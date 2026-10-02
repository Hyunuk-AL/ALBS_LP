(function () {
  "use strict";

  var CONFIG = window.LP_CONFIG || {};
  var STORAGE_VID = "albs_lp_vid";
  var STORAGE_DONE = "albs_lp_survey_done";
  var STORAGE_QUEUE = "albs_lp_survey_local";

  /* ---------------- storage helpers (private mode safe) ---------------- */
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------------- visitor context ---------------- */
  function visitorId() {
    var id = lsGet(STORAGE_VID);
    if (!id) {
      id = "v_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      lsSet(STORAGE_VID, id);
    }
    return id;
  }

  function utm() {
    var out = {};
    var params = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
      if (params.get(k)) out[k] = params.get(k);
    });
    return out;
  }

  var context = {
    visitor_id: visitorId(),
    referrer: document.referrer || "",
    page: window.location.pathname,
    user_agent: navigator.userAgent,
    utm: utm(),
  };

  /* ---------------- sending ---------------- */
  var ADAPTER = window.LP_ADAPTER || null; // 埋め込み先ごとの送信処理（artifact 版など）

  function send(payload) {
    if (ADAPTER) return ADAPTER.send(Object.assign({ sent_at: new Date().toISOString() }, context, payload));
    var body = JSON.stringify(Object.assign({ sent_at: new Date().toISOString() }, context, payload));
    if (!CONFIG.SURVEY_ENDPOINT) {
      // 送信先未設定：動作確認用にローカル保存
      var q = [];
      try { q = JSON.parse(lsGet(STORAGE_QUEUE) || "[]"); } catch (e) { q = []; }
      q.push(JSON.parse(body));
      lsSet(STORAGE_QUEUE, JSON.stringify(q));
      console.warn("[LP] SURVEY_ENDPOINT が未設定のため、ローカルに保存しました:", JSON.parse(body));
      return Promise.resolve();
    }
    // text/plain + no-cors で Google Apps Script へ（プリフライト回避）
    return fetch(CONFIG.SURVEY_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: body,
      keepalive: true,
    });
  }

  function track(eventName, params) {
    if (typeof window.gtag === "function") window.gtag("event", eventName, params || {});
  }

  /* ---------------- GA4 ---------------- */
  if (CONFIG.GA_MEASUREMENT_ID) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CONFIG.GA_MEASUREMENT_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CONFIG.GA_MEASUREMENT_ID);
  }

  /* ---------------- visit log ---------------- */
  if (CONFIG.TRACK_VISITS && (CONFIG.SURVEY_ENDPOINT || ADAPTER)) {
    send({ type: "visit" }).catch(function () {});
  }

  /* ---------------- hero cycle ---------------- */
  var HERO = [
    { key: "door", kind: "ドア", form: "片開き戸", size: "W900 H2100", type: "WD_01（900×2100_01）" },
    { key: "window", kind: "窓", form: "連窓 2", size: "W1800 H1200", type: "AW-1" },
    { key: "shutter", kind: "シャッター", form: "軽量・天井付", size: "W3000 H2500", type: "軽量_W3000×H2500" },
  ];
  var heroIdx = 0;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function heroShow(i) {
    var d = HERO[i];
    var fields = document.querySelectorAll("[data-hero]");
    fields.forEach(function (el) { el.classList.add("is-fading"); });
    setTimeout(function () {
      fields.forEach(function (el) {
        el.textContent = d[el.getAttribute("data-hero")];
        el.classList.remove("is-fading");
      });
    }, 250);
    document.querySelectorAll("[data-hero-icon]").forEach(function (el) {
      el.classList.toggle("is-show", el.getAttribute("data-hero-icon") === d.key);
    });
  }
  if (!reduceMotion) {
    setInterval(function () { heroIdx = (heroIdx + 1) % HERO.length; heroShow(heroIdx); }, 3200);
  }

  /* ---------------- assembly animations ---------------- */
  function playAnim(name) {
    var targets = [
      document.getElementById("anim-" + name),
      document.querySelector('[data-anim-target="' + name + '"]'),
    ];
    var copy = targets[1] && targets[1].closest(".product-copy");
    if (copy) targets.push(copy);
    targets.forEach(function (el) {
      if (!el) return;
      el.classList.remove("is-play");
      void el.getBoundingClientRect(); // reflow して再生し直す
      el.classList.add("is-play");
    });
  }

  function resetAnim(name) {
    var svg = document.getElementById("anim-" + name);
    var list = document.querySelector('[data-anim-target="' + name + '"]');
    [svg, list, list && list.closest(".product-copy")].forEach(function (el) { if (el) el.classList.remove("is-play"); });
  }

  ["door", "window", "shutter"].forEach(function (name) {
    var svg = document.getElementById("anim-" + name);
    if (!svg) return;
    if (!("IntersectionObserver" in window)) { playAnim(name); return; }
    // 画面に入るたびに再生し、画面外に出たら初期状態へ戻す
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio >= 0.35) {
          if (!svg.classList.contains("is-play")) {
            playAnim(name);
            track("view_animation", { item: name });
          }
        } else if (!e.isIntersecting && !reduceMotion) {
          resetAnim(name); // 完全に画面外へ出たときだけ戻す
        }
      });
    }, { threshold: [0, 0.35] });
    io.observe(svg);
  });

  /* ---------------- door variants gallery ---------------- */
  var vRows = document.querySelectorAll(".v-row");
  function playRow(row) {
    row.classList.remove("is-play");
    void row.getBoundingClientRect();
    row.classList.add("is-play");
  }
  if (vRows.length && !reduceMotion) {
    if ("IntersectionObserver" in window) {
      // 画面に入る少し手前で開始し、画面外に出たらリセット（入るたびに再生）
      var vo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) playRow(e.target);
          else e.target.classList.remove("is-play");
        });
      }, { rootMargin: "0px 0px 10% 0px", threshold: 0 });
      vRows.forEach(function (r) { vo.observe(r); });
    }
  }

  /* ---------------- survey ---------------- */
  var QUESTIONS = [
    {
      name: "role", type: "radio", required: true, cols: 2,
      label: "あなたのお仕事に近いものは？",
      options: ["設計担当", "BIM推進・BIMマネージャー", "管理者・経営者", "施工・現場管理", "メーカー・販売", "学生・その他"],
    },
    {
      name: "revit", type: "radio", required: true, cols: 2,
      label: "Revitの利用状況は？",
      options: ["これから導入を検討している", "導入して1年未満", "1〜3年使っている", "3年以上使っている", "Revitは使っていない"],
    },
    {
      name: "expectation", type: "scale", required: true,
      label: "「選ぶだけでドア・窓・シャッターのタイプができる」機能に、どのくらい期待しますか？",
      min: 1, max: 5, minLabel: "あまり期待しない", maxLabel: "とても期待する",
    },
    {
      name: "intent", type: "radio", required: true, cols: 2,
      label: "リリースされたら、使ってみたいですか？",
      options: ["すぐに使ってみたい", "無料で試せるなら使いたい", "内容を見てから考えたい", "今のところ必要ない"],
    },
    {
      name: "targets", type: "checkbox", cols: 2,
      label: "まず使ってみたい建具は？",
      help: "複数選んでいただけます。",
      options: ["ドア", "窓", "シャッター", "その他（間仕切り・点検口など）"],
    },
    {
      name: "pain", type: "checkbox", cols: 2,
      label: "Revit作業で、特に時間がかかっていることは？",
      help: "複数選んでいただけます。",
      options: [
        "ファミリ・タイプを作る／直す",
        "タイプ名やパラメータの整理",
        "建具表・集計表づくり",
        "図面の見た目の調整",
        "社内ルールづくり・教え方",
        "設計変更への対応",
      ],
      other: true,
    },
    {
      name: "wishes", type: "checkbox", cols: 2,
      label: "Revitに後から追加できる「便利ツール」があるとしたら、ほしいものは？",
      help: "Revitに組み込んで使う「お助け機能」のイメージです。複数選んでいただけます。",
      options: [
        "建具表を自動で作る",
        "部屋の面積表・仕上表を自動で作る",
        "図面枠（シート）やビューをまとめて作る",
        "寸法や符号（タグ）を自動で付ける",
        "壁・床・天井のタイプを選ぶだけで作る",
        "建材メーカーのデータを探してそのまま取り込む",
        "入力ミスやルール違反を自動でチェックする",
        "PDF・DWGをまとめて書き出す",
        "タイプ名・ファイル名を一括で変更する",
      ],
      other: true,
    },
    {
      name: "wish_free", type: "textarea",
      label: "「Revitでこれが自動でできたら助かる」と思うことがあれば教えてください",
      placeholder: "例：部屋ごとの建具を一覧にしたい／毎回同じ設定をしているのを省きたい など",
    },
  ];

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === true) e.setAttribute(k, "");
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function badge(q) { return q.required ? '<span class="req">必須</span>' : '<span class="opt">任意</span>'; }

  function buildForm(position) {
    var p = "s" + position + "-";
    var form = el("form", { class: "survey-form", novalidate: true, "data-position": position });

    QUESTIONS.forEach(function (q, i) {
      var no = '<span class="q-no">' + (i + 1) + "</span>";
      if (q.type === "textarea") {
        var wrap = el("div", { class: "q field" });
        wrap.appendChild(el("label", { class: "q-label", for: p + q.name }, no + esc(q.label) + badge(q)));
        wrap.appendChild(el("textarea", { id: p + q.name, name: q.name, placeholder: q.placeholder || "", maxlength: "2000" }));
        form.appendChild(wrap);
        return;
      }

      var fs = el("fieldset", { class: "q", "data-name": q.name, "data-required": q.required ? "1" : "0" });
      fs.appendChild(el("legend", null, no + esc(q.label) + badge(q)));
      if (q.help) fs.appendChild(el("p", { class: "q-help" }, esc(q.help)));

      if (q.type === "scale") {
        var sc = el("div", { class: "scale" });
        for (var v = q.min; v <= q.max; v++) {
          var c = el("div", { class: "choice" });
          c.appendChild(el("input", { type: "radio", id: p + q.name + v, name: q.name, value: String(v) }));
          c.appendChild(el("label", { for: p + q.name + v, "aria-label": v + "点" }, String(v)));
          sc.appendChild(c);
        }
        fs.appendChild(sc);
        fs.appendChild(el("div", { class: "scale-legend" }, "<span>1：" + esc(q.minLabel) + "</span><span>5：" + esc(q.maxLabel) + "</span>"));
      } else {
        var box = el("div", { class: "choices" + (q.cols === 2 ? " cols-2" : "") });
        var opts = q.options.slice();
        if (q.other) opts.push("その他");
        opts.forEach(function (opt, j) {
          var id = p + q.name + "-" + j;
          var c = el("div", { class: "choice" });
          var input = el("input", { type: q.type, id: id, name: q.name, value: opt });
          if (opt === "その他" && q.other) input.setAttribute("data-other", "1");
          c.appendChild(input);
          c.appendChild(el("label", { for: id }, esc(opt)));
          box.appendChild(c);
        });
        fs.appendChild(box);
        if (q.other) {
          var oi = el("div", { class: "field other-input" });
          oi.appendChild(el("input", { type: "text", name: q.name + "_other", placeholder: "具体的にご記入ください", "aria-label": q.label + "（その他の内容）", maxlength: "300" }));
          fs.appendChild(oi);
        }
      }
      fs.appendChild(el("p", { class: "q-error", role: "alert" }, "選択してください"));
      form.appendChild(fs);
    });

    // 連絡先（任意）
    var contact = el("div", { class: "q" });
    contact.appendChild(el("p", { class: "q-label", style: "font-weight:700;color:var(--navy);margin-bottom:6px" },
      '<span class="q-no">' + (QUESTIONS.length + 1) + "</span>リリース情報の受け取り" + '<span class="opt">任意</span>'));
    contact.appendChild(el("p", { class: "q-help", style: "margin:0 0 12px" }, "ご記入いただいた方へ、リリース情報と先行体験のご案内をお送りします。"));
    var grid = el("div", { class: "contact-grid" });
    var f1 = el("div", { class: "field" });
    f1.appendChild(el("label", { class: "q-label", for: p + "company" }, "会社名"));
    f1.appendChild(el("input", { type: "text", id: p + "company", name: "company", autocomplete: "organization", maxlength: "200" }));
    var f2 = el("div", { class: "field" });
    f2.appendChild(el("label", { class: "q-label", for: p + "email" }, "メールアドレス"));
    f2.appendChild(el("input", { type: "email", id: p + "email", name: "email", autocomplete: "email", inputmode: "email", maxlength: "200", placeholder: "name@example.com" }));
    grid.appendChild(f1); grid.appendChild(f2);
    contact.appendChild(grid);
    contact.appendChild(el("p", { class: "q-error", role: "alert", "data-email-error": "1" }, "メールアドレスの形式をご確認ください"));
    form.appendChild(contact);

    // honeypot
    var hp = el("div", { class: "hp", "aria-hidden": "true" });
    hp.appendChild(el("label", { for: p + "website" }, "website"));
    hp.appendChild(el("input", { type: "text", id: p + "website", name: "website", tabindex: "-1", autocomplete: "off" }));
    form.appendChild(hp);

    var submit = el("div", { class: "submit-area" });
    submit.appendChild(el("button", { type: "submit", class: "btn btn-primary" }, "この内容で送信する"));
    submit.appendChild(el("p", { class: "form-status", role: "status", "aria-live": "polite" }));
    submit.appendChild(el("p", { class: "privacy" }, "ご回答内容は、サービス開発とリリースのご案内にのみ利用します。<br>メールアドレスはご記入いただいた場合のみ、リリース情報のお知らせに使用します。"));
    form.appendChild(submit);

    // その他欄の開閉
    form.addEventListener("change", function (e) {
      var t = e.target;
      if (t.name && t.type === "checkbox" && t.getAttribute("data-other")) {
        var oi = t.closest("fieldset").querySelector(".other-input");
        if (oi) {
          oi.classList.toggle("is-open", t.checked);
          if (t.checked) oi.querySelector("input").focus();
        }
      }
      var fsx = t.closest && t.closest("fieldset.q");
      if (fsx) fsx.classList.remove("has-error");
    });

    form.addEventListener("submit", function (e) { e.preventDefault(); onSubmit(form); });

    var started = false;
    form.addEventListener("focusin", function () {
      if (!started) { started = true; track("survey_start", { position: position }); }
    });

    return form;
  }

  function collect(form) {
    var data = {};
    QUESTIONS.forEach(function (q) {
      if (q.type === "checkbox") {
        data[q.name] = Array.prototype.map.call(form.querySelectorAll('input[name="' + q.name + '"]:checked'), function (i) { return i.value; });
      } else if (q.type === "textarea") {
        data[q.name] = form.elements[q.name].value.trim();
      } else {
        var c = form.querySelector('input[name="' + q.name + '"]:checked');
        data[q.name] = c ? c.value : "";
      }
      if (q.other) {
        var o = form.elements[q.name + "_other"];
        data[q.name + "_other"] = o && data[q.name].indexOf("その他") >= 0 ? o.value.trim() : "";
      }
    });
    data.company = form.elements.company.value.trim();
    data.email = form.elements.email.value.trim();
    return data;
  }

  function validate(form, data) {
    var firstBad = null;
    form.querySelectorAll('fieldset.q[data-required="1"]').forEach(function (fs) {
      var name = fs.getAttribute("data-name");
      var ok = Array.isArray(data[name]) ? data[name].length > 0 : !!data[name];
      fs.classList.toggle("has-error", !ok);
      if (!ok && !firstBad) firstBad = fs;
    });
    var emailBox = form.querySelector("[data-email-error]").parentNode;
    var emailOk = !data.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
    emailBox.classList.toggle("has-error", !emailOk);
    if (!emailOk && !firstBad) firstBad = emailBox;
    if (firstBad) {
      firstBad.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      var inp = firstBad.querySelector("input");
      if (inp) setTimeout(function () { inp.focus({ preventScroll: true }); }, 300);
    }
    return !firstBad;
  }

  function onSubmit(form) {
    var status = form.querySelector(".form-status");
    var btn = form.querySelector('button[type="submit"]');
    status.classList.remove("is-error");
    status.textContent = "";

    if (form.elements.website.value) return; // bot
    var data = collect(form);
    if (!validate(form, data)) {
      status.classList.add("is-error");
      status.textContent = "未回答の必須項目があります。";
      return;
    }

    btn.disabled = true;
    btn.textContent = "送信中…";

    send({ type: "survey", position: form.getAttribute("data-position"), answers: data })
      .then(function () {
        lsSet(STORAGE_DONE, "1");
        track("survey_submit", { position: form.getAttribute("data-position"), expectation: data.expectation, intent: data.intent });
        document.querySelectorAll(".survey-mount").forEach(function (m) { showThanks(m, !!data.email); });
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = "この内容で送信する";
        status.classList.add("is-error");
        status.textContent = (err && err.userMessage) || "送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。";
      });
  }

  function showThanks(mount, withEmail) {
    mount.innerHTML = "";
    var box = el("div", { class: "survey-form thanks", tabindex: "-1" });
    box.innerHTML =
      '<div class="thanks-icon" aria-hidden="true">✓</div>' +
      "<h3>ご回答ありがとうございました</h3>" +
      "<p>いただいた声は、2027年1月末の正式リリースに向けた開発に活かします。" +
      (withEmail ? "<br>リリース情報はご記入のメールアドレスへお届けします。" : "") +
      "</p>";
    mount.appendChild(box);
  }

  window.LP_showThanksAll = function () {
    document.querySelectorAll(".survey-mount").forEach(function (m) { showThanks(m, false); });
  };

  var alreadyDone = lsGet(STORAGE_DONE) === "1";
  document.querySelectorAll(".survey-mount").forEach(function (mount) {
    if (alreadyDone) { showThanks(mount, false); return; }
    mount.appendChild(buildForm(mount.getAttribute("data-position")));
  });

  /* ---------------- floating CTA ---------------- */
  var floatCta = document.querySelector(".float-cta");
  var surveys = document.querySelectorAll(".survey-section");
  if (floatCta && "IntersectionObserver" in window) {
    var visible = new Set();
    var pastHero = false;
    var update = function () { floatCta.classList.toggle("is-show", pastHero && visible.size === 0 && lsGet(STORAGE_DONE) !== "1"); };
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      update();
    }, { threshold: 0.05 });
    surveys.forEach(function (s) { so.observe(s); });
    window.addEventListener("scroll", function () {
      var np = window.scrollY > window.innerHeight * 0.9;
      if (np !== pastHero) { pastHero = np; update(); }
    }, { passive: true });
  }
})();
