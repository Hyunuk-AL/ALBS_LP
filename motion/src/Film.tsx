import {ThreeCanvas} from '@remotion/three';
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {Pose, posePosition} from './lib/camera';
import {CameraRig, FloorGrid, GridLine, Studio} from './lib/three-kit';
import {C} from './lib/theme';

type StudioProps = React.ComponentProps<typeof Studio>;

// 3D シーン＋その上に重ねる SVG（寸法線・引き出し線）
export const Film: React.FC<{
  pose: Pose;
  studio?: StudioProps;
  overlay?: React.ReactNode;
  grid?: {lines: GridLine[]; unit?: number; bubble?: number; opacity?: number};
  children: React.ReactNode;
}> = ({pose, studio, overlay, grid, children}) => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{fov: pose.fov, position: posePosition(pose), near: 0.05, far: 200}}
        gl={{antialias: true, preserveDrawingBuffer: true}}
        flat
      >
        <CameraRig pose={pose} />
        <Studio {...studio} />
        {grid ? <FloorGrid {...grid} /> : null}
        {children}
      </ThreeCanvas>
      {overlay ? (
        <AbsoluteFill>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            {overlay}
          </svg>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

type P2 = [number, number];
// 線分 a→b に垂直で、hint の向きに近いほうの単位ベクトル
export const normalToward = (a: P2, b: P2, hint: P2): P2 => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const n: P2 = [-dy / l, dx / l];
  return n[0] * hint[0] + n[1] * hint[1] >= 0 ? n : [-n[0], -n[1]];
};
