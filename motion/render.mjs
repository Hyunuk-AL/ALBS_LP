// 動画とポスター画像を LP（../assets/video/）へ書き出す
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('..', 'assets', 'video');
mkdirSync(OUT, {recursive: true});

const JOBS = [
  {id: 'Door', file: 'door', poster: 149},
  {id: 'Window', file: 'window', poster: 149},
  {id: 'Shutter', file: 'shutter', poster: 149},
  {id: 'DoorSP', file: 'door-sp', poster: 149},
  {id: 'WindowSP', file: 'window-sp', poster: 149},
  {id: 'ShutterSP', file: 'shutter-sp', poster: 149},
  {id: 'CardDoor', file: 'card-door', poster: 149},
  {id: 'CardWindow', file: 'card-window', poster: 149},
  {id: 'CardShutter', file: 'card-shutter', poster: 149},
  {id: 'CardWall', file: 'card-wall', poster: 149},
];
const only = process.argv.slice(2);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = (args) => execFileSync(npx, ['remotion', ...args, '--gl=angle', '--log=error'], {stdio: 'inherit', shell: true});

for (const j of JOBS.filter((j) => !only.length || only.includes(j.id))) {
  run(['render', 'src/index.ts', j.id, path.join(OUT, `${j.file}.mp4`), '--codec=h264', '--crf=25', '--x264-preset=slow', '--pixel-format=yuv420p', '--concurrency=4']);
  run(['still', 'src/index.ts', j.id, path.join(OUT, `${j.file}.jpg`), `--frame=${j.poster}`, '--image-format=jpeg', '--jpeg-quality=88']);
  console.log(`done: ${j.file}`);
}
