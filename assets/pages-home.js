/* Hello dear Sunny — 홈 (요약 대시보드) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  App.page({
    id: "home", title: "홈",
    render: function (view) {
      var B = App.budget, curMonth = B.monthKey(new Date());
      var D = { todos: [], schedule: [], projects: null, grad: null, meetings: null, tlog: null, wlog: null, works: null, habits: null, budget: null, ledger: null, reco: null, gcal: null };

      /* ---------- affiliation badges + quote of the day, shown in the topbar itself ---------- */
      var strip = document.getElementById("homeStrip");
      H.clear(strip);
      var badges = el("div", "badges");
      badges.appendChild(el("span", "badge company", "한국가이던스 대구점"));
      badges.appendChild(el("span", "badge academic", "영남대학교 대학원 범죄심리학과 석·박사 수료"));
      var quote = App.todayQuote();
      var year = String(quote.y).replace(/^(\d+)경$/, "$1년경").replace(/^(기원전 )?(\d+)$/, "$1$2년");
      var box = el("div", "quote-box");
      box.appendChild(el("p", "quote-label", "오늘의 명언"));
      box.appendChild(el("p", "quote-text", "“" + quote.t + "”"));
      box.appendChild(el("p", "quote-author", "— " + quote.a + " · " + year));
      strip.appendChild(badges); strip.appendChild(box);
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
        var allTasks = (D.gtasks && D.gtasks.items) || [];
        var openTodos = allTasks.filter(function (t) { return t.status !== "completed"; })
          .sort(function (a, b) { return (a.due || "9999") < (b.due || "9999") ? -1 : 1; });
        var ledger = (D.ledger && D.ledger.items) || [];
        var money = B.totals(ledger), budget = Number(D.budget && D.budget.budget) || 0;
        var todaySpend = B.byDate(ledger, "지출")[today] || 0;
        var tCount = todaySum(D.tlog), wCount = todaySum(D.wlog);

        var tiles = el("div", "tiles");
        var plist0 = (D.projects && D.projects.items && D.projects.items.length) ? D.projects.items : App.proj.DEFAULTS;
        var reqs = (D.grad && D.grad.items) ? D.grad.items : App.proj.REQ_DEFAULTS;
        var reqDone = reqs.filter(function (x) { return x.done; }).length;
        var reqLeft = reqs.filter(function (x) { return !x.done; }).map(function (x) { return x.kind || "기타"; })
          .filter(function (k, i, a) { return a.indexOf(k) === i; });
        tiles.appendChild(tile("졸업 요건", reqDone + " / " + reqs.length, reqLeft.length ? "남은 요건 · " + reqLeft.join(" · ") : "모든 요건 충족", "thesis-home"));
        var active = plist0.filter(function (p) { return p.type === "학회지 논문" && !App.proj.isAccepted(p); }).sort(function (a, b) { return App.proj.stagePct(b) - App.proj.stagePct(a); })[0];
        tiles.appendChild(tile("진행 중 논문", active ? App.proj.stagePct(active) + "%" : "—", active ? active.title + " · " + App.proj.stagesFor(active)[App.proj.stageIndex(active)] : "모든 논문 게재 확정", "proj-overview"));
        tiles.appendChild(tile("남은 할 일", String(openTodos.length), D.gtasks ? "Google 할 일 · 오늘까지 " + openTodos.filter(function (t) { return t.due && t.due <= today; }).length + "개" : "Google 할 일과 연결해 보세요", "personal-calendar"));
        tiles.appendChild(tile("오늘 집필", (tCount + wCount).toLocaleString("ko-KR") + "자", "논문 " + tCount.toLocaleString("ko-KR") + " · 작품 " + wCount.toLocaleString("ko-KR"), "thesis-writing"));
        tiles.appendChild(tile("이번 달 지출", B.won(money.exp), budget ? "예산 " + B.won(budget) + " 중 " + Math.round(money.exp / budget * 100) + "%" : "수입 " + B.won(money.inc), "personal-budget"));
        tiles.appendChild(tile("오늘 지출", B.won(todaySpend), "고정지출 " + B.won(money.fixed) + " 반영", "personal-budget"));
        dash.appendChild(tiles);

        var g = ui.grid(dash, true);

        /* 오늘 · 이번 주 */
        var c1 = ui.card(g, { tab: "Today", tone: "t-2", title: "오늘 · 이번 주", link: "personal-calendar" });
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

        /* 가계부 */
        var c3 = ui.card(g, { tab: "Budget", tone: "t-3", title: "가계부", link: "personal-budget" });
        c3.body.appendChild(el("div", "mini-title", "이번 달"));
        var l6 = mini(c3.body);
        miniItem(l6, [el("span", "grow", "수입 " + B.won(money.inc) + " · 지출 " + B.won(money.exp)), el("span", "mini-sub", "잔액 " + (money.inc - money.exp < 0 ? "−" : "") + B.won(Math.abs(money.inc - money.exp)))]);
        if (budget) {
          var bp = ui.progress(Math.min(100, Math.round(money.exp / budget * 100)), "예산 " + Math.round(money.exp / budget * 100) + "% 사용");
          if (money.exp > budget) { bp.classList.add("over"); }
          c3.body.appendChild(bp);
        }
        c3.body.appendChild(el("div", "mini-title", "아직 반영 안 된 고정지출"));
        var l6b = mini(c3.body);
        var unpaid = B.unpaidFixed(D.budget, ledger, curMonth);
        if (!unpaid.length) { l6b.appendChild(ui.empty(D.budget && (D.budget.fixed || []).length ? "이번 달 고정지출을 모두 반영했어요." : "가계부에서 고정지출을 등록해 보세요.")); }
        unpaid.slice(0, 4).forEach(function (f) { miniItem(l6b, [H.ddayEl(f.date), el("span", "grow", f.name), el("span", "mini-sub", B.won(f.amount))]); });

        /* 작가 */
        var c4 = ui.card(g, { tab: "Writer", tone: "t-2", title: "작가", link: "writer-desk" });
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
      }

      draw();
      App.watchDoc(App.doc("personal/gtasks"), function (d) { D.gtasks = d; draw(); });
      if (App.gtasks.token()) { App.gtasks.sync().catch(function () {}); }
      App.watchQuery(App.col("schedule").orderBy("date", "asc"), function (i) { D.schedule = i; draw(); });
      [["projects", "research/projects"], ["grad", "research/gradreqs"], ["meetings", "research/meetings"], ["tlog", "research/log"], ["wlog", "writer/log"],
        ["works", "writer/works"], ["habits", "personal/habits"], ["budget", "personal/budget"], ["ledger", "personal/ledger-" + curMonth], ["reco", "research/reco"], ["gcal", "personal/gcal"]]
        .forEach(function (p) { App.watchDoc(App.doc(p[1]), function (d) { D[p[0]] = d; draw(); }); });
    }
  });
})(window.App);
