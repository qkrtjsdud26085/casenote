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

  /* =========================================================
     집필 책상 (작가 홈)
     ========================================================= */
  App.page({
    id: "writer-desk", title: "집필 책상",
    desc: "작가 섹션의 시작 화면이에요. 오늘의 집필량, 떠오른 글감, 공모 마감, 지금 쓰는 작품을 한곳에서 봅니다.",
    render: function (view) {
      W.track();
      /* order: 오늘의 집필 | 글감 빨리 적기 → 공모 → 작품 */
      var g0 = ui.grid(view, true); g0.classList.add("desk-gap");

      /* today's writing (goal bar · month · streak · last 7 days) */
      var c2 = ui.card(g0, { tab: "Today", tone: "t-2", title: "오늘의 집필" });
      ui.writingLog(c2.body, { ref: doc("writer/log"), goal: 1000, unit: "자" });

      /* quick capture; everything captured is listed on the Capture page */
      var c3 = ui.card(g0, { tab: "Capture", tone: "t-3", title: "글감 빨리 적기", link: "writer-capture" });
      /* a roomy box for longer notes; kind · 담기 on the line below (Ctrl+Enter also saves) */
      var form = el("form", "quick-add capture-form");
      var kindEl = el("select"); kindEl.setAttribute("aria-label", "종류");
      W.KINDS.forEach(function (k) { var o = el("option", "", k); o.value = k; kindEl.appendChild(o); });
      var txt = el("textarea", "capture-text"); txt.rows = 6; txt.placeholder = "떠오른 문장 · 소재 · 장면…"; txt.maxLength = 3000; txt.required = true; txt.setAttribute("aria-label", "글감");
      txt.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true })); } });
      var addB = el("button", "btn", "담기"); addB.type = "submit";
      var capRow = el("div", "capture-row"); capRow.appendChild(kindEl); capRow.appendChild(addB);
      form.appendChild(txt); form.appendChild(capRow);
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

      contestBoard(view, doc("writer/submissions"));
      var g = ui.grid(view, true);

      /* works in progress (writer/works; the 작품 관리 page was removed, so this only shows what is already there) */
      var c1 = ui.card(g, { tab: "Now", tone: "t-1", title: "지금 쓰고 있는 작품" });
      var wBox = el("div", "plain-list"); c1.body.appendChild(wBox);
      App.watchDoc(doc("writer/works"), function (d) {
        H.clear(wBox);
        var items = ((d && d.items) || []).filter(function (w) { return w.status !== "완결"; });
        var order = { "집필중": 0, "퇴고": 1, "구상": 2 };
        items.sort(function (a, b) { return (order[a.status || "구상"] || 0) - (order[b.status || "구상"] || 0); });
        if (!items.length) { wBox.appendChild(ui.empty("진행 중인 작품이 없어요.")); return; }
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
        { label: "활용", text: "[→ 글감함]으로 아이디어를 Capture(글감 모음)에 보내고, [개요 복사]로 연결 관계를 들여쓰기 목록(글의 개요)으로 복사해 원고에 붙여 넣을 수 있어요." }
      ]);
    }
  });

  /* =========================================================
     Capture — every note from 집필 책상 › 글감 빨리 적기 (writer/ideas), newest first
     ========================================================= */
  App.page({
    id: "writer-capture", title: "Capture", navLabel: "Capture",
    render: function (view) {
      var c1 = ui.card(view, { tab: "Capture", tone: "t-3", title: "적어 둔 글감 전체", wide: true });
      ui.itemsPanel(c1.body, {
        ref: doc("writer/ideas"), timestamp: true, search: true, views: ["cards", "table"], grid: true,
        checkKey: "used", filters: ["kind", "dest"],
        addLabel: "+ 글감 추가", empty: "아직 적어 둔 글감이 없어요. 집필 책상의 '글감 빨리 적기'에 쓰면 여기에 모여요.",
        sort: function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); },
        itemMeta: function (it) { return it.createdAt ? [H.fmtDateTime(it.createdAt)] : []; },
        fields: [
          { key: "text", label: "글감", type: "textarea", title: true, required: true, rows: 4, maxLength: 3000 },
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
     공모 · 투고 — 마감 다가오는 공모 카드
     PRESETS: 공개된 공모 공고(개인 정보 아님). 아직 목록에 없으면 버튼 하나로 추가해요.
     ========================================================= */
  var PRESETS = [
    {
      preset: "baengnok-46", title: "제46회 백록문학상", kind: "공모전", venue: "제주대학교", status: "준비",
      deadline: "2026-10-11", deadlineTime: "18:00", announce: "2026-11-18",
      eligibility: "전국 대학(원) 재학생 (휴학생 제외)",
      specs: "시 1인 3편 이상\n소설 1편 · A4 70매 이내\n수필 1편 · A4 20매 이내\n휴먼명조 11pt · 줄간격 170%",
      prize: "총 480만원 · 부문별 대상 100만원 · 우수상 60만원",
      caution: "이메일로 신청서 + 원고 제출 후 확인 전화 필수",
      email: "press@jejunu.ac.kr", phone: "064-754-2278, 2282",
      checklist: "신청서 작성\n원고 형식 (휴먼명조 11pt · 줄간격 170%)\n이메일 제출\n확인 전화"
    },
    {
      preset: "offbooks-office", title: "오프북스 앤솔로지 「망한 직장생활 이야기」", kind: "공모전", venue: "오프북스", status: "준비",
      deadline: "2026-10-15", deadlineTime: "", announce: "2026년 11월 초",
      eligibility: "직장생활에 애환이 있었던 누구나 · 에세이",
      specs: "200자 원고지 100~150매\nA4 12~15장 · 10pt · 여백 160%\nhwp · doc",
      prize: "최종 3명 · 선인세 각 50만원 + 정식 출판계약 · 단행본 출간 · 마케팅 지원",
      caution: "순수 창작물 (다른 문학상 수상작 불가)\nAI 활용 불가",
      email: "onpbooks1@gmail.com", phone: "",
      checklist: "원고에 이름 · 연락처 · 이메일 기재\n분량 확인 (원고지 100~150매)\n이메일 제출"
    }
  ];
  /* 새 공모 공고를 목록에 한 번에 넣는 줄 (이미 넣은 것 · 마감 지난 것은 안 보임) */
  function presetBar(parent, ref) {
    var bar = el("div", "contest-bar"); bar.hidden = true; parent.appendChild(bar);
    App.watchDoc(ref, function (d) {
      var items = (d && d.items) || [], today = H.todayStr(), have = {};
      items.forEach(function (x) { if (x.preset) { have[x.preset] = true; } });
      var fresh = PRESETS.filter(function (p) { return !have[p.preset] && p.deadline >= today; });
      H.clear(bar); bar.hidden = !fresh.length;
      if (!fresh.length) { return; }
      bar.appendChild(el("span", "", "새 공모 " + fresh.length + "개: " + fresh.map(function (p) { return p.title; }).join(" · ")));
      var addBtn = el("button", "btn", "모두 추가"); addBtn.type = "button";
      addBtn.addEventListener("click", function () {
        addBtn.disabled = true;
        ref.get().then(function (snap) {
          var cur = (snap.exists && snap.data().items) || [];
          var add = fresh.map(function (p) { return Object.assign({ id: H.uid(), createdAt: new Date().toISOString() }, p); });
          return ref.set({ items: cur.concat(add), updatedAt: new Date().toISOString() }, { merge: true });
        }).catch(function (err) { addBtn.disabled = false; window.alert("저장 실패: " + err.message); });
      });
      bar.appendChild(addBtn);
    });
  }
  var LIVE = ["준비", "제출", "심사중"];
  function lines(s) { return String(s || "").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function mmdd(k) { var d = H.parseKey(k); return (d.getMonth() + 1) + "/" + d.getDate() + "(" + H.DOW[d.getDay()] + ")"; }

  function contestBoard(parent, ref) {
    var c = ui.card(parent, { tab: "Contest", tone: "t-2", title: "마감 다가오는 공모", wide: true });
    c.el.classList.add("desk-submit");
    presetBar(c.body, ref);
    var grid = el("div", "contest-grid");
    c.body.appendChild(grid);
    var ITEMS = [];
    /* one item changed → write the whole list back (same shape itemsPanel uses) */
    function patch(id, fn) {
      return ref.get().then(function (snap) {
        var items = (snap.exists && snap.data().items) || [];
        return ref.set({ items: items.map(function (x) { return x.id === id ? fn(Object.assign({}, x)) : x; }), updatedAt: new Date().toISOString() }, { merge: true });
      }).catch(function (err) { window.alert("저장 실패: " + err.message); });
    }
    function draw() {
      H.clear(grid);
      var today = H.todayStr();
      var live = ITEMS.filter(function (x) { return LIVE.indexOf(x.status || "준비") !== -1 && (!x.deadline || x.deadline >= today); })
        .sort(function (a, b) { return String(a.deadline || "9999").localeCompare(String(b.deadline || "9999")); });
      if (!live.length) { grid.appendChild(ui.empty("마감을 앞둔 공모가 없어요.")); return; }
      live.forEach(function (x) {
        var card = el("article", "contest");
        var top = el("div", "contest-top");
        if (x.deadline) {
          var di = H.ddayInfo(x.deadline);
          top.appendChild(el("span", "contest-dday " + (di.diff <= 7 ? "near" : ""), di.text));
          top.appendChild(el("span", "contest-due", mmdd(x.deadline) + (x.deadlineTime ? " " + x.deadlineTime : "") + " 마감"));
        }
        top.appendChild(el("span", "status-chip", x.status || "준비"));
        card.appendChild(top);
        var t = el("h3", "contest-title", x.title || ""); card.appendChild(t);
        var sub = [x.venue, x.eligibility].filter(Boolean).join(" · ");
        if (sub) { card.appendChild(el("p", "contest-sub", sub)); }
        var sp = lines(x.specs);
        if (sp.length) { var chips = el("div", "contest-chips"); sp.forEach(function (s) { chips.appendChild(el("span", "contest-chip", s)); }); card.appendChild(chips); }
        if (x.prize) { card.appendChild(el("p", "contest-prize", "상금 · 혜택  " + x.prize)); }
        lines(x.caution).forEach(function (s) { card.appendChild(el("p", "contest-warn", "⚠ " + s)); });
        var cl = lines(x.checklist);
        if (cl.length) {
          var box = el("div", "contest-checks"), checks = x.checks || {};
          cl.forEach(function (label) {
            var lab = el("label", "contest-check" + (checks[label] ? " done" : ""));
            var cb = el("input"); cb.type = "checkbox"; cb.checked = !!checks[label];
            cb.addEventListener("change", function () {
              patch(x.id, function (it) { var m = Object.assign({}, it.checks || {}); m[label] = cb.checked; it.checks = m; return it; });
            });
            lab.appendChild(cb); lab.appendChild(document.createTextNode(" " + label)); box.appendChild(lab);
          });
          card.appendChild(box);
        }
        var foot = el("div", "contest-foot");
        if (x.email) {
          var eb = el("button", "copy-btn", "이메일 복사"); eb.type = "button"; eb.title = x.email;
          eb.addEventListener("click", function () { H.copyText(x.email, eb); });
          foot.appendChild(eb);
        }
        if (x.url) { var a = el("a", "copy-btn", "공고 보기"); a.href = H.safeUrl(x.url); a.target = "_blank"; a.rel = "noopener noreferrer"; foot.appendChild(a); }
        var meta = [x.email, x.phone ? "문의 " + x.phone : "", x.announce ? "발표 " + (/^\d{4}-\d{2}-\d{2}$/.test(x.announce) ? mmdd(x.announce) : x.announce) : ""].filter(Boolean).join(" · ");
        if (meta) { foot.appendChild(el("span", "contest-meta", meta)); }
        card.appendChild(foot);
        grid.appendChild(card);
      });
    }
    App.watchDoc(ref, function (d) { ITEMS = (d && d.items) || []; draw(); });
  }
  App.writer.PRESETS = PRESETS;

  /* =========================================================
     공모 · 투고
     ========================================================= */
  /* 글쓰기 기록: every contest / submission I track (준비 → 제출 → 결과) */
  App.page({
    id: "writer-submit", title: "글쓰기 기록",
    render: function (view) { W.track(); submitCard(view); }
  });
  function submitCard(view) {
      var c1 = ui.card(view, { tab: "Submit", tone: "t-1", title: "공모 · 투고 현황", wide: true });
      c1.el.classList.add("desk-submit");

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
          { key: "deadlineTime", label: "마감 시각", type: "text", maxLength: 10 },
          { key: "announce", label: "결과 발표", type: "text", maxLength: 30 },
          { key: "eligibility", label: "응모 자격", type: "text", maxLength: 120 },
          { key: "specs", label: "분량 · 형식 (한 줄에 하나)", type: "textarea", rows: 3 },
          { key: "prize", label: "상금 · 혜택", type: "text", maxLength: 160 },
          { key: "caution", label: "유의사항 (한 줄에 하나)", type: "textarea", rows: 2 },
          { key: "checklist", label: "제출 체크리스트 (한 줄에 하나)", type: "textarea", rows: 3 },
          { key: "email", label: "접수 이메일", type: "text", maxLength: 120 },
          { key: "phone", label: "문의 전화", type: "text", maxLength: 60 },
          { key: "rule", label: "규정 (분량 · 양식 · 유의사항)", type: "textarea", rows: 3 },
          { key: "note", label: "메모 · 결과", type: "textarea", rows: 2 }
        ],
        summary: function (items) {
          var m = countBy(items, "status", "준비");
          return items.length ? "총 " + items.length + "건 · 준비 " + (m["준비"] || 0) + " · 제출 " + (m["제출"] || 0) + " · 심사중 " + (m["심사중"] || 0) + " · 당선/게재 " + (m["당선 · 게재"] || 0) : "";
        }
      });
  }
})(window.App);
