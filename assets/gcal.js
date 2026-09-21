/* Hello dear Sunny — Google Calendar (read-only) sync.
   Uses the existing Firebase Google sign-in popup with the calendar.readonly scope to get a short-lived
   access token, reads events, and stores a copy in Firestore (personal/gcal) so every device/page can show them. */
(function (App) {
  "use strict";
  var H = App.h;
  var SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
  var TOKEN_KEY = "hds_gtoken";
  var API = "https://www.googleapis.com/calendar/v3";
  var G = App.gcal = {};

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
    provider.addScope(SCOPE);
    if (App.user && App.user.email) { provider.setCustomParameters({ login_hint: App.user.email }); }
    return App.auth.currentUser.reauthenticateWithPopup(provider).then(function (res) {
      var at = res && res.credential && res.credential.accessToken;
      if (!at) { throw new Error("액세스 토큰을 받지 못했어요."); }
      var t = { at: at, exp: Date.now() + 55 * 60 * 1000 };
      try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch (e) { /* ignore */ }
      return t;
    });
  };

  function api(path, token) {
    return fetch(API + path, { headers: { Authorization: "Bearer " + token } }).then(function (r) {
      return r.json().then(function (j) {
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
    if (err && (err.status === 403) && (err.reason === "accessNotConfigured" || /has not been used|is disabled|not enabled/i.test(msg))) {
      return "Google Calendar API가 아직 켜져 있지 않아요. 아래 '처음 한 번만 설정'의 1번을 먼저 진행해 주세요.";
    }
    if (err && err.status === 401) { G.clearToken(); return "연결이 만료됐어요. '연결 · 동기화'를 다시 눌러 주세요."; }
    if (err && err.status === 403) { return "권한이 거부됐어요 (" + msg + "). OAuth 동의 화면이 '테스트' 상태라면 테스트 사용자에 이 계정을 추가해야 해요."; }
    return msg;
  };

  function toEvent(ev, cal) {
    var s = ev.start || {}, e = ev.end || {};
    var allDay = !!s.date, date, end, time = "";
    if (allDay) {
      date = s.date;
      end = e.date ? H.dateKey(H.addDays(H.parseKey(e.date), -1)) : date;
    } else {
      if (!s.dateTime) { return null; }
      var d1 = new Date(s.dateTime);
      date = H.dateKey(d1);
      time = H.pad2(d1.getHours()) + ":" + H.pad2(d1.getMinutes());
      var d2 = e.dateTime ? new Date(e.dateTime) : d1;
      end = H.dateKey(d2);
      if (end > date && d2.getHours() === 0 && d2.getMinutes() === 0) { end = H.dateKey(H.addDays(d2, -1)); }
    }
    if (end < date) { end = date; }
    return { id: ev.id, cal: cal.id, title: String(ev.summary || "(제목 없음)").slice(0, 120), date: date, end: end, time: time, allDay: allDay, link: ev.htmlLink || "" };
  }

  /* Read calendars + events and store them in Firestore. Resolves with {calendars, events}. */
  G.sync = async function () {
    var t = G.token();
    if (!t) { t = await G.connect(); }
    var ref = App.doc("personal/gcal");
    var snap = await ref.get();
    var cur = snap.exists ? snap.data() : {};
    var list = await api("/users/me/calendarList?minAccessRole=reader&maxResults=100", t.at);
    var known = {};
    (cur.calendars || []).forEach(function (c) { known[c.id] = c; });
    var calendars = (list.items || []).map(function (c) {
      var k = known[c.id];
      return { id: c.id, name: c.summaryOverride || c.summary || c.id, cat: k ? (k.cat || "개인") : "개인", on: k ? !!k.on : !!c.primary, primary: !!c.primary };
    });
    var from = H.addDays(new Date(), -31); from.setHours(0, 0, 0, 0);
    var to = H.addDays(new Date(), 120); to.setHours(23, 59, 59, 0);
    var events = [];
    for (var i = 0; i < calendars.length; i++) {
      var c = calendars[i];
      if (!c.on) { continue; }
      var pageToken = "", pages = 0;
      do {
        var q = "/calendars/" + encodeURIComponent(c.id) + "/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=" +
          encodeURIComponent(from.toISOString()) + "&timeMax=" + encodeURIComponent(to.toISOString()) + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
        var res = await api(q, t.at);
        (res.items || []).forEach(function (ev) {
          if (ev.status === "cancelled") { return; }
          var e = toEvent(ev, c);
          if (e) { events.push(e); }
        });
        pageToken = res.nextPageToken || ""; pages++;
      } while (pageToken && pages < 3);
    }
    events.sort(function (a, b) { return (a.date + (a.time || "")) < (b.date + (b.time || "")) ? -1 : 1; });
    events = events.slice(0, 700);
    await ref.set({ calendars: calendars, events: events, syncedAt: new Date().toISOString(), range: { from: H.dateKey(from), to: H.dateKey(to) } }, { merge: true });
    return { calendars: calendars, events: events };
  };

  /* Save calendar choices (on / category) without contacting Google. */
  G.saveCalendars = function (calendars) {
    return App.doc("personal/gcal").set({ calendars: calendars, updatedAt: new Date().toISOString() }, { merge: true });
  };

  /* Expand stored events into one entry per day between fromKey and toKey (inclusive). */
  G.expand = function (doc, fromKey, toKey) {
    var out = [];
    if (!doc || !doc.events) { return out; }
    var map = {};
    (doc.calendars || []).forEach(function (c) { map[c.id] = c; });
    doc.events.forEach(function (ev) {
      var c = map[ev.cal];
      if (c && c.on === false) { return; }
      var cat = (c && c.cat) || "개인", name = c ? c.name : "";
      var d = ev.date, last = ev.end || ev.date, guard = 0;
      while (d <= last && guard < 60) {
        if (d >= fromKey && d <= toKey) { out.push({ id: ev.id + "@" + d, date: d, title: ev.title, cat: cat, time: ev.time || "", allDay: !!ev.allDay, link: ev.link || "", source: "google", calName: name }); }
        d = H.dateKey(H.addDays(H.parseKey(d), 1)); guard++;
      }
    });
    return out;
  };
})(window.App);
