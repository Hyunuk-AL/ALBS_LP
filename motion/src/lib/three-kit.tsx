import {useThree} from '@react-three/fiber';
import React, {createContext, useContext, useLayoutEffect, useMemo} from 'react';
import {BoxGeometry, BufferGeometry, EdgesGeometry, NoToneMapping, PerspectiveCamera, SRGBColorSpace} from 'three';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {Pose, V3, posePosition} from './camera';
import {C} from './theme';

/*
 * 見た目は Revit の 3D ビュー（表示スタイル「シェーディング」）に寄せる：
 * 陰影の少ないマットな面、黒い輪郭線、影なし、白背景、ほぼ平行投影。
 */

/* ---------- 不透明度（部材のフェードイン）を子孫へ伝える ---------- */
const Fade = createContext(1);
export const useFade = () => useContext(Fade);

/* ---------- マテリアル（Revit のシェーディング色） ---------- */
export type Mat = 'frame' | 'leaf' | 'louver' | 'steel' | 'alu' | 'aluDark' | 'glass' | 'ink' | 'slat' | 'case' | 'spacer';

const COLORS: Record<Mat, string> = {
  frame: '#8A8D92', // スチール枠（塗装）
  leaf: '#F1F2F3', // 扉
  louver: '#C3C6CA',
  steel: '#D6D8DB', // ステンレス
  alu: '#C9CCD0', // アルミ形材
  aluDark: '#9DA1A6',
  glass: '#B9C4E4', // Revit のガラス（半透明の青灰）
  ink: C.ink2,
  slat: '#DCDEE1',
  case: '#E6E7E9',
  spacer: '#5A5D62',
};

export const Material: React.FC<{kind: Mat}> = ({kind}) => {
  const o = useFade();
  if (kind === 'glass') {
    return <meshLambertMaterial color={COLORS.glass} transparent opacity={0.5 * o} depthWrite={false} />;
  }
  // 面を少し奥へずらし、輪郭線が面に埋もれないようにする
  return (
    <meshLambertMaterial
      color={COLORS[kind]}
      transparent={o < 0.999}
      opacity={o}
      depthWrite={o > 0.5}
      polygonOffset
      polygonOffsetFactor={1}
      polygonOffsetUnits={1}
    />
  );
};

/* ---------- 太さを持つ線（WebGL の線は 1px 固定なので LineSegments2 を使う） ---------- */
export const FatLines: React.FC<{
  positions: Float32Array | number[];
  color?: string;
  width?: number; // px（1440px 幅の映像での太さ）
  opacity?: number;
  position?: V3;
  rotation?: V3;
}> = ({positions, color = C.ink, width = 1.6, opacity = 1, position, rotation}) => {
  const {size} = useThree();
  const obj = useMemo(() => {
    const g = new LineSegmentsGeometry();
    g.setPositions(positions as Float32Array);
    const m = new LineMaterial({color, linewidth: width, transparent: true, opacity, worldUnits: false});
    return new LineSegments2(g, m);
  }, [positions]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = obj.material as LineMaterial;
  m.color.set(color);
  m.linewidth = width * (size.width / 1440);
  m.opacity = opacity;
  m.resolution.set(size.width, size.height);
  return <primitive object={obj} position={position} rotation={rotation} />;
};

const edgeCache = new WeakMap<BufferGeometry, Float32Array>();
const edgePositions = (g: BufferGeometry) => {
  let p = edgeCache.get(g);
  if (!p) {
    p = new EdgesGeometry(g, 25).attributes.position.array as Float32Array;
    edgeCache.set(g, p);
  }
  return p;
};

/* ---------- 形状＋黒い輪郭線 ---------- */
export const Solid: React.FC<{
  geometry: BufferGeometry;
  mat: Mat;
  position?: V3;
  rotation?: V3;
  edges?: boolean;
  shadow?: boolean;
}> = ({geometry, mat, position, rotation, edges = true}) => {
  const o = useFade();
  if (o <= 0.001) return null;
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry}>
        <Material kind={mat} />
      </mesh>
      {edges ? <FatLines positions={edgePositions(geometry)} color={C.ink} width={mat === 'glass' ? 1.1 : 1.5} opacity={(mat === 'glass' ? 0.55 : 0.9) * o} /> : null}
    </group>
  );
};

const boxCache = new Map<string, BoxGeometry>();
export const boxGeo = (w: number, h: number, d: number) => {
  const k = `${w}|${h}|${d}`;
  let g = boxCache.get(k);
  if (!g) {
    g = new BoxGeometry(w, h, d);
    boxCache.set(k, g);
  }
  return g;
};

