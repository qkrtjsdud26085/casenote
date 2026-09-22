/* Hello dear Sunny — 홈 (요약 대시보드) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  App.page({
    id: "home", title: "홈",
    render: function (view) {
      var D = { todos: [], schedule: [], projects: null, grad: null, meetings: null, tlog: null, wlog: null, works: null, habits: null, worklog: null, pipeline: null, reco: null, gcal: null };

      /* ---------- header: title, affiliation, quote of the day ---------- */
      var head = el("section", "home-head");
      var left = el("div", "home-left");
      var badges = el("div", "badges");
      badges.appendChild(el("span", "badge company", "한국가이던스 대구점"));
      badges.appendChild(el("span", "badge academic", "영남대학교 대학원 범죄심리학과 석·박사 수료"));
      left.appendChild(badges);
      var quote = App.todayQuote();
      var year = String(quote.y).replace(/^(\d+)경$/, "$1년경").replace(/^(기원전 )?(\d+)$/, "$1$2년");
      var box = el("div", "quote-box");
      box.appendChild(el("p", "quote-label", "오늘의 명언"));
      box.appendChild(el("p", "quote-text", "“" + quote.t + "”"));
      box.appendChild(el("p", "quote-author", "— " + quote.a + " · " + year));
      head.appendChild(left); head.appendChild(box);
      view.appendChild(head);

      /* ---------- quick capture ---------- */
      var cap = el("form", "capture");
      var qt = el("input"); qt.placeholder = "빠른 할 일 (Enter)"; qt.maxLength = 200; qt.setAttribute("aria-label", "빠른 할 일");
      var qm = el("input"); qm.placeholder = "빠른 메모 (Enter)"; qm.maxLength = 300; qm.setAttribute("aria-label", "빠른 메모");
      var qb = el("button", "btn", "추가"); qb.type = "submit";
      cap.appendChild(qt); cap.appendChild(qm); cap.appendChild(qb);
      cap.addEventListener("submit", function (e) {
        e.preventDefault();
        var t = qt.value.trim(), m = qm.value.trim();
        if (t) { App.col("todos").add({ text: t, done: false, createdAt: new Date().toISOString() }).catch(function (err) { window.alert("저장 실패: " + err.message); }); }
        if (m) { App.col("memos").add({ title: "", body: m, createdAt: new Date().toISOString() }).catch(function (err) { window.alert("저장 실패: " + err.message); }); }
        qt.value = ""; qm.value = "";
      });
      view.appendChild(cap);

      var dash = el("div"); view.appendChild(dash);

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
        H.clear(dash);
        var today = H.todayStr();
        var openTodos = D.todos.filter(function (t) { return !t.done; });
        var worklogOpen = [];
        ((D.worklog && D.worklog.groups) || []).forEach(function (g) { g.items.forEach(function (it) { if (!it.done) { worklogOpen.push({ date: g.date, school: it.school, text: it.text }); } }); });
        var deals = (D.pipeline && D.pipeline.items) || [];
        var activeDeals = deals.filter(function (d) { return d.stage !== "완료"; });
        var tCount = todaySum(D.tlog), wCount = todaySum(D.wlog);

        var tiles = el("div", "tiles");
        var plist0 = (D.projects && D.projects.items && D.projects.items.length) ? D.projects.items : App.proj.DEFAULTS;
        var need = Number(D.grad && D.grad.required) || 2;
        var accepted = plist0.filter(App.proj.isAccepted).length;
        tiles.appendChild(tile("졸업 요건 · 학회지 논문", accepted + " / " + need, accepted >= need ? "요건 충족 · 학위논문 단계로" : "게재 확정 기준", "thesis-home"));
        var active = plist0.filter(function (p) { return p.type === "학회지 논문" && !App.proj.isAccepted(p); }).sort(function (a, b) { return App.proj.stagePct(b) - App.proj.stagePct(a); })[0];
        tiles.appendChild(tile("진행 중 논문", active ? App.proj.stagePct(active) + "%" : "—", active ? active.title + " · " + App.proj.stagesFor(active)[App.proj.stageIndex(active)] : "모든 논문 게재 확정", "proj-overview"));
        tiles.appendChild(tile("오늘 할 일", String(openTodos.length), "전체 " + D.todos.length + "개 중 완료 " + (D.todos.length - openTodos.length), "personal-todos"));
        tiles.appendChild(tile("오늘 집필", (tCount + wCount).toLocaleString("ko-KR") + "자", "논문 " + tCount.toLocaleString("ko-KR") + " · 작품 " + wCount.toLocaleString("ko-KR"), "thesis-writing"));
        tiles.appendChild(tile("회사 미완료", String(worklogOpen.length), "업무 로그 기준", "company-worklog"));
        tiles.appendChild(tile("진행 중 학교", String(activeDeals.length), "전체 " + deals.length + "곳", "company-pipeline"));
        dash.appendChild(tiles);

        var g = ui.grid(dash, true);

        /* 오늘 · 이번 주 */
        var c1 = ui.card(g, { tab: "Today", tone: "t-2", title: "오늘 · 이번 주", link: "personal-calendar" });
        c1.body.appendChild(el("div", "mini-title", "할 일 (미완료)"));
        var l1 = mini(c1.body);
        if (!openTodos.length) { l1.appendChild(ui.empty("미완료 할 일이 없어요.")); }
        openTodos.slice(0, 5).forEach(function (t) {
          var row = el("div", "mini-item");
          var cb = el("input"); cb.type = "checkbox"; cb.setAttribute("aria-label", "완료");
          cb.addEventListener("change", function () { App.col("todos").doc(t.id).update({ done: true }).catch(function () {}); });
          row.appendChild(cb); row.appendChild(el("span", "grow", t.text));
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

        /* 박사 학위논문 */
        var c2 = ui.card(g, { tab: "Thesis", tone: "t-1", title: "박사", link: "thesis-home" });
        var plist = (D.projects && D.projects.items && D.projects.items.length) ? D.projects.items : App.proj.DEFAULTS;
        c2.body.appendChild(el("div", "mini-title", "논문 프로젝트"));
        var lp = mini(c2.body);
        plist.forEach(function (p) {
          var st = App.proj.stagesFor(p)[App.proj.stageIndex(p)];
          var a = el("a", "", p.title); a.href = "#/proj-overview"; a.addEventListener("click", function () { H.safeSet("hds_proj", p.id); });
          var w = el("span", "grow"); w.appendChild(a);
          miniItem(lp, [el("span", "status-chip", st), w, el("span", "mini-sub", App.proj.stagePct(p) + "%")]);
        });
        var meets = ((D.meetings && D.meetings.items) || []).filter(function (m) { return m.next && m.next >= today; }).sort(function (a, b) { return a.next < b.next ? -1 : 1; });
        c2.body.appendChild(el("div", "mini-title", "지도교수 다음 면담"));
        var l4 = mini(c2.body);
        if (meets.length) { miniItem(l4, [H.ddayEl(meets[0].next), el("span", "grow", meets[0].topic || "면담")]); } else { l4.appendChild(el("span", "mini-sub", "예정된 면담이 없어요.")); }
        var reco = D.reco && D.reco.daily && D.reco.daily.date === today ? (D.reco.daily.items || []) : [];
        c2.body.appendChild(el("div", "mini-title", "오늘의 추천 논문"));
        var l5 = mini(c2.body);
        if (!reco.length) {
          var lk = el("a", "more-link", (D.reco && (D.reco.interests || []).length) ? "추천 불러오는 중이거나 오늘 추천이 없어요 →" : "관심 키워드를 설정하고 추천받기 →");
          lk.href = "#/thesis-recommend"; l5.appendChild(lk);
        }
        reco.slice(0, 2).forEach(function (r) {
          var a = el("a", "", r.title); a.href = r.url; a.target = "_blank"; a.rel = "noopener noreferrer";
          var w = el("span", "grow"); w.appendChild(a);
          miniItem(l5, [el("span", "reco-badge " + (r.oa ? "free" : "inst"), r.pdf ? "PDF" : "무료"), w]);
        });

        /* 회사 */
        var c3 = ui.card(g, { tab: "Company", tone: "t-3", title: "회사", link: "company-pipeline" });
        var m = {}; deals.forEach(function (d) { var s = d.stage || App.STAGES[0]; m[s] = (m[s] || 0) + 1; });
        if (deals.length) {
          var sum = el("div", "stage-summary");
          App.STAGES.forEach(function (s) { var pill = el("span", "stage-pill", s); pill.appendChild(el("strong", "", String(m[s] || 0))); sum.appendChild(pill); });
          c3.body.appendChild(sum);
        } else { c3.body.appendChild(ui.empty("학교 현황에서 진행 중인 학교를 추가해 보세요.")); }
        c3.body.appendChild(el("div", "mini-title", "미완료 업무"));
        var l6 = mini(c3.body);
        if (!worklogOpen.length) { l6.appendChild(ui.empty("미완료 업무가 없어요.")); }
        worklogOpen.slice(0, 4).forEach(function (o) {
          var nodes = [el("span", "open-date", o.date)];
          if (o.school) { nodes.push(el("span", "school-chip", o.school)); }
          nodes.push(el("span", "grow", o.text));
          miniItem(l6, nodes);
        });

        /* 작가 · 습관 */
        var c4 = ui.card(g, { tab: "Writer", tone: "t-2", title: "작가 · 습관", link: "writer-desk" });
        var works = ((D.works && D.works.items) || []).filter(function (w) { return w.status && w.status !== "완결"; }).slice(0, 3);
        c4.body.appendChild(el("div", "mini-title", "진행 중인 작품"));
        var l7 = mini(c4.body);
        if (!works.length) { l7.appendChild(el("span", "mini-sub", "진행 중인 작품이 없어요.")); }
        works.forEach(function (w) {
          var t = Number(w.target) || 0, cur = Number(w.current) || 0;
          var chip = el("span", "status-chip", w.status); chip.setAttribute("data-tone", String(ui.tone(["구상", "집필중", "퇴고", "완결"], w.status)));
          var nodes = [chip, el("span", "grow", w.title)];
          if (t) { nodes.push(el("span", "mini-sub", Math.min(100, Math.round(cur / t * 100)) + "%")); }
          miniItem(l7, nodes);
        });
        var habits = (D.habits && D.habits.items) || [];
        c4.body.appendChild(el("div", "mini-title", "오늘의 습관"));
        var l8 = mini(c4.body);
        if (!habits.length) { l8.appendChild(el("span", "mini-sub", "습관 메뉴에서 추가해 보세요.")); }
        else {
          var doneCount = habits.filter(function (h) { return h.days && h.days[today]; }).length;
          c4.body.appendChild(ui.progress(Math.round(doneCount / habits.length * 100), doneCount + "/" + habits.length + " 체크"));
        }
      }

      draw();
      App.watchQuery(App.col("todos").orderBy("createdAt", "asc"), function (i) { D.todos = i; draw(); });
      App.watchQuery(App.col("schedule").orderBy("date", "asc"), function (i) { D.schedule = i; draw(); });
      [["projects", "research/projects"], ["grad", "research/grad"], ["meetings", "research/meetings"], ["tlog", "research/log"], ["wlog", "writer/log"],
        ["works", "writer/works"], ["habits", "personal/habits"], ["worklog", "worklog/current"], ["pipeline", "company/pipeline"], ["reco", "research/reco"], ["gcal", "personal/gcal"]]
        .forEach(function (p) { App.watchDoc(App.doc(p[1]), function (d) { D[p[0]] = d; draw(); }); });
    }
  });
})(window.App);
