import {Config} from '@remotion/cli/config';

// three.js（WebGL）を GPU で描くため ANGLE を使う
Config.setChromiumOpenGlRenderer('angle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