export const Box: React.FC<{size: V3; mat: Mat; position?: V3; rotation?: V3; edges?: boolean}> = ({size, ...rest}) => (
  <Solid geometry={boxGeo(...size)} {...rest} />
);

/* ---------- 組み立て：offset から定位置へ。p=0 で不可視、p=1 で定位置 ---------- */
export const Assemble: React.FC<{
  p: number;
  offset?: V3;
  rotate?: V3;
  children: React.ReactNode;
}> = ({p, offset = [0, 0, 0], rotate = [0, 0, 0], children}) => {
  const parent = useFade();
  const k = 1 - p;
  // 移動の前半でフェードインを終える（後半は不透明のまま収まる）
  const o = Math.max(0, Math.min(1, p * 2.4)) * parent;
  if (o <= 0.001) return null;
  return (
    <Fade.Provider value={o}>
      <group
        position={[offset[0] * k, offset[1] * k, offset[2] * k]}
        rotation={[rotate[0] * k, rotate[1] * k, rotate[2] * k]}
      >
        {children}
      </group>
    </Fade.Provider>
  );
};

export const FadeGroup: React.FC<{o: number; children: React.ReactNode}> = ({o, children}) => {
  const parent = useFade();
  const v = o * parent;
  if (v <= 0.001) return null;
  return <Fade.Provider value={v}>{children}</Fade.Provider>;
};

/* ---------- 床の通芯（一点鎖線）と符号の丸 ---------- */
export type GridLine = {label: string; axis: 'x' | 'z'; at: number; from: number; to: number};

const dashDot = (a: number, b: number, unit: number) => {
  // 長い線・すき間・点・すき間 の繰り返し
  const seq = [0.5, 0.09, 0.03, 0.09].map((v) => v * unit);
  const out: [number, number][] = [];
  let t = a;
  let i = 0;
  while (t < b) {
    const len = seq[i % 4];
    if (i % 2 === 0) out.push([t, Math.min(b, t + len)]);
    t += len;
    i++;
  }
  return out;
};

// 符号の丸の半径（m）。bubble はスマホ版で丸と文字を大きくする倍率
export const bubbleR = (unit: number, bubble = 1) => 0.13 * unit * bubble;
export const gridBubble = (g: GridLine, unit: number, bubble = 1): V3 => {
  const r = bubbleR(unit, bubble);
  return g.axis === 'x' ? [g.to + r, 0, g.at] : [g.at, 0, g.to + r];
};

export const FloorGrid: React.FC<{lines: GridLine[]; unit?: number; bubble?: number; opacity?: number; bubbles?: boolean}> = ({lines, unit = 1, bubble = 1, opacity = 1, bubbles = true}) => {
  const pos = useMemo(() => {
    const p: number[] = [];
    const y = 0.001;
    lines.forEach((g) => {
      dashDot(g.from, g.to, unit).forEach(([s, e]) => {
        if (g.axis === 'x') p.push(s, y, g.at, e, y, g.at);
        else p.push(g.at, y, s, g.at, y, e);
      });
      // 符号の丸（線の端）
      if (!bubbles) return;
      const [cx, , cz] = gridBubble(g, unit, bubble);
      const r = bubbleR(unit, bubble);
      const n = 48;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        p.push(cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r, cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r);
      }
    });
    return new Float32Array(p);
  }, [lines, unit, bubble, bubbles]);
  if (opacity <= 0.001) return null;
  return <FatLines positions={pos} color="#9EA2A8" width={1.3} opacity={0.75 * opacity} />;
};

/* ---------- カメラ ---------- */
export const CameraRig: React.FC<{pose: Pose}> = ({pose}) => {
  const {camera, invalidate} = useThree();
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.position.set(...posePosition(pose));
    cam.up.set(0, 1, 0);
    cam.fov = pose.fov;
    cam.near = 0.05;
    cam.far = 400;
    cam.lookAt(...pose.target);
    cam.updateProjectionMatrix();
    invalidate();
  });
  return null;
};

/* ---------- 照明：Revit のシェーディング表示に近い、明るく陰影の弱い光 ---------- */
export const Studio: React.FC<{keyPos?: V3}> = ({keyPos = [-3, 8, 6]}) => {
  const {gl} = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = NoToneMapping;
    gl.outputColorSpace = SRGBColorSpace;
  }, [gl]);
  return (
    <>
      <color attach="background" args={[C.bg]} />
      <ambientLight intensity={1.55} />
      <directionalLight position={keyPos} intensity={1.35} />
      <directionalLight position={[6, 3, 4]} intensity={0.55} />
      <directionalLight position={[0, 2, -8]} intensity={0.35} />
    </>
  );
};
