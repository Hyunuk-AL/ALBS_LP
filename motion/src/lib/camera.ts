import {PerspectiveCamera, Vector3} from 'three';

export type V3 = [number, number, number];

export type Pose = {
  target: V3;
  az: number; // 方位角（度）。0 で正面、マイナスで左から見る
  el: number; // 仰角（度）
  dist: number;
  fov: number;
};

export const posePosition = (p: Pose): V3 => {
  const az = (p.az * Math.PI) / 180;
  const el = (p.el * Math.PI) / 180;
  return [
    p.target[0] + p.dist * Math.cos(el) * Math.sin(az),
    p.target[1] + p.dist * Math.sin(el),
    p.target[2] + p.dist * Math.cos(el) * Math.cos(az),
  ];
};

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  target: [0, 1, 2].map((i) => a.target[i] + (b.target[i] - a.target[i]) * t) as V3,
  az: a.az + (b.az - a.az) * t,
  el: a.el + (b.el - a.el) * t,
  dist: a.dist + (b.dist - a.dist) * t,
  fov: a.fov + (b.fov - a.fov) * t,
});

// 3D の点を画面座標（px）へ。SVG の寸法線・引き出し線を 3D モデルに貼り付けるために使う
export const makeProjector = (pose: Pose, width: number, height: number) => {
  const cam = new PerspectiveCamera(pose.fov, width / height, 0.05, 200);
  cam.position.set(...posePosition(pose));
  cam.up.set(0, 1, 0);
  cam.lookAt(new Vector3(...pose.target));
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return (p: V3): [number, number] => {
    const v = new Vector3(...p).project(cam);
    return [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height];
  };
};
