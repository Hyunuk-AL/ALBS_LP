import React from 'react';
import {Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {Film, normalToward} from './Film';
import {Pose, V3, lerpPose, makeProjector} from './lib/camera';
import {ease, pulse, settle} from './lib/motion';
import {FadeGroup, GridLine, gridBubble} from './lib/three-kit';
import {DimLine, GridLabel, Tag} from './lib/overlay';
import {FPS} from './lib/theme';
import * as Door from './models/Door';
import * as Win from './models/Window';
import * as Sh from './models/Shutter';

/*
 * タイミングは LP の仕様リスト（.spec-list li の --d）と同じ秒数。
 * LP 側で仕様リストのアニメーションと同時に再生し、項目が選ばれた瞬間に部材が収まるようにする。
 * 全体は 5 秒。組み上がった後の回り込み・開閉を詰めて収め、最後はフェードアウトせず完成形で止める。
 */
export const FILM_SEC = 5;

const tagState = (f: number, t: number) => ({
  appear: ease(f, t + 0.1, t + 0.75),
  settle: ease(f, t + 1.3, t + 1.9),
});

// 寄りながら回り込む → 組み上がったらゆっくり流す
const camera = (f: number, A: Pose, B: Pose, Cp: Pose, arriveSec: number, endSec: number) => {
  const p1 = ease(f, 0, arriveSec, Easing.bezier(0.3, 0, 0.1, 1));
  const p2 = ease(f, arriveSec, endSec, Easing.bezier(0.4, 0, 0.6, 1));
  return lerpPose(lerpPose(A, B, p1), Cp, p2);
};

/* Revit の 3D ビューのように、ほぼ平行投影（画角 12°）で斜め上から見下ろす */
const FOV = 12;

// 床の通芯：壁芯（Y1）と、開口の両側の柱芯（X1・X2）
const grid = (halfX: number, y1: [number, number], x: [number, number]): GridLine[] => [
  {label: 'Y1', axis: 'x', at: 0, from: y1[0], to: y1[1]},
  {label: 'X1', axis: 'z', at: -halfX, from: x[0], to: x[1]},
  {label: 'X2', axis: 'z', at: halfX, from: x[0], to: x[1]},
];
const bubbleFor = (ui: number) => (ui > 1 ? 1.45 : 1);
const gridLabels = (lines: GridLine[], unit: number, P: (p: V3) => [number, number], ui: number, o: number, labelPx = 19) =>
  lines.map((g) => <GridLabel key={g.label} at={P(gridBubble(g, unit, bubbleFor(ui)))} label={g.label} size={labelPx * bubbleFor(ui)} opacity={o} />);

/* ============================== ドア ============================== */
export type FilmProps = {ui?: number; zoom?: number; shift?: number};
// zoom：カメラ距離の倍率、shift：注視点を左右にずらす量（m）。ラベル列の幅を確保する
const zoomPose = (p: Pose, z: number, shift = 0): Pose => ({...p, dist: p.dist * z, target: [p.target[0] + shift, p.target[1], p.target[2]]});

export const DoorFilm: React.FC<FilmProps> = ({ui = 1, zoom = 1}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const pose = zoomPose(camera(
    f,
    {target: [-0.15, 0.82, 0.25], az: -46, el: 26, dist: 19.5, fov: FOV},
    {target: [-0.15, 0.82, 0.25], az: -34, el: 21, dist: 16.4, fov: FOV},
    {target: [-0.15, 0.82, 0.25], az: -29, el: 20, dist: 16.2, fov: FOV},
    3.8,
    FILM_SEC,
  ), zoom);
  const pr: Door.DoorProgress = {
    leaf: settle(f, 0.2, 1.1),
    frame: settle(f, 0.8),
    sill: settle(f, 1.4),
    glass: settle(f, 2.0, 0.8),
    louver: settle(f, 2.3, 0.8),
    handle: settle(f, 2.6, 0.8),
    open: pulse(f, 3.7, 4.15, 4.35, 4.85),
  };
  const openRad = -(40 * Math.PI) / 180 * pr.open;
  const P = makeProjector(pose, width, height);
  const L = (p: V3) => P(Door.leafPoint(p, openRad));
  const labelX = P([-Door.W / 2, 1.0, 0.05])[0] - 92 * ui;

  const wA = P([-Door.W / 2, Door.H, 0.05]);
  const wB = P([Door.W / 2, Door.H, 0.05]);
  const hA = P([Door.W / 2, 0, 0.05]);
  const hB = P([Door.W / 2, Door.H, 0.05]);
  const dim = ease(f, 2.9, 3.7);

  const gl = grid(1.3, [-1.75, 1.6], [-0.9, 1.0]);
  const go = ease(f, 0, 0.7);

  const tags: {label: string; at: number; pt: [number, number]}[] = [
    {label: '枠', at: 0.8, pt: P(Door.DOOR_ANCHORS.frame)},
    {label: '窓', at: 2.0, pt: L(Door.DOOR_ANCHORS.glass)},
    {label: '扉', at: 0.2, pt: L(Door.DOOR_ANCHORS.leaf)},
    {label: 'ガラリ', at: 2.3, pt: L(Door.DOOR_ANCHORS.louver)},
    {label: '沓摺', at: 1.4, pt: P(Door.DOOR_ANCHORS.sill)},
  ];

  return (
    <Film
      pose={pose}
      grid={{lines: gl, bubble: bubbleFor(ui), opacity: go}}
      overlay={
        <>
          {gridLabels(gl, 1, P, ui, go)}
          {tags.map((t) => (
            <Tag key={t.label} anchor={t.pt} labelX={labelX} label={t.label} size={25 * ui} {...tagState(f, t.at)} />
          ))}
          <DimLine a={wA} b={wB} side={normalToward(wA, wB, [0, -1])} gap={44 * ui} label="W900" p={dim} size={26 * ui} />
          <DimLine a={hA} b={hB} side={normalToward(hA, hB, [1, 0])} gap={52 * ui} label="H2100" p={dim} size={26 * ui} />
        </>
      }
    >
      <Door.DoorModel pr={pr} />
    </Film>
  );
};

/* ============================== 窓 ============================== */
const WIN_Y = 0.55; // 窓下端の高さ（床からの浮き）

export const WindowFilm: React.FC<FilmProps> = ({ui = 1, zoom = 1, shift = 0}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const pose = zoomPose(camera(
    f,
    {target: [0, WIN_Y + 0.2, 0.25], az: -44, el: 26, dist: 19.5, fov: FOV},
    {target: [0, WIN_Y + 0.2, 0.25], az: -32, el: 21, dist: 16.4, fov: FOV},
    {target: [0, WIN_Y + 0.2, 0.25], az: -26, el: 20, dist: 16.2, fov: FOV},
    3.6,
    FILM_SEC,
  ), zoom, shift);
  const pr: Win.WindowProgress = {
    frame: settle(f, 0.2),
    mullion: settle(f, 0.8),
    sashL: settle(f, 1.3),
    sashR: settle(f, 1.45),
    glass: settle(f, 2.0, 0.8),
    sill: settle(f, 2.4),
  };
  const P0 = makeProjector(pose, width, height);
  const P = (p: V3) => P0([p[0], p[1] + WIN_Y, p[2]]);
  const labelX = P([-Win.W / 2, 0.6, 0.04])[0] - 84 * ui;
  const wA = P([-Win.W / 2, Win.H, 0.04]);
  const wB = P([Win.W / 2, Win.H, 0.04]);
  const hA = P([Win.W / 2, 0, 0.04]);
  const hB = P([Win.W / 2, Win.H, 0.04]);
  const dim = ease(f, 2.7, 3.5);

  const gl = grid(1.5, [-2.1, 2.0], [-0.8, 0.95]);
  const go = ease(f, 0, 0.7);

  const tags = [
    {label: '外枠', at: 0.2, pt: P(Win.WINDOW_ANCHORS.frame)},
    {label: '方立', at: 0.8, pt: P(Win.WINDOW_ANCHORS.mullion)},
    {label: '複層ガラス', at: 2.0, pt: P(Win.WINDOW_ANCHORS.glass)},
    {label: '水切り', at: 2.4, pt: P(Win.WINDOW_ANCHORS.sill)},
  ];

  return (
    <Film
      pose={pose}
      grid={{lines: gl, bubble: bubbleFor(ui), opacity: go}}
      overlay={
        <>
          {gridLabels(gl, 1, P0, ui, go)}
          {tags.map((t) => (
            <Tag key={t.label} anchor={t.pt} labelX={labelX} label={t.label} size={25 * ui} {...tagState(f, t.at)} />
          ))}
          <DimLine a={wA} b={wB} side={normalToward(wA, wB, [0, -1])} gap={42 * ui} label="W1800" p={dim} size={26 * ui} />
          <DimLine a={hA} b={hB} side={normalToward(hA, hB, [1, 0])} gap={46 * ui} label="H1200" p={dim} size={26 * ui} />
        </>
      }
    >
      <group position={[0, WIN_Y, 0]}>
        <Win.WindowModel pr={pr} />
      </group>
    </Film>
  );
};

/* ============================== シャッター ============================== */
export const ShutterFilm: React.FC<FilmProps> = ({ui = 1, zoom = 1}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const pose = zoomPose(camera(
    f,
    {target: [-0.2, 1.05, 0.35], az: -44, el: 26, dist: 36, fov: FOV},
    {target: [-0.2, 1.05, 0.35], az: -32, el: 21, dist: 30.5, fov: FOV},
    {target: [-0.2, 1.05, 0.35], az: -26, el: 20, dist: 30, fov: FOV},
    3.8,
    FILM_SEC,
  ), zoom);
  const down = ease(f, 1.4, 3.2, Easing.bezier(0.25, 0.1, 0.25, 1));
  const lift = pulse(f, 3.5, 3.95, 4.2, 4.8);
  const pr: Sh.ShutterProgress = {
    railL: settle(f, 0.2),
    railR: settle(f, 0.3),
    case: settle(f, 0.8),
    curtain: down * (1 - 0.5 * lift),
  };
  const P = makeProjector(pose, width, height);
  const labelX = P([-Sh.W / 2, 1.3, 0])[0] - 92 * ui;
  const wA = P([-Sh.W / 2, 0, 0.04]);
  const wB = P([Sh.W / 2, 0, 0.04]);
  const hA = P([Sh.W / 2 + 0.06, 0, 0.04]);
  const hB = P([Sh.W / 2 + 0.06, Sh.H, 0.04]);
  const dim = ease(f, 3.4, 4.2);

  const gl = grid(2.35, [-3.1, 2.8], [-1.2, 1.45]);
  const go = ease(f, 0, 0.7);

  const tags = [
    {label: 'ケース', at: 0.8, pt: P(Sh.SHUTTER_ANCHORS.case)},
    {label: 'スラット', at: 1.4, pt: P(Sh.SHUTTER_ANCHORS.slat)},
    {label: 'ガイド', at: 0.2, pt: P(Sh.SHUTTER_ANCHORS.rail)},
  ];

  return (
    <Film
      pose={pose}
      grid={{lines: gl, unit: 1.5, bubble: bubbleFor(ui), opacity: go}}
      overlay={
        <>
          {gridLabels(gl, 1.5, P, ui, go, 22)}
          {tags.map((t) => (
            <Tag key={t.label} anchor={t.pt} labelX={labelX} label={t.label} size={25 * ui} {...tagState(f, t.at)} />
          ))}
          <DimLine a={wA} b={wB} side={normalToward(wA, wB, [0, 1])} gap={40 * ui} label="W3000" p={dim} size={26 * ui} />
          <DimLine a={hA} b={hB} side={normalToward(hA, hB, [1, 0])} gap={46 * ui} label="H2500" p={dim} size={26 * ui} />
        </>
      }
    >
      <Sh.ShutterModel pr={pr} />
    </Film>
  );
};

/* ============================== ヒーロー（3.2 秒ごとに切り替わるループ） ============================== */
export const HERO_SEG = 3.2;

const Turntable: React.FC<{tau: number; y?: number; scale?: number; children: React.ReactNode}> = ({tau, y = 0, scale = 1, children}) => {
  const fIn = tau * FPS;
  const out = ease(fIn, HERO_SEG - 0.5, HERO_SEG - 0.05);
  const rot = -0.42 + 0.5 * (tau / HERO_SEG);
  return (
    <FadeGroup o={1 - out}>
      <group position={[0, y + out * 0.25, 0]} rotation={[0, rot, 0]} scale={scale}>
        {children}
      </group>
    </FadeGroup>
  );
};

export const HeroFilm: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const seg = Math.min(2, Math.floor(t / HERO_SEG));
  const tau = t - seg * HERO_SEG;
  const lf = tau * FPS; // 区間内のフレーム
  const k = 0.32; // 組み立てを LP 本編より速く

  const pose: Pose = {target: [0, 0.82, 0.2], az: -30, el: 20, dist: 17.5, fov: FOV};
  const gl = grid(1.05, [-1.6, 1.4], [-0.8, 0.8]);

  const {width, height} = useVideoConfig();
  const P = makeProjector(pose, width, height);

  return (
    <Film pose={pose} grid={{lines: gl, opacity: 0.8}} overlay={<>{gridLabels(gl, 1, P, 1, 0.8, 21)}</>}>
      {seg === 0 ? (
        <Turntable tau={tau}>
          <Door.DoorModel
            pr={{
              leaf: settle(lf, 0.2 * k, 0.8),
              frame: settle(lf, 0.8 * k, 0.8),
              sill: settle(lf, 1.4 * k, 0.8),
              glass: settle(lf, 2.0 * k, 0.7),
              louver: settle(lf, 2.3 * k, 0.7),
              handle: settle(lf, 2.6 * k, 0.7),
              open: 0,
            }}
          />
        </Turntable>
      ) : null}
      {seg === 1 ? (
        <Turntable tau={tau} y={0.42}>
          <Win.WindowModel
            pr={{
              frame: settle(lf, 0.2 * k, 0.8),
              mullion: settle(lf, 0.8 * k, 0.8),
              sashL: settle(lf, 1.3 * k, 0.8),
              sashR: settle(lf, 1.45 * k, 0.8),
              glass: settle(lf, 2.0 * k, 0.7),
              sill: settle(lf, 2.4 * k, 0.7),
            }}
          />
        </Turntable>
      ) : null}
      {seg === 2 ? (
        <Turntable tau={tau} scale={0.62}>
          <Sh.ShutterModel
            pr={{
              railL: settle(lf, 0.2 * k, 0.8),
              railR: settle(lf, 0.3 * k, 0.8),
              case: settle(lf, 0.8 * k, 0.8),
              curtain: ease(lf, 1.2 * k, 1.2 * k + 1.1, Easing.bezier(0.25, 0.1, 0.25, 1)),
            }}
          />
        </Turntable>
      ) : null}
    </Film>
  );
};
