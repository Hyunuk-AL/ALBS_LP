import React, {useMemo} from 'react';
import {CylinderGeometry, ExtrudeGeometry, Path, Shape} from 'three';
import {V3} from '../lib/camera';
import {Assemble, Box, Solid} from '../lib/three-kit';

/*
 * 片開き戸 W900 H2100（片ヒバタ枠・沓摺 A・窓＋ガラリ）
 * 原点は床・開口中心、+z が室外側（正面）。単位 m。
 */
export const W = 0.9;
export const H = 2.1;
const FW = 0.045; // 枠見付
const FD = 0.1; // 枠見込
const SILL = 0.008;
const IN = W / 2 - FW; // 開口内法の半幅 0.405
const LEAF_T = 0.04;
const LEAF_Z = 0.01;
const LEAF_W = IN * 2 - 0.006;
const LEAF_B = SILL + 0.005;
const LEAF_TOP = H - FW - 0.003;
const LEAF_H = LEAF_TOP - LEAF_B;
const LEAF_CY = (LEAF_TOP + LEAF_B) / 2;

// 扉の吊り元（蝶番の軸）
export const HINGE: V3 = [-IN, 0, LEAF_Z + LEAF_T / 2];

// 窓・ガラリの開口（扉中心からの相対）
const VIS = {w: 0.3, h: 0.52, cy: 0.5};
const LOU = {w: 0.5, h: 0.34, cy: -0.66};

// 扉を開いたときの点の位置（引き出し線を扉に追従させる）
export const leafPoint = (p: V3, openRad: number): V3 => {
  const x = p[0] - HINGE[0];
  const z = p[2] - HINGE[2];
  const c = Math.cos(openRad);
  const s = Math.sin(openRad);
  return [HINGE[0] + x * c + z * s, p[1], HINGE[2] - x * s + z * c];
};

export const DOOR_ANCHORS = {
  frame: [-IN - FW * 0.5, H - 0.02, FD / 2] as V3,
  sill: [-0.22, SILL, FD / 2 + 0.005] as V3,
  leaf: [0.12, LEAF_CY + 0.05, LEAF_Z + LEAF_T / 2] as V3,
  glass: [-VIS.w / 2 + 0.04, LEAF_CY + VIS.cy + 0.12, LEAF_Z + LEAF_T / 2] as V3,
  louver: [-LOU.w / 2 + 0.05, LEAF_CY + LOU.cy, LEAF_Z + LEAF_T / 2] as V3,
};

const rectHole = (w: number, h: number, cy: number) => {
  const p = new Path();
  p.moveTo(-w / 2, cy - h / 2);
  p.lineTo(w / 2, cy - h / 2);
  p.lineTo(w / 2, cy + h / 2);
  p.lineTo(-w / 2, cy + h / 2);
  p.closePath();
  return p;
};

const useLeafGeometry = () =>
  useMemo(() => {
    const s = new Shape();
    s.moveTo(-LEAF_W / 2, -LEAF_H / 2);
    s.lineTo(LEAF_W / 2, -LEAF_H / 2);
    s.lineTo(LEAF_W / 2, LEAF_H / 2);
    s.lineTo(-LEAF_W / 2, LEAF_H / 2);
    s.closePath();
    s.holes.push(rectHole(VIS.w, VIS.h, VIS.cy), rectHole(LOU.w, LOU.h, LOU.cy));
    const g = new ExtrudeGeometry(s, {depth: LEAF_T - 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1});
    g.translate(0, 0, -(LEAF_T - 0.004) / 2);
    return g;
  }, []);

// 開口まわりの押縁（表裏）
const Bead: React.FC<{w: number; h: number; cy: number}> = ({w, h, cy}) => {
  const b = 0.018;
  const t = 0.006;
  return (
    <>
      {[1, -1].map((side) => {
        const z = side * (LEAF_T / 2 + t / 2);
        return (
          <group key={side}>
            <Box size={[w + b * 2, b, t]} position={[0, cy + h / 2 + b / 2, z]} mat="frame" />
            <Box size={[w + b * 2, b, t]} position={[0, cy - h / 2 - b / 2, z]} mat="frame" />
            <Box size={[b, h, t]} position={[-w / 2 - b / 2, cy, z]} mat="frame" />
            <Box size={[b, h, t]} position={[w / 2 + b / 2, cy, z]} mat="frame" />
          </group>
        );
      })}
    </>
  );
};

