import {Easing, interpolate, spring} from 'remotion';
import {FPS} from './theme';

// 部材が定位置へ収まる動き。わずかにオーバーシュートして「カチッ」と止まる
export const settle = (frame: number, delaySec: number, durSec = 0.9) =>
  spring({
    frame: frame - delaySec * FPS,
    fps: FPS,
    durationInFrames: Math.round(durSec * FPS),
    config: {damping: 16, stiffness: 140, mass: 0.8},
  });

// オーバーシュートしない滑らかな 0→1
export const ease = (frame: number, fromSec: number, toSec: number, easing = Easing.bezier(0.45, 0, 0.2, 1)) =>
  interpolate(frame, [fromSec * FPS, toSec * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

// 0→1→0（開いて閉じる、上げて下ろす など）
export const pulse = (frame: number, fromSec: number, holdFromSec: number, holdToSec: number, toSec: number) =>
  ease(frame, fromSec, holdFromSec) - ease(frame, holdToSec, toSec);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
