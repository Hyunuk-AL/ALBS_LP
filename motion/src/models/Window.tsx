import React, {useMemo} from 'react';
import {ExtrudeGeometry, Shape} from 'three';
import {V3} from '../lib/camera';
import {Assemble, Box, Solid} from '../lib/three-kit';

/*
 * 連窓 2・1 段 W1800 H1200（RC 枠・複層ガラス）
 * 原点は窓下端・中心。+z が室外側。単位 m。
 */
export const W = 1.8;
export const H = 1.2;
const FW = 0.05; // 外枠見付
const FD = 0.075; // 外枠見込
const MW = 0.04; // 方立
const SW = 0.038; // 障子框
const SD = 0.045;
const IG = {pane: 0.005, gap: 0.012}; // 複層ガラス

const halfOpenW = (W - FW * 2 - MW) / 2; // 片側の開口幅
const xL = -(MW / 2 + halfOpenW / 2);
const xR = -xL;
const openH = H - FW * 2;

export const WINDOW_ANCHORS = {
  frame: [-W / 2 + 0.02, H - 0.02, FD / 2] as V3,
  mullion: [0, H * 0.58, FD / 2] as V3,
  sill: [-W / 2 + 0.18, -0.03, FD / 2 + 0.06] as V3,
  glass: [xL - 0.2, H * 0.38, 0.01] as V3,
};

const Sash: React.FC<{glass: number}> = ({glass}) => {
  const w = halfOpenW - 0.006;
  const h = openH - 0.006;
  return (
    <group>
      <Box size={[w, SW, SD]} position={[0, h / 2 - SW / 2, 0]} mat="alu" />
      <Box size={[w, SW, SD]} position={[0, -h / 2 + SW / 2, 0]} mat="alu" />
      <Box size={[SW, h - SW * 2, SD]} position={[-w / 2 + SW / 2, 0, 0]} mat="alu" />
      <Box size={[SW, h - SW * 2, SD]} position={[w / 2 - SW / 2, 0, 0]} mat="alu" />
      {/* 複層ガラス：2 枚のガラスとスペーサー。上から框へ落とし込む */}
      <Assemble p={glass} offset={[0, 0.5, 0.25]}>
        {[-1, 1].map((s) => (
          <Box key={s} size={[w - SW * 2 + 0.01, h - SW * 2 + 0.01, IG.pane]} position={[0, 0, (s * (IG.gap + IG.pane)) / 2]} mat="glass" />
        ))}
        <Box size={[w - SW * 2 + 0.004, 0.008, IG.gap]} position={[0, h / 2 - SW - 0.002, 0]} mat="spacer" edges={false} />
        <Box size={[w - SW * 2 + 0.004, 0.008, IG.gap]} position={[0, -h / 2 + SW + 0.002, 0]} mat="spacer" edges={false} />
        <Box size={[0.008, h - SW * 2, IG.gap]} position={[-w / 2 + SW + 0.002, 0, 0]} mat="spacer" edges={false} />
        <Box size={[0.008, h - SW * 2, IG.gap]} position={[w / 2 - SW - 0.002, 0, 0]} mat="spacer" edges={false} />
      </Assemble>
    </group>
  );
};

export type WindowProgress = {
  frame: number;
  mullion: number;
  sashL: number;
  sashR: number;
  glass: number;
  sill: number;
};

export const WindowModel: React.FC<{pr: WindowProgress}> = ({pr}) => {
  // 水切り：外へ勾配をつけた板金
  const sillGeo = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.01, 0);
    s.lineTo(0.12, -0.022);
    s.lineTo(0.12, -0.04);
    s.lineTo(0.112, -0.04);
    s.lineTo(0.112, -0.03);
    s.lineTo(-0.01, -0.01);
    s.closePath();
    const g = new ExtrudeGeometry(s, {depth: W + 0.04, bevelEnabled: false});
    g.translate(0, 0, -(W + 0.04) / 2);
    g.rotateY(-Math.PI / 2);
    return g;
  }, []);

  return (
    <group>
      <Assemble p={pr.frame} offset={[0, 0.9, 0]}>
        <Box size={[W, FW, FD]} position={[0, H - FW / 2, 0]} mat="alu" />
        <Box size={[W, FW, FD]} position={[0, FW / 2, 0]} mat="alu" />
        <Box size={[FW, H - FW * 2, FD]} position={[-W / 2 + FW / 2, H / 2, 0]} mat="alu" />
        <Box size={[FW, H - FW * 2, FD]} position={[W / 2 - FW / 2, H / 2, 0]} mat="alu" />
      </Assemble>

      <Assemble p={pr.mullion} offset={[0, -1.1, 0]}>
        <Box size={[MW, openH, FD]} position={[0, H / 2, 0]} mat="aluDark" />
      </Assemble>

      <Assemble p={pr.sashL} offset={[-1.6, 0, 0.35]}>
        <group position={[xL, H / 2, 0.004]}>
          <Sash glass={pr.glass} />
        </group>
      </Assemble>
      <Assemble p={pr.sashR} offset={[1.6, 0, 0.35]}>
        <group position={[xR, H / 2, 0.004]}>
          <Sash glass={pr.glass} />
        </group>
      </Assemble>

      <Assemble p={pr.sill} offset={[0, -0.45, 0.4]}>
        <Solid geometry={sillGeo} mat="alu" position={[0, 0, FD / 2 - 0.005]} />
      </Assemble>
    </group>
  );
};
