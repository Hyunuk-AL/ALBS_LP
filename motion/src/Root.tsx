import React from 'react';
import {Composition} from 'remotion';
import {DoorFilm, FILM_SEC, HERO_SEG, HeroFilm, ShutterFilm, WindowFilm} from './films';
import {FPS} from './lib/theme';
import {CARD_FRAMES, DoorCard, ShutterCard, WallCard, WindowCard} from './cards';

export const Root: React.FC = () => (
  <>
    <Composition id="Door" component={DoorFilm} width={1440} height={1080} fps={FPS} durationInFrames={FPS * FILM_SEC} />
    <Composition id="Window" component={WindowFilm} width={1440} height={1080} fps={FPS} durationInFrames={FPS * FILM_SEC} />
    <Composition id="Shutter" component={ShutterFilm} width={1440} height={1080} fps={FPS} durationInFrames={FPS * FILM_SEC} />
    {/* スマホ用：正方形で文字・線を大きく */}
    <Composition id="DoorSP" component={DoorFilm} width={1080} height={1080} fps={FPS} durationInFrames={FPS * FILM_SEC} defaultProps={{ui: 1.9, zoom: 1.2}} />
    <Composition id="WindowSP" component={WindowFilm} width={1080} height={1080} fps={FPS} durationInFrames={FPS * FILM_SEC} defaultProps={{ui: 1.9, zoom: 1.6, shift: -0.32}} />
    <Composition id="ShutterSP" component={ShutterFilm} width={1080} height={1080} fps={FPS} durationInFrames={FPS * FILM_SEC} defaultProps={{ui: 1.9, zoom: 1.36}} />
    <Composition id="Hero" component={HeroFilm} width={800} height={1000} fps={FPS} durationInFrames={Math.round(FPS * HERO_SEG * 3)} />
    {/* ヒーローのタイプ生成カード（正方形ループ） */}
    <Composition id="CardDoor" component={DoorCard} width={640} height={640} fps={FPS} durationInFrames={CARD_FRAMES} />
    <Composition id="CardWindow" component={WindowCard} width={640} height={640} fps={FPS} durationInFrames={CARD_FRAMES} />
    <Composition id="CardShutter" component={ShutterCard} width={640} height={640} fps={FPS} durationInFrames={CARD_FRAMES} />
    <Composition id="CardWall" component={WallCard} width={640} height={640} fps={FPS} durationInFrames={CARD_FRAMES} />
  </>
);
