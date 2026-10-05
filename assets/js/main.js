(function () {
  "use strict";

  var CONFIG = window.LP_CONFIG || {};
  var STORAGE_VID = "albs_lp_vid";
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

  /* ---------------- survey link ---------------- */
  document.querySelectorAll("[data-survey-link]").forEach(function (a) {
    a.addEventListener("click", function () { track("survey_click", { label: a.textContent.trim() }); });
  });
})();
