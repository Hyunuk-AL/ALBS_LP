import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {Film} from './Film';
import {Pose} from './lib/camera';
import {ease, settle} from './lib/motion';
import {FadeGroup, FloorGrid, GridLine} from './lib/three-kit';
import {FPS} from './lib/theme';
import * as Door from './models/Door';
import * as Win from './models/Window';
import * as Sh from './models/Shutter';
import * as Wall from './models/Wall';

/*
 * ヒーローのタイプ生成カード用ループ（正方形・文字なし）。
 * 0 秒は空 → 組み立て → ゆっくり回る → 消える → 6 秒で頭に戻る（継ぎ目なし）。
 */
export const CARD_SEC = 6;
const K = 0.55; // 組み立ての速さ（LP 本編の仕様リスト秒数に掛ける）

const POSE: Pose = {target: [0, 0.78, 0], az: -32, el: 22, dist: 15.5, fov: 12};

const GRID: GridLine[] = [
  {label: 'Y1', axis: 'x', at: 0, from: -1.5, to: 1.5},
  {label: 'X1', axis: 'z', at: -1.1, from: -0.9, to: 0.9},
  {label: 'X2', axis: 'z', at: 1.1, from: -0.9, to: 0.9},
];

const Loop: React.FC<{children: (lf: number) => React.ReactNode; scale?: number; y?: number}> = ({children, scale = 1, y = 0}) => {
  const f = useCurrentFrame();
  const grid = ease(f, 0, 0.5) * (1 - ease(f, CARD_SEC - 0.5, CARD_SEC - 0.05));
  const out = ease(f, CARD_SEC - 0.75, CARD_SEC - 0.15);
  const rot = -0.3 + 0.55 * ease(f, 0, CARD_SEC, Easing.linear);
  return (
    <Film pose={POSE}>
      <group rotation={[0, rot, 0]}>
        <FloorGrid lines={GRID} opacity={grid * 0.9} bubbles={false} />
        <FadeGroup o={1 - out}>
          <group position={[0, y + out * 0.2, 0]} scale={scale}>
            {children(f)}
          </group>
        </FadeGroup>
      </group>
    </Film>
  );
};

export const DoorCard: React.FC = () => (
  <Loop>
    {(f) => (
      <Door.DoorModel
        pr={{
          leaf: settle(f, 0.2 * K, 0.9),
          frame: settle(f, 0.8 * K, 0.9),
          sill: settle(f, 1.4 * K, 0.9),
          glass: settle(f, 2.0 * K, 0.8),
          louver: settle(f, 2.3 * K, 0.8),
          handle: settle(f, 2.6 * K, 0.8),
          open: ease(f, 2.9, 3.6) - ease(f, 4.0, 4.7),
        }}
      />
    )}
  </Loop>
);

export const WindowCard: React.FC = () => (
  <Loop y={0.35}>
    {(f) => (
      <Win.WindowModel
        pr={{
          frame: settle(f, 0.2 * K, 0.9),
          mullion: settle(f, 0.8 * K, 0.9),
          sashL: settle(f, 1.3 * K, 0.9),
          sashR: settle(f, 1.45 * K, 0.9),
          glass: settle(f, 2.0 * K, 0.8),
          sill: settle(f, 2.4 * K, 0.8),
        }}
      />
    )}
  </Loop>
);

export const ShutterCard: React.FC = () => (
  <Loop scale={0.6}>
    {(f) => {
      const down = ease(f, 1.3 * K, 1.3 * K + 1.4, Easing.bezier(0.25, 0.1, 0.25, 1));
      const lift = ease(f, 3.2, 4.0) - ease(f, 4.3, 5.0);
      return (
        <Sh.ShutterModel
          pr={{
            railL: settle(f, 0.2 * K, 0.9),
            railR: settle(f, 0.3 * K, 0.9),
            case: settle(f, 0.8 * K, 0.9),
            curtain: down * (1 - 0.5 * lift),
          }}
        />
      );
    }}
  </Loop>
);

export const WallCard: React.FC = () => (
  <Loop>
    {(f) => (
      <Wall.WallModel
        pr={{
          runner: settle(f, 0.15, 0.9),
          studs: ease(f, 0.4, 1.5),
          insulation: settle(f, 1.6, 0.9),
          inner: settle(f, 2.0, 0.9),
          outer: settle(f, 2.45, 0.9),
        }}
      />
    )}
  </Loop>
);

export const CARD_FRAMES = Math.round(FPS * CARD_SEC);