const Handle: React.FC = () => {
  const rose = useMemo(() => new CylinderGeometry(0.026, 0.026, 0.01, 40), []);
  const neck = useMemo(() => new CylinderGeometry(0.009, 0.009, 0.04, 24), []);
  const cyl = useMemo(() => new CylinderGeometry(0.017, 0.017, 0.012, 32), []);
  return (
    <>
      {[1, -1].map((side) => (
        <group key={side} position={[LEAF_W / 2 - 0.065, -0.03, (side * LEAF_T) / 2]} scale={[1, 1, side]}>
          <Solid geometry={rose} mat="steel" rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.005]} edges={false} />
          <Solid geometry={neck} mat="steel" rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.026]} edges={false} />
          <Box size={[0.135, 0.019, 0.019]} position={[-0.058, 0, 0.046]} mat="steel" edges={false} />
          <Solid geometry={cyl} mat="steel" rotation={[Math.PI / 2, 0, 0]} position={[0, 0.16, 0.006]} edges={false} />
        </group>
      ))}
    </>
  );
};

export type DoorProgress = {
  leaf: number;
  frame: number;
  sill: number;
  glass: number;
  louver: number;
  handle: number;
  open: number; // 0〜1（開き角 0〜40°）
};

export const DoorModel: React.FC<{pr: DoorProgress}> = ({pr}) => {
  const leafGeo = useLeafGeometry();
  const hingeGeo = useMemo(() => new CylinderGeometry(0.008, 0.008, 0.1, 20), []);
  const openRad = -(40 * Math.PI) / 180 * pr.open;
  const slats = 6;

  return (
    <group>
      {/* 枠（上から降りてくる） */}
      <Assemble p={pr.frame} offset={[0, 1.1, 0]}>
        <Box size={[FW, H, FD]} position={[-W / 2 + FW / 2, H / 2, 0]} mat="frame" />
        <Box size={[FW, H, FD]} position={[W / 2 - FW / 2, H / 2, 0]} mat="frame" />
        <Box size={[W, FW, FD]} position={[0, H - FW / 2, 0]} mat="frame" />
        {/* 戸当り（ヒバタ） */}
        <Box size={[0.012, H - FW, 0.03]} position={[-IN + 0.006, (H - FW) / 2, -0.025]} mat="frame" />
        <Box size={[0.012, H - FW, 0.03]} position={[IN - 0.006, (H - FW) / 2, -0.025]} mat="frame" />
        <Box size={[IN * 2 - 0.024, 0.012, 0.03]} position={[0, H - FW - 0.006, -0.025]} mat="frame" />
      </Assemble>

      {/* 沓摺（下から差し込む） */}
      <Assemble p={pr.sill} offset={[0, -0.25, 0.55]}>
        <Box size={[W, SILL, FD + 0.012]} position={[0, SILL / 2, 0.006]} mat="steel" />
      </Assemble>

      {/* 扉（吊り元を軸に回転） */}
      <Assemble p={pr.leaf} offset={[-0.15, 0.1, 1.25]} rotate={[0, -0.55, 0]}>
        <group position={HINGE} rotation={[0, openRad, 0]}>
          <group position={[-HINGE[0], 0, -HINGE[2]]}>
            <group position={[0, LEAF_CY, LEAF_Z]}>
              <Solid geometry={leafGeo} mat="leaf" />
              {[-0.78, 0.02, 0.82].map((y) => (
                <Solid key={y} geometry={hingeGeo} mat="steel" position={[-LEAF_W / 2 - 0.004, y, LEAF_T / 2 + 0.002]} edges={false} />
              ))}

              {/* 窓：ガラス＋押縁 */}
              <Assemble p={pr.glass} offset={[0, 0, 0.5]}>
                <Box size={[VIS.w, VIS.h, 0.006]} position={[0, VIS.cy, 0]} mat="glass" />
                <Bead w={VIS.w} h={VIS.h} cy={VIS.cy} />
              </Assemble>

              {/* ガラリ：羽根を斜めに */}
              <Assemble p={pr.louver} offset={[0, 0, 0.5]}>
                {Array.from({length: slats}, (_, i) => {
                  const y = LOU.cy - LOU.h / 2 + (LOU.h / slats) * (i + 0.5);
                  return <Box key={i} size={[LOU.w, 0.05, 0.004]} position={[0, y, 0]} rotation={[-0.75, 0, 0]} mat="louver" />;
                })}
                <Bead w={LOU.w} h={LOU.h} cy={LOU.cy} />
              </Assemble>

              {/* ハンドル */}
              <Assemble p={pr.handle} offset={[0.35, 0, 0.35]}>
                <Handle />
              </Assemble>
            </group>
          </group>
        </group>
      </Assemble>
    </group>
  );
};
