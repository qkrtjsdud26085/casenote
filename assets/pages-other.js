/* Hello dear Sunny — 개인 pages: 일정 · 캘린더 (+ 할 일 via Google Tasks), 주간 리뷰
   (가계부 lives in pages-budget.js, 작가 pages in pages-writer.js) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;
  var doc = function (path) { return App.doc(path); };

  /* a card that stays folded until opened; the choice is remembered per browser */
  function foldable(card, key, label) {
    var open = H.safeGet("hds_fold_" + key) === "1";
    var btn = el("button", "tool-btn fold-btn"); btn.type = "button";
    card.head.replaceChild(btn, card.count);
    card.head.classList.add("fold-head");
    function set(v) {
      open = v; H.safeSet("hds_fold_" + key, v ? "1" : "0");
      card.body.hidden = !open; card.el.classList.toggle("folded", !open);
      btn.textContent = open ? "접기 ▴" : "펼치기 ▾";
      btn.setAttribute("aria-expanded", open ? "true" : "false"); btn.setAttribute("aria-label", label + (open ? " 접기" : " 펼치기"));
    }
    btn.addEventListener("click", function () { set(!open); });
    card.head.querySelector("h2").addEventListener("click", function () { set(!open); });
    set(open);
  }

  /* =========================================================
     할 일 — stored in Google Tasks (default list); Firestore keeps a read-only copy
     ========================================================= */
  function todoCard(parent) {
    var G = App.gtasks;
    var c = ui.card(parent, { tab: "To-do", tone: "t-2", title: "할 일 · Google Tasks" });
    c.el.classList.add("todo-card");
    var S = { cache: null, busy: false, legacy: [] };
    var status = el("p", "hint");
    var tools = el("div", "items-tools");
    var sync = el("button", "tool-btn", "Google 할 일 연결 · 동기화"); sync.type = "button";
    var migrate = el("button", "tool-btn", ""); migrate.type = "button"; migrate.hidden = true;
    tools.appendChild(sync); tools.appendChild(migrate);
    var form = el("form", "quick-add");
    var tIn = el("input"); tIn.placeholder = "할 일 입력 후 Enter → Google Tasks에 바로 저장"; tIn.maxLength = 200; tIn.required = true; tIn.setAttribute("aria-label", "할 일");
    var dIn = el("input", "w-date"); dIn.type = "date"; dIn.setAttribute("aria-label", "기한 (선택)"); dIn.title = "기한 (선택)";
    var nIn = el("input"); nIn.placeholder = "메모 (선택)"; nIn.maxLength = 300; nIn.setAttribute("aria-label", "메모");
    var add = el("button", "btn", "추가"); add.type = "submit";
    [tIn, dIn, nIn, add].forEach(function (n) { form.appendChild(n); });
    var msg = el("p", "hint todo-msg");
    var list = el("div", "plain-list");
    var doneBox = el("details", "reco-settings todo-done"); var doneSum = el("summary"); var doneList = el("div", "plain-list");
    doneBox.appendChild(doneSum); doneBox.appendChild(doneList);
    var scroll = el("div", "todo-scroll");  /* the list scrolls so the card keeps the calendar's height */
    scroll.appendChild(list); scroll.appendChild(doneBox);
    [status, tools, form, msg, scroll].forEach(function (n) { c.body.appendChild(n); });

    function fail(err) { S.busy = false; msg.textContent = G.explain(err); draw(); }
    function run(label, job) {
      S.busy = true; msg.textContent = label; draw();
      return job.then(function () { S.busy = false; msg.textContent = ""; draw(); }, fail);
    }
    function row(t) {
      var done = t.status === "completed";
      var r = el("div", "todo-item" + (done ? " done" : ""));
      var cb = el("input"); cb.type = "checkbox"; cb.checked = done; cb.disabled = S.busy; cb.setAttribute("aria-label", t.title + (done ? " 완료 취소" : " 완료"));
      cb.addEventListener("change", function () { run(cb.checked ? "완료 처리 중…" : "되돌리는 중…", G.setDone(t.id, cb.checked)); });
      r.appendChild(cb);
      var main = el("span", "todo-text");
      main.appendChild(document.createTextNode(t.title));
      if (t.notes) { main.appendChild(el("span", "mini-sub todo-notes", t.notes)); }
      r.appendChild(main);
      if (t.due && !done) { r.appendChild(H.ddayEl(t.due)); }
      var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "Google에서 삭제"; del.disabled = S.busy; del.setAttribute("aria-label", t.title + " 삭제");
      del.addEventListener("click", function () { if (window.confirm("'" + t.title + "'을(를) Google 할 일에서 삭제할까요?")) { run("삭제하는 중…", G.remove(t.id)); } });
      r.appendChild(del);
      return r;
    }
    function draw() {
      var items = (S.cache && S.cache.items) || [];
      var open = items.filter(function (t) { return t.status !== "completed"; })
        .sort(function (a, b) { return (a.due || "9999") < (b.due || "9999") ? -1 : ((a.due || "9999") > (b.due || "9999") ? 1 : (a.position < b.position ? -1 : 1)); });
      var done = items.filter(function (t) { return t.status === "completed"; })
        .sort(function (a, b) { return a.completed < b.completed ? 1 : -1; }).slice(0, 30);
      var tok = G.token();
      status.textContent = (tok ? "Google 연결됨" : "Google 연결 안 됨 · 추가 · 체크하면 로그인 창이 한 번 떠요") + " · " +
        (S.cache && S.cache.syncedAt ? "마지막 동기화 " + H.fmtDateTime(S.cache.syncedAt) : "아직 동기화한 적 없음");
      c.count.textContent = items.length ? open.length + "개 남음" : "";
      sync.disabled = add.disabled = S.busy;
      migrate.hidden = !S.legacy.length; migrate.disabled = S.busy;
      migrate.textContent = "예전 할 일 " + S.legacy.length + "개 Google로 옮기기";
      H.clear(list);
      if (!open.length) { list.appendChild(ui.empty(S.cache ? "남은 할 일이 없어요." : "Google 할 일과 연결하면 목록이 여기에 보여요.")); }
      open.forEach(function (t) { list.appendChild(row(t)); });
      doneBox.hidden = !done.length; doneSum.textContent = "완료한 할 일 " + done.length + "개";
      H.clear(doneList); done.forEach(function (t) { doneList.appendChild(row(t)); });
    }
    sync.addEventListener("click", function () { run("Google 할 일을 불러오는 중…", G.sync()); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var title = tIn.value.trim();
      if (!title || S.busy) { return; }
      var job = G.add(title, dIn.value, nIn.value.trim());
      tIn.value = ""; dIn.value = ""; nIn.value = "";
      run("Google 할 일에 저장하는 중…", job);
    });
    migrate.addEventListener("click", function () {
      var todo = S.legacy.slice();
      if (!window.confirm("이 사이트에만 있던 할 일 " + todo.length + "개를 Google 할 일로 옮길까요? 옮긴 뒤 여기 사본은 지워져요.")) { return; }
      var chain = Promise.resolve();
      todo.forEach(function (t) {
        chain = chain.then(function () { return G.createTask(t.text, t.due || "", ""); }).then(function () { return App.col("todos").doc(t.id).delete(); });
      });
      run("옮기는 중…", chain.then(G.sync));
    });
    draw();
    App.watchDoc(App.doc("personal/gtasks"), function (d) { S.cache = d; draw(); });
    App.watchQuery(App.col("todos").orderBy("createdAt", "asc"), function (items) { S.legacy = items.filter(function (t) { return !t.done; }); draw(); });
    /* refresh quietly when a token is still valid */
    if (G.token()) { G.sync().then(draw, function () {}); }
  }

  /* =========================================================
     메모 — one scratchpad that saves itself (Firestore personal/quicknote)
     ========================================================= */
  function memoCard(parent) {
    var ref = App.doc("personal/quicknote");
    var c = ui.card(parent, { tab: "Memo", tone: "t-3", title: "메모" });
    c.el.classList.add("memo-card");
    var ta = el("textarea", "quicknote"); ta.placeholder = "생각나는 걸 바로 적어 두세요. 자동으로 저장돼요."; ta.maxLength = 20000; ta.setAttribute("aria-label", "메모");
    c.body.appendChild(ta);
    var timer = null, dirty = false;
    function save() {
      dirty = false;
      ref.set({ text: ta.value, updatedAt: new Date().toISOString() }, { merge: true })
        .then(function () { c.count.textContent = "저장됨 " + H.fmtDateTime(new Date().toISOString()).slice(6); })
        .catch(function (err) { c.count.textContent = "저장 실패"; window.alert("메모 저장 실패: " + err.message); });
    }
    ta.addEventListener("input", function () { dirty = true; c.count.textContent = "입력 중…"; clearTimeout(timer); timer = setTimeout(save, 700); });
    ta.addEventListener("blur", function () { if (dirty) { clearTimeout(timer); save(); } });
    App.unsubs.push(function () { if (dirty) { clearTimeout(timer); save(); } });  /* leaving the page flushes */
    App.watchDoc(ref, function (d) {
      /* never overwrite what is being typed */
      if (document.activeElement === ta || dirty) { return; }
      ta.value = (d && d.text) || "";
      c.count.textContent = d && d.updatedAt ? "저장됨 " + H.fmtDateTime(d.updatedAt).slice(6) : "";
    });
  }

  /* =========================================================
     개인 — 일정 · 캘린더
     ========================================================= */
  App.page({
    id: "personal-calendar", title: "일정 · 캘린더",
    render: function (view) {
      var scheduleRef = App.col("schedule");
      var state = { month: new Date(), sel: H.todayStr(), items: [], cat: "전체", gdoc: null };
      state.month.setDate(1);
      /* calendar on the left; to-do + memo on the right, never taller than the calendar */
      var top = el("div", "cal-top"), left = el("div", "cal-left"), right = el("div", "cal-right"), rightIn = el("div", "cal-right-in");
      right.appendChild(rightIn); top.appendChild(left); top.appendChild(right); view.appendChild(top);
      var calCard = ui.card(left, { tab: "Calendar", tone: "t-1", title: "월간 캘린더" });
      todoCard(rightIn);
      memoCard(rightIn);
      /* Google · Upcoming: small, side by side, folded until needed */
      var bottom = el("div", "cal-bottom"); view.appendChild(bottom);
      var gCard = ui.card(bottom, { tab: "Google", tone: "t-2", title: "Google 캘린더 연동" });
      var upCard = ui.card(bottom, { tab: "Upcoming", tone: "t-3", title: "다가오는 일정" });
      gCard.el.classList.add("cal-mini"); upCard.el.classList.add("cal-mini");
      ui.upcoming(upCard.body, "*", 10);
      foldable(gCard, "gcal", "Google 캘린더 연동");
      foldable(upCard, "upcoming", "다가오는 일정");

      var filters = el("div", "archive-filters");
      var head = el("div", "cal-head");
      var title = el("div", "cal-title");
      var nav = el("div", "items-tools");
      var prev = el("button", "tool-btn", "‹"); prev.type = "button";
      var today = el("button", "tool-btn", "오늘"); today.type = "button";
      var next = el("button", "tool-btn", "›"); next.type = "button";
      [prev, today, next].forEach(function (b) { nav.appendChild(b); });
      head.appendChild(title); head.appendChild(nav);
      var grid = el("div", "cal-grid");
      [filters, head, grid].forEach(function (n) { calCard.body.appendChild(n); });

      var dayTitle = el("div", "mini-title");
      var form = el("form", "quick-add");
      var dateEl = el("input", "w-date"); dateEl.type = "date"; dateEl.required = true; dateEl.value = state.sel;
      /* "할 일" is not a schedule category: picking it saves a Google Task due that day */
      var TASK = "할 일";
      var catEl = el("select"); App.CATS.concat([TASK]).forEach(function (c) { var o = el("option", "", c === TASK ? "할 일 (Google)" : c); o.value = c; catEl.appendChild(o); });
      catEl.setAttribute("aria-label", "분류");
      var titleEl = el("input"); titleEl.placeholder = "일정 제목"; titleEl.maxLength = 80; titleEl.required = true;
      var addBtn = el("button", "btn", "추가"); addBtn.type = "submit";
      [dateEl, catEl, titleEl, addBtn].forEach(function (n) { form.appendChild(n); });
      var dayList = el("div", "plain-list");
      /* the selected day's events and the add form sit under the month grid */
      var dayBox = el("div", "cal-day");
      [dayTitle, form, dayList].forEach(function (n) { dayBox.appendChild(n); });
      calCard.body.appendChild(dayBox);

      function visible() {
        var y = state.month.getFullYear(), m = state.month.getMonth();
        var from = H.dateKey(new Date(y, m - 1, 20)), to = H.dateKey(new Date(y, m + 2, 10));
        var tasks = ((state.tasks && state.tasks.items) || []).filter(function (t) { return t.due; }).map(function (t) {
          return { id: t.id, date: t.due, title: t.title, cat: TASK, source: "tasks", done: t.status === "completed" };
        });
        var all = state.items.concat(App.gcal ? App.gcal.expand(state.gdoc, from, to) : []).concat(tasks);
        return all.filter(function (s) { return state.cat === "전체" || (s.cat || "개인") === state.cat; });
      }
      function drawCal() {
        H.clear(filters);
        ["전체"].concat(App.CATS, [TASK]).forEach(function (c) {
          var b = el("button", "chip" + (state.cat === c ? " active" : ""), c); b.type = "button";
          b.addEventListener("click", function () { state.cat = c; drawCal(); drawDay(); });
          filters.appendChild(b);
        });
        var y = state.month.getFullYear(), m = state.month.getMonth();
        title.textContent = y + "년 " + (m + 1) + "월";
        H.clear(grid);
        H.DOW.forEach(function (d) { grid.appendChild(el("div", "cal-dow", d)); });
        var startDow = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
        for (var i = 0; i < startDow; i++) { grid.appendChild(el("div", "cal-cell blank")); }
        var byDate = {};
        visible().forEach(function (s) { (byDate[s.date] = byDate[s.date] || []).push(s); });
        var todayKey = H.todayStr();
        for (var d = 1; d <= days; d++) {
          (function (day) {
            var key = y + "-" + H.pad2(m + 1) + "-" + H.pad2(day);
            var dow = new Date(y, m, day).getDay();
            var cell = el("button", "cal-cell" + (key === todayKey ? " today" : "") + (key === state.sel ? " sel" : "") + ((dow === 0 || dow === 6) ? " wknd" : "")); cell.type = "button";
            cell.appendChild(el("span", "", String(day)));
            var evs = byDate[key] || [];
            if (evs.length) {
              var dots = el("span", "cal-dots");
              var seen = {};
              evs.forEach(function (s) { var c = s.cat || "개인"; if (!seen[c] && Object.keys(seen).length < 4) { seen[c] = true; var dot = el("span", "cal-dot"); dot.setAttribute("data-cat", c); dots.appendChild(dot); } });
              cell.appendChild(dots);
              cell.title = evs.map(function (s) { return s.title; }).join("\n");
            }
            cell.addEventListener("click", function () { state.sel = key; dateEl.value = key; drawCal(); drawDay(); });
            grid.appendChild(cell);
          })(d);
        }
      }
      function drawDay() {
        var p = H.parseKey(state.sel);
        dayTitle.textContent = state.sel + " (" + H.DOW[p.getDay()] + ")";
        H.clear(dayList);
        var evs = visible().filter(function (s) { return s.date === state.sel; });
        if (!evs.length) { dayList.appendChild(ui.empty("이 날의 일정이 없습니다.")); return; }
        evs.sort(function (a, b) { return (a.time || "") < (b.time || "") ? -1 : ((a.time || "") > (b.time || "") ? 1 : 0); });
        evs.forEach(function (s) {
          var row = el("div", "upcoming-item");
          var chip = el("span", "cat-chip", s.cat || "개인"); chip.setAttribute("data-cat", s.cat || "개인");
          row.appendChild(chip);
          if (s.source === "tasks") {
            row.classList.toggle("done", s.done);
            var tcb = el("input"); tcb.type = "checkbox"; tcb.checked = s.done; tcb.setAttribute("aria-label", s.title + (s.done ? " 완료 취소" : " 완료"));
            tcb.addEventListener("change", function () {
              App.gtasks.setDone(s.id, tcb.checked).catch(function (err) { tcb.checked = !tcb.checked; window.alert("Google 저장 실패: " + App.gtasks.explain(err)); });
            });
            row.insertBefore(tcb, chip);
            row.appendChild(el("span", "u-title", s.title));
            row.appendChild(el("span", "u-date", "Google 할 일"));
          } else if (s.source === "google") {
            var t = el("span", "u-title");
            if (s.link) { var a = el("a", "", s.title); a.href = s.link; a.target = "_blank"; a.rel = "noopener noreferrer"; t.appendChild(a); } else { t.textContent = s.title; }
            row.appendChild(t);
            row.appendChild(el("span", "u-date", (s.allDay ? "종일" : s.time) + " · Google" + (s.calName ? " · " + s.calName : "")));
          } else {
            row.appendChild(el("span", "u-title", s.title));
            var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제";
            del.addEventListener("click", function () { scheduleRef.doc(s.id).delete().catch(function (e) { window.alert("삭제 실패: " + e.message); }); });
            row.appendChild(del);
          }
          dayList.appendChild(row);
        });
      }
      prev.addEventListener("click", function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); drawCal(); });
      next.addEventListener("click", function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); drawCal(); });
      today.addEventListener("click", function () { state.month = new Date(); state.month.setDate(1); state.sel = H.todayStr(); dateEl.value = state.sel; drawCal(); drawDay(); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var t = titleEl.value.trim();
        if (!t || !dateEl.value) { return; }
        if (catEl.value === TASK) {
          App.gtasks.add(t, dateEl.value, "").catch(function (err) { window.alert("Google 할 일 저장 실패: " + App.gtasks.explain(err)); });
        } else {
          scheduleRef.add({ date: dateEl.value, title: t, cat: catEl.value, note: "", createdAt: new Date().toISOString() }).catch(function (err) { window.alert("저장 실패: " + err.message); });
        }
        titleEl.value = "";
        state.sel = dateEl.value;
        var d = H.parseKey(state.sel); state.month = new Date(d.getFullYear(), d.getMonth(), 1);
      });
      /* ---------- Google Calendar connection (read-only) ---------- */
      var gStatus = el("p", "hint");
      var gRow = el("div", "items-tools");
      var gConnect = el("button", "btn", "Google 캘린더 연결 · 동기화"); gConnect.type = "button";
      var gClear = el("button", "tool-btn", "연결 정보 지우기"); gClear.type = "button";
      gClear.title = "이 브라우저에 저장된 1시간짜리 접근 토큰만 지워요";
      gRow.appendChild(gConnect); gRow.appendChild(gClear);
      var gMsg = el("p", "hint");
      var gCals = el("div", "plain-list");
      var help = el("details", "reco-settings");
      help.appendChild(el("summary", "", "처음 한 번만 설정 · 자세한 안내"));
      var GUIDE = [
        { t: "1. Google Calendar API 켜기 (1분, 한 번만)", lines: [
          ["link", "이 링크 열기 (Google Cloud 콘솔 · Calendar API 페이지)", "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=hello-dear-sunny"],
          "이 사이트를 만들 때 Firebase 프로젝트를 만든 구글 계정으로 로그인돼 있어야 해요. '권한이 없습니다'가 나오면 오른쪽 위 프로필에서 다른 계정으로 바꿔 다시 열어 주세요.",
          "화면 위쪽 프로젝트 이름이 hello-dear-sunny인지 확인하고, 파란 '사용' 버튼을 누르세요. 'API 사용 설정됨' 표시가 나오면 끝이에요.",
          "처음 켜면 반영에 1~2분 걸릴 수 있어요."
        ] },
        { t: "2. (막힐 때만) 테스트 사용자 추가", lines: [
          ["link", "OAuth 동의 화면 열기", "https://console.cloud.google.com/apis/credentials/consent?project=hello-dear-sunny"],
          "게시 상태가 '테스트'라면 [대상(Audience)] 메뉴의 '테스트 사용자'에 이 사이트에 로그인하는 구글 계정을 추가하세요. (게시 상태가 '프로덕션'이면 이 단계는 건너뛰어도 돼요.)",
          "연결할 때 'access_denied' 또는 '액세스 차단됨' 오류가 나면 이 단계가 필요해요."
        ] },
        { t: "3. 캘린더 연결하기", lines: [
          "위의 [Google 캘린더 연결 · 동기화] 버튼을 누르면 구글 로그인 팝업이 떠요. 이 사이트에 로그인한 것과 같은 계정을 고르세요.",
          "'Google에서 확인하지 않은 앱' 경고가 나오면 왼쪽 아래 '고급' → 'hello-dear-sunny(안전하지 않음)(으)로 이동'을 누르세요. 내가 직접 만든 앱이라 나오는 정상 경고예요.",
          "권한 목록에서 'Google 캘린더의 모든 캘린더 보기'(읽기 전용)에 체크하고 '계속'을 누르세요. 일정을 수정하거나 지우는 권한은 요청하지 않아요.",
          "팝업이 닫히면 잠시 뒤 '동기화 완료 · 일정 N개'가 표시돼요."
        ] },
        { t: "4. 가져올 캘린더와 분류 고르기", lines: [
          "처음에는 기본 캘린더만 켜져 있어요. 아래 목록에서 더 가져올 캘린더(공휴일, 공유 캘린더 등)를 체크하세요.",
          "캘린더마다 분류(개인 · 논문 · 글쓰기 · 회사)를 정해 두면, 그 분류의 다가오는 일정 카드에도 자동으로 나타나요. 예) 회사 캘린더 → 회사, 학교 일정 캘린더 → 논문."
        ] },
        { t: "5. 평소에 쓰는 법", lines: [
          "가져온 일정은 내 Firestore에 복사돼 있어서, 다른 기기에서도 그대로 보여요.",
          "연결 정보(접근 토큰)는 약 1시간 뒤 만료돼요. 만료되면 이미 가져온 일정은 그대로 남고, 새 일정을 보려면 [연결 · 동기화]를 다시 누르면 돼요. (이미 허용했다면 팝업이 금방 닫혀요.)",
          "구글 캘린더에서 일정을 지우거나 바꾼 것은 다음 동기화 때 반영돼요. 이 사이트에서 구글 캘린더로 일정을 보내지는 않아요."
        ] },
        { t: "문제 해결", lines: [
          "'Google Calendar API가 아직 켜져 있지 않아요' → 1번을 하고 1~2분 뒤 다시 시도하세요.",
          "팝업이 안 뜨거나 바로 닫힘 → 주소창 오른쪽의 '팝업 차단됨'을 허용하세요. Claude 앱 내장 브라우저에서는 로그인 팝업이 막힐 수 있으니 Chrome · Edge에서 열어 주세요.",
          "'다른 Google 계정을 선택하셨어요' → 이 사이트에 로그인한 계정과 같은 계정을 고르세요.",
          "'연결이 만료됐어요' → [연결 · 동기화]를 다시 누르세요.",
          "일정이 안 보임 → 아래 목록에서 해당 캘린더가 켜져 있는지, 위쪽 분류 필터가 '전체'인지 확인하세요. 동기화 범위는 지난 31일 ~ 앞으로 120일이에요."
        ] },
        { t: "연결 끊기 · 개인정보", lines: [
          "[연결 정보 지우기]는 이 브라우저의 1시간짜리 토큰만 지워요.",
          ["link", "구글 계정의 앱 권한 페이지", "https://myaccount.google.com/permissions"],
          "에서 hello-dear-sunny를 삭제하면 권한이 완전히 취소돼요. 가져온 일정 사본은 내 Firestore(본인 계정만 접근)에만 저장돼요."
        ] }
      ];
      var guideBox = el("div", "guide");
      GUIDE.forEach(function (sec) {
        guideBox.appendChild(el("h4", "guide-title", sec.t));
        var ul = el("ul", "guide-list");
        sec.lines.forEach(function (ln) {
          var li = el("li");
          if (Array.isArray(ln)) { var a = el("a", "", ln[1]); a.href = ln[2]; a.target = "_blank"; a.rel = "noopener noreferrer"; li.appendChild(a); }
          else { li.textContent = ln; }
          ul.appendChild(li);
        });
        guideBox.appendChild(ul);
      });
      help.appendChild(guideBox);
      [gStatus, gRow, gMsg, gCals, help].forEach(function (n) { gCard.body.appendChild(n); });

      var gBusy = false, autoTried = false;
      function drawG() {
        var d = state.gdoc, tok = App.gcal.token();
        var left = tok ? Math.max(1, Math.round((tok.exp - Date.now()) / 60000)) : 0;
        gStatus.textContent = (tok ? "연결됨 (약 " + left + "분 더 유효)" : "연결 안 됨") + " · " +
          (d && d.syncedAt ? "마지막 동기화 " + H.fmtDateTime(d.syncedAt) + " · 일정 " + ((d.events || []).length) + "개" : "아직 동기화한 적 없음");
        H.clear(gCals);
        var cals = (d && d.calendars) || [];
        if (cals.length) { gCals.appendChild(el("div", "mini-title", "가져올 캘린더 · 분류")); }
        cals.forEach(function (c, i) {
          var row = el("div", "upcoming-item");
          var cb = el("input"); cb.type = "checkbox"; cb.checked = !!c.on; cb.setAttribute("aria-label", c.name + " 가져오기");
          var sel = el("select"); sel.setAttribute("aria-label", c.name + " 분류");
          App.CATS.forEach(function (cat) { var o = el("option", "", cat); o.value = cat; sel.appendChild(o); });
          sel.value = c.cat || "개인";
          row.appendChild(cb); row.appendChild(el("span", "u-title", c.name + (c.primary ? " (기본)" : ""))); row.appendChild(sel);
          function saveChoice(needFetch) {
            var next = cals.map(function (x, j) { return j === i ? Object.assign({}, x, { on: cb.checked, cat: sel.value }) : x; });
            App.gcal.saveCalendars(next).then(function () {
              if (needFetch && App.gcal.token()) { runSync(); }
              else { gMsg.textContent = needFetch ? "설정을 저장했어요. '연결 · 동기화'를 누르면 반영돼요." : "분류를 저장했어요."; }
            }).catch(function (err) { window.alert("저장 실패: " + err.message); });
          }
          cb.addEventListener("change", function () { saveChoice(true); });
          sel.addEventListener("change", function () { saveChoice(false); });
          gCals.appendChild(row);
        });
      }
      async function runSync() {
        if (gBusy) { return; }
        gBusy = true; gConnect.disabled = true; gMsg.textContent = "Google 캘린더에서 일정을 가져오는 중…";
        try {
          var r = await App.gcal.sync();
          gMsg.textContent = "동기화 완료 · 일정 " + r.events.length + "개를 가져왔어요.";
        } catch (err) { gMsg.textContent = App.gcal.explain(err); }
        gBusy = false; gConnect.disabled = false; drawG();
      }
      gConnect.addEventListener("click", runSync);
      gClear.addEventListener("click", function () { App.gcal.clearToken(); gMsg.textContent = "이 브라우저의 연결 정보를 지웠어요. (동기화된 일정은 그대로 남아 있어요.)"; drawG(); });

      drawCal(); drawDay(); drawG();
      App.watchQuery(scheduleRef.orderBy("date", "asc"), function (items) { state.items = items; drawCal(); drawDay(); });
      App.watchDoc(App.doc("personal/gtasks"), function (d) { state.tasks = d; drawCal(); drawDay(); });
      App.watchDoc(App.doc("personal/gcal"), function (d) {
        state.gdoc = d; drawCal(); drawDay(); drawG();
        if (!autoTried && App.gcal.token() && (!d || !d.syncedAt || Date.now() - new Date(d.syncedAt).getTime() > 300000)) { autoTried = true; runSync(); }
      });
    }
  });

  /* =========================================================
     개인 — 주간 리뷰
     ========================================================= */
  App.page({
    id: "personal-weekly", title: "주간 리뷰",
    desc: "일주일에 한 번, 잘한 것 · 막힌 것 · 배운 것을 적고 다음 주 목표를 정해 보세요. 10분이면 충분해요.",
    render: function (view) {
      var c = ui.card(view, { tab: "Weekly", tone: "t-1", title: "주간 리뷰" });
      ui.itemsPanel(c.body, {
        ref: doc("personal/weekly"), views: ["cards", "table"], statusKey: "mood", addLabel: "+ 이번 주 리뷰 쓰기", empty: "아직 리뷰가 없습니다. 이번 주를 돌아보며 한 줄이라도 남겨 보세요.",
        statusTones: { "매우 좋음": 3, "좋음": 2, "보통": 1, "힘듦": 0, "매우 힘듦": 0 },
        itemTitle: function (it) { return (it.week || "") + " 주"; },
        sort: function (a, b) { return String(b.week || "").localeCompare(String(a.week || "")); },
        fields: [
          { key: "week", label: "주 시작일 (월요일)", type: "date", title: true, required: true, col: true, default: function () { return H.mondayKey(); } },
          { key: "mood", label: "컨디션", type: "select", options: ["매우 좋음", "좋음", "보통", "힘듦", "매우 힘듦"], col: true },
          { key: "wins", label: "이번 주 잘한 것", type: "textarea", col: true },
          { key: "issues", label: "아쉬운 점 · 막힌 것", type: "textarea", col: true },
          { key: "learned", label: "배운 것", type: "textarea" },
          { key: "goals", label: "다음 주 목표 (3가지)", type: "textarea", col: true }
        ]
      });
    }
  });

})(window.App);
