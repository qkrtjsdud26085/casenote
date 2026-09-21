/* Hello dear Sunny — 홈 (요약 대시보드) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  App.page({
    id: "home", title: "홈",
    render: function (view) {
      var D = { todos: [], schedule: [], thesis: null, roadmap: null, meetings: null, tlog: null, wlog: null, works: null, habits: null, worklog: null, pipeline: null, reco: null };

      /* ---------- hero (profile, editable) ---------- */
      var hero = el("section", "hero");
      var now = new Date();
      hero.appendChild(el("p", "eyebrow", "Personal Workspace · " + now.getFullYear() + "." + H.pad2(now.getMonth() + 1) + "." + H.pad2(now.getDate()) + " (" + H.DOW[now.getDay()] + ")"));
      var fields = {
        name: el("h1", "name"), bio: el("p", "bio"),
        company: el("span", "badge company"), academic: el("span", "badge academic")
      };
      fields.name.setAttribute("data-placeholder", "이름을 입력하세요");
      fields.bio.setAttribute("data-placeholder", "한 줄 소개를 입력하세요");
      Object.keys(fields).forEach(function (k) { fields[k].contentEditable = "true"; fields[k].setAttribute("data-field", k); });
      var badges = el("div", "badges"); badges.appendChild(fields.company); badges.appendChild(fields.academic);
      hero.appendChild(fields.name); hero.appendChild(fields.bio); hero.appendChild(badges);
      view.appendChild(hero);
      var profile = { company: "한국가이던스 대구점", academic: "영남대학교 대학원 범죄심리학과 석·박사 수료" };
      var profileRef = App.doc("profile/main");
      function empty(elm) { if (elm.textContent.trim().length === 0) { elm.setAttribute("data-empty", "true"); } else { elm.removeAttribute("data-empty"); } }
      function applyProfile(d) {
        profile = Object.assign({}, profile, d || {});
        Object.keys(fields).forEach(function (k) {
          if (document.activeElement === fields[k]) { return; }
          fields[k].textContent = profile[k] || ""; empty(fields[k]);
        });
      }
      Object.keys(fields).forEach(function (k) {
        var f = fields[k];
        f.addEventListener("input", function () { empty(f); });
        f.addEventListener("blur", function () { profile[k] = f.textContent.trim(); profileRef.set(profile, { merge: true }).catch(function () {}); });
        f.addEventListener("keydown", function (e) { if (e.key === "Enter" && k !== "bio") { e.preventDefault(); f.blur(); } });
      });
      applyProfile(null);
      App.watchDoc(profileRef, applyProfile);

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
        var chapters = (D.thesis && D.thesis.chapters) || [];
        var deadline = D.thesis && D.thesis.deadline;
        var worklogOpen = [];
        ((D.worklog && D.worklog.groups) || []).forEach(function (g) { g.items.forEach(function (it) { if (!it.done) { worklogOpen.push({ date: g.date, school: it.school, text: it.text }); } }); });
        var deals = (D.pipeline && D.pipeline.items) || [];
        var activeDeals = deals.filter(function (d) { return d.stage !== "완료"; });
        var tCount = todaySum(D.tlog), wCount = todaySum(D.wlog);

        var tiles = el("div", "tiles");
        tiles.appendChild(tile("논문 제출 D-day", deadline ? H.ddayInfo(deadline).text : "미설정", deadline ? (D.thesis.title || "제출 목표일 " + deadline) : "개요에서 목표일 설정", "thesis-overview"));
        var pct = chapters.length ? App.chaptersPct(chapters) : 0;
        tiles.appendChild(tile("논문 진행률", pct + "%", chapters.length ? "장 " + chapters.filter(function (c) { return c.status === "완료"; }).length + "/" + chapters.length + " 완료" : "집필에서 장 구성하기", "thesis-writing"));
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
        var up = D.schedule.filter(function (s) { return s.date >= today; }).slice(0, 5);
        if (!up.length) { l2.appendChild(ui.empty("예정된 일정이 없어요.")); }
        up.forEach(function (s) {
          var chip = el("span", "cat-chip", s.cat || "개인"); chip.setAttribute("data-cat", s.cat || "개인");
          miniItem(l2, [H.ddayEl(s.date), el("span", "grow", s.title), chip]);
        });

        /* 박사 학위논문 */
        var c2 = ui.card(g, { tab: "Thesis", tone: "t-1", title: "박사 학위논문", link: "thesis-overview" });
        var rm = (D.roadmap && D.roadmap.items) || null;
        if (rm && rm.length) {
          var done = rm.filter(function (x) { return x.done; }).length;
          c2.body.appendChild(ui.progress(Math.round(done / rm.length * 100), "로드맵 " + done + "/" + rm.length));
          var nextStep = rm.filter(function (x) { return !x.done; })[0];
          c2.body.appendChild(el("div", "mini-title", "다음 단계"));
          var l3 = mini(c2.body);
          if (nextStep) { var nodes = [el("span", "grow", nextStep.text)]; if (nextStep.due) { nodes.unshift(H.ddayEl(nextStep.due)); } miniItem(l3, nodes); }
          else { l3.appendChild(ui.empty("모든 단계를 마쳤어요!")); }
        } else {
          c2.body.appendChild(ui.empty("개요 · 로드맵에서 학위 취득 단계를 확인해 보세요."));
        }
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
        var c4 = ui.card(g, { tab: "Writer", tone: "t-2", title: "작가 · 습관", link: "writer-works" });
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
      [["thesis", "research/thesis"], ["roadmap", "research/roadmap"], ["meetings", "research/meetings"], ["tlog", "research/log"], ["wlog", "writer/log"],
        ["works", "writer/works"], ["habits", "personal/habits"], ["worklog", "worklog/current"], ["pipeline", "company/pipeline"], ["reco", "research/reco"]]
        .forEach(function (p) { App.watchDoc(App.doc(p[1]), function (d) { D[p[0]] = d; draw(); }); });
    }
  });
})(window.App);
