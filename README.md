# Arch-LINC BIM Standard｜タイプ生成 LP

2027年1月末の正式リリースに向けた、リリース予告とニーズ把握アンケート用のランディングページです（ビルド不要の静的サイト）。

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

## アンケートの受信設定（Google スプレッドシート）
1. Google スプレッドシートを新規作成 → 拡張機能 → Apps Script
2. `gas/Code.gs` を貼り付けて保存
3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」／実行ユーザー「自分」／アクセス「全員」
4. 発行された `https://script.google.com/macros/s/.../exec` を `assets/js/config.js` の `SURVEY_ENDPOINT` に設定

- `survey` シート：アンケート回答（どちらのフォームから送られたか `position` = top / bottom 付き）
- `visits` シート：訪問ログ（匿名ID・参照元・UTM）。不要なら `TRACK_VISITS: false`
- `SURVEY_ENDPOINT` が空の間は、回答はブラウザの localStorage に保存されコンソールに出力されます（動作確認用）

## 訪問者分析（任意）
`config.js` の `GA_MEASUREMENT_ID` に GA4 の測定ID を設定すると、ページビューに加えて次のイベントを送信します。
`survey_start` / `survey_submit` / `view_animation` / `replay_animation`

## 公開前の確認事項
- メインカラー：設計書の「#60012」は5桁表記のため、仮で `#A8001F` を使用中（`style.css` の `--brand`）
- リリース時期・プラン表記・各建具の仕様例（Notion設計書の値を使用）
- お問い合わせ先 `support@arch-log.com`
