import {loadFont} from '@remotion/google-fonts/NotoSansJP';
import React from 'react';
import {C} from './theme';

const {fontFamily} = loadFont('normal', {weights: ['500', '700']});
export const FONT = `${fontFamily}, sans-serif`;

type P2 = [number, number];

const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]];
const mul = (a: P2, k: number): P2 => [a[0] * k, a[1] * k];
const len = (a: P2) => Math.hypot(a[0], a[1]);
const norm = (a: P2): P2 => mul(a, 1 / (len(a) || 1));

/**
 * 寸法線。a・b は投影済みの計測点、side は寸法線を出す側（画面上の向き）、gap は計測点からの距離（px）。
 * p で 中央から両端へ線が伸び、文字は線が伸び切る直前に出る。
 */
export const DimLine: React.FC<{
  a: P2;
  b: P2;
  side: P2;
  gap: number;
  label: string;
  p: number;
  size?: number;
}> = ({a, b, side, gap, label, p, size = 26}) => {
  if (p <= 0) return null;
  const n = norm(side);
  const A = add(a, mul(n, gap));
  const B = add(b, mul(n, gap));
  const mid = mul(add(A, B), 0.5);
  const t = Math.min(1, p * 1.25);
  const A2 = add(mid, mul(sub(A, mid), t));
  const B2 = add(mid, mul(sub(B, mid), t));
  const ext = Math.min(1, p * 2);
  const dir = norm(sub(B, A));
  let ang = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI;
  if (ang > 90) ang -= 180;
  if (ang < -90) ang += 180;
  const textPos = add(mid, mul(n, size * 0.85));
  const tick = 9;
  const tickV = mul(norm(add(dir, n)), tick);
  return (
    <g stroke={C.brand} strokeWidth={2.2} fill="none" strokeLinecap="round">
      {/* 補助線 */}
      <line x1={a[0] + n[0] * 8} y1={a[1] + n[1] * 8} x2={a[0] + n[0] * (8 + (gap + 12 - 8) * ext)} y2={a[1] + n[1] * (8 + (gap + 12 - 8) * ext)} strokeWidth={1.4} opacity={0.75} />
      <line x1={b[0] + n[0] * 8} y1={b[1] + n[1] * 8} x2={b[0] + n[0] * (8 + (gap + 12 - 8) * ext)} y2={b[1] + n[1] * (8 + (gap + 12 - 8) * ext)} strokeWidth={1.4} opacity={0.75} />
      {/* 寸法線 */}
      <line x1={A2[0]} y1={A2[1]} x2={B2[0]} y2={B2[1]} />
      {/* 端部（建築図面の斜線止め） */}
      {t >= 1 ? (
        <>
          <line x1={A[0] - tickV[0]} y1={A[1] - tickV[1]} x2={A[0] + tickV[0]} y2={A[1] + tickV[1]} strokeWidth={2.6} />
          <line x1={B[0] - tickV[0]} y1={B[1] - tickV[1]} x2={B[0] + tickV[0]} y2={B[1] + tickV[1]} strokeWidth={2.6} />
        </>
      ) : null}
      <text
        x={textPos[0]}
        y={textPos[1]}
        transform={`rotate(${ang} ${textPos[0]} ${textPos[1]})`}
        fill={C.brand}
        stroke="none"
        fontFamily={FONT}
        fontWeight={700}
        fontSize={size}
        textAnchor="middle"
        dominantBaseline="middle"
        opacity={Math.max(0, Math.min(1, (p - 0.55) * 3))}
        letterSpacing="0.02em"
      >
        {label}
      </text>
    </g>
  );
};

/**
 * 部材名の引き出し線。anchor（部材上の点）から labelX の列まで水平に引き、名前を置く。
 * 出た直後は濃く、少しずつ落ち着いたグレーへ戻る。
 */
export const Tag: React.FC<{
  anchor: P2;
  labelX: number;
  labelY?: number;
  label: string;
  appear: number; // 0→1
  settle: number; // 0→1（強調から通常へ）
  align?: 'left' | 'right';
  size?: number;
}> = ({anchor, labelX, labelY, label, appear, settle, align = 'left', size = 25}) => {
  if (appear <= 0) return null;
  const y = labelY ?? anchor[1];
  const elbowX = align === 'left' ? labelX + 14 : labelX - 14;
  const pts: P2[] = [anchor, [elbowX + (anchor[0] - elbowX) * 0.25, y], [elbowX, y]];
  const d = `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]} L${pts[2][0]},${pts[2][1]}`;
  const total = len(sub(pts[1], pts[0])) + len(sub(pts[2], pts[1]));
  const color = settle < 1 ? C.ink : C.gray;
  return (
    <g opacity={1 - settle * 0.35}>
      <circle cx={anchor[0]} cy={anchor[1]} r={5.5 * Math.min(1, appear * 3)} fill={C.ink} />
      <path d={d} fill="none" stroke={C.ink} strokeWidth={1.6} strokeDasharray={total} strokeDashoffset={total * (1 - Math.min(1, appear * 1.4))} />
      <text
        x={labelX}
        y={y}
        fill={color}
        fontFamily={FONT}
        fontWeight={700}
        fontSize={size}
        textAnchor={align === 'left' ? 'end' : 'start'}
        dominantBaseline="middle"
        opacity={Math.max(0, Math.min(1, (appear - 0.45) * 2.5))}
      >
        {label}
      </text>
    </g>
  );
};

/** 通芯の符号（丸の中の文字）。丸は 3D 側で床に描き、文字だけ画面に重ねる */
export const GridLabel: React.FC<{at: P2; label: string; size?: number; opacity?: number}> = ({at, label, size = 19, opacity = 1}) => (
  <text x={at[0]} y={at[1]} fill="#8E9298" fontFamily={FONT} fontWeight={500} fontSize={size} textAnchor="middle" dominantBaseline="central" opacity={opacity}>
    {label}
  </text>
);
