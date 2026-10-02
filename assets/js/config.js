/**
 * LP 設定
 * - SURVEY_ENDPOINT : gas/Code.gs を「ウェブアプリ」としてデプロイした URL（https://script.google.com/macros/s/.../exec）
 *                     未設定の間はブラウザの localStorage に保存され、コンソールに内容が出力されます（動作確認用）。
 * - GA_MEASUREMENT_ID : Google Analytics 4 の測定ID（G-XXXXXXX）。未設定なら読み込みません。
 * - TRACK_VISITS : true の場合、訪問ログ（参照元・UTM・匿名ID）も SURVEY_ENDPOINT に送信します。
 */
window.LP_CONFIG = {
  SURVEY_ENDPOINT: "",
  GA_MEASUREMENT_ID: "",
  TRACK_VISITS: true,
};
