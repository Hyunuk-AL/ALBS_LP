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

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- ヒーロー：タイプ生成カードの 3D ループ ---------------- */
  var cardVideos = [].slice.call(document.querySelectorAll(".tb-video"));
  // OS の「アニメーション効果」がオフの人：ループせず、画面に入るたびに頭から 1 回だけ再生
  if (cardVideos.length && reduceMotion) {
    var cardTimers = [];
    var stopCards = function () {
      cardTimers.forEach(clearTimeout); cardTimers = [];
      cardVideos.forEach(function (v) { v.pause(); try { v.currentTime = 0; } catch (e) { /* ignore */ } });
    };
    var playCardsOnce = function () {
      stopCards();
      cardVideos.forEach(function (v, i) {
        v.loop = false;
        // 4 枚が同時に組み上がらないよう、開始を少しずつずらす
        cardTimers.push(setTimeout(function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); }, i * 400));
      });
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) playCardsOnce(); else stopCards();
      }, { threshold: 0.15 }).observe(document.querySelector(".tool-board"));
    } else {
      playCardsOnce();
    }
  } else if (cardVideos.length) {
    var cardsStarted = false;
    var playCards = function () {
      cardVideos.forEach(function (v, i) {
        // 4 枚が同時に組み上がらないよう、再生位置を少しずつずらす
        if (!cardsStarted) { try { v.currentTime = i * 1.1; } catch (e) { /* ignore */ } }
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
      cardsStarted = true;
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) playCards(); else cardVideos.forEach(function (v) { v.pause(); });
      }, { threshold: 0.15 }).observe(document.querySelector(".tool-board"));
    } else {
      playCards();
    }
  }

  /* ---------------- パネル名を 1 行に収める（長い名前だけ文字を縮める） ---------------- */
  var panelLabels = [].slice.call(document.querySelectorAll(".v-panel .vt-card > span:last-child"));
  function fitPanelLabels() {
    panelLabels.forEach(function (el) {
      el.style.fontSize = "";
      var base = parseFloat(getComputedStyle(el).fontSize);
      var room = el.parentNode.clientWidth - 8;
      if (el.scrollWidth > room) el.style.fontSize = Math.max(6, base * room / el.scrollWidth).toFixed(2) + "px";
    });
  }
  fitPanelLabels();
  window.addEventListener("resize", fitPanelLabels);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPanelLabels);

  /* ---------------- 3D 動画：スマホは正方形・文字大きめの版へ ---------------- */
  if (window.matchMedia("(max-width: 759px)").matches) {
    document.querySelectorAll(".asm-video").forEach(function (v) {
      v.poster = v.poster.replace(/(\w+)\.jpg$/, "$1-sp.jpg");
      v.src = v.getAttribute("src").replace(/(\w+)\.mp4$/, "$1-sp.mp4");
    });
  }

  /* ---------------- assembly animations ---------------- */
  // 3D 動画（motion/ で書き出し）は仕様リストと同じ秒数で組み上がるので、同時に頭から再生する
  // 製品の説明そのものなので、OS のアニメーション効果がオフでも再生する（ループなし・画面に入るたび 1 回）
  function playVideo(v) {
    if (!v || v.tagName !== "VIDEO") return;
    v.preload = "auto";
    try { v.currentTime = 0; } catch (e) { /* ignore */ }
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function playAnim(name) {
    playVideo(document.getElementById("anim-" + name));
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
    if (svg && svg.tagName === "VIDEO") svg.pause();
    [svg, list, list && list.closest(".product-copy")].forEach(function (el) { if (el) el.classList.remove("is-play"); });
  }

  ["door", "window", "shutter"].forEach(function (name) {
    var svg = document.getElementById("anim-" + name);
    if (!svg) return;
    if (!("IntersectionObserver" in window)) { svg.preload = "auto"; playAnim(name); return; }
    // 1 画面手前で読み込みを始め、入った瞬間に再生できるようにする
    var pre = new IntersectionObserver(function (entries) {
      // 再生が先に始まっていたら load() で中断させない
      if (entries[0].isIntersecting) { svg.preload = "auto"; if (svg.readyState === 0 && svg.paused) svg.load(); pre.disconnect(); }
    }, { rootMargin: "100% 0px 100% 0px" });
    pre.observe(svg);
    // 画面に入るたびに再生し、画面外に出たら初期状態へ戻す
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio >= 0.35) {
          if (!svg.classList.contains("is-play")) {
            playAnim(name);
            track("view_animation", { item: name });
          }
        } else if (!e.isIntersecting) {
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
  if (vRows.length) {
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

  /* ---------------- snap：最後のパネル＋フッターで 1 画面 ---------------- */
  var footer = document.querySelector(".site-footer");
  function setFooterH() { if (footer) document.documentElement.style.setProperty("--footer-h", footer.offsetHeight + "px"); }
  setFooterH();
  window.addEventListener("resize", setFooterH);

  /* ---------------- magnet：パネルの頭が画面上端に近づいて止まったら、軽くドッキング（PC） ---------------- */
  var magnetMq = window.matchMedia("(min-width: 1024px) and (min-height: 700px)");
  var panels = [].slice.call(document.querySelectorAll(".snap"));
  var HEADER_H = 52;
  var settleTimer = null, docking = false, lastY = window.scrollY, dir = 0;

  function magnetSettle() {
    if (!magnetMq.matches) return;
    if (docking) { docking = false; return; }
    // 吸い付く範囲：画面の高さの 12%（最大 120px）以内
    var range = Math.min(120, window.innerHeight * 0.12);
    var y = window.scrollY, best = null;
    panels.forEach(function (p) {
      var d = p.getBoundingClientRect().top - HEADER_H; // パネルの頭とヘッダー下端の差
      // 進んでいる向きから近づいてくるパネルだけ（離れていくパネルへは引き戻さない）
      if (d * dir < 0) return;
      if (Math.abs(d) < range && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    });
    if (best === null || Math.abs(best) < 2) return;
    docking = true;
    window.scrollTo({ top: y + best, behavior: reduceMotion ? "auto" : "smooth" });
  }
  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    if (!docking && y !== lastY) dir = y > lastY ? 1 : -1;
    lastY = y;
    if (!("onscrollend" in window)) { clearTimeout(settleTimer); settleTimer = setTimeout(magnetSettle, 180); }
  }, { passive: true });
  if ("onscrollend" in window) window.addEventListener("scrollend", magnetSettle);
  // ユーザーが操作したら、吸い付き中の扱いを解除
  ["wheel", "touchstart", "keydown"].forEach(function (ev) { window.addEventListener(ev, function () { docking = false; }, { passive: true }); });

  /* ---------------- signup / login link ---------------- */
  document.querySelectorAll("[data-signup-link]").forEach(function (a) {
    a.addEventListener("click", function () { track("signup_click", { label: a.textContent.trim() }); });
  });
  document.querySelectorAll("[data-login-link]").forEach(function (a) {
    a.addEventListener("click", function () { track("login_click", { label: a.textContent.trim() }); });
  });
})();
