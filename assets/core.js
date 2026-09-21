/* Hello dear Sunny — core: helpers, Firebase/auth, menu + router */
(function () {
  "use strict";
  var App = window.App = { pages: {}, unsubs: [], owner: false, user: null, ui: {} };

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined && text !== null) { n.textContent = text; }
    return n;
  }
  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } return node; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dateKey(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function todayStr() { return dateKey(new Date()); }
  function parseKey(k) { var p = String(k).split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function mondayKey(d) { var x = new Date((d || new Date()).getTime()); var dow = x.getDay(); x.setDate(x.getDate() - (dow === 0 ? 6 : dow - 1)); return dateKey(x); }
  function ddayInfo(k) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var diff = Math.round((parseKey(k) - t) / 86400000);
    return { diff: diff, text: diff === 0 ? "D-DAY" : (diff > 0 ? "D-" + diff : "D+" + (-diff)), cls: diff < 0 ? "past" : (diff <= 3 ? "soon" : "") };
  }
  function ddayEl(k) { var i = ddayInfo(k); return el("span", "dday " + i.cls, i.text); }
  function fmtDateTime(iso) {
    try {
      var d = new Date(iso);
      return pad2(d.getMonth() + 1) + "/" + pad2(d.getDate()) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    } catch (e) { return ""; }
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    if (/^10\.\d{4,}\//.test(u)) { return "https://doi.org/" + u; }
    return /^https?:\/\//i.test(u) ? u : "";
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function copyText(text, btn) {
    if (!navigator.clipboard) { window.alert("이 브라우저에서는 자동 복사를 지원하지 않습니다. 문구를 직접 선택해 복사해 주세요."); return; }
    navigator.clipboard.writeText(text).then(function () {
      if (btn) { var old = btn.textContent; btn.textContent = "복사됨"; setTimeout(function () { btn.textContent = old; }, 1200); }
    }).catch(function () { window.alert("복사에 실패했습니다. 문구를 직접 선택해 복사해 주세요."); });
  }
  App.h = {
    el: el, clear: clear, pad2: pad2, dateKey: dateKey, todayStr: todayStr, parseKey: parseKey, addDays: addDays,
    mondayKey: mondayKey, ddayInfo: ddayInfo, ddayEl: ddayEl, fmtDateTime: fmtDateTime, safeUrl: safeUrl, uid: uid,
    safeGet: safeGet, safeSet: safeSet, copyText: copyText, DOW: ["일", "월", "화", "수", "목", "금", "토"]
  };
  App.TSTAT = ["미착수", "집필중", "초안 완료", "수정중", "완료"];
  App.CATS = ["개인", "논문", "글쓰기", "회사"];

  /* ---------- Firebase ---------- */
  App.OWNER_EMAIL = "qkrtjsdud26085@gmail.com";
  var firebaseConfig = {
    apiKey: "AIzaSyC_giOdf00Q1BpDIS6hGk1p7Yy-t1fIYHs",
    authDomain: "hello-dear-sunny.firebaseapp.com",
    projectId: "hello-dear-sunny",
    storageBucket: "hello-dear-sunny.firebasestorage.app",
    messagingSenderId: "123065037934",
    appId: "1:123065037934:web:cc63c1bdf564ee01d0627f",
    measurementId: "G-5RR08TPFZY"
  };
  App.doc = function (path) { var p = path.split("/"); return App.db.collection(p[0]).doc(p[1]); };
  App.col = function (name) { return App.db.collection(name); };
  App.setDoc = function (ref, data) {
    return ref.set(Object.assign({}, data, { updatedAt: new Date().toISOString() }), { merge: true })
      .catch(function (err) { window.alert("저장 실패: " + err.message); });
  };

  /* ---------- watchers (cleaned up on every page change) ---------- */
  App.watch = function (target, cb) {
    var u = target.onSnapshot(function (snap) {
      try { cb(snap); } catch (e) { console.error(e); }
    }, function (err) { console.warn("watch error:", err && err.message); });
    App.unsubs.push(u);
    return u;
  };
  App.watchDoc = function (ref, cb) { return App.watch(ref, function (snap) { cb(snap.exists ? snap.data() : null); }); };
  App.watchQuery = function (q, cb) {
    return App.watch(q, function (snap) {
      cb(snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
    });
  };
  function cleanupWatchers() {
    App.unsubs.forEach(function (u) { try { u(); } catch (e) { /* ignore */ } });
    App.unsubs = [];
  }

  /* ---------- menu ---------- */
  App.MENU = [
    { key: "thesis", short: "박사", label: "박사 학위논문", pages: ["thesis-overview", "thesis-library", "thesis-recommend", "thesis-notes", "thesis-concepts", "thesis-questions", "thesis-methods", "thesis-ethics", "thesis-analysis", "thesis-writing", "thesis-advisor", "thesis-publications", "thesis-refs"] },
    { key: "writer", short: "작가", label: "작가", pages: ["writer-works", "writer-ideas", "writer-log"] },
    { key: "personal", short: "개인", label: "개인", pages: ["personal-calendar", "personal-todos", "personal-memos", "personal-habits", "personal-weekly"] },
    { key: "company", short: "회사", label: "회사", pages: ["company-pipeline", "company-billing", "company-worklog", "company-flow", "company-snippets", "company-instructors"] }
  ];
  App.page = function (def) { App.pages[def.id] = def; };

  var $ = function (id) { return document.getElementById(id); };
  var viewEl, headEl, sectionsEl, subnavEl;

  function groupOf(id) {
    for (var i = 0; i < App.MENU.length; i++) { if (App.MENU[i].pages.indexOf(id) !== -1) { return App.MENU[i]; } }
    return null;
  }
  function lastPageOf(g) {
    var saved = safeGet("hds_last_" + g.key);
    return g.pages.indexOf(saved) !== -1 ? saved : g.pages[0];
  }
  function buildSections() {
    clear(sectionsEl);
    App.MENU.forEach(function (g) {
      var a = el("a", "sec-btn", g.short);
      a.href = "#/" + lastPageOf(g);
      a.setAttribute("data-section", g.key);
      sectionsEl.appendChild(a);
    });
  }
  function updateSections(page) {
    var grp = groupOf(page.id);
    if (grp) { safeSet("hds_last_" + grp.key, page.id); }
    Array.prototype.forEach.call(sectionsEl.children, function (a) {
      var g = App.MENU.filter(function (x) { return x.key === a.getAttribute("data-section"); })[0];
      a.href = "#/" + lastPageOf(g);
      var on = !!grp && grp.key === g.key;
      a.classList.toggle("active", on);
      if (on) { a.setAttribute("aria-current", "true"); } else { a.removeAttribute("aria-current"); }
    });
    clear(subnavEl);
    if (!grp) { subnavEl.hidden = true; return; }
    subnavEl.hidden = false;
    grp.pages.forEach(function (pid) {
      var p = App.pages[pid];
      if (!p) { return; }
      var a = el("a", "sub-link" + (pid === page.id ? " active" : ""), p.title);
      a.href = "#/" + pid; a.setAttribute("data-page", pid);
      if (pid === page.id) { a.setAttribute("aria-current", "page"); }
      subnavEl.appendChild(a);
    });
    var act = subnavEl.querySelector(".active");
    if (act && act.scrollIntoView) { act.scrollIntoView({ block: "nearest", inline: "center" }); }
  }

  function currentId() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    return h || safeGet("hds_page") || "home";
  }
  function errorCard(e) {
    var c = el("div", "error-card");
    c.textContent = "이 페이지를 그리는 중 문제가 생겼어요: " + (e && e.message ? e.message : e);
    return c;
  }
  function route() {
    if (!App.owner) { return; }
    var id = currentId();
    var page = App.pages[id] || App.pages.home;
    cleanupWatchers();
    var grp = groupOf(page.id);
    clear(headEl);
    if (page.id === "home") {
      headEl.hidden = true;
    } else {
      headEl.hidden = false;
      headEl.appendChild(el("p", "eyebrow", grp ? grp.label : ""));
      headEl.appendChild(el("h1", "page-title", page.title));
      if (page.desc) { headEl.appendChild(el("p", "page-desc", page.desc)); }
    }
    document.title = (page.id === "home" ? "" : page.title + " · ") + "Hello dear Sunny";
    updateSections(page);
    clear(viewEl);
    window.scrollTo(0, 0);
    try { page.render(viewEl, { page: page }); } catch (e) { console.error(e); viewEl.appendChild(errorCard(e)); }
    safeSet("hds_page", page.id);
  }
  App.route = route;
  App.go = function (id) { location.hash = "#/" + id; };

  /* ---------- auth / boot ---------- */
  function showLanding(user) {
    $("appRoot").hidden = true;
    var box = $("landing");
    box.hidden = false;
    clear(box);
    box.appendChild(el("p", "eyebrow", "Personal Workspace"));
    box.appendChild(el("h1", "page-title", "Hello dear Sunny"));
    if (user) {
      box.appendChild(el("p", "page-desc", "이 Google 계정(" + user.email + ")은 이 워크스페이스의 소유자가 아니라 접근할 수 없습니다."));
      var out = el("button", "signin-btn", "로그아웃"); out.type = "button";
      out.addEventListener("click", function () { App.auth.signOut(); });
      box.appendChild(out);
    } else {
      box.appendChild(el("p", "page-desc", "박사 논문 · 글쓰기 · 개인 일정 · 회사 업무를 한곳에서 관리하는 나만의 공간입니다."));
      var btn = el("button", "signin-btn"); btn.type = "button";
      btn.innerHTML = '<svg class="g-icon" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.7 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.6-.2-3.1-.4-4.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.9 29.5 4.5 24 4.5c-7.7 0-14.4 4.3-17.7 10.2z"/><path fill="#4CAF50" d="M24 45.5c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 36.5 26.9 37.5 24 37.5c-5.3 0-9.8-3.3-11.4-8l-6.6 5.1C9.5 41 16.2 45.5 24 45.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.6-2.7 4.8-5 6.3l6.5 5.5C40.8 36.6 44.5 31.3 44.5 25c0-1.6-.2-3.1-.9-4.5z"/></svg>Google로 로그인';
      btn.addEventListener("click", function () {
        var provider = new firebase.auth.GoogleAuthProvider();
        App.auth.signInWithPopup(provider).catch(function (err) { window.alert("로그인에 실패했습니다: " + err.message); });
      });
      box.appendChild(btn);
      box.appendChild(el("p", "landing-note", "본인 Google 계정으로 로그인한 상태에서만 내용이 보이며, 한 번 로그인하면 이 브라우저에서는 계속 유지됩니다."));
    }
  }
  function showApp(user) {
    $("landing").hidden = true;
    $("appRoot").hidden = false;
    $("userAvatar").hidden = !user.photoURL;
    $("userAvatar").src = user.photoURL || "";
    $("userLabel").textContent = user.displayName || user.email;
    if (!sectionsEl.firstChild) { buildSections(); }
    route();
  }

  App.start = function () {
    viewEl = $("view"); headEl = $("pageHead"); sectionsEl = $("sections"); subnavEl = $("subnav");
    $("signOutBtn").addEventListener("click", function () { App.auth.signOut(); });
    window.addEventListener("hashchange", route);
    if (typeof firebase === "undefined") {
      var box = $("landing"); box.hidden = false;
      box.appendChild(el("p", "page-desc", "Firebase를 불러오지 못했어요. 네트워크 연결이나 콘텐츠 차단 설정을 확인해 주세요."));
      return;
    }
    firebase.initializeApp(firebaseConfig);
    App.auth = firebase.auth();
    App.db = firebase.firestore();
    App.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () { /* ignore */ });
    App.auth.onAuthStateChanged(function (user) {
      App.user = user;
      cleanupWatchers();
      if (user && user.email === App.OWNER_EMAIL) { App.owner = true; showApp(user); }
      else { App.owner = false; showLanding(user); }
    });
  };
})();
