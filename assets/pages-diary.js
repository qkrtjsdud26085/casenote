/* Hello dear Sunny — 개인 › 일기 (하루 한 편, 한글 프로그램 같은 편집기, 3분마다 자동 저장)
   + 오늘의 기분 고르기 (홈 · 일정 · 캘린더 · 일기가 함께 쓰고, 주간 리뷰가 모아 봐요) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  App.MOODS = [["😆", "최고"], ["😊", "좋음"], ["🙂", "괜찮음"], ["😐", "그저 그럼"], ["😔", "울적"], ["😢", "슬픔"], ["😡", "화남"], ["😴", "피곤"]];
  var MOOD_DOC = "personal/mood";
  function moodName(m) { var hit = App.MOODS.filter(function (x) { return x[0] === m; })[0]; return hit ? hit[1] : ""; }
  function fmtDay(k) { var d = H.parseKey(k); return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + H.DOW[d.getDay()] + ")"; }
  function stamp() { var d = new Date(); return H.pad2(d.getHours()) + ":" + H.pad2(d.getMinutes()); }

  /* ---------- 기분 고르기 ----------
     o: { date, memo: true (한 줄 메모), week: true (그 주 월~일), diaryLink: true, onDays(days) }
     returns { setDate(k), days() } */
  App.moodPicker = function (parent, o) {
    o = o || {};
    var ref = App.doc(MOOD_DOC), days = {}, date = o.date || H.todayStr(), memoTimer = null;
    var box = el("div", "mood-box"); parent.appendChild(box);
    var dayEl = el("div", "mood-for"); if (o.showDate !== false) { box.appendChild(dayEl); }
    var pick = el("div", "mood-pick"); pick.setAttribute("role", "radiogroup"); pick.setAttribute("aria-label", "기분");
    var btns = App.MOODS.map(function (m) {
      var b = el("button", "mood-btn", m[0]); b.type = "button"; b.title = m[1];
      b.setAttribute("role", "radio"); b.setAttribute("aria-label", m[1]); b.setAttribute("data-mood", m[0]);
      b.addEventListener("click", function () { save({ mood: (days[date] || {}).mood === m[0] ? "" : m[0] }); });
      pick.appendChild(b); return b;
    });
    box.appendChild(pick);
    var memo = null;
    if (o.memo) {
      memo = el("input", "mood-memo"); memo.maxLength = 200; memo.placeholder = "한 줄 메모 (자동 저장)"; memo.setAttribute("aria-label", "한 줄 메모");
      box.appendChild(memo);
      memo.addEventListener("input", function () { clearTimeout(memoTimer); memoTimer = setTimeout(flush, 800); });
      memo.addEventListener("blur", flush);
    }
    var status = el("div", "fields-status"); box.appendChild(status);
    var week = null;
    if (o.week) { box.appendChild(el("div", "mini-title", "이번 주")); week = el("div", "mood-strip"); box.appendChild(week); }
    var link = null;
    if (o.diaryLink) {
      link = el("a", "more-link mood-more", "이 날 일기 쓰기 →"); link.href = "#/personal-diary";
      link.addEventListener("click", function () { H.safeSet("hds_diary_date", date); });
      box.appendChild(link);
    }
    function flush() {
      if (!memoTimer) { return; }
      clearTimeout(memoTimer); memoTimer = null;
      save({ note: memo.value });
    }
    function save(patch) {
      var day = {}; day[date] = Object.assign({}, days[date] || {}, patch, { at: new Date().toISOString() });
      days[date] = day[date]; paint();
      ref.set({ days: day, updatedAt: new Date().toISOString() }, { merge: true })
        .then(function () { status.textContent = "저장됨 · " + stamp(); })
        .catch(function (err) { window.alert("저장 실패: " + err.message); });
    }
    function paint() {
      var cur = days[date] || {};
      dayEl.textContent = date === H.todayStr() ? "오늘 · " + fmtDay(date) : fmtDay(date);
      btns.forEach(function (b) { var on = b.getAttribute("data-mood") === cur.mood; b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false"); });
      if (memo && document.activeElement !== memo && !memoTimer) { memo.value = cur.note || ""; }
      if (link) { link.textContent = date === H.todayStr() ? "오늘 일기 쓰기 →" : fmtDay(date) + " 일기 쓰기 →"; }
      if (week) {
        H.clear(week);
        var mon = H.parseKey(H.mondayKey(H.parseKey(date)));
        for (var i = 0; i < 7; i++) {
          var k = H.dateKey(H.addDays(mon, i)), d = days[k] || {};
          var cell = el("button", "mood-strip-day" + (k === date ? " on" : "")); cell.type = "button";
          cell.appendChild(el("span", "mood-strip-emo", d.mood || "·"));
          cell.appendChild(el("span", "mood-strip-lab", H.DOW[H.parseKey(k).getDay()]));
          cell.title = fmtDay(k) + (d.mood ? " · " + moodName(d.mood) : "") + (d.note ? "\n" + d.note : "");
          cell.disabled = k > H.todayStr();
          cell.addEventListener("click", (function (key) { return function () { if (o.onPickDay) { o.onPickDay(key); } else { api.setDate(key); } }; })(k));
          week.appendChild(cell);
        }
      }
    }
    var api = {
      setDate: function (k) { flush(); date = k; status.textContent = ""; paint(); },
      days: function () { return days; }
    };
    paint();
    App.watchDoc(ref, function (d) {
      days = (d && d.days) || {};
      paint();
      if (o.onDays) { o.onDays(days); }
    });
    App.unsubs.push(flush);
    return api;
  };

  /* =========================================================
     개인 — 일기: personal/diary (날짜별 목록: 글자 수 · 첫 줄) + personal/diary_YYYY-MM-DD (본문)
     ========================================================= */
  var INDEX = "personal/diary";
  function bodyRef(k) { return App.doc("personal/diary_" + k); }
  var AUTOSAVE_MS = 3 * 60 * 1000;
  var BACKUP_KEY = "hds_diary_backup";

  App.page({
    id: "personal-diary", title: "일기",
    render: function (view) {
      var date = H.safeGet("hds_diary_date") || H.todayStr();
      H.safeSet("hds_diary_date", "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > H.todayStr()) { date = H.todayStr(); }
      var index = {}, dirty = false, loaded = false, lastSaved = "", backupTimer = null, saving = null;

      var c = ui.card(view, { tab: "Diary", tone: "t-2", title: "오늘의 일기", wide: true });
      c.el.classList.add("diary-card");
      var head = el("div", "diary-head");
      var bPrev = el("button", "tool-btn", "‹"); bPrev.type = "button"; bPrev.setAttribute("aria-label", "전날");
      var dateLab = el("span", "diary-date");
      var bNext = el("button", "tool-btn", "›"); bNext.type = "button"; bNext.setAttribute("aria-label", "다음 날");
      var bToday = el("button", "tool-btn", "오늘"); bToday.type = "button";
      var pickDate = el("input", "w-date"); pickDate.type = "date"; pickDate.setAttribute("aria-label", "날짜 고르기"); pickDate.max = H.todayStr();
      [bPrev, dateLab, bNext, bToday, pickDate].forEach(function (n) { head.appendChild(n); });
      c.body.appendChild(head);
      var moodRow = el("div", "diary-mood"); c.body.appendChild(moodRow);
      var mood = App.moodPicker(moodRow, { date: date, showDate: false });

      var ed = App.richEditor(c.body, { label: "일기 본문", placeholder: "오늘 하루를 적어 보세요.", onChange: changed, onSave: function () { save(true); } });
      var foot = el("div", "cmp-foot");
      var stat = el("span", "cmp-stat"); foot.appendChild(stat);
      var acts = el("span", "cmp-acts");
      var bSave = el("button", "btn", "지금 저장"); bSave.type = "button"; bSave.title = "저장 (Ctrl+S)";
      acts.appendChild(bSave); foot.appendChild(acts); c.body.appendChild(foot);
      var note = "";
      function paintStat() {
        var n = ed.counts();
        stat.textContent = "글자 수 " + n.all.toLocaleString("ko-KR") + "자 · 3분마다 자동 저장" + (note ? " · " + note : "");
      }

      var lc = ui.card(view, { tab: "Past", tone: "t-3", title: "지난 일기", wide: true });
      var listBox = el("div", "cmp-list"); lc.body.appendChild(listBox);

      function changed() {
        if (!loaded) { return; }
        dirty = true; note = "저장 안 됨"; paintStat();
        /* a local copy right away, so nothing is lost even before the 3-minute save */
        clearTimeout(backupTimer);
        backupTimer = setTimeout(function () { H.safeSet(BACKUP_KEY, JSON.stringify({ date: date, html: ed.html(), lh: ed.lh(), at: Date.now() })); }, 1000);
      }
      function save(manual) {
        if (saving) { return saving; }
        if (!dirty && !manual) { return Promise.resolve(); }
        var k = date, html = App.cleanHTML(ed.html()), lh = ed.lh(), n = ed.counts(), now = new Date().toISOString();
        var text = (ed.paper.innerText || "").replace(/\s+/g, " ").trim();
        if (!text && !index[k]) { dirty = false; note = ""; paintStat(); return Promise.resolve(); }
        var entry = {}; entry[k] = { chars: n.all, preview: text.slice(0, 80), updatedAt: now };
        note = "저장 중…"; paintStat();
        saving = bodyRef(k).set({ html: html, lh: lh, updatedAt: now })
          .then(function () { return App.doc(INDEX).set({ days: entry, updatedAt: now }, { merge: true }); })
          .then(function () {
            if (k === date && ed.html() === html) { dirty = false; }
            lastSaved = stamp(); note = "마지막 저장 " + lastSaved; paintStat();
            var b = readBackup(); if (b && b.date === k) { H.safeSet(BACKUP_KEY, ""); }
          })
          .catch(function (err) { note = "저장 실패 · 다시 시도해요"; paintStat(); console.warn(err); })
          .then(function () { saving = null; });
        return saving;
      }
      function readBackup() { try { return JSON.parse(H.safeGet(BACKUP_KEY) || "null"); } catch (e) { return null; } }
      function open(k) {
        if (k > H.todayStr()) { return; }
        var go = function () {
          date = k; loaded = false; dirty = false; note = "";
          dateLab.textContent = fmtDay(k) + (k === H.todayStr() ? " · 오늘" : "");
          c.head.querySelector("h2").textContent = k === H.todayStr() ? "오늘의 일기" : "일기";
          pickDate.value = k; bNext.disabled = k >= H.todayStr();
          mood.setDate(k);
          ed.set("", "160"); paintStat(); paintList();
          bodyRef(k).get().then(function (snap) {
            if (date !== k) { return; }
            var b = snap.exists ? snap.data() : {};
            ed.set(b.html || "", b.lh || "160");
            /* an unsaved local copy newer than the saved one wins (e.g. the window was closed mid-sentence) */
            var bk = readBackup();
            if (bk && bk.date === k && bk.html && bk.html !== (b.html || "") && (!b.updatedAt || bk.at > Date.parse(b.updatedAt))) {
              ed.set(bk.html, bk.lh); loaded = true; dirty = true; note = "저장 안 된 글을 불러왔어요";
            } else { loaded = true; note = b.updatedAt ? "마지막 저장 " + H.fmtDateTime(b.updatedAt) : ""; }
            paintStat();
          }).catch(function (err) { loaded = true; note = "불러오기 실패"; paintStat(); console.warn(err); });
        };
        if (dirty) { save().then(go); } else { go(); }
      }
      function shift(n) { var d = H.addDays(H.parseKey(date), n); open(H.dateKey(d)); }
      bPrev.addEventListener("click", function () { shift(-1); });
      bNext.addEventListener("click", function () { shift(1); });
      bToday.addEventListener("click", function () { open(H.todayStr()); });
      pickDate.addEventListener("change", function () { if (pickDate.value) { open(pickDate.value); } });
      bSave.addEventListener("click", function () { save(true); });

      function paintList() {
        H.clear(listBox);
        var keys = Object.keys(index).filter(function (k) { return index[k] && index[k].chars > 0; }).sort().reverse();
        lc.count.textContent = keys.length ? keys.length + "편" : "";
        if (!keys.length) { listBox.appendChild(ui.empty("아직 쓴 일기가 없어요. 위에 쓰면 3분마다 저절로 저장돼요.")); return; }
        var moods = mood.days();
        keys.slice(0, 60).forEach(function (k) {
          var row = el("div", "cmp-row" + (k === date ? " cur" : ""));
          var main = el("button", "cmp-open"); main.type = "button";
          main.appendChild(el("span", "diary-row-date", fmtDay(k)));
          main.appendChild(el("span", "diary-row-mood", (moods[k] || {}).mood || ""));
          main.appendChild(el("span", "diary-row-prev", index[k].preview || ""));
          main.appendChild(el("span", "mini-sub cmp-row-n", index[k].chars.toLocaleString("ko-KR") + "자"));
          main.addEventListener("click", function () { open(k); c.el.scrollIntoView({ behavior: "smooth", block: "start" }); });
          row.appendChild(main); listBox.appendChild(row);
        });
      }

      var timer = setInterval(function () { save(false); }, AUTOSAVE_MS);
      function onHide() { if (document.visibilityState === "hidden" && dirty) { save(false); } }
      document.addEventListener("visibilitychange", onHide);
      App.unsubs.push(function () {
        clearInterval(timer); document.removeEventListener("visibilitychange", onHide);
        if (dirty) { H.safeSet(BACKUP_KEY, JSON.stringify({ date: date, html: ed.html(), lh: ed.lh(), at: Date.now() })); save(false); }
      });
      App.watchDoc(App.doc(INDEX), function (d) { index = (d && d.days) || {}; paintList(); });
      App.watchDoc(App.doc(MOOD_DOC), function () { paintList(); });
      open(date);
    }
  });
})(window.App);
