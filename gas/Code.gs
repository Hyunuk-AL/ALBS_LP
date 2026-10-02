/**
 * Arch-LINC BIM Standard LP — アンケート / 訪問ログ受信用 Google Apps Script
 *
 * 使い方
 * 1. 新しい Google スプレッドシートを作成 → 拡張機能 → Apps Script を開く
 * 2. このファイルの内容を貼り付けて保存
 * 3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *      次のユーザーとして実行：自分 ／ アクセスできるユーザー：全員
 * 4. 発行された URL（.../exec）を assets/js/config.js の SURVEY_ENDPOINT に設定
 *
 * シート「survey」に回答、「visits」に訪問ログが1行ずつ追記されます。
 */
var SURVEY_COLUMNS = [
  'sent_at', 'position', 'role', 'revit', 'expectation', 'intent',
  'targets', 'pain', 'pain_other', 'wishes', 'wishes_other', 'wish_free',
  'company', 'email',
  'visitor_id', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'user_agent'
];
var VISIT_COLUMNS = [
  'sent_at', 'visitor_id', 'page', 'referrer',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'user_agent'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var utm = data.utm || {};
    var flat = Object.assign({}, data, data.answers || {}, utm);

    if (data.type === 'survey') {
      appendRow_('survey', SURVEY_COLUMNS, flat);
    } else if (data.type === 'visit') {
      appendRow_('visits', VISIT_COLUMNS, flat);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function appendRow_(sheetName, columns, obj) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(columns);
    sheet.setFrozenRows(1);
  }
  var row = columns.map(function (c) {
    var v = obj[c];
    if (Array.isArray(v)) return v.join(' / ');
    if (v === undefined || v === null) return '';
    // 数式インジェクション対策
    v = String(v);
    return /^[=+\-@]/.test(v) ? "'" + v : v;
  });
  sheet.appendRow(row);
}
