/**
 * LP 設定
 * - SURVEY_ENDPOINT : 訪問ログの送信先。gas/Code.gs を「ウェブアプリ」としてデプロイした URL（https://script.google.com/macros/s/.../exec）
 *                     ※ アンケートは Notion フォームへのリンクに変更済み。未設定なら訪問ログは送信しません。
 * - GA_MEASUREMENT_ID : Google Analytics 4 の測定ID（G-XXXXXXX）。未設定なら読み込みません。
 * - TRACK_VISITS : true の場合、訪問ログ（参照元・UTM・匿名ID）も SURVEY_ENDPOINT に送信します。
 */
window.LP_CONFIG = {
  SURVEY_ENDPOINT: "",
  GA_MEASUREMENT_ID: "",
  TRACK_VISITS: true,
};
