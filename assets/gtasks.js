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

  G.connect = function () {
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

  /* date+time item -> Google Calendar event (1 hour, primary calendar, device timezone) */
  G.createEvent = function (title, dateKey, timeStr, notes) {
    return ensureToken().then(function (t) {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
      var parts = String(timeStr).split(":");
      var start = H.parseKey(dateKey);
      start.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
      var end = new Date(start.getTime() + 60 * 60 * 1000);
      function iso(d) { return d.getFullYear() + "-" + H.pad2(d.getMonth() + 1) + "-" + H.pad2(d.getDate()) + "T" + H.pad2(d.getHours()) + ":" + H.pad2(d.getMinutes()) + ":00"; }
      return api(CAL_API, "/calendars/primary/events", t.at, {
        method: "POST",
        body: { summary: title, description: notes || "", start: { dateTime: iso(start), timeZone: tz }, end: { dateTime: iso(end), timeZone: tz } }
      });
    });
  };
})(window.App);
