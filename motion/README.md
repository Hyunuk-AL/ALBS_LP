# motion — LP の 3D モーショングラフィックス

Remotion（React で動画を作るフレームワーク）＋ three.js（@remotion/three）で、ドア・窓・シャッターが組み上がる 3D 動画を作る。

## 使い方
```
npm install
npm run studio     # ブラウザでプレビュー・調整
npm run render     # 10 本の動画とポスター画像を ../assets/video/ へ書き出す
node render.mjs Door Window   # 一部だけ書き出す
```

## 構成
```
src/Root.tsx            コンポジション（Door/Window/Shutter 1440×1080、*SP 1080×1080、Card* 640×640 ループ）
src/cards.tsx           ヒーローのタイプ生成カード（ドア・窓・シャッター・壁、5 秒）
src/films.tsx           タイムライン・カメラワーク・寸法線/部材名（LP の仕様リスト --d と同じ秒数）
src/models/*.tsx        3D モデル（実寸 m 単位：ドア W900 H2100 / 窓 W1800 H1200 / シャッター W3000 H2500 / LGS 壁）
src/lib/three-kit.tsx   マテリアル・輪郭線・照明・床の通芯・組み立て（Assemble）
src/lib/overlay.tsx     3D の点を画面へ投影して描く寸法線（赤）と引き出し線
src/lib/theme.ts        LP と同じパレット
```

## 決めごと
- 見た目は Revit の 3D ビュー（シェーディング）：マットな面＋黒い輪郭線（LineSegments2）、影なし、画角 12° のほぼ平行投影で斜め上から
- 床に通芯（Y1・X1・X2）を一点鎖線で薄く引き、符号の丸を付ける（`FloorGrid`）
- 背景は白。LP 側で `mix-blend-mode: multiply` をかけ、タイルの色（#F4F5F7 / #FFF）に継ぎ目なく溶かす
- 赤（#E60012）は寸法線だけ。部材名はインク→グレー
- 部材の登場時刻は LP の `.spec-list li` の `--d` と一致させる（変えるときは両方）
- 動画はどれも 5 秒で、最後はフェードアウトせず完成形で止める（ポスター画像も最終フレーム）
- ヒーローのカード動画は、アニメーション効果オンの人にはループ（main.js が 4 枚の再生位置を 1.1 秒ずつずらす）、オフの人には 1 回だけ再生

## ライセンス
Remotion は、従業員 4 人以上の営利企業が使う場合 Company License（有料）が必要。評価目的の利用は無料。
公開・商用利用の前に https://www.remotion.dev/license を確認し、購入を判断すること。
フォント：Noto Sans JP（SIL OFL）。
