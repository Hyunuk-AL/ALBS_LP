/* claude.ai Artifact 版：アンケート回答・訪問ログを artifact の db に保存し、
   編集権限のある人には回答の集計を表示する。 */
window.LP_ADAPTER = (function () {
  "use strict";

  var ctx = (async function () {
    if (!window.claude || typeof window.claude.use !== "function") return {};
    var res = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    var db = res[0], user = res[1];
    var id = user ? await user.id() : null;
    return { db: db, user: user, id: id };
  })().catch(function () { return {}; });

  function unavailable() {
    var e = new Error("unavailable");
    e.userMessage = "この画面では回答を保存できませんでした。claude.ai にサインインした状態で開き直してください。解決しない場合は、このページを共有した方にお知らせください。";
    return e;
  }

  async function send(p) {
    var c = await ctx;
    if (!c.db || !c.id) throw unavailable();
    try {
      if (p.type === "survey") {
        await c.db.doc("responses/" + c.id).set(Object.assign({}, p.answers, {
          position: p.position, submitted_at: p.sent_at, referrer: p.referrer || "",
        }));
      } else if (p.type === "visit") {
        var ref = c.db.doc("visits/" + c.id);
        var snap = await ref.get();
        var prev = snap.exists ? snap.data() : {};
        await ref.set({
          first_seen: prev.first_seen || p.sent_at,
          last_seen: p.sent_at,
          count: (prev.count || 0) + 1,
          referrer: prev.referrer || p.referrer || "",
        });
      }
    } catch (err) {
      if (p.type === "survey") throw unavailable();
    }
  }

  /* ---------- 回答済みなら上下のフォームをお礼表示に ---------- */
  ctx.then(async function (c) {
    if (!c.db || !c.id) return;
    try {
      var s = await c.db.doc("responses/" + c.id).get();
      if (s.exists && window.LP_showThanksAll) window.LP_showThanksAll();
    } catch (e) { /* 表示はそのまま */ }
  });

  /* ---------- 集計パネル（編集権限のある人のみ） ---------- */
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function tally(rows, key) {
    var m = {};
    rows.forEach(function (r) {
      var v = r[key];
      (Array.isArray(v) ? v : v ? [v] : []).forEach(function (x) { m[x] = (m[x] || 0) + 1; });
    });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  function bars(title, list, n) {
    if (!list.length) return '<div class="r-block"><h4>' + esc(title) + '</h4><p class="r-empty">まだ回答がありません</p></div>';
    var max = list[0][1];
    return '<div class="r-block"><h4>' + esc(title) + "</h4><ul class=\"r-bars\">" + list.map(function (e) {
      return '<li><span class="r-label">' + esc(e[0]) + '</span><span class="r-track"><span class="r-fill" style="width:' +
        (e[1] / max * 100).toFixed(1) + '%"></span></span><span class="r-num">' + e[1] + '<small>' +
        (n ? Math.round(e[1] / n * 100) : 0) + "%</small></span></li>";
    }).join("") + "</ul></div>";
  }

  ctx.then(async function (c) {
    if (!c.db || !c.user) return;
    var canSee = false;
    try { canSee = await c.user.canEdit(); } catch (e) { canSee = false; }
    if (!canSee) return;
    var panel = document.getElementById("results");
    if (!panel) return;
    panel.hidden = false;
    var out = panel.querySelector(".r-body");
    var responses = [], visits = [];

    function render() {
      var n = responses.length;
      var exp = responses.map(function (r) { return Number(r.expectation); }).filter(function (x) { return x > 0; });
      var avg = exp.length ? (exp.reduce(function (a, b) { return a + b; }, 0) / exp.length).toFixed(1) : "—";
      var uv = visits.length;
      var pv = visits.reduce(function (a, v) { return a + (Number(v.count) || 0); }, 0);
      var free = responses.map(function (r) { return [r.wish_free, r.wishes_other, r.pain_other].filter(Boolean).join(" ／ "); })
        .filter(Boolean);

      out.innerHTML =
        '<div class="r-kpis">' +
        '<div><span class="r-k">訪問者（ユニーク）</span><b>' + uv + '</b><small>延べ ' + pv + ' 回</small></div>' +
        '<div><span class="r-k">回答数</span><b>' + n + '</b><small>回答率 ' + (uv ? Math.round(n / uv * 100) : 0) + '%</small></div>' +
        '<div><span class="r-k">タイプ生成への期待度</span><b>' + avg + '</b><small>5点満点の平均</small></div>' +
        '<div><span class="r-k">利用意向「すぐに使ってみたい」</span><b>' + responses.filter(function (r) { return r.intent === "すぐに使ってみたい"; }).length + '</b><small>回答者のうち</small></div>' +
        "</div>" +
        '<div class="r-grid">' +
        bars("利用意向", tally(responses, "intent"), n) +
        bars("ほしい便利ツール", tally(responses, "wishes"), n) +
        bars("時間がかかっている作業", tally(responses, "pain"), n) +
        bars("まず使いたい建具", tally(responses, "targets"), n) +
        bars("お仕事", tally(responses, "role"), n) +
        bars("Revitの利用状況", tally(responses, "revit"), n) +
        "</div>" +
        '<div class="r-block"><h4>回答者一覧（新しい順）</h4>' +
        (n ? '<div class="r-table-wrap"><table class="r-table"><thead><tr><th>送信日時</th><th>会社名</th><th>お名前</th><th>メールアドレス</th><th>期待度</th></tr></thead><tbody>' +
          responses.slice().reverse().map(function (r) {
            var t = r.submitted_at ? new Date(r.submitted_at).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" }) : "";
            return "<tr><td>" + esc(t) + "</td><td>" + esc(r.company) + "</td><td>" + esc(r.name) + "</td><td class=\"sel\">" + esc(r.email) + "</td><td>" + esc(r.expectation) + "</td></tr>";
          }).join("") + "</tbody></table></div>" : '<p class="r-empty">まだ回答がありません</p>') + "</div>" +
        '<div class="r-block"><h4>自由記述（新しい順）</h4>' +
        (free.length ? '<ul class="r-free">' + free.slice().reverse().map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>"
          : '<p class="r-empty">まだ記入がありません</p>') + "</div>";
    }
    render();

    c.db.collection("responses").onSnapshot(function (snap) {
      responses = snap.docs.map(function (d) { return d.data() || {}; })
        .sort(function (a, b) { return String(a.submitted_at).localeCompare(String(b.submitted_at)); });
      render();
    }, function () {});
    c.db.collection("visits").onSnapshot(function (snap) {
      visits = snap.docs.map(function (d) { return d.data() || {}; });
      render();
    }, function () {});
  });

  return { send: send };
})();
