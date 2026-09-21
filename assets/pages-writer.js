/* Hello dear Sunny — 작가 섹션 (소설 · 에세이 집필 워크스페이스) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;
  var doc = function (path) { return App.doc(path); };
  var W = App.writer = {};

  function countBy(items, key, first) {
    var m = {};
    items.forEach(function (it) { var v = it[key] || first; m[v] = (m[v] || 0) + 1; });
    return m;
  }
  function fmtN(n) { return Number(n || 0).toLocaleString("ko-KR"); }

  /* ---------- shared: works list, idea inbox ---------- */
  var NONE = "(미지정)";
  W.works = [];
  W.workOpts = [NONE];
  W.track = function (cb) {
    App.watchDoc(doc("writer/works"), function (d) {
      W.works = (d && d.items) || [];
      W.workOpts.length = 0; W.workOpts.push(NONE);
      W.works.forEach(function (w) { if (w.title) { W.workOpts.push(w.title); } });
      if (cb) { cb(W.works); }
    });
  };
  W.addIdea = function (text, kind, tags) {
    var ref = doc("writer/ideas");
    return ref.get().then(function (snap) {
      var items = snap.exists ? (snap.data().items || []) : [];
      var item = { id: H.uid(), text: text, kind: kind || "미분류", dest: "미정", tags: tags || [], createdAt: new Date().toISOString() };
      return ref.set({ items: items.concat([item]), updatedAt: new Date().toISOString() }, { merge: true });
    }).catch(function (err) { window.alert("저장 실패: " + err.message); });
  };
  W.KINDS = ["미분류", "문장", "소재", "장면", "관찰", "질문", "제목 후보"];
  W.FORMS = ["소설", "에세이", "기타"];

  /* work-aware page: a work switcher on top, per-work data in writer/wk_<id>_<name> */
  W.page = function (def) {
    App.page({
      id: def.id, title: def.title, desc: def.desc,
      render: function (view) {
        var bar = el("div", "proj-bar"), body = el("div"), builtFor = null;
        view.appendChild(bar); view.appendChild(body);
        var subs = [];
        App.watchDoc(doc("writer/works"), function (d) {
          var all = (d && d.items) || [];
          var list = all.filter(function (w) { return w.id && (def.anyForm || w.form !== "에세이"); });
          H.clear(bar);
          if (!list.length) {
            builtFor = null; H.clear(body);
            bar.appendChild(el("span", "proj-stage", "먼저 작품을 하나 추가해 주세요"));
            var a0 = el("a", "more-link", "작품 관리에서 추가 →"); a0.href = "#/writer-works"; bar.appendChild(a0);
            body.appendChild(ui.empty(def.anyForm ? "작품이 있어야 작품별 기록을 남길 수 있어요." : "소설 · 긴 글 작품이 있어야 줄거리와 장면을 정리할 수 있어요. 작품 관리에서 '형식'을 소설로 추가해 보세요. (에세이는 '에세이 서랍'에서 다룹니다.)"));
            return;
          }
          var saved = H.safeGet("hds_work");
          var work = list.filter(function (w) { return w.id === saved; })[0] || list[0];
          var pick = el("label", "proj-pick");
          pick.appendChild(el("span", "f-label", "작품"));
          var sel = el("select");
          list.forEach(function (w) { var o = el("option", "", w.title || "(제목 없음)"); o.value = w.id; sel.appendChild(o); });
          sel.value = work.id; sel.setAttribute("aria-label", "작품 선택");
          sel.addEventListener("change", function () { H.safeSet("hds_work", sel.value); App.route(); });
          pick.appendChild(sel); bar.appendChild(pick);
          if (work.status) { bar.appendChild(el("span", "cat-chip", work.status)); }
          if (work.genre) { bar.appendChild(el("span", "cat-chip", work.genre)); }
          var a = el("a", "more-link", "작품 관리 →"); a.href = "#/writer-works"; bar.appendChild(a);
          if (builtFor !== work.id) {
            builtFor = work.id; H.clear(body);
            var ctx = { id: work.id, work: work, ref: function (name) { return doc("writer/wk_" + work.id + "_" + name); } };
            try { def.render(body, ctx); } catch (e) {
              console.error(e);
              body.appendChild(el("div", "error-card", "이 페이지를 그리는 중 문제가 생겼어요: " + e.message));
            }
          }
        });
      }
    });
  };

  /* =========================================================
     집필 책상 (작가 홈)
     ========================================================= */
  var PROMPTS = [
    "오늘 하루 중 가장 오래 눈에 남은 장면 하나를 묘사해 보세요. 의견은 빼고 보이는 것만.",
    "지금 사는 동네에서 가장 낯설게 느껴지는 소리는 무엇인가요?",
    "어릴 적 살던 집의 냄새를 문장으로 옮겨 보세요.",
    "끝내 하지 못한 말이 있나요? 그 사람에게 부치지 않을 편지를 써 보세요.",
    "내가 반복하는 습관 하나가 나에 대해 말해 주는 것은 무엇일까요?",
    "인물 하나를 골라, 그가 절대 버리지 못하는 물건 한 가지를 적어 보세요.",
    "오늘 들은 대화 한 토막을 그대로 옮기고, 그 아래에 말해지지 않은 것을 적어 보세요.",
    "이야기의 첫 문장을 열 개 써 보세요. 가장 마음에 드는 하나만 남기세요.",
    "두려우면서도 자꾸 마음이 가는 것은 무엇인가요?",
    "두 사람이 같은 방에 있지만 서로 다른 것을 원합니다. 그 장면은 어떻게 흐를까요?",
    "최근 나를 조금 바꾼 사소한 순간을 세 문장으로 써 보세요.",
    "오래 미뤄 둔 이야기의 제목부터 지어 보세요.",
    "'그때는 몰랐지만 지금은 아는 것'을 한 문단으로 써 보세요.",
    "창밖에 보이는 것 세 가지로 한 인물의 기분을 표현해 보세요.",
    "좋아하는 소설의 한 장면을 다른 인물의 시점에서 다시 써 보세요.",
    "지금 화가 나는 일을 십 년 뒤의 내가 어떻게 이야기할지 상상해 보세요.",
    "물건 하나(열쇠, 우산, 낡은 편지)를 정해 그 물건의 일대기를 써 보세요.",
    "오늘 가장 솔직했던 순간은 언제였나요? 그때 하지 않은 말은 무엇이었나요?",
    "내 직업에서만 볼 수 있는 풍경 하나를 낯선 사람에게 설명해 보세요.",
    "이야기 속 인물이 거짓말을 한다면 무엇에 대해서일까요? 왜 그럴까요?",
    "지금 쓰는 글의 독자가 단 한 사람이라면, 그 사람은 누구인가요?",
    "사라져 가는 것 하나를 골라 애도하는 글을 써 보세요.",
    "'괜찮아'라는 말이 괜찮지 않게 들렸던 순간을 써 보세요.",
    "지금 쓰는 이야기에서 가장 쓰기 싫은 장면은 무엇인가요? 그게 핵심일지도 몰라요.",
    "나를 가장 잘 아는 사람이 나를 세 단어로 소개한다면 어떤 단어일까요?",
    "오늘의 날씨를 쓰지 말고, 날씨가 사람에게 한 일을 써 보세요.",
    "가 보지 않은 도시의 골목 하나를 상상하며 걸어 보세요.",
    "인물이 방에 들어와 문을 닫습니다. 그 뒤 30초 동안 일어나는 일을 써 보세요.",
    "내가 가진 것 중 가장 오래된 것은 무엇이고, 왜 아직 곁에 있나요?",
    "오늘 쓴 글에서 가장 아끼는 문장 하나를 고르고 이유를 적어 보세요."
  ];
  W.PROMPTS = PROMPTS;

  App.page({
    id: "writer-desk", title: "집필 책상",
    desc: "작가 섹션의 시작 화면이에요. 오늘의 글쓰기 질문, 지금 쓰는 작품, 오늘의 집필량, 떠오른 글감을 한곳에서 봅니다.",
    render: function (view) {
      W.track();
      var g = ui.grid(view, true);

      /* today's prompt */
      var c0 = ui.card(g, { tab: "Prompt", tone: "t-3", title: "오늘의 글쓰기 질문", wide: true });
      var idx = Math.floor(Date.now() / 86400000) % PROMPTS.length;
      var promptEl = el("p", "desk-prompt", PROMPTS[idx]);
      var pRow = el("div", "items-tools");
      var bNext = el("button", "tool-btn", "다른 질문"); bNext.type = "button";
      var bSave = el("button", "tool-btn", "이 질문을 글감함에 저장"); bSave.type = "button";
      var pMsg = el("span", "hint", "");
      bNext.addEventListener("click", function () { idx = (idx + 1) % PROMPTS.length; promptEl.textContent = PROMPTS[idx]; pMsg.textContent = ""; });
      bSave.addEventListener("click", function () { W.addIdea(PROMPTS[idx], "질문", ["글쓰기 질문"]).then(function () { pMsg.textContent = "글감함에 저장했어요"; }); });
      [bNext, bSave, pMsg].forEach(function (n) { pRow.appendChild(n); });
      c0.body.appendChild(promptEl); c0.body.appendChild(pRow);

      /* works in progress */
      var c1 = ui.card(g, { tab: "Now", tone: "t-1", title: "지금 쓰고 있는 작품", link: "writer-works" });
      var wBox = el("div", "plain-list"); c1.body.appendChild(wBox);
      App.watchDoc(doc("writer/works"), function (d) {
        H.clear(wBox);
        var items = ((d && d.items) || []).filter(function (w) { return w.status !== "완결"; });
        var order = { "집필중": 0, "퇴고": 1, "구상": 2 };
        items.sort(function (a, b) { return (order[a.status || "구상"] || 0) - (order[b.status || "구상"] || 0); });
        if (!items.length) { wBox.appendChild(ui.empty("진행 중인 작품이 없어요. 작품 관리에서 추가해 보세요.")); return; }
        items.slice(0, 5).forEach(function (w) {
          var row = el("div", "desk-work");
          var top = el("div", "desk-work-top");
          top.appendChild(el("strong", "", w.title || "(제목 없음)"));
          top.appendChild(el("span", "cat-chip", (w.form ? w.form + " · " : "") + (w.status || "구상")));
          row.appendChild(top);
          var t = Number(w.target) || 0;
          if (t) { var cur = Number(w.current) || 0; row.appendChild(ui.progress(Math.min(100, Math.round(cur / t * 100)), fmtN(cur) + " / " + fmtN(t) + "자")); }
          if (w.due) { var dd = el("div", "desk-due"); dd.appendChild(document.createTextNode("마감 · 목표일 ")); dd.appendChild(H.ddayEl(w.due)); row.appendChild(dd); }
          wBox.appendChild(row);
        });
      });

      /* today's writing */
      var c2 = ui.card(g, { tab: "Today", tone: "t-2", title: "오늘의 집필", link: "writer-log" });
      var lBox = el("div"); c2.body.appendChild(lBox);
      App.watchDoc(doc("writer/log"), function (d) {
        H.clear(lBox);
        var entries = (d && d.entries) || [], goal = Number(d && d.goal) || 0, today = H.todayStr(), tc = 0, days = {};
        entries.forEach(function (e) { days[e.date] = (days[e.date] || 0) + (Number(e.count) || 0); if (e.date === today) { tc += Number(e.count) || 0; } });
        var pct = goal ? Math.min(100, Math.round(tc / goal * 100)) : 0;
        lBox.appendChild(ui.progress(pct, goal ? "오늘 " + fmtN(tc) + " / " + fmtN(goal) + "자 (" + pct + "%)" : "오늘 " + fmtN(tc) + "자 · 집필 기록에서 목표를 정해 보세요"));
        var streak = 0, cur = new Date();
        if (!days[H.dateKey(cur)]) { cur = H.addDays(cur, -1); }
        while (days[H.dateKey(cur)]) { streak++; cur = H.addDays(cur, -1); }
        lBox.appendChild(el("p", "hint", streak ? "연속 " + streak + "일째 쓰는 중이에요." : "오늘 한 줄이라도 써 볼까요?"));
      });

      /* quick capture */
      var c3 = ui.card(g, { tab: "Capture", tone: "t-3", title: "글감 빨리 적기" });
      var form = el("form", "quick-add");
      var kindEl = el("select"); kindEl.setAttribute("aria-label", "종류");
      W.KINDS.forEach(function (k) { var o = el("option", "", k); o.value = k; kindEl.appendChild(o); });
      var txt = el("input"); txt.placeholder = "떠오른 문장 · 소재 · 장면…"; txt.maxLength = 600; txt.required = true;
      var addB = el("button", "btn", "담기"); addB.type = "submit";
      [kindEl, txt, addB].forEach(function (n) { form.appendChild(n); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = txt.value.trim(); if (!v) { return; }
        W.addIdea(v, kindEl.value, []); txt.value = "";
      });
      c3.body.appendChild(form);
      var recent = el("div", "plain-list"); c3.body.appendChild(recent);
      App.watchDoc(doc("writer/ideas"), function (d) {
        H.clear(recent);
        var items = ((d && d.items) || []).slice().sort(function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); }).slice(0, 4);
        if (!items.length) { recent.appendChild(ui.empty("아직 담아 둔 글감이 없어요.")); return; }
        items.forEach(function (it) {
          var li = el("div", "upcoming-item");
          if (it.kind && it.kind !== "미분류") { li.appendChild(el("span", "cat-chip", it.kind)); }
          li.appendChild(el("span", "u-title", it.text));
          recent.appendChild(li);
        });
      });

      /* deadlines */
      var c4 = ui.card(g, { tab: "Deadline", tone: "t-1", title: "공모 · 투고 마감", link: "writer-submit" });
      var dBox = el("div", "plain-list"); c4.body.appendChild(dBox);
      App.watchDoc(doc("writer/submissions"), function (d) {
        H.clear(dBox);
        var t = H.todayStr();
        var items = ((d && d.items) || []).filter(function (s) { return s.deadline && s.deadline >= t && (s.status === "준비" || s.status === "제출" || !s.status); }).sort(function (a, b) { return a.deadline < b.deadline ? -1 : 1; }).slice(0, 5);
        if (!items.length) { dBox.appendChild(ui.empty("다가오는 마감이 없어요.")); return; }
        items.forEach(function (s) {
          var li = el("div", "upcoming-item");
          li.appendChild(H.ddayEl(s.deadline));
          li.appendChild(el("span", "u-title", s.title + (s.venue ? " · " + s.venue : "")));
          li.appendChild(el("span", "u-date", s.deadline.slice(5).replace("-", "/")));
          dBox.appendChild(li);
        });
      });
      var c5 = ui.card(g, { tab: "Upcoming", tone: "t-2", title: "글쓰기 일정" });
      ui.upcoming(c5.body, "글쓰기", 5);
    }
  });

  /* =========================================================
     아이디어 캔버스 (마인드맵)
     ========================================================= */
  App.page({
    id: "writer-canvas", title: "아이디어 캔버스",
    desc: "마인드맵처럼 자유롭게 아이디어를 펼치는 무한 캔버스예요. 빈 곳을 두 번 눌러 아이디어를 만들고, 끌어서 옮기고, 선으로 이어 보세요. 소설의 인물 관계도, 에세이의 생각 지도에도 씁니다.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c = ui.card(g, { tab: "Canvas", tone: "t-1", title: "자유 캔버스", wide: true });
      App.canvas(c.body, {
        boardsRef: doc("writer/boards"),
        boardRef: function (id) { return doc("writer/board_" + id); },
        onSendIdea: function (text) { return W.addIdea(text, "미분류", ["캔버스"]); }
      });
      var c2 = ui.card(g, { tab: "How to", tone: "t-3", title: "사용법", wide: true });
      ui.refList(c2.body, [
        { label: "만들기", text: "빈 곳을 두 번 누르거나 [+ 아이디어]로 시작 → 글을 쓰고 Enter로 확정 (줄바꿈은 Shift+Enter)" },
        { label: "가지 뻗기", text: "아이디어를 고르고 Tab (또는 [+ 하위]) → 이어지는 아이디어가 선으로 연결돼 생겨요. 글을 쓰는 중 Tab을 누르면 확정하고 바로 다음 가지를 만듭니다." },
        { label: "옮기기 · 이동", text: "아이디어를 끌어서 옮기고, 빈 곳을 끌면 화면이 움직여요. 마우스 휠로 확대 · 축소, [전체 보기]로 한눈에 맞춥니다." },
        { label: "잇기", text: "아이디어를 고르고 [연결] → 이을 다른 아이디어를 누르세요. 이미 이어진 둘을 다시 누르면 선이 끊어져요. 선을 눌러 고른 뒤 Delete로도 지웁니다." },
        { label: "색 · 분류", text: "아이디어(기본) · 주제 · 인물 · 장면 · 질문 · 소재로 색을 나누어 두면 큰 지도에서도 길을 찾기 쉬워요." },
        { label: "활용", text: "[→ 글감함]으로 아이디어를 글감 수집함에 보내고, [개요 복사]로 연결 관계를 들여쓰기 목록(글의 개요)으로 복사해 원고에 붙여 넣을 수 있어요." }
      ]);
    }
  });

  /* =========================================================
     글감 수집함
     ========================================================= */
  App.page({
    id: "writer-ideas", title: "글감 수집함",
    desc: "떠오른 문장 · 소재 · 장면 · 관찰을 일단 담아 두는 곳이에요. 쓸 곳(소설 · 에세이)을 정해 두고, 실제로 글에 쓰면 '활용함'을 체크하세요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Inbox", tone: "t-3", title: "글감 · 아이디어", wide: true });
      ui.itemsPanel(c1.body, {
        ref: doc("writer/ideas"), timestamp: true, search: true, views: ["cards", "table"], grid: true,
        checkKey: "used", filters: ["kind", "dest"],
        addLabel: "+ 글감 추가", empty: "떠오른 글감이 아직 없습니다. 집필 책상의 '글감 빨리 적기'로도 담을 수 있어요.",
        sort: function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); },
        itemMeta: function (it) { return it.createdAt ? [H.fmtDateTime(it.createdAt)] : []; },
        fields: [
          { key: "text", label: "글감", type: "textarea", title: true, required: true, rows: 3, maxLength: 600 },
          { key: "kind", label: "종류", type: "select", options: W.KINDS, meta: true, col: true },
          { key: "dest", label: "쓸 곳", type: "select", options: ["미정", "소설", "에세이", "기타"], meta: true, col: true },
          { key: "tags", label: "태그 (쉼표로 구분)", type: "tags", meta: true },
          { key: "used", label: "글에 활용함", type: "check" }
        ],
        summary: function (items) {
          var used = items.filter(function (x) { return x.used; }).length;
          return items.length ? "글감 " + items.length + "개 · 활용 " + used + " · 남은 씨앗 " + (items.length - used) : "";
        }
      });
      var c2 = ui.card(g, { tab: "Grow", tone: "t-2", title: "글감을 키우는 질문 (복사 가능)", wide: true });
      ui.refList(c2.body, [
        { label: "왜", text: "이 글감이 왜 나를 붙잡았을까? 나는 무엇에 반응한 걸까?" },
        { label: "누구", text: "이 글감은 누구의 이야기가 될 수 있을까? 그 사람이 가장 감추고 싶은 것은?" },
        { label: "뒤집기", text: "반대로 뒤집으면? 이 일이 일어나지 않았다면, 다른 사람에게 일어났다면?" },
        { label: "소설로", text: "이 안에서 갈등은 어디에 있고, 인물은 무엇을 잃을 수 있을까?" },
        { label: "에세이로", text: "이 경험에서 내가 뒤늦게 알게 된 것은? 독자의 삶과 만나는 지점은?" }
      ]);
    }
  });

  /* =========================================================
     문장 수집 · 독서
     ========================================================= */
  App.page({
    id: "writer-quotes", title: "문장 · 독서 노트",
    desc: "좋은 글은 읽으면서 자랍니다. 마음에 남은 문장과 그 이유, 읽은 책에서 배운 점을 모아 두세요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Sentences", tone: "t-1", title: "문장 수집", wide: true });
      ui.itemsPanel(c1.body, {
        ref: doc("writer/sentences"), timestamp: true, search: true, filters: ["kind"], grid: true,
        addLabel: "+ 문장 추가", empty: "마음에 남은 문장을 적어 두세요. 왜 좋은지 한 줄만 붙여도 문장력이 자랍니다.",
        fields: [
          { key: "text", label: "문장", type: "textarea", title: true, required: true, rows: 3, maxLength: 800 },
          { key: "source", label: "출처 (작가 · 작품 · 쪽)", type: "text", meta: true, maxLength: 120 },
          { key: "kind", label: "종류", type: "select", options: ["문장", "묘사", "대사", "첫 문장", "마지막 문장", "구조 · 기법"], meta: true },
          { key: "why", label: "왜 좋은가 · 배울 점", type: "textarea", rows: 2 },
          { key: "tags", label: "태그 (쉼표로 구분)", type: "tags", meta: true }
        ]
      });
      var c2 = ui.card(g, { tab: "Reading", tone: "t-2", title: "읽은 책 · 읽을 책", wide: true });
      ui.itemsPanel(c2.body, {
        ref: doc("writer/reads"), views: ["cards", "table"], search: true, statusKey: "status", filters: ["status", "form"], grid: true,
        addLabel: "+ 책 추가", empty: "읽은 책, 읽고 싶은 책을 적어 보세요.",
        fields: [
          { key: "title", label: "책 제목", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "author", label: "지은이", type: "text", meta: true, col: true, maxLength: 60 },
          { key: "form", label: "갈래", type: "select", options: ["소설", "에세이", "시", "작법서", "기타"], meta: true, col: true },
          { key: "status", label: "상태", type: "select", options: ["읽을 책", "읽는 중", "완독"], col: true },
          { key: "takeaway", label: "배운 점 · 내 글에 가져올 것", type: "textarea", rows: 3 }
        ]
      });
    }
  });

  /* =========================================================
     소설 — 줄거리 · 장면 구성 (작품별)
     ========================================================= */
  var PLOT = [
    { label: "3막 구조", text: "1막(약 25%) 일상 · 문제 제시 → 기폭 사건 → 1막 전환점\n2막(약 50%) 갈등 상승 → 중간 전환점 → 최악의 순간\n3막(약 25%) 클라이맥스 → 결말" },
    { label: "기승전결", text: "기(도입: 인물 · 배경) → 승(사건 전개 · 갈등 심화) → 전(반전 · 위기) → 결(해소 · 여운)" },
    { label: "로그라인 공식", text: "[주인공]이 [사건]을 겪고, [목표]를 이루려 하지만 [장애물] 때문에 [위험]에 처한다." },
    { label: "장면 카드", text: "장면 목표 / 갈등(방해물) / 결과(성공 · 실패 · 복선) / 감정 변화 / 다음 장면으로 이어지는 질문" },
    { label: "인물에게 던질 질문", text: "가장 원하는 것은? 가장 두려워하는 것은? 숨기고 있는 것은? 결정적 결함은? 이야기가 끝났을 때 무엇이 달라지는가?" }
  ];
  W.page({
    id: "writer-plot", title: "줄거리 · 장면 구성",
    desc: "선택한 작품의 뼈대(전제 · 주제 · 갈등 · 결말)와 장면 목록을 정리합니다. 작품마다 따로 저장돼요.",
    render: function (body, C) {
      var g = ui.grid(body, true);
      var c1 = ui.card(g, { tab: "Story", tone: "t-1", title: "이야기의 뼈대 · " + (C.work.title || ""), wide: true });
      ui.fieldsPanel(c1.body, {
        ref: C.ref("story"),
        fields: [
          { key: "premise", label: "로그라인 · 전제 (한두 문장)", type: "textarea", rows: 2 },
          { key: "theme", label: "주제 — 이 이야기가 던지는 질문", type: "textarea", rows: 2 },
          { key: "protagonist", label: "주인공 · 원하는 것 · 결핍", type: "textarea", rows: 2 },
          { key: "antagonist", label: "맞서는 힘 (인물 · 사회 · 자기 자신)", type: "textarea", rows: 2 },
          { key: "conflict", label: "핵심 갈등", type: "textarea", rows: 2 },
          { key: "stakes", label: "실패하면 잃는 것", type: "textarea", rows: 2 },
          { key: "pov", label: "시점 · 화자", type: "text" },
          { key: "tone", label: "문체 · 분위기", type: "text" },
          { key: "setting", label: "시공간 배경", type: "text" },
          { key: "ending", label: "결말의 방향", type: "textarea", rows: 2 }
        ]
      });
      var c2 = ui.card(g, { tab: "Scenes", tone: "t-2", title: "장(章) · 장면 목록", wide: true });
      ui.itemsPanel(c2.body, {
        ref: C.ref("scenes"), views: ["cards", "table"], search: true, statusKey: "status", filters: ["status"], grid: true,
        addLabel: "+ 장면 추가", empty: "장면을 하나씩 추가해 이야기의 순서를 잡아 보세요. 장 번호를 '1-1', '2장'처럼 적으면 순서대로 정렬돼요.",
        sort: function (a, b) { return String(a.chapter || "").localeCompare(String(b.chapter || ""), "ko", { numeric: true }); },
        fields: [
          { key: "chapter", label: "장 · 순서 (예: 1-2)", type: "text", meta: true, col: true, maxLength: 20 },
          { key: "title", label: "장면 제목", type: "text", title: true, required: true, col: true, maxLength: 100 },
          { key: "status", label: "진행", type: "select", options: ["구상", "초고", "퇴고", "완료"], col: true },
          { key: "pov", label: "시점 인물", type: "text", meta: true, col: true, maxLength: 40 },
          { key: "place", label: "장소 · 시간", type: "text", meta: true, maxLength: 80 },
          { key: "goal", label: "인물의 목표", type: "textarea", rows: 2 },
          { key: "conflict", label: "갈등 · 방해물", type: "textarea", rows: 2 },
          { key: "outcome", label: "결과 · 전환 · 복선", type: "textarea", rows: 2 },
          { key: "words", label: "분량 (자)", type: "number", step: 100, col: true, hideInCard: true },
          { key: "note", label: "메모", type: "textarea", rows: 2 }
        ],
        summary: function (items) {
          var m = countBy(items, "status", "구상"), w = 0;
          items.forEach(function (x) { w += Number(x.words) || 0; });
          return items.length ? "장면 " + items.length + "개 · 완료 " + (m["완료"] || 0) + " · 퇴고 " + (m["퇴고"] || 0) + " · 초고 " + (m["초고"] || 0) + (w ? " · 합계 " + fmtN(w) + "자" : "") : "";
        }
      });
      var c3 = ui.card(g, { tab: "Template", tone: "t-3", title: "구조 · 질문 템플릿 (복사 가능)", wide: true });
      ui.refList(c3.body, PLOT);
    }
  });

  /* =========================================================
     소설 — 인물 · 세계관 · 연표
     ========================================================= */
  App.page({
    id: "writer-world", title: "인물 · 세계관 · 연표",
    desc: "인물 카드와 장소 · 세계관 설정, 작품 속 사건의 연표를 모아 둡니다. 인물 사이의 관계는 아이디어 캔버스에서 그려 보세요.",
    render: function (view) {
      W.track();
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Characters", tone: "t-1", title: "인물 · 설정 노트", wide: true });
      ui.itemsPanel(c1.body, {
        ref: doc("writer/characters"), search: true, filters: ["work", "role"], grid: true, views: ["cards", "table"],
        addLabel: "+ 인물·설정 추가", empty: "인물 · 세계관 설정을 추가해 보세요.",
        fields: [
          { key: "name", label: "이름 · 항목", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "role", label: "구분", type: "select", options: ["주인공", "조연", "적대자", "장소 · 세계관", "기타"], meta: true, col: true },
          { key: "work", label: "작품", type: "select", options: W.workOpts, meta: true, col: true },
          { key: "traits", label: "성격 · 외형 · 특징", type: "textarea" },
          { key: "motivation", label: "욕망 · 결핍", type: "textarea" },
          { key: "arc", label: "변화(아크)", type: "textarea" },
          { key: "notes", label: "메모", type: "textarea" }
        ]
      });
      var c2 = ui.card(g, { tab: "Timeline", tone: "t-2", title: "작품 속 연표 · 사건 순서", wide: true });
      ui.itemsPanel(c2.body, {
        ref: doc("writer/timeline"), search: true, filters: ["work"], views: ["cards", "table"],
        addLabel: "+ 사건 추가", empty: "작품 속에서 일어나는 사건을 시간 순서로 적어 두면 설정이 어긋나는 것을 막을 수 있어요.",
        sort: function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); },
        fields: [
          { key: "order", label: "순서 (숫자)", type: "number", col: true, step: 1 },
          { key: "when", label: "작품 속 시점", type: "text", meta: true, col: true, maxLength: 60 },
          { key: "title", label: "사건", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "work", label: "작품", type: "select", options: W.workOpts, meta: true, col: true },
          { key: "note", label: "메모 · 관련 인물", type: "textarea", rows: 2 }
        ]
      });
      var c3 = ui.card(g, { tab: "Map", tone: "t-3", title: "관계도는 캔버스에서", wide: true });
      var p = el("p", "hint", "인물을 아이디어(인물 색)로 만들고 선으로 이으면 관계도가 돼요. ");
      var a = el("a", "more-link", "아이디어 캔버스 열기 →"); a.href = "#/writer-canvas";
      p.appendChild(a); c3.body.appendChild(p);
    }
  });

  /* =========================================================
     에세이 서랍
     ========================================================= */
  App.page({
    id: "writer-essay", title: "에세이 서랍",
    desc: "에세이는 '하고 싶은 말 한 문장'에서 시작해요. 씨앗 단계부터 발표까지, 편별로 기획을 정리합니다. (분량이 큰 연재 · 책 단위는 작품 관리에서 함께 관리하세요.)",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Essays", tone: "t-1", title: "에세이 기획 서랍", wide: true });
      ui.itemsPanel(c1.body, {
        ref: doc("writer/essays"), views: ["cards", "table"], search: true, statusKey: "status", filters: ["status"], grid: true,
        addLabel: "+ 에세이 추가", empty: "쓰고 싶은 에세이를 씨앗 단계로 적어 두세요. 제목이 없어도 괜찮아요.",
        fields: [
          { key: "title", label: "제목 (가제)", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "status", label: "단계", type: "select", options: ["씨앗", "구상", "초고", "퇴고", "완성", "발표"], col: true },
          { key: "theme", label: "주제 · 소재", type: "text", meta: true, col: true, maxLength: 80 },
          { key: "thesis", label: "이 글이 하고 싶은 말 (한 문장)", type: "textarea", rows: 2 },
          { key: "reader", label: "독자에게 남기고 싶은 것 (감정 · 질문)", type: "textarea", rows: 2 },
          { key: "material", label: "재료 — 경험 · 장면 · 사실 · 인용", type: "textarea", rows: 3 },
          { key: "opening", label: "첫 문장 후보", type: "textarea", rows: 2 },
          { key: "structure", label: "구조 (도입 → 전개 → 전환 → 맺음)", type: "textarea", rows: 3 },
          { key: "venue", label: "발표 예정처 (매체 · 공모)", type: "text", meta: true, maxLength: 80 },
          { key: "target", label: "목표 분량 (자)", type: "number", step: 100, hideInCard: true },
          { key: "current", label: "현재 분량 (자)", type: "number", step: 100, hideInCard: true }
        ],
        itemExtra: function (it) {
          var t = Number(it.target) || 0;
          if (!t) { return null; }
          var cur = Number(it.current) || 0;
          return ui.progress(Math.min(100, Math.round(cur / t * 100)), fmtN(cur) + " / " + fmtN(t) + "자");
        },
        summary: function (items) {
          var m = countBy(items, "status", "씨앗");
          return items.length ? "총 " + items.length + "편 · 씨앗 " + (m["씨앗"] || 0) + " · 구상 " + (m["구상"] || 0) + " · 초고 " + (m["초고"] || 0) + " · 퇴고 " + (m["퇴고"] || 0) + " · 완성/발표 " + ((m["완성"] || 0) + (m["발표"] || 0)) : "";
        }
      });
      var c2 = ui.card(g, { tab: "Template", tone: "t-2", title: "에세이 구조 · 첫 문장 · 점검 (복사 가능)", wide: true });
      ui.refList(c2.body, [
        { label: "발견형 구조", text: "구체적인 장면 → 그 장면이 던진 질문 → 사유(경험 · 지식 · 인용) → 뜻밖의 전환 → 여운을 남기는 맺음" },
        { label: "경험 · 성찰 · 확장", text: "무슨 일이 있었나(경험) → 어떻게 느꼈나(감정) → 왜 그랬나(성찰) → 독자의 삶으로 열기(보편)" },
        { label: "첫 문장 유형", text: "장면으로 시작 / 대화로 시작 / 질문으로 시작 / 고백으로 시작 / 물건 · 이미지로 시작 / 통념을 뒤집으며 시작" },
        { label: "맺음 점검", text: "주장을 되풀이하지 않고 이미지나 행동으로 닫았는가 · 첫 문장과 호응하는가 · 독자에게 질문 하나를 남겼는가" },
        { label: "퇴고 점검", text: "추상어를 구체적 장면 · 감각으로 바꿨는가 · '나'만 말하지 않고 독자에게 열려 있는가 · 한 문단에 한 생각 · 접속어 줄이기 · 소리 내어 읽기" }
      ]);
    }
  });

  /* =========================================================
     작품 관리
     ========================================================= */
  App.page({
    id: "writer-works", title: "작품 관리",
    desc: "장편 · 연작 · 책 단위 작품의 진행 상태와 분량, 마감을 한눈에 관리합니다. 상태 칩을 누르면 구상 → 집필중 → 퇴고 → 완결로 바뀌어요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Works", tone: "t-1", title: "작품 · 원고", wide: true });
      ui.itemsPanel(c1.body, {
        ref: doc("writer/works"), views: ["cards", "table"], search: true, statusKey: "status", filters: ["form", "status"], grid: true, dueKey: "due",
        rowDone: function (it) { return it.status === "완결"; },
        addLabel: "+ 작품 추가", empty: "아직 작품이 없습니다. 첫 작품을 추가해 보세요.",
        fields: [
          { key: "title", label: "작품 제목", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "form", label: "형식", type: "select", options: W.FORMS, col: true },
          { key: "status", label: "진행 상태", type: "select", options: ["구상", "집필중", "퇴고", "완결"], col: true },
          { key: "genre", label: "장르", type: "text", meta: true, col: true, maxLength: 40 },
          { key: "due", label: "마감 · 목표일", type: "date", col: true },
          { key: "logline", label: "로그라인 (한 문장 요약)", type: "textarea", rows: 2 },
          { key: "target", label: "목표 분량 (자)", type: "number", col: true, step: 100, hideInCard: true },
          { key: "current", label: "현재 분량 (자)", type: "number", col: true, step: 100, hideInCard: true },
          { key: "note", label: "메모 · 한 줄 소개", type: "textarea", rows: 2 }
        ],
        itemExtra: function (it) {
          var t = Number(it.target) || 0;
          if (!t) { return null; }
          var cur = Number(it.current) || 0;
          return ui.progress(Math.min(100, Math.round(cur / t * 100)), fmtN(cur) + " / " + fmtN(t) + "자");
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

  /* =========================================================
     집필 기록
     ========================================================= */
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
     퇴고 · 피드백 (작품별)
     ========================================================= */
  var PHASES = ["구조", "장면 · 문단", "문장", "교정"];
  var REVISE_DEFAULTS = [
    { phase: "구조", text: "주제 · 핵심 갈등(또는 하고 싶은 말)이 한 문장으로 말해지는가", done: false },
    { phase: "구조", text: "시작과 끝이 서로 호응하는가", done: false },
    { phase: "구조", text: "늘어지거나 비어 있는 구간은 없는가", done: false },
    { phase: "구조", text: "정보를 너무 일찍 · 너무 늦게 주지 않았는가", done: false },
    { phase: "장면 · 문단", text: "모든 장면(문단)에 목적이 있는가 — 목표 · 갈등 · 변화", done: false },
    { phase: "장면 · 문단", text: "인물의 동기가 행동으로 설명되는가", done: false },
    { phase: "장면 · 문단", text: "복선과 회수가 짝이 맞는가", done: false },
    { phase: "장면 · 문단", text: "장면 · 문단 전환이 자연스러운가", done: false },
    { phase: "문장", text: "중복 표현 · 습관적 어휘 줄이기", done: false },
    { phase: "문장", text: "추상어를 구체적 장면 · 감각으로 바꾸기", done: false },
    { phase: "문장", text: "대사가 인물마다 다르게 들리는가", done: false },
    { phase: "문장", text: "소리 내어 읽으며 리듬 점검", done: false },
    { phase: "교정", text: "맞춤법 · 띄어쓰기 · 문장부호", done: false },
    { phase: "교정", text: "이름 · 시간 · 나이 · 장소의 일관성", done: false },
    { phase: "교정", text: "시점 흔들림 확인", done: false },
    { phase: "교정", text: "분량 · 투고 규정 · 제출 양식 확인", done: false }
  ];
  W.page({
    id: "writer-revise", title: "퇴고 · 피드백", anyForm: true,
    desc: "선택한 작품의 퇴고 체크리스트와 합평 · 피드백 기록입니다. 구조 → 장면 → 문장 → 교정 순서로, 큰 것부터 고치세요.",
    render: function (body, C) {
      var g = ui.grid(body, true);
      var c1 = ui.card(g, { tab: "Revise", tone: "t-1", title: "퇴고 체크리스트 · " + (C.work.title || ""), wide: true });
      ui.itemsPanel(c1.body, {
        ref: C.ref("revise"), checkKey: "done", search: true, defaults: REVISE_DEFAULTS,
        groupBy: { key: "phase", order: PHASES },
        addLabel: "+ 점검 항목", empty: "점검 항목이 없습니다.",
        summary: function (items) { var d = items.filter(function (x) { return x.done; }).length; return items.length ? d + " / " + items.length + " 완료" : ""; },
        fields: [
          { key: "text", label: "점검 항목", type: "text", title: true, required: true, maxLength: 160 },
          { key: "phase", label: "단계", type: "select", options: PHASES, meta: true },
          { key: "done", label: "완료", type: "check" }
        ]
      });
      var c2 = ui.card(g, { tab: "Feedback", tone: "t-2", title: "합평 · 피드백 기록", wide: true });
      ui.itemsPanel(c2.body, {
        ref: C.ref("feedback"), views: ["cards", "table"], search: true, statusKey: "action", filters: ["action"], grid: true,
        addLabel: "+ 피드백 추가", empty: "합평 · 지인 · 편집자에게 받은 피드백을 남겨 두세요.",
        sort: function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); },
        fields: [
          { key: "from", label: "누가 · 어디서", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "date", label: "날짜", type: "date", today: true, col: true },
          { key: "round", label: "원고 차수 (초고 · 2고…)", type: "text", meta: true, col: true, maxLength: 30 },
          { key: "action", label: "반영", type: "select", options: ["미반영", "반영", "보류"], col: true },
          { key: "comment", label: "피드백 내용", type: "textarea", rows: 4 },
          { key: "plan", label: "내가 고칠 방향", type: "textarea", rows: 2 }
        ]
      });
      var c3 = ui.card(g, { tab: "Method", tone: "t-3", title: "퇴고의 순서 (복사 가능)", wide: true });
      ui.refList(c3.body, [
        { label: "1차 · 구조", text: "쓰고 나서 며칠 묵힌 뒤 통째로 읽으며 뼈대만 봅니다. 문장은 고치지 않고 '어디가 늘어지고 어디가 비는지'만 표시하세요." },
        { label: "2차 · 장면 · 문단", text: "장면(문단)마다 '목적 · 갈등 · 변화'를 한 줄로 적어 보고, 답이 없는 장면은 줄이거나 합칩니다." },
        { label: "3차 · 문장", text: "소리 내어 읽으며 리듬이 걸리는 곳, 같은 말이 반복되는 곳, 추상적인 곳을 고칩니다." },
        { label: "4차 · 교정", text: "맞춤법과 고유명사, 시간 · 나이의 일관성을 확인합니다. 출력하거나 화면 · 글꼴을 바꿔 읽으면 새로 보여요." }
      ]);
    }
  });

  /* =========================================================
     공모 · 투고
     ========================================================= */
  App.page({
    id: "writer-submit", title: "공모 · 투고",
    desc: "공모전 · 신춘문예 · 문예지 투고 · 웹 연재 · 출간 제안을 마감일과 결과까지 한곳에서 관리합니다.",
    render: function (view) {
      W.track();
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Submit", tone: "t-1", title: "공모 · 투고 현황", wide: true });
      var DONE = ["당선 · 게재", "낙선", "철회"];
      ui.itemsPanel(c1.body, {
        ref: doc("writer/submissions"), views: ["cards", "table"], search: true, statusKey: "status", filters: ["status", "kind"], grid: true, dueKey: "deadline",
        rowDone: function (it) { return DONE.indexOf(it.status) !== -1; },
        sort: function (a, b) {
          var da = DONE.indexOf(a.status) !== -1, db = DONE.indexOf(b.status) !== -1;
          if (da !== db) { return da ? 1 : -1; }
          return String(a.deadline || "9999").localeCompare(String(b.deadline || "9999"));
        },
        addLabel: "+ 공모 · 투고 추가", empty: "관심 있는 공모전이나 투고처를 마감일과 함께 적어 두세요.",
        fields: [
          { key: "title", label: "공모 · 투고명", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "kind", label: "종류", type: "select", options: ["공모전", "신춘문예", "문예지 투고", "웹 연재", "출간 제안", "기타"], meta: true, col: true },
          { key: "status", label: "상태", type: "select", options: ["준비", "제출", "심사중", "당선 · 게재", "낙선", "철회"], col: true },
          { key: "deadline", label: "마감일", type: "date", col: true },
          { key: "venue", label: "주최 · 매체", type: "text", meta: true, col: true, maxLength: 80 },
          { key: "work", label: "제출 작품", type: "select", options: W.workOpts, meta: true },
          { key: "url", label: "공고 링크", type: "url" },
          { key: "rule", label: "규정 (분량 · 양식 · 유의사항)", type: "textarea", rows: 3 },
          { key: "note", label: "메모 · 결과", type: "textarea", rows: 2 }
        ],
        summary: function (items) {
          var m = countBy(items, "status", "준비");
          return items.length ? "총 " + items.length + "건 · 준비 " + (m["준비"] || 0) + " · 제출 " + (m["제출"] || 0) + " · 심사중 " + (m["심사중"] || 0) + " · 당선/게재 " + (m["당선 · 게재"] || 0) : "";
        }
      });
      var c2 = ui.card(g, { tab: "Upcoming", tone: "t-3", title: "글쓰기 분류 일정" });
      ui.upcoming(c2.body, "글쓰기", 6);
      var c3 = ui.card(g, { tab: "Checklist", tone: "t-2", title: "제출 전 점검 (복사 가능)" });
      ui.refList(c3.body, [
        { label: "규정", text: "분량(원고지 매수 · 자수) · 글꼴 · 파일 형식 · 익명(이름 제거) 여부 · 제출 방식(우편 · 메일 · 사이트)" },
        { label: "원고", text: "제목 · 첫 문장 · 마지막 문장을 한 번 더 · 맞춤법 · 시점 · 고유명사 확인 · 미발표작인지(이중 투고 금지) 확인" },
        { label: "기록", text: "제출일 · 접수 확인 · 결과 발표일을 메모하고 상태를 '제출'로 바꾸기" }
      ]);
    }
  });
})(window.App);
