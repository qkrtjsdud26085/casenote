/* Hello dear Sunny — 작가 · 개인 · 회사 pages */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;
  var doc = function (path) { return App.doc(path); };
  function countBy(items, key, first) {
    var m = {};
    items.forEach(function (it) { var v = it[key] || first; m[v] = (m[v] || 0) + 1; });
    return m;
  }

  /* =========================================================
     작가
     ========================================================= */
  App.page({
    id: "writer-works", title: "작품 관리",
    desc: "구상 중인 작품부터 완결작까지, 진행 상태와 분량을 한눈에 관리합니다. 상태 칩을 누르면 구상 → 집필중 → 퇴고 → 완결로 바뀌어요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Works", tone: "t-1", title: "작품 · 원고", wide: true });
      ui.itemsPanel(c1.body, {
        ref: doc("writer/works"), views: ["cards", "table"], search: true, statusKey: "status", filters: ["status"], grid: true,
        addLabel: "+ 작품 추가", empty: "아직 작품이 없습니다. 첫 작품을 추가해 보세요.",
        fields: [
          { key: "title", label: "작품 제목", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "status", label: "진행 상태", type: "select", options: ["구상", "집필중", "퇴고", "완결"], col: true },
          { key: "genre", label: "장르", type: "text", meta: true, col: true, maxLength: 40 },
          { key: "logline", label: "로그라인 (한 문장 요약)", type: "textarea", rows: 2 },
          { key: "target", label: "목표 분량 (자)", type: "number", col: true, step: 100, hideInCard: true },
          { key: "current", label: "현재 분량 (자)", type: "number", col: true, step: 100, hideInCard: true },
          { key: "note", label: "메모 · 한 줄 소개", type: "textarea", rows: 2 }
        ],
        itemExtra: function (it) {
          var t = Number(it.target) || 0;
          if (!t) { return null; }
          var cur = Number(it.current) || 0;
          return ui.progress(Math.min(100, Math.round(cur / t * 100)), cur.toLocaleString("ko-KR") + " / " + t.toLocaleString("ko-KR") + "자");
        },
        summary: function (items) {
          var m = countBy(items, "status", "구상");
          return items.length ? "총 " + items.length + "편 · 집필중 " + (m["집필중"] || 0) + " · 퇴고 " + (m["퇴고"] || 0) + " · 완결 " + (m["완결"] || 0) : "";
        }
      });
      var c2 = ui.card(g, { tab: "Upcoming", tone: "t-3", title: "공모전 · 투고 마감" });
      ui.upcoming(c2.body, "글쓰기", 6);
    }
  });

  var PLOT = [
    { label: "3막 구조", text: "1막(약 25%) 일상 · 문제 제시 → 기폭 사건 → 1막 전환점\n2막(약 50%) 갈등 상승 → 중간 전환점 → 최악의 순간\n3막(약 25%) 클라이맥스 → 결말" },
    { label: "로그라인 공식", text: "[주인공]이 [사건]을 겪고, [목표]를 이루려 하지만 [장애물] 때문에 [위험]에 처한다." },
    { label: "장면 카드", text: "장면 목표 / 갈등(방해물) / 결과(성공 · 실패 · 복선) / 감정 변화 / 다음 장면으로 이어지는 질문" },
    { label: "인물에게 던질 질문", text: "가장 원하는 것은? 가장 두려워하는 것은? 숨기고 있는 것은? 결정적 결함은? 이야기가 끝났을 때 무엇이 달라지는가?" },
    { label: "퇴고 체크", text: "장면마다 목적이 있는가 · 정보의 과다 / 누락 · 시점 일관성 · 대사와 지문의 균형 · 첫 문장과 마지막 문장" }
  ];
  App.page({
    id: "writer-ideas", title: "글감 · 설정 노트",
    desc: "떠오른 문장과 소재, 인물 · 세계관 설정을 모아 둡니다. 플롯 템플릿은 복사해서 바로 쓸 수 있어요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Ideas", tone: "t-3", title: "글감 · 아이디어" });
      ui.itemsPanel(c1.body, {
        ref: doc("writer/ideas"), timestamp: true, search: true, addLabel: "+ 글감 추가", empty: "떠오른 글감이 아직 없습니다.",
        sort: function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); },
        itemMeta: function (it) { return it.createdAt ? [H.fmtDateTime(it.createdAt)] : []; },
        fields: [
          { key: "text", label: "글감", type: "textarea", title: true, required: true, rows: 3, maxLength: 600 },
          { key: "tags", label: "태그 (쉼표로 구분)", type: "tags", meta: true }
        ]
      });
      var c2 = ui.card(g, { tab: "Characters", tone: "t-1", title: "인물 · 설정 노트" });
      ui.itemsPanel(c2.body, {
        ref: doc("writer/characters"), search: true, filters: ["role"], addLabel: "+ 인물·설정 추가", empty: "인물 · 세계관 설정을 추가해 보세요.",
        fields: [
          { key: "name", label: "이름 · 항목", type: "text", title: true, required: true, maxLength: 80 },
          { key: "role", label: "구분", type: "select", options: ["주인공", "조연", "적대자", "장소 · 세계관", "기타"], meta: true },
          { key: "traits", label: "성격 · 외형 · 특징", type: "textarea" },
          { key: "motivation", label: "욕망 · 결핍", type: "textarea" },
          { key: "arc", label: "변화(아크)", type: "textarea" },
          { key: "notes", label: "메모", type: "textarea" }
        ]
      });
      var c3 = ui.card(g, { tab: "Template", tone: "t-2", title: "플롯 · 퇴고 템플릿 (복사 가능)", wide: true });
      ui.refList(c3.body, PLOT);
    }
  });

  App.page({
    id: "writer-log", title: "집필 기록",
    desc: "매일 쓴 분량을 남기면 목표 달성률과 연속 집필 일수, 최근 7일 흐름을 보여줍니다.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Daily", tone: "t-2", title: "창작 집필 기록" });
      ui.writingLog(c1.body, { ref: doc("writer/log"), goal: 1000, unit: "자" });
      var c2 = ui.card(g, { tab: "Upcoming", tone: "t-1", title: "공모전 · 투고 마감" });
      ui.upcoming(c2.body, "글쓰기", 6);
    }
  });

  /* =========================================================
     개인 — 일정 · 캘린더
     ========================================================= */
  App.page({
    id: "personal-calendar", title: "일정 · 캘린더",
    desc: "월간 캘린더에서 날짜를 눌러 일정을 보고 추가합니다. 분류(개인 · 논문 · 글쓰기 · 회사)는 다른 메뉴의 '다가오는 일정'에도 함께 나타나요.",
    render: function (view) {
      var scheduleRef = App.col("schedule");
      var state = { month: new Date(), sel: H.todayStr(), items: [], cat: "전체" };
      state.month.setDate(1);
      var g = ui.grid(view, true);
      var calCard = ui.card(g, { tab: "Calendar", tone: "t-1", title: "월간 캘린더" });
      var dayCard = ui.card(g, { tab: "Day", tone: "t-2", title: "선택한 날" });
      var upCard = ui.card(g, { tab: "Upcoming", tone: "t-3", title: "다가오는 일정 (전체)", wide: true });
      ui.upcoming(upCard.body, "*", 10);

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
      var catEl = el("select"); App.CATS.forEach(function (c) { var o = el("option", "", c); o.value = c; catEl.appendChild(o); });
      var titleEl = el("input"); titleEl.placeholder = "일정 제목"; titleEl.maxLength = 80; titleEl.required = true;
      var addBtn = el("button", "btn", "추가"); addBtn.type = "submit";
      [dateEl, catEl, titleEl, addBtn].forEach(function (n) { form.appendChild(n); });
      var dayList = el("div", "plain-list");
      [dayTitle, form, dayList].forEach(function (n) { dayCard.body.appendChild(n); });

      function visible() { return state.items.filter(function (s) { return state.cat === "전체" || (s.cat || "개인") === state.cat; }); }
      function drawCal() {
        H.clear(filters);
        ["전체"].concat(App.CATS).forEach(function (c) {
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
        evs.forEach(function (s) {
          var row = el("div", "upcoming-item");
          var chip = el("span", "cat-chip", s.cat || "개인"); chip.setAttribute("data-cat", s.cat || "개인");
          row.appendChild(chip);
          row.appendChild(el("span", "u-title", s.title));
          var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제";
          del.addEventListener("click", function () { scheduleRef.doc(s.id).delete().catch(function (e) { window.alert("삭제 실패: " + e.message); }); });
          row.appendChild(del); dayList.appendChild(row);
        });
      }
      prev.addEventListener("click", function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); drawCal(); });
      next.addEventListener("click", function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); drawCal(); });
      today.addEventListener("click", function () { state.month = new Date(); state.month.setDate(1); state.sel = H.todayStr(); dateEl.value = state.sel; drawCal(); drawDay(); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var t = titleEl.value.trim();
        if (!t || !dateEl.value) { return; }
        scheduleRef.add({ date: dateEl.value, title: t, cat: catEl.value, note: "", createdAt: new Date().toISOString() }).catch(function (err) { window.alert("저장 실패: " + err.message); });
        titleEl.value = "";
        state.sel = dateEl.value;
        var d = H.parseKey(state.sel); state.month = new Date(d.getFullYear(), d.getMonth(), 1);
      });
      drawCal(); drawDay();
      App.watchQuery(scheduleRef.orderBy("date", "asc"), function (items) { state.items = items; drawCal(); drawDay(); });
    }
  });

  /* =========================================================
     개인 — 할 일
     ========================================================= */
  App.page({
    id: "personal-todos", title: "할 일",
    desc: "가볍게 적고 체크하는 할 일 목록입니다. 기한을 넣으면 D-day가 표시돼요.",
    render: function (view) {
      var ref = App.col("todos");
      var TODOS = [], openOnly = false;
      var c = ui.card(view, { tab: "To-do", tone: "t-2", title: "할 일" });
      var form = el("form", "quick-add");
      var input = el("input"); input.placeholder = "새 할 일 입력 후 Enter"; input.maxLength = 200; input.required = true;
      var due = el("input", "w-date"); due.type = "date"; due.title = "기한 (선택)"; due.setAttribute("aria-label", "기한");
      var add = el("button", "btn", "추가"); add.type = "submit";
      [input, due, add].forEach(function (n) { form.appendChild(n); });
      var tools = el("div", "items-tools");
      var fbtn = el("button", "tool-btn", "미완료만 보기"); fbtn.type = "button";
      var cbtn = el("button", "tool-btn", "완료 항목 삭제"); cbtn.type = "button";
      tools.appendChild(fbtn); tools.appendChild(cbtn);
      var prog = el("div"); var list = el("div", "plain-list");
      [form, tools, prog, list].forEach(function (n) { c.body.appendChild(n); });

      function draw() {
        var open = TODOS.filter(function (t) { return !t.done; }).length;
        c.count.textContent = TODOS.length ? open + " / " + TODOS.length : "";
        H.clear(prog);
        if (TODOS.length) { var pct = Math.round((TODOS.length - open) / TODOS.length * 100); prog.appendChild(ui.progress(pct, (TODOS.length - open) + "/" + TODOS.length + " 완료")); }
        H.clear(list);
        var items = openOnly ? TODOS.filter(function (t) { return !t.done; }) : TODOS;
        if (!items.length) { list.appendChild(ui.empty(TODOS.length ? "미완료 항목이 없습니다." : "아직 할 일이 없습니다. 위에서 추가해보세요.")); return; }
        items.forEach(function (t) {
          var row = el("div", "todo-item" + (t.done ? " done" : ""));
          var cb = el("input"); cb.type = "checkbox"; cb.checked = !!t.done; cb.setAttribute("aria-label", "완료");
          cb.addEventListener("change", function () { ref.doc(t.id).update({ done: cb.checked }).catch(function () {}); });
          row.appendChild(cb);
          row.appendChild(el("span", "todo-text", t.text));
          if (t.due && !t.done) { row.appendChild(H.ddayEl(t.due)); }
          var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제";
          del.addEventListener("click", function () { ref.doc(t.id).delete().catch(function () {}); });
          row.appendChild(del); list.appendChild(row);
        });
      }
      fbtn.addEventListener("click", function () { openOnly = !openOnly; fbtn.textContent = openOnly ? "전체 보기" : "미완료만 보기"; draw(); });
      cbtn.addEventListener("click", function () {
        var done = TODOS.filter(function (t) { return t.done; });
        if (!done.length) { window.alert("완료된 항목이 없습니다."); return; }
        if (!window.confirm("완료된 " + done.length + "개 항목을 삭제할까요?")) { return; }
        var batch = App.db.batch();
        done.forEach(function (t) { batch.delete(ref.doc(t.id)); });
        batch.commit().catch(function (err) { window.alert("삭제 실패: " + err.message); });
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = input.value.trim();
        if (!text) { return; }
        var payload = { text: text, done: false, createdAt: new Date().toISOString() };
        if (due.value) { payload.due = due.value; }
        ref.add(payload).catch(function (err) { window.alert("저장 실패: " + err.message); });
        input.value = ""; due.value = "";
      });
      draw();
      App.watchQuery(ref.orderBy("createdAt", "asc"), function (items) { TODOS = items; draw(); });
    }
  });

  /* =========================================================
     개인 — 메모
     ========================================================= */
  App.page({
    id: "personal-memos", title: "메모",
    desc: "생각나는 대로 적어 두는 기록장입니다. 검색으로 빠르게 찾을 수 있어요.",
    render: function (view) {
      var ref = App.col("memos");
      var MEMOS = [], q = "";
      var c = ui.card(view, { tab: "Log", tone: "t-3", title: "메모 · 기록" });
      var form = el("form", "quick-add col-form");
      var t = el("input"); t.placeholder = "제목 (선택)"; t.maxLength = 80;
      var b = el("textarea"); b.placeholder = "남길 메모를 적어보세요"; b.rows = 4; b.required = true;
      var add = el("button", "btn", "기록 추가"); add.type = "submit";
      [t, b, add].forEach(function (n) { form.appendChild(n); });
      var tools = el("div", "items-tools");
      var s = el("input"); s.type = "search"; s.placeholder = "메모 검색"; s.setAttribute("aria-label", "메모 검색");
      tools.appendChild(s);
      var list = el("div", "plain-list");
      [form, tools, list].forEach(function (n) { c.body.appendChild(n); });
      function draw() {
        H.clear(list);
        c.count.textContent = MEMOS.length ? MEMOS.length + "개" : "";
        var items = q ? MEMOS.filter(function (m) { return ((m.title || "") + " " + (m.body || "")).toLowerCase().indexOf(q) !== -1; }) : MEMOS;
        if (!items.length) { list.appendChild(ui.empty(q ? "검색 결과가 없습니다." : "기록된 메모가 없습니다.")); return; }
        items.forEach(function (m) {
          var li = el("div", "memo-item"), head = el("div", "memo-item-head");
          head.appendChild(el("span", "memo-title", m.title && m.title.length ? m.title : "(제목 없음)"));
          head.appendChild(el("span", "memo-date", H.fmtDateTime(m.createdAt)));
          var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제";
          del.addEventListener("click", function () { if (window.confirm("이 메모를 삭제할까요?")) { ref.doc(m.id).delete().catch(function () {}); } });
          head.appendChild(del); li.appendChild(head); li.appendChild(el("div", "memo-body", m.body));
          list.appendChild(li);
        });
      }
      s.addEventListener("input", function () { q = s.value.trim().toLowerCase(); draw(); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var body = b.value.trim();
        if (!body) { return; }
        ref.add({ title: t.value.trim(), body: body, createdAt: new Date().toISOString() }).catch(function (err) { window.alert("저장 실패: " + err.message); });
        t.value = ""; b.value = "";
      });
      draw();
      App.watchQuery(ref.orderBy("createdAt", "desc"), function (items) { MEMOS = items; draw(); });
    }
  });

  /* =========================================================
     개인 — 습관
     ========================================================= */
  App.page({
    id: "personal-habits", title: "습관",
    desc: "매일 하고 싶은 습관을 추가하고, 최근 7일 칸을 눌러 체크하세요. 연속 일수가 쌓여요.",
    render: function (view) {
      var ref = doc("personal/habits");
      var HABITS = [];
      var c = ui.card(view, { tab: "Habits", tone: "t-2", title: "습관 · 루틴" });
      var form = el("form", "quick-add");
      var input = el("input"); input.placeholder = "예: 논문 1편 읽기, 운동, 글쓰기"; input.maxLength = 60; input.required = true;
      var add = el("button", "btn", "추가"); add.type = "submit";
      form.appendChild(input); form.appendChild(add);
      var list = el("div", "plain-list");
      c.body.appendChild(form); c.body.appendChild(list);
      function save(items) {
        HABITS = items; draw();
        return ref.set({ items: items, updatedAt: new Date().toISOString() }, { merge: true }).catch(function (err) { window.alert("저장 실패: " + err.message); });
      }
      function streak(h) {
        var days = h.days || {}, cur = new Date();
        if (!days[H.dateKey(cur)]) { cur = H.addDays(cur, -1); }
        var n = 0; while (days[H.dateKey(cur)]) { n++; cur = H.addDays(cur, -1); }
        return n;
      }
      function toggle(id, key) {
        save(HABITS.map(function (h) {
          if (h.id !== id) { return h; }
          var days = Object.assign({}, h.days || {});
          if (days[key]) { delete days[key]; } else { days[key] = true; }
          return Object.assign({}, h, { days: days });
        }));
      }
      function draw() {
        H.clear(list);
        if (!HABITS.length) { list.appendChild(ui.empty("매일 하고 싶은 습관을 추가해 보세요.")); return; }
        var today = H.todayStr();
        HABITS.forEach(function (h) {
          var li = el("div", "habit-item"), top = el("div", "habit-top");
          top.appendChild(el("span", "habit-name", h.name));
          top.appendChild(el("span", "habit-streak", "연속 " + streak(h) + "일"));
          var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제";
          del.addEventListener("click", function () { if (window.confirm("'" + h.name + "' 습관을 삭제할까요?")) { save(HABITS.filter(function (x) { return x.id !== h.id; })); } });
          top.appendChild(del);
          var row = el("div", "habit-days");
          for (var i = 6; i >= 0; i--) {
            (function (offset) {
              var dt = H.addDays(new Date(), -offset), k = H.dateKey(dt), on = !!(h.days && h.days[k]);
              var btn = el("button", "habit-dot" + (on ? " done" : "") + (k === today ? " today" : ""), H.DOW[dt.getDay()]);
              btn.type = "button"; btn.title = k;
              btn.addEventListener("click", function () { toggle(h.id, k); });
              row.appendChild(btn);
            })(i);
          }
          li.appendChild(top); li.appendChild(row); list.appendChild(li);
        });
      }
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = input.value.trim();
        if (!name) { return; }
        save(HABITS.concat([{ id: H.uid(), name: name, days: {} }]));
        input.value = "";
      });
      draw();
      App.watchDoc(ref, function (d) { HABITS = d && d.items ? d.items : []; draw(); });
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

  /* =========================================================
     회사 — 학교 현황
     ========================================================= */
  var STAGES = ["견적 전달", "확정", "강사 배정", "진행", "결과·계산서", "완료"];
  App.STAGES = STAGES;
  App.page({
    id: "company-pipeline", title: "학교 현황",
    desc: "학교별 견적 · 확정 · 강사 배정 · 진행 · 정산 단계를 관리합니다. 단계 칩을 누르면 다음 단계로 넘어가요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Pipeline", tone: "t-1", title: "학교 진행 현황", wide: true });
      ui.itemsPanel(c1.body, {
        ref: doc("company/pipeline"), views: ["cards", "table"], search: true, statusKey: "stage", dueKey: "due",
        groupBy: { key: "stage", order: STAGES, collapse: ["완료"] },
        addLabel: "+ 학교 추가", empty: "등록된 학교가 없습니다. 위에서 학교와 진행 단계를 추가해 보세요.",
        sort: function (a, b) { return String(a.due || "9999").localeCompare(String(b.due || "9999")); },
        fields: [
          { key: "school", label: "학교명", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "program", label: "프로그램", type: "text", col: true, maxLength: 100, placeholder: "예: 집단상담 · 표준화검사" },
          { key: "stage", label: "진행 단계", type: "select", options: STAGES, col: true },
          { key: "due", label: "마감 · 실시일", type: "date", col: true },
          { key: "contact", label: "담당자 · 부서", type: "text", maxLength: 100 },
          { key: "memo", label: "메모", type: "textarea" }
        ],
        summary: function (items) {
          if (!items.length) { return null; }
          var m = countBy(items, "stage", STAGES[0]);
          var wrap = el("div", "stage-summary");
          STAGES.forEach(function (s) { var pill = el("span", "stage-pill", s); pill.appendChild(el("strong", "", String(m[s] || 0))); wrap.appendChild(pill); });
          return wrap;
        }
      });
      var c2 = ui.card(g, { tab: "Upcoming", tone: "t-3", title: "다가오는 회사 일정" });
      ui.upcoming(c2.body, "회사", 6);
    }
  });

  /* =========================================================
     회사 — 정산 체크
     ========================================================= */
  App.page({
    id: "company-billing", title: "정산 체크",
    desc: "프로그램이 끝난 뒤의 서류 · 계산서 · 강사비 처리를 표로 한눈에 확인합니다. 다섯 칸이 모두 체크되면 완료로 표시돼요.",
    render: function (view) {
      var c = ui.card(view, { tab: "Billing", tone: "t-2", title: "정산 · 계산서 체크표" });
      var KEYS = ["report", "log", "invoice", "docs", "paid"];
      ui.itemsPanel(c.body, {
        ref: doc("company/billing"), views: ["table", "cards"], search: true, addLabel: "+ 정산 항목 추가", empty: "아직 항목이 없습니다. 프로그램이 끝나면 한 줄씩 추가해 체크하세요.",
        rowDone: function (it) { return KEYS.every(function (k) { return !!it[k]; }); },
        hint: "결과보고서 → 상담일지 → 계산서 발행 → 서류 발송 → 강사비 지급 순서로 체크합니다. (계산서 발행 시 4대보험 완납증명서 기한도 함께 확인하세요.)",
        summary: function (items) {
          if (!items.length) { return null; }
          var open = items.filter(function (it) { return !KEYS.every(function (k) { return !!it[k]; }); }).length;
          return "미정산 " + open + "건 / 전체 " + items.length + "건";
        },
        fields: [
          { key: "school", label: "학교", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "program", label: "프로그램", type: "text", col: true, maxLength: 100 },
          { key: "report", label: "결과보고서", type: "check", col: true },
          { key: "log", label: "상담일지", type: "check", col: true },
          { key: "invoice", label: "계산서 발행", type: "check", col: true },
          { key: "docs", label: "서류 발송", type: "check", col: true },
          { key: "paid", label: "강사비 지급", type: "check", col: true },
          { key: "memo", label: "메모", type: "text", col: true, maxLength: 160 }
        ]
      });
    }
  });

  /* =========================================================
     회사 — 업무 로그 (Obsidian paste import)
     ========================================================= */
  function parseObsidian(raw) {
    var groups = [], current = null;
    raw.split(/\r?\n/).forEach(function (line) {
      var h = line.match(/^#{1,6}\s+(.+)$/);
      if (h) { current = { date: h[1].trim(), items: [] }; groups.push(current); return; }
      var m = line.match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
      if (m) {
        if (!current) { current = { date: "", items: [] }; groups.push(current); }
        var rest = m[2].trim(), school = null;
        var lk = rest.match(/^\[\[([^\]]+)\]\]\s*(.*)$/);
        if (lk) { school = lk[1].trim(); rest = lk[2].trim(); }
        rest = rest.replace(/\[\[([^\]]+)\]\]/g, "$1");
        current.items.push({ done: m[1].toLowerCase() === "x", school: school, text: rest });
      }
    });
    return groups.filter(function (g) { return g.items.length > 0; });
  }
  App.parseObsidian = parseObsidian;
  App.page({
    id: "company-worklog", title: "업무 로그",
    desc: "옵시디언 업무 일지의 체크리스트를 붙여넣어 가져옵니다. 체크 안 된 항목은 '미완료 업무'로 따로 모아 보여줘요.",
    render: function (view) {
      var ref = doc("worklog/current");
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Open", tone: "t-3", title: "미완료 업무" });
      var openList = el("div", "plain-list"); c1.body.appendChild(openList);
      var c2 = ui.card(g, { tab: "Obsidian", tone: "t-2", title: "업무 로그" });
      var updated = el("p", "hint");
      var toggle = el("button", "tool-btn", "옵시디언에서 붙여넣기로 가져오기"); toggle.type = "button"; toggle.style.marginBottom = "10px";
      var form = el("form", "obs-import"); form.hidden = true;
      form.appendChild(el("p", "hint", "옵시디언 노트에서 '## 날짜' 제목과 '- [x] [[학교명]] 내용' 형식의 체크리스트를 그대로 복사해서 붙여넣으세요."));
      var ta = el("textarea"); ta.rows = 8; ta.placeholder = "## 9/16\n- [x] [[봉무초등학교]] 생명존중교육 관리\n- [ ] [[만촌초등학교]] 상담일지 및 계산서 발행";
      var go = el("button", "btn", "가져오기 (Firestore에 저장)"); go.type = "submit";
      form.appendChild(ta); form.appendChild(go);
      var log = el("div", "obs-log");
      [updated, toggle, form, log].forEach(function (n) { c2.body.appendChild(n); });
      toggle.addEventListener("click", function () { form.hidden = !form.hidden; });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var groups = parseObsidian(ta.value);
        if (!groups.length) { window.alert("체크리스트 형식(- [ ] 또는 - [x])을 찾지 못했습니다."); return; }
        ref.set({ groups: groups, updatedAt: new Date().toISOString() }).then(function () { ta.value = ""; form.hidden = true; })
          .catch(function (err) { window.alert("저장 실패: " + err.message); });
      });
      function draw(data) {
        H.clear(log); H.clear(openList);
        var open = [];
        ((data && data.groups) || []).forEach(function (gr) { gr.items.forEach(function (it) { if (!it.done) { open.push({ date: gr.date, school: it.school, text: it.text }); } }); });
        c1.count.textContent = open.length ? open.length + "건" : "";
        if (!open.length) { openList.appendChild(ui.empty(data ? "미완료 업무가 없습니다." : "업무 로그를 가져오면 미완료 항목이 여기에 모여요.")); }
        open.forEach(function (o) {
          var row = el("div", "open-item");
          row.appendChild(el("span", "open-date", o.date));
          if (o.school) { row.appendChild(el("span", "school-chip", o.school)); }
          row.appendChild(el("span", "", o.text)); openList.appendChild(row);
        });
        if (!data || !data.groups || !data.groups.length) { updated.textContent = "아직 가져온 업무 로그가 없습니다."; return; }
        updated.textContent = "마지막 업데이트: " + H.fmtDateTime(data.updatedAt);
        data.groups.forEach(function (gr) {
          var box = el("div");
          if (gr.date) { box.appendChild(el("div", "obs-date", gr.date)); }
          var ul = el("div", "obs-items");
          gr.items.forEach(function (it) {
            var row = el("div", "obs-item" + (it.done ? " done" : ""));
            row.appendChild(el("span", "mark", it.done ? "✓" : ""));
            if (it.school) { row.appendChild(el("span", "school-chip", it.school)); }
            row.appendChild(el("span", "", it.text)); ul.appendChild(row);
          });
          box.appendChild(ul); log.appendChild(box);
        });
      }
      draw(null);
      App.watchDoc(ref, draw);
    }
  });

  /* =========================================================
     회사 — 업무 순서도 (Obsidian manual import)
     ========================================================= */
  function parseFlow(raw) {
    var steps = [], current = null;
    raw.split(/\r?\n/).forEach(function (line) {
      var m = line.match(/^#{2,3}\s*(\d+)\.\s*(.+)$/);
      if (m) { current = { title: m[1] + ". " + m[2].trim(), body: [] }; steps.push(current); return; }
      if (current) { current.body.push(line); }
    });
    return steps.map(function (s) { return { title: s.title, body: s.body.join("\n").trim() }; }).filter(function (s) { return s.body.length > 0; });
  }
  App.parseFlow = parseFlow;
  App.page({
    id: "company-flow", title: "업무 순서도",
    desc: "업무 매뉴얼을 단계별 순서도로 정리해 두고, 단계를 눌러 세부 내용을 펼쳐 봅니다.",
    render: function (view) {
      var ref = doc("company/flowchart");
      var c = ui.card(view, { tab: "Flow", tone: "t-1", title: "업무 순서도" });
      var updated = el("p", "hint");
      var toggle = el("button", "tool-btn", "옵시디언에서 붙여넣기로 가져오기"); toggle.type = "button"; toggle.style.marginBottom = "10px";
      var form = el("form", "obs-import"); form.hidden = true;
      form.appendChild(el("p", "hint", "업무 매뉴얼 노트를 그대로 복사해서 붙여넣으세요. '## 1. 제목' 형식의 소제목 단위로 단계가 나뉘어 순서도가 만들어집니다."));
      var ta = el("textarea"); ta.rows = 10; ta.placeholder = "## 1. 유선 마케팅\n...내용...\n\n## 2. 주문 접수 시 업무\n...내용...";
      var go = el("button", "btn", "가져오기 (Firestore에 저장)"); go.type = "submit";
      form.appendChild(ta); form.appendChild(go);
      var row = el("div", "flow-row"), detail = el("div", "flow-detail");
      [updated, toggle, form, row, detail].forEach(function (n) { c.body.appendChild(n); });
      var steps = [], active = 0;
      toggle.addEventListener("click", function () { form.hidden = !form.hidden; });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var s = parseFlow(ta.value);
        if (!s.length) { window.alert("'## 1. 제목' 형식의 소제목을 찾지 못했습니다."); return; }
        ref.set({ steps: s, updatedAt: new Date().toISOString() }).then(function () { ta.value = ""; form.hidden = true; })
          .catch(function (err) { window.alert("저장 실패: " + err.message); });
      });
      function drawDetail() {
        var st = steps[active];
        detail.innerHTML = "";
        if (!st) { return; }
        if (typeof marked !== "undefined") { detail.innerHTML = marked.parse(st.body); } else { detail.textContent = st.body; }
      }
      function drawChips() {
        H.clear(row);
        steps.forEach(function (st, i) {
          var chip = el("button", "flow-chip" + (i === active ? " active" : ""), st.title); chip.type = "button";
          chip.addEventListener("click", function () { active = i; drawChips(); drawDetail(); });
          row.appendChild(chip);
          if (i < steps.length - 1) { row.appendChild(el("span", "flow-arrow", "→")); }
        });
      }
      function draw(data) {
        steps = (data && data.steps) || []; active = 0;
        if (!steps.length) {
          updated.textContent = "아직 가져온 업무 순서도가 없습니다."; H.clear(row);
          detail.innerHTML = ""; detail.appendChild(ui.empty("위 '옵시디언에서 붙여넣기로 가져오기'를 눌러 업무 매뉴얼을 붙여넣으세요."));
          return;
        }
        updated.textContent = "마지막 업데이트: " + H.fmtDateTime(data.updatedAt);
        drawChips(); drawDetail();
      }
      draw(null);
      App.watchDoc(ref, draw);
    }
  });

  /* =========================================================
     회사 — 문구 · 양식
     ========================================================= */
  App.page({
    id: "company-snippets", title: "문구 · 양식",
    desc: "자주 보내는 문자 · 통화 멘트 · 메일 양식을 저장해 두고 복사 버튼으로 바로 씁니다.",
    render: function (view) {
      var c = ui.card(view, { tab: "Snippets", tone: "t-3", title: "자주 쓰는 문구" });
      ui.itemsPanel(c.body, {
        ref: doc("company/snippets"), search: true, grid: true, addLabel: "+ 문구 추가", empty: "자주 보내는 문자 · 통화 멘트 · 메일 양식을 저장해 두세요.",
        actions: [{ label: "복사", run: function (it, btn) { H.copyText(it.text, btn); } }],
        fields: [
          { key: "title", label: "제목", type: "text", title: true, required: true, maxLength: 60 },
          { key: "text", label: "문구", type: "textarea", required: true, rows: 5, maxLength: 2000 }
        ]
      });
    }
  });

  /* =========================================================
     회사 — 강사 · 상담사 명단
     ========================================================= */
  App.page({
    id: "company-instructors", title: "강사 · 상담사 명단",
    desc: "외래 강사 · 상담사 · 대학생 서포터의 연락처와 강점, 최근 배정 이력을 모아 두어 강사 배정을 빠르게 합니다.",
    render: function (view) {
      var c = ui.card(view, { tab: "Roster", tone: "t-2", title: "강사 · 상담사" });
      ui.itemsPanel(c.body, {
        ref: doc("company/instructors"), views: ["table", "cards"], search: true, filters: ["type"], addLabel: "+ 강사 추가", empty: "아직 등록된 강사가 없습니다.",
        hint: "연락처 등 개인정보는 로그인한 본인에게만 보이는 Firestore에 저장됩니다. 꼭 필요한 정보만 적으세요.",
        fields: [
          { key: "name", label: "성함", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "type", label: "구분", type: "select", options: ["외래강사", "상담사", "대학생 서포터", "기타"], meta: true, col: true },
          { key: "region", label: "활동 지역", type: "text", col: true, maxLength: 60 },
          { key: "specialty", label: "가능 프로그램 · 강점", type: "textarea", col: true },
          { key: "license", label: "상담사 자격", type: "select", options: ["확인 필요", "보유", "미보유"], col: true },
          { key: "phone", label: "연락처", type: "text", col: true, maxLength: 40 },
          { key: "email", label: "이메일", type: "text", maxLength: 100 },
          { key: "last", label: "최근 배정 (학교 · 일자)", type: "text", maxLength: 100 },
          { key: "memo", label: "메모", type: "textarea" }
        ]
      });
    }
  });
})(window.App);
