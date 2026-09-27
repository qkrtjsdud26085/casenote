/* Hello dear Sunny — Google Tasks & Calendar write sync for quick capture.
   Reuses the Firebase Google sign-in popup (same pattern as gcal.js) to grant write scopes,
   then creates a Google Task (date only, since Google Tasks has no time-of-day) or a Google
   Calendar event (date + time) for a quick-add to-do/memo. Token is cached separately from
   the read-only calendar token in gcal.js because it carries different (write) scopes. */
(function (App) {
  "use strict";
  var H = App.h;
  var SCOPES = ["https://www.googleapis.com/auth/tasks", "https://www.googleapis.com/auth/calendar.events"];
  var TOKEN_KEY = "hds_gtoken_rw";
  var TASKS_API = "https://tasks.googleapis.com/tasks/v1";
  var CAL_API = "https://www.googleapis.com/calendar/v3";
  var G = App.gtasks = {};

  G.token = function () {
    try {
      var t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null");
      if (t && t.at && t.exp > Date.now() + 30000) { return t; }
    } catch (e) { /* ignore */ }
    return null;
  };
  G.clearToken = function () { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } };

  /* the same popup as gcal.js (calendar read + tasks + events), so one connection serves both */
  G.connect = function () {
    if (App.gcal && App.gcal.connect) { return App.gcal.connect(); }
    var provider = new firebase.auth.GoogleAuthProvider();
    SCOPES.forEach(function (s) { provider.addScope(s); });
    if (App.user && App.user.email) { provider.setCustomParameters({ login_hint: App.user.email }); }
    return App.auth.currentUser.reauthenticateWithPopup(provider).then(function (res) {
      var at = res && res.credential && res.credential.accessToken;
      if (!at) { throw new Error("액세스 토큰을 받지 못했어요."); }
      var t = { at: at, exp: Date.now() + 55 * 60 * 1000 };
      try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch (e) { /* ignore */ }
      return t;
    });
  };

  function api(base, path, token, opts) {
    opts = opts || {};
    var headers = { Authorization: "Bearer " + token };
    if (opts.body) { headers["Content-Type"] = "application/json"; }
    return fetch(base + path, { method: opts.method || "GET", headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined }).then(function (r) {
      if (r.status === 204) { return {}; }
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var err = new Error((j.error && j.error.message) || ("HTTP " + r.status));
          err.status = r.status;
          err.reason = j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason;
          throw err;
        }
        return j;
      });
    });
  }

  G.explain = function (err) {
    var code = err && err.code;
    var msg = (err && err.message) || String(err);
    if (code === "auth/popup-blocked") { return "팝업이 차단됐어요. 주소창 오른쪽의 팝업 차단을 해제한 뒤 다시 눌러 주세요."; }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") { return "연결 창이 닫혀서 취소됐어요."; }
    if (code === "auth/user-mismatch") { return "다른 Google 계정을 선택하셨어요. 이 사이트에 로그인한 계정으로 연결해 주세요."; }
    if (err && err.status === 403 && (err.reason === "accessNotConfigured" || /has not been used|is disabled|not enabled/i.test(msg))) {
      return "Google Tasks/Calendar API가 아직 켜져 있지 않아요. Google Cloud 콘솔에서 Tasks API(및 Calendar API)를 사용 설정해 주세요.";
    }
    if (err && err.status === 401) { G.clearToken(); return "연결이 만료됐어요. 다시 시도해 주세요."; }
    if (err && err.status === 403) { return "권한이 거부됐어요 (" + msg + "). OAuth 동의 화면이 '테스트' 상태라면 테스트 사용자에 이 계정을 추가해야 해요."; }
    return msg;
  };

  function ensureToken() {
    var t = G.token();
    if (t) { return Promise.resolve(t); }
    return G.connect();
  }

  /* date-only item -> Google Tasks (default list). Google Tasks has no time-of-day field. */
  G.createTask = function (title, dateKey, notes) {
    return ensureToken().then(function (t) {
      var body = { title: title, notes: notes || "" };
      if (dateKey) { body.due = dateKey + "T00:00:00.000Z"; }
      return api(TASKS_API, "/lists/@default/tasks", t.at, { method: "POST", body: body });
    });
  };

  /* ---------- the 할 일 list lives in Google Tasks (default list) ----------
     A copy is kept in Firestore personal/gtasks so the home page and other devices can show it
     without a fresh Google token; every change goes to Google first, then refreshes that copy. */
  var CACHE = "personal/gtasks";
  function norm(x) {
    return { id: x.id, title: x.title || "", notes: x.notes || "", due: x.due ? String(x.due).slice(0, 10) : "",
      status: x.status || "needsAction", completed: x.completed || "", updated: x.updated || "", position: x.position || "" };
  }
  G.list = function () {
    return ensureToken().then(function (t) {
      var out = [];
      function page(tokenParam) {
        var q = "/lists/@default/tasks?showCompleted=true&showHidden=true&maxResults=100" + (tokenParam ? "&pageToken=" + encodeURIComponent(tokenParam) : "");
        return api(TASKS_API, q, t.at).then(function (j) {
          (j.items || []).forEach(function (x) { if (!x.deleted && x.title) { out.push(norm(x)); } });
          return j.nextPageToken && out.length < 500 ? page(j.nextPageToken) : out;
        });
      }
      return page(null);
    });
  };
  G.sync = function () {
    return G.list().then(function (items) {
      return App.doc(CACHE).set({ items: items, syncedAt: new Date().toISOString() }).then(function () { return items; });
    });
  };
  G.setDone = function (id, done) {
    return ensureToken().then(function (t) {
      var body = done ? { status: "completed" } : { status: "needsAction", completed: null };
      return api(TASKS_API, "/lists/@default/tasks/" + encodeURIComponent(id), t.at, { method: "PATCH", body: body });
    }).then(G.sync);
  };
  G.remove = function (id) {
    return ensureToken().then(function (t) {
      return api(TASKS_API, "/lists/@default/tasks/" + encodeURIComponent(id), t.at, { method: "DELETE" });
    }).then(G.sync);
  };
  G.add = function (title, dateKey, notes) { return G.createTask(title, dateKey, notes).then(G.sync); };

  /* date+time item -> Google Calendar event (primary calendar, device timezone).
     opts.end ("HH:MM") sets the end time (default: 1 hour later); opts.location fills the place. */
  G.createEvent = function (title, dateKey, timeStr, notes, opts) {
    opts = opts || {};
    return ensureToken().then(function (t) {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
      var parts = String(timeStr).split(":");
      var start = H.parseKey(dateKey);
      start.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
      var end = new Date(start.getTime() + 60 * 60 * 1000);
      if (opts.end) {
        var ep = String(opts.end).split(":"), e2 = H.parseKey(dateKey);
        e2.setHours(Number(ep[0]) || 0, Number(ep[1]) || 0, 0, 0);
        if (e2 > start) { end = e2; }
      }
      function iso(d) { return d.getFullYear() + "-" + H.pad2(d.getMonth() + 1) + "-" + H.pad2(d.getDate()) + "T" + H.pad2(d.getHours()) + ":" + H.pad2(d.getMinutes()) + ":00"; }
      return api(CAL_API, "/calendars/primary/events", t.at, {
        method: "POST",
        body: Object.assign({ summary: title, description: notes || "", start: { dateTime: iso(start), timeZone: tz }, end: { dateTime: iso(end), timeZone: tz } },
          opts.location ? { location: opts.location } : {})
      });
    });
  };
})(window.App);
