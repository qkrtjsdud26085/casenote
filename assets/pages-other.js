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
     지나간 할 일 — Google Tasks whose due date has passed but are not done yet
     ========================================================= */
  function overdueCard(parent) {
    var G = App.gtasks, S = { cache: null, busy: false };
    var c = ui.card(parent, { tab: "Overdue", tone: "t-2", title: "지나간 할 일" });
    c.el.classList.add("overdue-card");
    var msg = el("p", "hint todo-msg"), list = el("div", "plain-list overdue-list");
    c.body.appendChild(msg); c.body.appendChild(list);
    function draw() {
      var t = H.todayStr();
      var items = ((S.cache && S.cache.items) || []).filter(function (x) { return x.status !== "completed" && x.due && String(x.due).slice(0, 10) < t; })
        .sort(function (a, b) { return a.due < b.due ? -1 : 1; });
      c.count.textContent = items.length ? items.length + "개" : "";
      H.clear(list);
      if (!items.length) { list.appendChild(ui.empty(S.cache ? "밀린 할 일이 없어요." : "Google 할 일과 연결하면 여기에 보여요.")); return; }
      items.forEach(function (x) {
        var r = el("div", "todo-item");
        var cb = el("input"); cb.type = "checkbox"; cb.disabled = S.busy; cb.setAttribute("aria-label", x.title + " 완료");
        cb.addEventListener("change", function () {
          S.busy = true; msg.textContent = "완료 처리 중…"; draw();
          G.setDone(x.id, true).then(function () { S.busy = false; msg.textContent = ""; draw(); }, function (err) { S.busy = false; msg.textContent = G.explain(err); draw(); });
        });
        r.appendChild(cb);
        var main = el("span", "todo-text");
        main.appendChild(document.createTextNode(x.title));
        if (x.notes) { main.appendChild(el("span", "mini-sub todo-notes", x.notes)); }
        r.appendChild(main);
        r.appendChild(H.ddayEl(String(x.due).slice(0, 10)));
        list.appendChild(r);
      });
    }
    draw();
    App.watchDoc(App.doc("personal/gtasks"), function (d) { S.cache = d; draw(); });
    /* refresh quietly when a token is still valid */
    if (G.token()) { G.sync().catch(function () {}); }
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
      /* quick add on top (same as 홈) → month grid on the left (a day opens its list) · 기분 + 지나간 할 일 on the right */
      var top = el("div", "cal-top cal-top-mood"), left = el("div", "cal-left"), right = el("div", "cal-right"), rightIn = el("div", "cal-right-in");
      right.appendChild(rightIn); top.appendChild(left); top.appendChild(right);
      /* once a day: syncs by itself while the Google connection is alive; otherwise one button (Google needs a click to reconnect) */
      var dayBar = el("div", "gsync-bar"); dayBar.hidden = true;
      var dayBtn = el("button", "btn", "지금 동기화"); dayBtn.type = "button";
      dayBar.appendChild(el("span", "", "오늘 Google 캘린더 · 할 일을 아직 가져오지 않았어요.")); dayBar.appendChild(dayBtn);
      App.quickCapture(view).classList.add("cal-capture");
      view.appendChild(dayBar); view.appendChild(top);
      var calCard = ui.card(left, { tab: "Calendar", tone: "t-1", title: "캘린더" });
      var moodCard = ui.card(rightIn, { tab: "Mood", tone: "t-3", title: "오늘의 기분" });
      moodCard.el.classList.add("mood-card");
      var moods = {};
      var picker = App.moodPicker(moodCard.body, {
        date: state.sel, memo: true, week: true, diaryLink: true,
        onDays: function (d) { moods = d; drawCal(); },
        onPickDay: function (k) { pickDay(k); }
      });
      overdueCard(rightIn);
      /* Google · Upcoming: small, side by side, folded until needed */
      var bottom = el("div", "cal-bottom"); view.appendChild(bottom);
      var gCard = ui.card(bottom, { tab: "Google", tone: "t-2", title: "Google 캘린더 연동" });
      gCard.el.classList.add("cal-mini");
      foldable(gCard, "gcal", "Google 캘린더 연동");

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
      var legend = el("div", "cal-legend");
      legend.innerHTML = '<span><i class="event"></i>일정</span><span><i class="task"></i>Google 할 일</span>';
      [filters, head, grid, legend].forEach(function (n) { calCard.body.appendChild(n); });

      /* clicking a day opens a small list of that day's events and tasks under the clicked cell */
      var TASK = "할 일";
      var pop = el("div", "cal-pop"); pop.hidden = true; pop.setAttribute("role", "dialog");
      var popHead = el("div", "cal-pop-head"), popTitle = el("strong"), popClose = el("button", "icon-btn", "×");
      popClose.type = "button"; popClose.setAttribute("aria-label", "닫기");
      popHead.appendChild(popTitle); popHead.appendChild(popClose);
      var dayList = el("div", "plain-list");
      pop.appendChild(popHead); pop.appendChild(dayList);
      calCard.body.appendChild(pop);
      var popFor = "";
      function closePop() {
        pop.hidden = true; popFor = "";
        var on = grid.querySelector(".cal-cell[aria-expanded='true']"); if (on) { on.setAttribute("aria-expanded", "false"); }
      }
      popClose.addEventListener("click", closePop);
      function onPopKey(e) { if (e.key === "Escape" && !pop.hidden) { closePop(); } }
      function onPopDown(e) { if (!pop.hidden && !pop.contains(e.target) && !grid.contains(e.target)) { closePop(); } }
      document.addEventListener("keydown", onPopKey);
      document.addEventListener("mousedown", onPopDown);
      App.unsubs.push(function () { document.removeEventListener("keydown", onPopKey); document.removeEventListener("mousedown", onPopDown); });

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
            if (moods[key] && moods[key].mood) { var me = el("span", "cal-mood", moods[key].mood); me.title = "기분"; cell.appendChild(me); }
            var evs = byDate[key] || [];
            if (evs.length) {
              /* one dot per item: yellow = calendar event, blue = Google Task */
              var dots = el("span", "cal-dots"), MAX = 6;
              evs.slice().sort(function (a, b) { return (a.source === "tasks") - (b.source === "tasks"); }).slice(0, MAX).forEach(function (s) {
                var dot = el("span", "cal-dot"); dot.setAttribute("data-kind", s.source === "tasks" ? "task" : "event");
                dots.appendChild(dot);
              });
              if (evs.length > MAX) { dots.appendChild(el("span", "cal-more", "+" + (evs.length - MAX))); }
              cell.appendChild(dots);
              var nT = evs.filter(function (s) { return s.source === "tasks"; }).length;
              cell.title = "일정 " + (evs.length - nT) + " · 할 일 " + nT + "\n" + evs.map(function (s) { return (s.source === "tasks" ? "☐ " : "• ") + s.title; }).join("\n");
            }
            cell.setAttribute("data-date", key); cell.setAttribute("aria-expanded", popFor === key ? "true" : "false");
            cell.addEventListener("click", function () { if (popFor === key) { closePop(); } else { pickDay(key, true); } });
            grid.appendChild(cell);
          })(d);
        }
      }
      /* choosing a day moves the calendar and the 기분 card together and opens that day's list */
      function pickDay(key, open) {
        state.sel = key;
        var d = H.parseKey(key); state.month = new Date(d.getFullYear(), d.getMonth(), 1);
        if (key <= H.todayStr()) { picker.setDate(key); }
        if (open) { popFor = key; } else { closePop(); }
        drawCal(); drawDay();
      }
      function drawDay() {
        if (!popFor) { return; }
        var cell = grid.querySelector(".cal-cell[data-date='" + popFor + "']");
        if (!cell) { closePop(); return; }
        var p = H.parseKey(popFor);
        popTitle.textContent = (p.getMonth() + 1) + "월 " + p.getDate() + "일 (" + H.DOW[p.getDay()] + ")";
        H.clear(dayList);
        var day = visible().filter(function (s) { return s.date === popFor; });
        if (!day.length) { dayList.appendChild(ui.empty("이 날의 일정이 없어요.")); }
        day.sort(function (a, b) {
          return ((a.source === "tasks") - (b.source === "tasks")) || ((a.time || "") < (b.time || "") ? -1 : ((a.time || "") > (b.time || "") ? 1 : 0));
        });
        day.forEach(function (s) {
          var row = el("div", "upcoming-item" + (s.done ? " done" : ""));
          if (s.source === "tasks") {
            var cb = el("input"); cb.type = "checkbox"; cb.checked = !!s.done; cb.setAttribute("aria-label", s.title + (s.done ? " 완료 취소" : " 완료"));
            cb.addEventListener("change", function () { App.gtasks.setDone(s.id, cb.checked).catch(function (err) { cb.checked = !cb.checked; window.alert("Google 저장 실패: " + App.gtasks.explain(err)); }); });
            row.appendChild(cb);
            row.appendChild(el("span", "u-title", s.title));
            row.appendChild(el("span", "u-date", "할 일"));
          } else {
            var chip = el("span", "cat-chip", s.cat || "개인"); chip.setAttribute("data-cat", s.cat || "개인");
            row.appendChild(chip);
            var t = el("span", "u-title");
            if (s.link) { var a = el("a", "", s.title); a.href = s.link; a.target = "_blank"; a.rel = "noopener noreferrer"; t.appendChild(a); } else { t.textContent = s.title; }
            row.appendChild(t);
            if (s.source === "google") { row.appendChild(el("span", "u-date", s.allDay ? "종일" : s.time)); }
            else {
              if (s.time) { row.appendChild(el("span", "u-date", s.time)); }
              var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제"; del.setAttribute("aria-label", s.title + " 삭제");
              del.addEventListener("click", function () { scheduleRef.doc(s.id).delete().catch(function (e) { window.alert("삭제 실패: " + e.message); }); });
              row.appendChild(del);
            }
          }
          dayList.appendChild(row);
        });
        /* place the box under the clicked day, kept inside the card */
        pop.hidden = false;
        var body = calCard.body.getBoundingClientRect(), r = cell.getBoundingClientRect();
        var w = Math.min(300, body.width);
        pop.style.width = w + "px";
        pop.style.left = Math.max(0, Math.min(r.left - body.left, body.width - w)) + "px";
        pop.style.top = (r.bottom - body.top + 4) + "px";
      }
      prev.addEventListener("click", function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); closePop(); drawCal(); });
      next.addEventListener("click", function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); closePop(); drawCal(); });
      today.addEventListener("click", function () { pickDay(H.todayStr()); });
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
          /* the same connection also brings in Google Tasks */
          try {
            var tasks = await App.gtasks.sync();
            gMsg.textContent += " · 할 일 " + tasks.length + "개";
          } catch (terr) { gMsg.textContent += " · 할 일은 못 가져왔어요: " + App.gtasks.explain(terr); }
        } catch (err) { gMsg.textContent = App.gcal.explain(err); }
        gBusy = false; gConnect.disabled = false; drawG(); drawDayBar();
      }
      function drawDayBar() {
        var d = state.gdoc, synced = d && d.syncedAt && H.dateKey(new Date(d.syncedAt)) === H.todayStr();
        dayBar.hidden = !!synced || gBusy;
      }
      dayBtn.addEventListener("click", runSync);
      gConnect.addEventListener("click", runSync);
      gClear.addEventListener("click", function () { App.gcal.clearToken(); gMsg.textContent = "이 브라우저의 연결 정보를 지웠어요. (동기화된 일정은 그대로 남아 있어요.)"; drawG(); });

      drawCal(); drawDay(); drawG();
      App.watchQuery(scheduleRef.orderBy("date", "asc"), function (items) { state.items = items; drawCal(); drawDay(); });
      App.watchDoc(App.doc("personal/gtasks"), function (d) { state.tasks = d; drawCal(); drawDay(); });
      App.watchDoc(App.doc("personal/gcal"), function (d) {
        state.gdoc = d; drawCal(); drawDay(); drawG(); drawDayBar();
        if (!autoTried && App.gcal.token() && (!d || !d.syncedAt || Date.now() - new Date(d.syncedAt).getTime() > 300000)) { autoTried = true; runSync(); }
      });
    }
  });

  /* =========================================================
     개인 — 주간 리뷰
     ========================================================= */
  /* 주간 리뷰 위쪽: 왼쪽 달력(그날 기분 이모티콘 · 일기 쓴 날 표시) → 오른쪽에 고른 날 일기 짧은 요약 */
  function reviewSection(view) {
    var moods = {}, diary = {}, month = H.todayStr().slice(0, 7), picked = H.todayStr(), cache = {};
    var g = ui.grid(view, true);
    g.classList.add("mood-review");
    var cc = ui.card(g, { tab: "Calendar", tone: "t-2", title: "달력" });
    var cNav = el("div", "mcal-nav"), grid = el("div", "mcal");
    cc.body.appendChild(cNav); cc.body.appendChild(grid);
    cc.body.appendChild(el("p", "hint mcal-legend", "이모티콘은 그날 기분, 날짜에 밑줄이 있으면 일기를 쓴 날이에요. 날짜를 누르면 오른쪽에 그날 일기 요약이 보여요."));
    var dc = ui.card(g, { tab: "Diary", tone: "t-1", title: "그날 일기" });
    var detail = el("div", "review-diary"); dc.body.appendChild(detail);

    function navBtn(parent, label, aria, fn) {
      var b = el("button", "tool-btn", label); b.type = "button"; b.setAttribute("aria-label", aria);
      b.addEventListener("click", fn); parent.appendChild(b); return b;
    }
    function fmtDay(k) { var d = H.parseKey(k); return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + H.DOW[d.getDay()] + ")"; }
    function moodName(m) { var hit = (App.MOODS || []).filter(function (x) { return x[0] === m; })[0]; return hit ? hit[1] : ""; }
    function hasDiary(k) { return !!(diary[k] && diary[k].chars > 0); }

    function paintCal() {
      H.clear(cNav); H.clear(grid);
      var first = H.parseKey(month + "-01");
      navBtn(cNav, "‹", "지난달", function () { month = H.dateKey(new Date(first.getFullYear(), first.getMonth() - 1, 1)).slice(0, 7); paintCal(); });
      cNav.appendChild(el("span", "mcal-label", first.getFullYear() + "년 " + (first.getMonth() + 1) + "월"));
      var nx = navBtn(cNav, "›", "다음 달", function () { month = H.dateKey(new Date(first.getFullYear(), first.getMonth() + 1, 1)).slice(0, 7); paintCal(); });
      nx.disabled = month >= H.todayStr().slice(0, 7);
      H.DOW.forEach(function (w) { grid.appendChild(el("span", "mcal-dow", w)); });
      for (var b = 0; b < first.getDay(); b++) { grid.appendChild(el("span", "mcal-blank")); }
      var last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      for (var n = 1; n <= last; n++) {
        var k = month + "-" + H.pad2(n), d = moods[k] || {};
        var cell = el("button", "mcal-day" + (k === picked ? " on" : "") + (k === H.todayStr() ? " today" : "") + (d.mood || hasDiary(k) ? " has" : "") + (hasDiary(k) ? " diary" : ""));
        cell.type = "button"; cell.setAttribute("data-date", k);
        cell.setAttribute("aria-label", fmtDay(k) + (d.mood ? " " + moodName(d.mood) : "") + (hasDiary(k) ? " · 일기 있음" : ""));
        cell.appendChild(el("span", "mcal-num", String(n)));
        cell.appendChild(el("span", "mcal-emo", d.mood || ""));
        cell.disabled = k > H.todayStr();
        cell.addEventListener("click", (function (key) { return function () { picked = key; paintCal(); paintDetail(); }; })(k));
        grid.appendChild(cell);
      }
    }
    function paintDetail() {
      var k = picked, m = moods[k] || {}, ix = diary[k];
      H.clear(detail);
      dc.head.querySelector("h2").textContent = (k === H.todayStr() ? "오늘 · " : "") + fmtDay(k) + " 일기";
      var top = el("div", "review-mood");
      top.appendChild(el("span", "review-mood-emo", m.mood || "·"));
      top.appendChild(el("span", "", m.mood ? moodName(m.mood) : "기분 기록 없음"));
      detail.appendChild(top);
      if (m.note) { detail.appendChild(el("p", "review-memo", "“" + m.note + "”")); }
      var sum = el("p", "review-sum"); detail.appendChild(sum);
      if (!ix || !ix.chars) { sum.classList.add("empty"); sum.textContent = "이 날은 쓴 일기가 없어요."; }
      else if (ix.summary) { sum.textContent = ix.summary; }
      else if (cache[k] !== undefined) { sum.textContent = cache[k]; }
      else {
        sum.textContent = "요약하는 중…";
        App.doc("personal/diary_" + k).get().then(function (snap) {
          var box = document.createElement("div"); box.innerHTML = App.cleanHTML((snap.exists && snap.data().html) || "");
          cache[k] = App.summarizeDiary(box.textContent || "");
          if (picked === k) { paintDetail(); }
        }).catch(function () { sum.textContent = ix.preview || ""; });
      }
      if (ix && ix.chars) { detail.appendChild(el("div", "mini-sub review-chars", "전체 " + ix.chars.toLocaleString("ko-KR") + "자 · 자동 요약")); }
      var a = el("a", "more-link", ix && ix.chars ? "일기 전체 보기 →" : "이 날 일기 쓰기 →"); a.href = "#/personal-diary";
      a.addEventListener("click", function () { H.safeSet("hds_diary_date", k); });
      detail.appendChild(a);
    }
    paintCal(); paintDetail();
    App.watchDoc(App.doc("personal/mood"), function (d) { moods = (d && d.days) || {}; paintCal(); paintDetail(); });
    App.watchDoc(App.doc("personal/diary"), function (d) { diary = (d && d.days) || {}; paintCal(); paintDetail(); });
  }

  App.page({
    id: "personal-weekly", title: "주간 리뷰",
    desc: "일주일에 한 번, 잘한 것 · 막힌 것 · 배운 것을 적고 다음 주 목표를 정해 보세요. 10분이면 충분해요.",
    render: function (view) {
      reviewSection(view);
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
