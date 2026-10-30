import React, {useMemo} from 'react';
import {ExtrudeGeometry, Shape} from 'three';
import {V3} from '../lib/camera';
import {Assemble, Box, FadeGroup, Solid} from '../lib/three-kit';

/*
 * 軽量シャッター・天井付 W3000 H2500（標準ガイドレール）
 * 原点は床・開口中心。+z が正面。単位 m。
 */
export const W = 3.0;
export const H = 2.5;
const RAIL = {w: 0.06, d: 0.07, t: 0.006};
const CASE = {h: 0.42, d: 0.62}; // 天井付ケース（奥行きは巻き取り径＋点検スペース）
const PITCH = 0.062;
const N = Math.ceil(H / PITCH);
const SLAT_W = W + 0.05; // ガイドレールに掛かる分だけ長く

export const SHUTTER_ANCHORS = {
  rail: [-W / 2 - RAIL.w / 2, H * 0.55, RAIL.d / 2] as V3,
  case: [-W / 2 + 0.1, H + CASE.h * 0.6, CASE.d / 2 - 0.12] as V3,
  slat: [-W / 2 + 0.35, H * 0.78, 0.012] as V3,
};

// コの字のガイドレール（開口側が開いている）
const Rail: React.FC<{side: 1 | -1}> = ({side}) => {
  const x = side * (W / 2 + RAIL.w / 2 - 0.01);
  return (
    <group position={[x, H / 2, 0]}>
      <Box size={[RAIL.w, H, RAIL.t]} position={[0, 0, RAIL.d / 2 - RAIL.t / 2]} mat="aluDark" />
      <Box size={[RAIL.w, H, RAIL.t]} position={[0, 0, -RAIL.d / 2 + RAIL.t / 2]} mat="aluDark" />
      <Box size={[RAIL.t, H, RAIL.d]} position={[(side * (RAIL.w - RAIL.t)) / 2, 0, 0]} mat="aluDark" />
    </group>
  );
};

export type ShutterProgress = {
  railL: number;
  railR: number;
  case: number;
  curtain: number; // 0〜1：降りている割合
};

export const ShutterModel: React.FC<{pr: ShutterProgress}> = ({pr}) => {
  // スラット：浅い波形の断面を幅方向へ押し出す
  const slatGeo = useMemo(() => {
    const s = new Shape();
    const h = PITCH + 0.004;
    const pts: [number, number][] = [
      [0.0, 0],
      [0.006, h * 0.18],
      [0.013, h * 0.5],
      [0.006, h * 0.82],
      [0.0, h],
    ];
    s.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([z, y]) => s.lineTo(z, y));
    [...pts].reverse().forEach(([z, y]) => s.lineTo(z - 0.0016, y));
    s.closePath();
    const g = new ExtrudeGeometry(s, {depth: SLAT_W, bevelEnabled: false, curveSegments: 4});
    g.translate(0, 0, -SLAT_W / 2);
    g.rotateY(-Math.PI / 2);
    return g;
  }, []);

  const drop = pr.curtain * H; // 降りた長さ
  const bottom = H - drop;

  return (
    <group>
      <Assemble p={pr.railL} offset={[0, -2.8, 0]}>
        <Rail side={-1} />
      </Assemble>
      <Assemble p={pr.railR} offset={[0, -2.8, 0]}>
        <Rail side={1} />
      </Assemble>

      {/* 天井付ケース（まぐさの奥に据え付け） */}
      <Assemble p={pr.case} offset={[0, 1.3, 0]}>
        <group position={[0, H + CASE.h / 2, -CASE.d / 2 + RAIL.d / 2 + 0.02]}>
          <Box size={[W + 0.22, CASE.h, CASE.d]} mat="case" />
          <Box size={[W + 0.22, 0.012, CASE.d + 0.01]} position={[0, -CASE.h / 2 + 0.006, 0.0]} mat="aluDark" />
          <Box size={[0.012, CASE.h + 0.004, CASE.d + 0.004]} position={[-(W + 0.22) / 2, 0, 0]} mat="aluDark" />
          <Box size={[0.012, CASE.h + 0.004, CASE.d + 0.004]} position={[(W + 0.22) / 2, 0, 0]} mat="aluDark" />
        </group>
      </Assemble>

      {/* カーテン：ケースから巻き下ろす。ケースより上にあるスラットは描かない */}
      <FadeGroup o={pr.curtain > 0.001 ? 1 : 0}>
        {Array.from({length: N}, (_, i) => {
          const y = bottom + 0.04 + i * PITCH;
          if (y > H - 0.01) return null;
          return <Solid key={i} geometry={slatGeo} mat="slat" position={[0, y, -0.006]} />;
        })}
        {/* 座板 */}
        <Box size={[W + 0.03, 0.045, 0.034]} position={[0, bottom + 0.0225, 0]} mat="aluDark" />
      </FadeGroup>
    </group>
  );
};
