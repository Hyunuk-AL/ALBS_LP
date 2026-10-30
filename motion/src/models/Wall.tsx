import React from 'react';
import {V3} from '../lib/camera';
import {Assemble, Box} from '../lib/three-kit';

/*
 * 壁タイプ：LGS 間仕切り（スタッド 65・石膏ボード 12.5 二重張り×両面・グラスウール）
 * 端部をボード 1 枚ごとに段状に剥がし、層構成が見えるようにする（Revit の壁タイプ図の見せ方）。
 * 原点は床・壁芯の中央。単位 m。
 */
export const W = 1.8;
export const H = 1.5;
const STUD = {w: 0.045, d: 0.065, t: 0.0008 * 6, pitch: 0.455};
const RUNNER_H = 0.04;
const BOARD = 0.0125;
const STEP = 0.32; // 層ごとの段差（カメラ側＝左端で剥がす）

export const WALL_ANCHORS = {
  stud: [W / 2 - 0.05, H * 0.55, 0] as V3,
};

const studXs = (() => {
  const xs: number[] = [];
  for (let x = -W / 2 + STUD.w / 2; x <= W / 2 - STUD.w / 2 + 1e-6; x += STUD.pitch) xs.push(x);
  return xs;
})();

// 外側の層ほど左端を短くして段状に見せる（表面側は大きく、裏面側は少し）
const Board: React.FC<{side: 1 | -1; layer: 0 | 1}> = ({side, layer}) => {
  const cut = side === 1 ? STEP * (layer + 1.4) : 0.06 * (layer + 1);
  const w = W - cut;
  const z = side * (STUD.d / 2 + BOARD * (layer + 0.5));
  return <Box size={[w, H, BOARD]} position={[cut / 2, H / 2, z]} mat={layer === 0 ? 'case' : 'leaf'} />;
};

export type WallProgress = {
  runner: number;
  studs: number; // 0〜1 を本数ぶんずらして使う
  insulation: number;
  inner: number; // 1 枚目のボード（両面）
  outer: number; // 2 枚目のボード（両面）
};

export const WallModel: React.FC<{pr: WallProgress}> = ({pr}) => {
  const n = studXs.length;
  return (
    <group>
      {/* ランナー（上下） */}
      <Assemble p={pr.runner} offset={[0, -0.6, 0]}>
        <Box size={[W, RUNNER_H, STUD.d + 0.004]} position={[0, RUNNER_H / 2, 0]} mat="aluDark" />
      </Assemble>
      <Assemble p={pr.runner} offset={[0, 0.6, 0]}>
        <Box size={[W, RUNNER_H, STUD.d + 0.004]} position={[0, H - RUNNER_H / 2, 0]} mat="aluDark" />
      </Assemble>

      {/* スタッド：左から順に立てる */}
      {studXs.map((x, i) => {
        const p = Math.max(0, Math.min(1, pr.studs * (n + 2) - i * 1));
        return (
          <Assemble key={x} p={p} offset={[0, 0.9, 0]}>
            <group position={[x, H / 2, 0]}>
              <Box size={[STUD.w, H - RUNNER_H * 2, STUD.t]} position={[0, 0, STUD.d / 2 - STUD.t / 2]} mat="alu" />
              <Box size={[STUD.w, H - RUNNER_H * 2, STUD.t]} position={[0, 0, -STUD.d / 2 + STUD.t / 2]} mat="alu" />
              <Box size={[STUD.t, H - RUNNER_H * 2, STUD.d]} position={[-STUD.w / 2 + STUD.t / 2, 0, 0]} mat="alu" />
            </group>
          </Assemble>
        );
      })}

      {/* グラスウール */}
      <Assemble p={pr.insulation} offset={[0, 0, 0.8]}>
        <Box size={[W - 0.24, H - RUNNER_H * 2 - 0.02, STUD.d * 0.8]} position={[0.11, H / 2, 0]} mat="louver" />
      </Assemble>

      {/* 石膏ボード：内側の層 → 外側の層。表裏から同時に張る */}
      <Assemble p={pr.inner} offset={[0, 0, 0.7]}>
        <Board side={1} layer={0} />
      </Assemble>
      <Assemble p={pr.inner} offset={[0, 0, -0.7]}>
        <Board side={-1} layer={0} />
      </Assemble>
      <Assemble p={pr.outer} offset={[0, 0, 0.7]}>
        <Board side={1} layer={1} />
      </Assemble>
      <Assemble p={pr.outer} offset={[0, 0, -0.7]}>
        <Board side={-1} layer={1} />
      </Assemble>
    </group>
  );
};
