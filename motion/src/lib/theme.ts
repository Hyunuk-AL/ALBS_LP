// LP（ALBS_LP_renewal/assets/css/style.css の :root）と同じパレット
export const C = {
  brand: '#E60012',
  ink: '#1C1C1C',
  ink2: '#3C3C3C',
  gray: '#707070',
  grayLight: '#C8C8C8',
  line: '#E8E8E8',
  surface: '#F4F5F7',
  glass: '#AFB4F1',
  glassEdge: '#757CDD',
  // 映像の背景は白。LP 側で mix-blend-mode: multiply をかけ、タイルの色に溶け込ませる
  bg: '#FFFFFF',
} as const;

export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);
