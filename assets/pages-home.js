/* Hello dear Sunny — 홈 (요약 대시보드) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;
  /* shared with 주간 리뷰 (pages-other.js), which shows the week and a calendar of past moods */
  App.MOODS = [["😆", "최고"], ["😊", "좋음"], ["🙂", "괜찮음"], ["😐", "그저 그럼"], ["😔", "울적"], ["😢", "슬픔"], ["😡", "화남"], ["😴", "피곤"]];

  App.page({
    id: "home", title: "홈",
    render: function (view) {
      var B = App.budget, curMonth = B.monthKey(new Date());
      var D = { todos: [], schedule: [], wlog: null, budget: null, ledger: null, gcal: null };

      /* ---------- affiliation badges, shown in the topbar itself (today's quote sits beside the logo) ---------- */
      var strip = document.getElementById("homeStrip");
      H.clear(strip);
      var badges = el("div", "badges");
      badges.appendChild(el("span", "badge academic", "영남대학교 대학원 범죄심리학과 석·박사 수료"));
      strip.appendChild(badges);
      strip.hidden = false;

      /* ---------- quick capture → Google Tasks (or a Calendar event when a time is given) ---------- */
      var cap = el("form", "capture");
      var qt = el("input"); qt.placeholder = "빠른 할 일 (Enter)"; qt.maxLength = 200; qt.setAttribute("aria-label", "빠른 할 일");
      var qd = el("input"); qd.type = "date"; qd.className = "cap-date"; qd.setAttribute("aria-label", "날짜 (선택)");
      var qh = el("input"); qh.type = "time"; qh.className = "cap-time"; qh.setAttribute("aria-label", "시간 (선택)");
      var qb = el("button", "btn", "추가"); qb.type = "submit";
      cap.appendChild(qt); cap.appendChild(qd); cap.appendChild(qh); cap.appendChild(qb);
      view.appendChild(cap);
      view.appendChild(el("p", "capture-hint", "할 일은 Google 할 일(Tasks)에 바로 저장돼요. 시간까지 적으면 Google 캘린더 일정으로 등록돼요."));
      cap.addEventListener("submit", function (e) {
        e.preventDefault();
        var t = qt.value.trim();
        if (!t) { return; }
        var job = qh.value && qd.value ? App.gtasks.createEvent(t, qd.value, qh.value, "") : App.gtasks.add(t, qd.value, "");
        job.catch(function (err) { window.alert("Google 저장 실패: " + App.gtasks.explain(err)); });
        qt.value = ""; qd.value = ""; qh.value = "";
      });

      var tilesHost = el("div"); view.appendChild(tilesHost);

      /* ---------- first row: Today (redrawn with data) · 오늘의 기분 (built once so typing is never interrupted) ---------- */
      var top = ui.grid(view, true);
      var todaySlot = el("div", "home-slot"); top.appendChild(todaySlot);
      var MOODS = App.MOODS;
      var moodRef = App.doc("personal/mood"), moodDays = {}, moodDate = H.todayStr();
      var cm = ui.card(top, { tab: "Mood", tone: "t-3", title: "오늘의 기분" });
      cm.el.classList.add("mood-card");
      var pick = el("div", "mood-pick"); pick.setAttribute("role", "radiogroup"); pick.setAttribute("aria-label", "오늘의 기분");
      var moodBtns = MOODS.map(function (m) {
        var b = el("button", "mood-btn", m[0]); b.type = "button"; b.title = m[1];
        b.setAttribute("role", "radio"); b.setAttribute("aria-label", m[1]); b.setAttribute("data-mood", m[0]);
        b.addEventListener("click", function () {
          var cur = moodDays[moodDate] || {};
          saveMood({ mood: cur.mood === m[0] ? "" : m[0] });
        });
        pick.appendChild(b); return b;
      });
      cm.body.appendChild(pick);
      var diary = el("textarea", "mood-diary"); diary.rows = 5; diary.maxLength = 1000;
      diary.placeholder = "오늘 하루를 한두 줄로 남겨 보세요. (자동 저장)"; diary.setAttribute("aria-label", "오늘의 일기");
      cm.body.appendChild(diary);
      var moodStatus = el("div", "fields-status"); cm.body.appendChild(moodStatus);
      var weekLink = el("a", "more-link mood-more", "지난 기분 · 일기 모아 보기 (주간 리뷰) →"); weekLink.href = "#/personal-weekly"; cm.body.appendChild(weekLink);
      var diaryTimer = null;
      function saveMood(patch) {
        var day = {}; day[moodDate] = Object.assign({}, moodDays[moodDate] || {}, patch, { at: new Date().toISOString() });
        moodDays[moodDate] = day[moodDate]; paintMood();
        moodRef.set({ days: day, updatedAt: new Date().toISOString() }, { merge: true }).then(function () {
          var d = new Date(); moodStatus.textContent = "저장됨 · " + H.pad2(d.getHours()) + ":" + H.pad2(d.getMinutes());
        }).catch(function (err) { window.alert("저장 실패: " + err.message); });
      }
      function flushDiary() {
        if (!diaryTimer) { return; }
        clearTimeout(diaryTimer); diaryTimer = null;
        saveMood({ note: diary.value });
      }
      diary.addEventListener("input", function () {
        clearTimeout(diaryTimer);
        diaryTimer = setTimeout(flushDiary, 800);
      });
      diary.addEventListener("blur", flushDiary);
      function paintMood() {
        var cur = moodDays[moodDate] || {};
        moodBtns.forEach(function (b) { var on = b.getAttribute("data-mood") === cur.mood; b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false"); });
        if (document.activeElement !== diary && !diaryTimer) { diary.value = cur.note || ""; }
      }
      paintMood();
      App.watchDoc(moodRef, function (d) {
        moodDays = (d && d.days) || {};
        paintMood();
      });


      /* ---------- summaries ---------- */
      function tile(label, value, sub, page) {
        var a = el("a", "tile"); a.href = "#/" + page;
        a.appendChild(el("div", "tile-label", label));
        a.appendChild(el("div", "tile-value", value));
        a.appendChild(el("div", "tile-sub", sub));
        return a;
      }
      function todaySum(log) {
        var t = H.todayStr(), s = 0;
        ((log && log.entries) || []).forEach(function (e) { if (e.date === t) { s += Number(e.count) || 0; } });
        return s;
      }
      function mini(parent, cls) { var u = el("div", "mini-list" + (cls ? " " + cls : "")); parent.appendChild(u); return u; }
      function miniItem(list, nodes) {
        var row = el("div", "mini-item");
        nodes.forEach(function (n) { row.appendChild(n); });
        list.appendChild(row); return row;
      }
      function draw() {
        H.clear(tilesHost); H.clear(todaySlot);
        var today = H.todayStr();
        var allTasks = (D.gtasks && D.gtasks.items) || [];
        var openTodos = allTasks.filter(function (t) { return t.status !== "completed"; })
          .sort(function (a, b) { return (a.due || "9999") < (b.due || "9999") ? -1 : 1; });
        var ledger = (D.ledger && D.ledger.items) || [];
        var money = B.totals(ledger), budget = Number(D.budget && D.budget.budget) || 0;
        var todaySpend = B.byDate(ledger, "지출")[today] || 0;
        var wCount = todaySum(D.wlog);

        var tiles = el("div", "tiles home-tiles");
        /* 진행 중 논문 stays as an empty slot: its source (기타 자료 › 논문 프로젝트) was removed */
        tiles.appendChild(tile("진행 중 논문", "—", "연결된 논문 없음", "ias-home"));
        tiles.appendChild(tile("오늘 집필", wCount.toLocaleString("ko-KR") + "자", "작가 집필 기록", "writer-desk"));
        tiles.appendChild(tile("오늘 지출", B.won(todaySpend), "고정지출 " + B.won(money.fixed) + " 반영", "personal-budget"));
        tiles.appendChild(tile("이번 달 지출", B.won(money.exp), budget ? "예산 " + B.won(budget) + " 중 " + Math.round(money.exp / budget * 100) + "%" : "수입 " + B.won(money.inc), "personal-budget"));
        tilesHost.appendChild(tiles);

        /* 오늘 · 이번 주 */
        var c1 = ui.card(todaySlot, { tab: "Today", tone: "t-2", title: "오늘 · 이번 주", link: "personal-calendar" });
        c1.body.appendChild(el("div", "mini-title", "할 일 (미완료)"));
        var l1 = mini(c1.body);
        if (!openTodos.length) { l1.appendChild(ui.empty("미완료 할 일이 없어요.")); }
        openTodos.slice(0, 5).forEach(function (t) {
          var row = el("div", "mini-item");
          var cb = el("input"); cb.type = "checkbox"; cb.setAttribute("aria-label", t.title + " 완료");
          cb.addEventListener("change", function () {
            App.gtasks.setDone(t.id, true).catch(function (err) { cb.checked = false; window.alert("Google 저장 실패: " + App.gtasks.explain(err)); });
          });
          row.appendChild(cb); row.appendChild(el("span", "grow", t.title));
          if (t.due) { row.appendChild(H.ddayEl(t.due)); }
          l1.appendChild(row);
        });
        c1.body.appendChild(el("div", "mini-title", "다가오는 일정"));
        var l2 = mini(c1.body);
        var up = D.schedule.filter(function (s) { return s.date >= today; })
          .concat(App.gcal ? App.gcal.expand(D.gcal, today, H.dateKey(H.addDays(new Date(), 60))) : [])
          .sort(function (a, b) { var x = a.date + (a.time || ""), y = b.date + (b.time || ""); return x < y ? -1 : (x > y ? 1 : 0); })
          .slice(0, 5);
        if (!up.length) { l2.appendChild(ui.empty("예정된 일정이 없어요.")); }
        up.forEach(function (s) {
          var chip = el("span", "cat-chip", s.cat || "개인"); chip.setAttribute("data-cat", s.cat || "개인");
          var nodes = [H.ddayEl(s.date), el("span", "grow", s.title)];
          if (s.time) { nodes.push(el("span", "mini-sub", s.time)); }
          if (s.source === "google") { var g = el("span", "cat-chip", "G"); g.setAttribute("data-cat", "구글"); g.title = "Google 캘린더"; nodes.push(g); }
          nodes.push(chip);
          miniItem(l2, nodes);
        });
      }

      draw();
      App.watchDoc(App.doc("personal/gtasks"), function (d) { D.gtasks = d; draw(); });
      if (App.gtasks.token()) { App.gtasks.sync().catch(function () {}); }
      App.watchQuery(App.col("schedule").orderBy("date", "asc"), function (i) { D.schedule = i; draw(); });
      [["wlog", "writer/log"],
        ["budget", "personal/budget"], ["ledger", "personal/ledger-" + curMonth], ["gcal", "personal/gcal"]]
        .forEach(function (p) { App.watchDoc(App.doc(p[1]), function (d) { D[p[0]] = d; draw(); }); });
    }
  });
})(window.App);
