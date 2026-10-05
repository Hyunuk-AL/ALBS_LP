# Arch-LINC BIM Standard｜タイプ生成 LP

2027年1月末の正式リリースに向けたリリース予告ページです（ビルド不要の静的サイト）。
アンケートは Notion フォーム（https://keen-airboat-177.notion.site/8fdcff9bd17440d4af2c0ebf24754964?pvs=105）へのリンクで受け付けます（`data-survey-link` の付いたボタン）。

## 構成
```
index.html            LP本体（ヒーロー → アンケート → 課題 → 解決 → ドア/窓/シャッター → 使い方 → 価値 → リリース → アンケート）
assets/css/style.css  スタイル（色はファイル先頭の :root で一括管理）
assets/js/config.js   送信先URL・GA4 の設定
assets/js/main.js     組み立てアニメーション制御・アンケート生成・送信・訪問ログ
gas/Code.gs           回答をスプレッドシートに保存する Google Apps Script
```

## ローカル確認
```
python3 -m http.server 8000
# → http://localhost:8000
```

## 訪問ログ（任意）
`gas/Code.gs` を Apps Script のウェブアプリとしてデプロイし、その URL を `assets/js/config.js` の `SURVEY_ENDPOINT` に設定すると、`visits` シートに訪問ログ（匿名ID・参照元・UTM）が記録されます。

## 訪問者分析（任意）
`config.js` の `GA_MEASUREMENT_ID` に GA4 の測定ID を設定すると、ページビューに加えて次のイベントを送信します。
`survey_click`（アンケートボタンのクリック） / `view_animation`

## 公開前の確認事項
- メインカラー：`#E60012`（`style.css` の `--brand`）
- リリース時期・プラン表記・各建具の仕様例（Notion設計書の値を使用）
- お問い合わせ先 `support@arch-log.com`

## claude.ai Artifact 版
`python3 artifact/build.py <出力.html>` で、LP を Artifact 用の単一 HTML にまとめます（画像は data URI で埋め込み）。
