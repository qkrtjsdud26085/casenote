/* Hello dear Sunny — 박사 › 비선형 공격성 임계점 [현재 진행중: 연구 흐름 · 시작 체크리스트] · 자격증 · AI
   Everything here is personal study data, stored only in Firestore (research/*). */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;
  var R = function (name) { return App.doc("research/" + name); };
  var tabs = function (view, ids, id) { App.rkit.pageTabs(view, ids, id); };
  /* nearest date (either side of today) first, undated last */
  function byNearest(key) {
    return function (a, b) {
      function rank(x) { return x[key] ? Math.abs(H.parseKey(x[key]) - H.parseKey(H.todayStr())) : Infinity; }
      var ra = rank(a), rb = rank(b);
      return ra === rb ? 0 : (ra < rb ? -1 : 1);
    };
  }
  function newestFirst(key) { return function (a, b) { return String(b[key] || "").localeCompare(String(a[key] || "")); }; }

  /* =========================================================
     비선형 공격성 임계점 › 현재 진행중 — 연구 흐름도 + 시작 체크리스트 (research/diss_process · diss_startcheck)
     ========================================================= */
  App.page({
    id: "diss-current", title: "비선형 공격성 임계점 · 현재 진행중", navLabel: "현재 진행중",
    tabLabel: "현재 진행중",
    render: function (view) {
      var DD = App.diss.D;
      App.rkit.pageTabs(view, ["diss-current", "diss-report1"], "diss-current");
      var c = ui.card(view, { tab: "Process", tone: "t-1", title: "연구 프로세스", wide: true });
      ui.researchFlow(c.body, { ref: DD("process") });
      var n = ui.card(view, { tab: "Start", tone: "t-2", title: "연구 시작 체크리스트", wide: true });
      ui.itemsPanel(n.body, {
        ref: DD("startcheck"), checkKey: "done", dueKey: "due", ddayInTable: true, views: ["table", "cards"], filters: ["phase"],
        addLabel: "+ 항목 추가", reorder: { resetLabel: "기한 가까운 순으로" }, empty: "아직 항목이 없어요.",
        sort: function (a, b) { return (!!a.done - !!b.done) || byNearest("due")(a, b); },
        fields: [
          { key: "text", label: "할 일", type: "text", title: true, required: true, col: true, maxLength: 200 },
          { key: "phase", label: "단계", type: "text", meta: true, col: true, maxLength: 30 },
          { key: "due", label: "기한", type: "date", col: true },
          { key: "note", label: "메모 · 근거", type: "textarea", rows: 2 }
        ]
      });
      App.diss.importCard(view, "", "자료 불러오기 · 백업");
    }
  });

  /* =========================================================
     비선형 › 현재 진행중 › 1차년도 보고서 (= 연구 지도 확인서, 2026 신청요강 붙임7)
     연구윤리교육 ~11.30 · 연구 지도 확인서 e-R&D 제출 ~12.31 (research/diss_report1 · diss_r1steps · diss_r1advice · diss_r1outputs)
     ========================================================= */
  var R1_TABS = ["diss-current", "diss-report1"];
  var R1_DUE = [{ label: "연구윤리교육 이수", date: "2026-11-30" }, { label: "연구 지도 확인서 제출 (e-R&D)", date: "2026-12-31" }];
  var R1_STEPS = [
    { text: "연구윤리교육 이수", phase: "필수", due: "2026-11-30" },
    { text: "1. 연구진행상황 초안 쓰기", phase: "확인서", due: "2026-12-05" },
    { text: "2. 연구지도내용 정리 (지도 기록에서 모으기)", phase: "확인서", due: "2026-12-05" },
    { text: "지도교수께 초안 보내고 검토 받기", phase: "지도교수", due: "2026-12-15" },
    { text: "지도교수 확인 · 서명 받기", phase: "지도교수", due: "2026-12-22" },
    { text: "e-R&D에 연구 지도 확인서 온라인 제출", phase: "제출", due: "2026-12-31" }
  ];
  var R1_SECTIONS = [
    { key: "s1", title: "1. 연구진행상황", ph: "예: 문헌 검토 범위 · 자료 수집 진행률 · 분석 진행 · 계획서 대비 달라진 점" },
    { key: "s2", title: "2. 연구지도내용", ph: "예: 지도 날짜별 핵심 조언 · 그 뒤 고친 점 (아래 '지도 기록'에서 모으기)" },
    { key: "s3", title: "3. 기타", ph: "예: 연구윤리교육 이수 · 학회 발표 · 논문 투고 계획" }
  ];
  var R1_STATUS = ["계획", "자료 모음", "초안", "완료"];
  App.page({
    id: "diss-report1", title: "1차년도 보고서 · 연구 지도 확인서", navHidden: true, navParent: "diss-current", tabLabel: "1차년도 보고서",
    render: function (view) {
      var DD = App.diss.D;
      App.rkit.pageTabs(view, R1_TABS, "diss-report1");

      /* 마감 · 단계 */
      var dc = ui.card(view, { tab: "Deadline", tone: "t-1", title: "제출 일정", wide: true });
      var dues = el("div", "r1-dues");
      R1_DUE.forEach(function (d) {
        var b = el("div", "r1-due"); b.appendChild(H.ddayEl(d.date));
        b.appendChild(el("span", "r1-due-label", d.label)); b.appendChild(el("span", "r1-due-date", d.date.slice(5).replace("-", "/")));
        dues.appendChild(b);
      });
      dc.body.appendChild(dues);
      ui.itemsPanel(dc.body, {
        ref: DD("r1steps"), checkKey: "done", dueKey: "due", ddayInTable: true, views: ["table"], defaults: R1_STEPS,
        addLabel: "+ 단계 추가", reorder: { resetLabel: "기본 순서로" }, empty: "단계가 없어요.",
        fields: [
          { key: "text", label: "할 일", type: "text", title: true, required: true, col: true, maxLength: 200 },
          { key: "phase", label: "구분", type: "text", meta: true, col: true, maxLength: 20 },
          { key: "due", label: "기한", type: "date", col: true },
          { key: "note", label: "메모", type: "textarea", rows: 2 }
        ]
      });

      /* 확인서 목차별 계획 · 초안 */
      var grid = el("div", "r1-sections"); view.appendChild(grid);
      R1_SECTIONS.forEach(function (sec) {
        var c = ui.card(grid, { tab: "Section", tone: "t-2", title: sec.title, wide: true });
        ui.fieldsPanel(c.body, {
          ref: DD("report1"), docKey: sec.key,
          fields: [
            { key: "status", label: "상태", type: "select", options: R1_STATUS },
            { key: "plan", label: "쓸 내용 (한 줄에 하나)", type: "textarea", rows: 4, placeholder: sec.ph },
            { key: "evidence", label: "근거 자료 · 파일 위치", type: "text", wide: true, maxLength: 300 },
            { key: "draft", label: "초안", type: "textarea", rows: 7 }
          ],
          onData: function (src) {
            src = src || {};
            var n = String(src.draft || "").replace(/\s/g, "").length;
            c.count.textContent = (src.status || R1_STATUS[0]) + (n ? " · " + n.toLocaleString("ko-KR") + "자" : "");
            c.el.classList.toggle("r1-done", src.status === "완료");
          }
        });
      });

      var g = ui.grid(view, true);
      /* 지도 기록 → 2. 연구지도내용 */
      var ac = ui.card(g, { tab: "Advice", tone: "t-3", title: "지도 기록" });
      ui.itemsPanel(ac.body, {
        ref: DD("r1advice"), views: ["cards", "table"], addLabel: "+ 지도 기록", empty: "지도받은 날마다 적어 두면 '2. 연구지도내용'에 옮기기 쉬워요.",
        sort: function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); },
        fields: [
          { key: "date", label: "날짜", type: "date", col: true },
          { key: "text", label: "지도 내용", type: "textarea", title: true, required: true, col: true, rows: 3 },
          { key: "applied", label: "반영한 점", type: "textarea", col: true, rows: 2 }
        ]
      });
      /* 연구 성과 (사사표기 확인) */
      var oc = ui.card(g, { tab: "Outputs", tone: "t-1", title: "연구 성과" });
      ui.itemsPanel(oc.body, {
        ref: DD("r1outputs"), views: ["table", "cards"], addLabel: "+ 성과 추가", empty: "논문 투고 · 학회 발표를 적어 두세요.",
        fields: [
          { key: "title", label: "제목", type: "text", title: true, required: true, col: true, maxLength: 200 },
          { key: "kind", label: "구분", type: "select", options: ["학술지 논문", "학회 발표", "저서", "기타"], meta: true, col: true },
          { key: "status", label: "상태", type: "select", options: ["준비", "투고", "게재 확정", "게재", "발표 완료"], col: true },
          { key: "date", label: "날짜", type: "date", col: true },
          { key: "ack", label: "사사표기", type: "check", col: true },
          { key: "note", label: "학술지 · 학회 · 메모", type: "text", maxLength: 200 }
        ]
      });
      var ak = ui.card(g, { tab: "Credit", tone: "t-2", title: "사사표기 문구", wide: true });
      ui.refList(ak.body, [
        { label: "국문", text: "이 논문 또는 저서는 2026년 대한민국 교육부와 한국연구재단의 지원을 받아 수행된 연구임 (NRF-과제번호)" },
        { label: "영문", text: "This work was supported by the Ministry of Education of the Republic of Korea and the National Research Foundation of Korea (NRF-과제번호)" }
      ]);
    }
  });

  /* =========================================================
     자격증 — 목록 · 일정 / 공부 계획 · 기록 / 증빙 파일
     ========================================================= */
  var CERT_TABS = ["cert-list", "cert-study", "cert-files"];
  var CERT_STATUS = ["관심", "준비 중", "접수 완료", "응시 완료", "합격", "불합격", "취득"];

  App.page({
    id: "cert-list", title: "자격증", navLabel: "전체 현황", tabLabel: "목록 · 일정",
    render: function (view) {
      tabs(view, CERT_TABS, "cert-list");
      var c = ui.card(view, { tab: "Certificates", tone: "t-1", title: "자격증 목록 · 일정", wide: true });
      ui.itemsPanel(c.body, {
        ref: R("certs"), views: ["table", "cards"], statusKey: "status", dueKey: "exam", ddayInTable: true,
        sort: byNearest("exam"), reorder: { resetLabel: "시험일 가까운 순으로 정렬" }, search: true,
        statusTones: { "관심": 0, "준비 중": 1, "접수 완료": 1, "응시 완료": 2, "합격": 3, "취득": 3, "불합격": 0 },
        addLabel: "+ 자격증 추가", empty: "준비하거나 취득한 자격증을 추가하세요. 시험일을 넣으면 D-day가 보여요.",
        hint: "상태 칩을 누르면 다음 단계로 넘어가요. 시험일이 가까운 순서로 정렬되고, ▲▼로 순서를 바꿀 수 있어요.",
        fields: [
          { key: "name", label: "자격증", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "org", label: "발급 기관", type: "text", col: true, maxLength: 80 },
          { key: "status", label: "상태", type: "select", options: CERT_STATUS, col: true },
          { key: "applyEnd", label: "접수 마감", type: "date", col: true },
          { key: "exam", label: "시험일", type: "date", col: true },
          { key: "score", label: "점수 · 결과", type: "text", col: true, maxLength: 60 },
          { key: "valid", label: "유효기간", type: "date", col: true },
          { key: "memo", label: "메모", type: "textarea" }
        ],
        summary: function (items) {
          if (!items.length) { return null; }
          var got = items.filter(function (x) { return x.status === "합격" || x.status === "취득"; }).length;
          var next = items.filter(function (x) { return x.exam && x.exam >= H.todayStr(); }).sort(function (a, b) { return a.exam < b.exam ? -1 : 1; })[0];
          return "취득 · 합격 " + got + "개 / 전체 " + items.length + "개" + (next ? " · 다음 시험 " + next.name + " (" + H.ddayInfo(next.exam).text + ")" : "");
        }
      });
    }
  });

  App.page({
    id: "cert-study", title: "자격증 공부 계획 · 기록", navHidden: true, navParent: "cert-list", tabLabel: "공부 계획 · 기록",
    render: function (view) {
      tabs(view, CERT_TABS, "cert-study");
      var g = ui.grid(view, true);
      var p = ui.card(g, { tab: "Plan", tone: "t-2", title: "공부 계획" });
      ui.itemsPanel(p.body, {
        ref: R("certplan"), views: ["table"], checkKey: "done", dueKey: "due", ddayInTable: true,
        sort: function (a, b) { return (!!a.done - !!b.done) || byNearest("due")(a, b); }, reorder: { resetLabel: "기한 가까운 순으로 정렬" },
        quickFields: ["goal", "cert", "due"], empty: "자격증별로 이번 주 · 이번 달 목표를 적어 두세요.",
        fields: [
          { key: "goal", label: "목표", type: "text", title: true, required: true, col: true, maxLength: 140, placeholder: "예: 기출 3회독" },
          { key: "cert", label: "자격증", type: "text", col: true, maxLength: 60, placeholder: "자격증" },
          { key: "due", label: "기한", type: "date", col: true }
        ]
      });
      var l = ui.card(g, { tab: "Log", tone: "t-3", title: "공부 기록" });
      ui.itemsPanel(l.body, {
        ref: R("certlog"), views: ["table"], sort: newestFirst("date"),
        quickFields: ["what", "cert", "hours", "date"], empty: "공부한 날짜와 시간, 범위를 기록하세요.",
        fields: [
          { key: "what", label: "범위 · 내용", type: "text", title: true, required: true, col: true, maxLength: 160, placeholder: "범위 · 내용" },
          { key: "date", label: "날짜", type: "date", col: true, today: true },
          { key: "cert", label: "자격증", type: "text", col: true, maxLength: 60, placeholder: "자격증" },
          { key: "hours", label: "시간(h)", type: "number", col: true, step: "0.5", placeholder: "시간" }
        ],
        summary: function (items) {
          if (!items.length) { return null; }
          var by = {};
          items.forEach(function (x) { var k = x.cert || "기타"; by[k] = (by[k] || 0) + (Number(x.hours) || 0); });
          return "누적 공부 시간 · " + Object.keys(by).map(function (k) { return k + " " + Math.round(by[k] * 10) / 10 + "h"; }).join(" · ");
        }
      });
    }
  });

  App.page({
    id: "cert-files", title: "자격증 증빙 파일", navHidden: true, navParent: "cert-list", tabLabel: "증빙 파일",
    render: function (view) {
      tabs(view, CERT_TABS, "cert-files");
      var c = ui.card(view, { tab: "Files", tone: "t-1", title: "취득 증빙 파일 링크", wide: true });
      ui.itemsPanel(c.body, {
        ref: R("certfiles"), views: ["table", "cards"], titleLink: "url", addLabel: "+ 파일 링크 추가",
        empty: "합격증 · 자격증 사본이 있는 구글 드라이브 링크를 모아 두세요.",
        hint: "파일 자체는 올리지 않고 링크만 저장해요. 드라이브 공유 설정은 '나만 보기'로 두는 걸 추천해요.",
        fields: [
          { key: "name", label: "이름", type: "text", title: true, required: true, col: true, maxLength: 80, placeholder: "예: 정신건강임상심리사 2급 합격증" },
          { key: "cert", label: "자격증", type: "text", col: true, maxLength: 60 },
          { key: "url", label: "링크", type: "url", col: true },
          { key: "issued", label: "발급일", type: "date", col: true },
          { key: "memo", label: "메모", type: "text", col: true, maxLength: 160 }
        ]
      });
    }
  });

  /* =========================================================
     자격증 세부 — 범죄심리사 / 피해상담사 / 임상심리사
     ========================================================= */
  var CERT_SUB = [["cert-crime", "범죄심리사"], ["cert-victim", "피해상담사"], ["cert-clinical", "임상심리사"]];
  /* 범죄심리사 / 피해상담사 / 임상심리사 switcher, placed beside the big page title */
  function certHeadTabs(active) {
    var head = document.getElementById("pageHead"), h1 = head && head.querySelector(".page-title");
    if (!h1) { return; }
    head.classList.add("has-tabs");
    var nav = el("nav", "bud-tabs cert-head-tabs"); nav.setAttribute("aria-label", "자격증 선택");
    CERT_SUB.forEach(function (t) {
      var a = el("a", "bud-tab" + (t[0] === active ? " on" : ""), t[1]); a.href = "#/" + t[0];
      if (t[0] === active) { a.setAttribute("aria-current", "page"); }
      nav.appendChild(a);
    });
    h1.insertAdjacentElement("afterend", nav);
  }

  /* D-day: the nearest upcoming exam in large type + the list of exam dates */
  function ddayCard(parent, ref) {
    var c = ui.card(parent, { tab: "D-day", tone: "t-2", title: "시험 D-day" });
    var big = el("div", "dday-big"); c.body.appendChild(big);
    ui.itemsPanel(c.body, {
      ref: ref, views: ["table"], dueKey: "date", ddayInTable: true, quickFields: ["name", "date"],
      sort: function (a, b) { return String(a.date || "9999").localeCompare(String(b.date || "9999")); }, empty: "시험 날짜를 추가하세요.",
      onItems: function (items) {
        H.clear(big);
        var t = H.todayStr();
        var next = items.filter(function (x) { return x.date && x.date >= t; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
        if (!next) { big.appendChild(el("div", "dday-big-none", "다가오는 시험 없음")); return; }
        var info = H.ddayInfo(next.date);
        big.appendChild(el("div", "dday-big-num " + info.cls, info.text));
        big.appendChild(el("div", "dday-big-name", next.name + " · " + next.date.replace(/-/g, ".")));
      },
      fields: [
        { key: "name", label: "시험", type: "text", title: true, required: true, col: true, maxLength: 60, placeholder: "예: 임상심리사 2급 필기" },
        { key: "date", label: "날짜", type: "date", col: true }
      ]
    });
  }
  /* quick links to past-exam (기출문제) sites; defaults can be edited or restored */
  function examLinks(parent, ref, defaults) {
    var c = ui.card(parent, { tab: "Exams", tone: "t-3", title: "기출문제 바로가기", wide: true });
    ui.itemsPanel(c.body, {
      ref: ref, grid: true, titleLink: "url", defaults: defaults, addLabel: "+ 사이트 추가", empty: "사이트를 추가하세요.",
      fields: [
        { key: "name", label: "사이트", type: "text", title: true, required: true, maxLength: 80 },
        { key: "kind", label: "구분", type: "select", options: ["필기 기출", "실기 기출", "시험 정보", "기타"], meta: true },
        { key: "url", label: "링크", type: "url", required: true, hideInCard: true },
        { key: "memo", label: "메모", type: "text", maxLength: 120 }
      ]
    });
  }

  function certDetailPage(cfg) {
    App.page({
      id: cfg.id,
      title: cfg.title,
      navLabel: cfg.title,
      tabLabel: cfg.title,
      render: function (view) {
        certHeadTabs(cfg.id);
        var g = ui.grid(view, true);

        var o = ui.card(g, { tab: "Info", tone: "t-1", title: cfg.title + " 자격 정보 · 목표", wide: !cfg.dday });
        ui.fieldsPanel(o.body, {
          ref: R(cfg.key + "_info"), docKey: "info",
          fields: [
            { key: "level", label: "취득 등급", type: "text", maxLength: 60, placeholder: cfg.defaultLevel || "예: 1급 / 전문가" },
            { key: "org", label: "주관 기관", type: "text", maxLength: 80, placeholder: cfg.defaultOrg || "주관 기관" },
            { key: "status", label: "진행 상태", type: "select", options: ["관심", "준비 중", "수련 중", "접수 완료", "응시 완료", "합격", "취득"] },
            { key: "targetDate", label: "목표 시험일", type: "date" },
            { key: "note", label: "메모 · 요건 요약", type: "textarea", rows: 2, wide: true, placeholder: "응시 자격 요건, 학점/수련 기준 등 메모" }
          ]
        });

        if (cfg.dday) { ddayCard(g, R(cfg.key + "_dday")); }
        if (cfg.links) { examLinks(g, R(cfg.key + "_links"), cfg.links); }

        var r = ui.card(g, { tab: "Requirements", tone: "t-2", title: "취득 요건 · 수련 체크리스트", wide: true });
        ui.itemsPanel(r.body, {
          ref: R(cfg.key + "_reqs"), views: ["table", "cards"], checkKey: "done", dueKey: "due", ddayInTable: true,
          quickFields: ["task", "area", "progress", "due"], addLabel: "+ 요건 추가",
          sort: function (a, b) { return (!!a.done - !!b.done) || byNearest("due")(a, b); },
          reorder: { resetLabel: "기한 가까운 순으로 정렬" },
          empty: cfg.title + " 취득 요건(교과목 이수, 수련 시간, 필수 서류 등)을 추가하세요.",
          summary: function (items) {
            if (!items.length) { return null; }
            var done = items.filter(function (x) { return x.done; }).length;
            return "완료 " + done + "개 / 전체 " + items.length + "개 (" + Math.round(done / items.length * 100) + "%)";
          },
          fields: [
            { key: "task", label: "요건 · 과제", type: "text", title: true, required: true, col: true, maxLength: 140, placeholder: "예: 필수 과목 이수, 수련 시간 충족" },
            { key: "area", label: "구분", type: "select", options: ["교과목 이수", "수련 · 실습", "필기시험", "실기 · 면접", "서류 제출", "기타"], meta: true, col: true },
            { key: "progress", label: "진행도", type: "text", col: true, maxLength: 40, placeholder: "예: 60/100시간" },
            { key: "due", label: "목표 기한", type: "date", col: true },
            { key: "memo", label: "메모", type: "text", col: true, maxLength: 160 }
          ]
        });

        var p = ui.card(g, { tab: "Plan", tone: "t-3", title: "공부 계획 · 시험 일정" });
        ui.itemsPanel(p.body, {
          ref: R(cfg.key + "_plan"), views: ["table"], checkKey: "done", dueKey: "due", ddayInTable: true,
          quickFields: ["goal", "due"], addLabel: "+ 계획 추가",
          sort: function (a, b) { return (!!a.done - !!b.done) || byNearest("due")(a, b); },
          reorder: { resetLabel: "기한 가까운 순으로 정렬" },
          empty: "시험 대비 공부 계획과 일정을 추가하세요.",
          fields: [
            { key: "goal", label: "목표 · 과목", type: "text", title: true, required: true, col: true, maxLength: 140, placeholder: "예: 기출문제 3개년 풀이" },
            { key: "due", label: "기한", type: "date", col: true },
            { key: "memo", label: "메모", type: "text", col: true, maxLength: 160 }
          ]
        });

        var f = ui.card(g, { tab: "Files", tone: "t-1", title: "자료 · 증빙 링크" });
        ui.itemsPanel(f.body, {
          ref: R(cfg.key + "_files"), views: ["table", "cards"], titleLink: "url", addLabel: "+ 링크 추가",
          quickFields: ["name", "url"],
          empty: "수련 일지, 기출 자료, 합격 증빙 링크를 모아 두세요.",
          fields: [
            { key: "name", label: "이름", type: "text", title: true, required: true, col: true, maxLength: 100, placeholder: "예: 수련 증명서 양식" },
            { key: "url", label: "링크", type: "url", col: true, required: true },
            { key: "date", label: "날짜", type: "date", col: true },
            { key: "memo", label: "메모", type: "text", col: true, maxLength: 160 }
          ]
        });
      }
    });
  }

  certDetailPage({
    id: "cert-victim",
    title: "피해상담사",
    key: "cert_victim",
    defaultLevel: "1급 / 2급",
    defaultOrg: "한국피해자지원협회(KOVA) / 한국피해자학회"
  });

  certDetailPage({
    id: "cert-clinical",
    title: "임상심리사",
    key: "cert_clinical",
    defaultLevel: "정신건강임상심리사 1급·2급 / 임상심리사 1급·2급",
    defaultOrg: "보건복지부 / 한국산업인력공단",
    dday: true,
    links: [
      { name: "최강 자격증 기출문제 CBT (comcbt)", kind: "필기 기출", url: "https://www.comcbt.com/xe/bk", memo: "임상심리사 2급 필기 · 해설 · 모의고사" },
      { name: "킨즈 (kinz)", kind: "필기 기출", url: "https://www.kinz.kr/subject/6291", memo: "임상심리사 2급 객관식 필기 · 연도별" },
      { name: "CBT문제은행", kind: "필기 기출", url: "https://cbtbank.kr/category/%EC%9E%84%EC%83%81%EC%8B%AC%EB%A6%AC%EC%82%AC-2%EA%B8%89", memo: "필기 기출 · 자동 채점" },
      { name: "모두CBT", kind: "실기 기출", url: "https://www.moducbt.com/category/%EC%9E%84%EC%83%81%EC%8B%AC%EB%A6%AC%EC%82%AC2%EA%B8%89-%EC%8B%A4%EA%B8%B0-%EA%B8%B0%EC%B6%9C-%EA%B3%BC%EB%85%84%EB%8F%84-%EC%95%94%EA%B8%B0%EC%9E%A5", memo: "실기 기출 · 모범답안" },
      { name: "Q-Net 임상심리사2급 시험 정보", kind: "시험 정보", url: "https://www.q-net.or.kr/crf005.do?id=crf00503&jmCd=9540", memo: "시험 일정 · 응시 자격 · 출제 기준" }
    ]
  });

  /* =========================================================
     범죄심리사 — 면담 기록 / 선도 대책 / 자주 쓰는 문구 / 보고서 프롬프트 / 자격 정보
     면담 기록에는 이름을 두지 않고 날짜 · 인원 · 죄명만 둡니다. 문구와 프롬프트는
     research/crime_* 에만 있고, 처음 한 번 '자격 정보 › 자료 불러오기'로 채웁니다.
     ========================================================= */
  var CRIME_TABS = ["cert-crime", "cert-crime-guide", "cert-crime-phrase", "cert-crime-prompt", "cert-crime-info"];
  var CK = App.rkit({ prefix: "crime", docs: ["sessions", "guide", "phrases", "prompt", "info"], stages: ["기록", "완료"],
    name: "범죄심리사", fileName: "범죄심리사_홈페이지자료", homeId: "cert-crime-info" });
  var CD = CK.D;
  var SESSION_STATUS = ["예정", "1차 작성", "최종 제출"];
  var CRIMES = ["공통", "절도·재산", "도박", "성 관련", "디지털·정보통신", "주거침입·재물손괴", "무면허·교통", "주민등록·공문서",
    "폭력·학교폭력", "스토킹", "경범(화재)", "기타"];
  var AREAS = ["면담 태도", "PAI 검사", "가정환경", "비행환경"];
  var RK = App.rkit;
  function crimeHead(view, id) { certHeadTabs("cert-crime"); RK.pageTabs(view, CRIME_TABS, id); }
  function phraseText(it) { return el("p", "phrase-text", it.text || ""); }
  function crimePage(def) {
    App.page(Object.assign({ title: "범죄심리사" }, def, { navHidden: def.id !== "cert-crime", navParent: def.id === "cert-crime" ? undefined : "cert-crime" }));
  }
  /* completed sessions only (예정 is not counted yet) */
  function doneSessions(items) { return items.filter(function (x) { return (x.status || SESSION_STATUS[0]) !== "예정"; }); }
  function peopleOf(x) { return Math.max(0, Number(x.people) || 0); }
  function sessionLabel(x) {
    var d = x.date ? H.parseKey(x.date) : null;
    return (x.date ? x.date.slice(5).replace("-", "/") + " (" + H.DOW[d.getDay()] + ")" : "") + (x.time ? " " + x.time + (x.end ? "–" + x.end : "") : "");
  }

  function sessionStats(parent) {
    var tiles = el("div", "crime-tiles"), chartHead = el("div", "mini-title", "월별 면담 인원 · 최근 12개월"), bars = el("div", "crime-bars");
    [tiles, chartHead, bars].forEach(function (n) { parent.appendChild(n); });
    return function (items) {
      H.clear(tiles); H.clear(bars);
      var done = doneSessions(items), total = 0, byYear = {}, byMonth = {};
      done.forEach(function (x) {
        var n = peopleOf(x); total += n;
        var y = String(x.date || "").slice(0, 4), m = String(x.date || "").slice(0, 7);
        if (y) { byYear[y] = (byYear[y] || 0) + n; }
        if (m) { byMonth[m] = (byMonth[m] || 0) + n; }
      });
      var t = el("div", "crime-tile hi");
      t.appendChild(el("small", "", "전체 면담")); t.appendChild(el("b", "", total + "건"));
      tiles.appendChild(t);
      Object.keys(byYear).sort().slice(-3).forEach(function (y) {
        var yt = el("div", "crime-tile");
        yt.appendChild(el("small", "", y + "년")); yt.appendChild(el("b", "", String(byYear[y])));
        tiles.appendChild(yt);
      });
      var months = [], now = new Date();
      for (var i = 11; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(d.getFullYear() + "-" + H.pad2(d.getMonth() + 1)); }
      var max = Math.max.apply(null, months.map(function (m) { return byMonth[m] || 0; }).concat([1]));
      months.forEach(function (m) {
        var v = byMonth[m] || 0;
        var col = el("div", "crime-bar-col"), wrap = el("div", "crime-bar-wrap"), bar = el("div", "crime-bar");
        bar.style.height = Math.round(v / max * 100) + "%"; bar.title = m + " · " + v + "명";
        if (v) { wrap.appendChild(el("span", "crime-bar-v", String(v))); }
        wrap.appendChild(bar); col.appendChild(wrap);
        col.appendChild(el("div", "crime-bar-label", String(Number(m.slice(5)))));
        bars.appendChild(col);
      });
    };
  }

  function upcomingList(parent) {
    var box = el("div", "plain-list"); parent.appendChild(box);
    return function (items) {
      H.clear(box);
      var t = H.todayStr();
      var up = items.filter(function (x) { return (x.status || "예정") === "예정" && x.date >= t; })
        .sort(function (a, b) { return (a.date + (a.time || "")) < (b.date + (b.time || "")) ? -1 : 1; }).slice(0, 6);
      if (!up.length) { box.appendChild(ui.empty("예정된 면담이 없어요.")); return; }
      up.forEach(function (x) {
        var li = el("div", "upcoming-item");
        li.appendChild(H.ddayEl(x.date));
        li.appendChild(el("span", "u-title", sessionLabel(x) + " · " + peopleOf(x) + "명" + (x.place ? " · " + x.place : "")));
        if (x.gcal) { var g = el("span", "cat-chip", "G"); g.setAttribute("data-cat", "구글"); g.title = "Google 캘린더에 추가됨"; li.appendChild(g); }
        box.appendChild(li);
      });
    };
  }

  /* new session → saved as 예정 + Google Calendar event "범죄심리사 면담 N명" */
  function scheduleForm(parent) {
    var form = el("form", "crime-sched");
    function inp(type, label, extra) {
      var i = el("input"); i.type = type; i.setAttribute("aria-label", label); i.title = label;
      Object.keys(extra || {}).forEach(function (k) { i[k] = extra[k]; });
      return i;
    }
    var date = inp("date", "날짜", { required: true, value: H.todayStr() });
    var start = inp("time", "시작 시간", { required: true, value: "10:00" });
    var end = inp("time", "끝 시간", { value: "" });
    var people = inp("number", "인원", { required: true, min: 1, step: 1, value: 1, placeholder: "인원" });
    var place = inp("text", "장소", { value: H.safeGet("hds_crime_place") || "", placeholder: "장소", maxLength: 60 });
    var memo = inp("text", "메모", { placeholder: "메모 (선택)", maxLength: 160 });
    var btn = el("button", "btn", "일정 추가"); btn.type = "submit";
    var r1 = el("div", "crime-sched-row"), r2 = el("div", "crime-sched-row"), r3 = el("div", "crime-sched-row");
    r1.appendChild(date); r1.appendChild(start); r1.appendChild(el("span", "crime-sched-sep", "~")); r1.appendChild(end);
    var pw = el("label", "crime-people"); pw.appendChild(people); pw.appendChild(el("span", "", "명"));
    r2.appendChild(pw); r2.appendChild(place);
    r3.appendChild(memo); r3.appendChild(btn);
    [r1, r2, r3].forEach(function (r) { form.appendChild(r); });
    var status = el("p", "crime-sched-status");
    parent.appendChild(form); parent.appendChild(status);

    function update(fn) {
      return CD("sessions").get().then(function (snap) {
        var items = snap.exists && Array.isArray(snap.data().items) ? snap.data().items : [];
        return CD("sessions").set({ items: fn(items), updatedAt: new Date().toISOString() }, { merge: true });
      });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!date.value || !start.value) { return; }
      var n = Math.max(1, Number(people.value) || 1);
      var item = { id: H.uid(), date: date.value, time: start.value, end: end.value, people: n, crimes: "", place: place.value.trim(),
        status: "예정", memo: memo.value.trim(), gcal: false };
      H.safeSet("hds_crime_place", item.place);
      btn.disabled = true; status.textContent = "저장 중…";
      update(function (items) { return items.concat([item]); }).then(function () {
        status.textContent = "Google 캘린더에 추가하는 중…";
        return App.gtasks.createEvent("범죄심리사 면담 " + n + "명", item.date, item.time, item.memo, { end: item.end, location: item.place });
      }).then(function () {
        status.textContent = "추가됨 · Google 캘린더 ✓";
        memo.value = "";
        return update(function (items) { return items.map(function (x) { return x.id === item.id ? Object.assign({}, x, { gcal: true }) : x; }); });
      }).catch(function (err) {
        status.textContent = "기록은 저장됐어요 · 캘린더 추가 실패";
        window.alert("Google 캘린더에 추가하지 못했어요: " + (App.gtasks.explain ? App.gtasks.explain(err) : err.message));
      }).then(function () { btn.disabled = false; });
    });
  }

  crimePage({
    id: "cert-crime", navLabel: "범죄심리사", tabLabel: "면담 기록",
    render: function (view) {
      crimeHead(view, "cert-crime");
      var g = ui.grid(view, true);
      var rec = ui.card(g, { tab: "Record", tone: "t-2", title: "면담 기록" });
      var drawStats = sessionStats(rec.body);
      var sch = ui.card(g, { tab: "Schedule", tone: "t-3", title: "새 면담 일정 → Google 캘린더" });
      scheduleForm(sch.body);
      sch.body.appendChild(el("div", "mini-title crime-up-title", "다가오는 면담"));
      var drawUp = upcomingList(sch.body);
      var list = ui.card(view, { tab: "Log", tone: "t-1", title: "면담 목록", wide: true });
      ui.itemsPanel(list.body, {
        ref: CD("sessions"), views: ["table"], statusKey: "status", search: true, addLabel: "+ 기록 추가",
        statusTones: { "예정": 0, "1차 작성": 1, "최종 제출": 3 },
        sort: function (a, b) { return String(b.date + (b.time || "")).localeCompare(String(a.date + (a.time || ""))); },
        itemTitle: function (it) { return it.date ? sessionLabel(it).replace(/^(\d\d)\/(\d\d)/, it.date.slice(0, 4) + ".$1.$2") : "(날짜 없음)"; },
        empty: "아직 기록이 없어요.",
        summary: function (items) {
          var d = doneSessions(items), p = d.reduce(function (s, x) { return s + peopleOf(x); }, 0);
          return items.length ? "면담 " + d.length + "일 · " + p + "명" + (items.length > d.length ? " · 예정 " + (items.length - d.length) + "건" : "") : null;
        },
        onItems: function (items) { drawStats(items); drawUp(items); },
        fields: [
          { key: "date", label: "날짜", type: "date", title: true, required: true, col: true, today: true },
          { key: "time", label: "시작", type: "time" },
          { key: "end", label: "끝", type: "time" },
          { key: "people", label: "인원", type: "number", col: true, step: 1, default: 1 },
          { key: "crimes", label: "죄명", type: "text", col: true, maxLength: 120 },
          { key: "place", label: "장소", type: "text", col: true, maxLength: 60 },
          { key: "status", label: "보고서", type: "select", options: SESSION_STATUS, col: true },
          { key: "memo", label: "메모", type: "text", col: true, maxLength: 160 }
        ]
      });
    }
  });

  crimePage({
    id: "cert-crime-guide", tabLabel: "선도 대책",
    render: function (view) {
      crimeHead(view, "cert-crime-guide");
      var c = ui.card(view, { tab: "Guidance", tone: "t-1", title: "죄명별 선도 대책", wide: true });
      ui.itemsPanel(c.body, {
        ref: CD("guide"), grid: true, search: true, filters: ["crime"], filterCounts: true, textBtns: true, addLabel: "+ 문구 추가",
        actions: RK.copyAction("text"), itemExtra: phraseText, empty: "아직 문구가 없어요.",
        sort: function (a, b) { return CRIMES.indexOf(a.crime) - CRIMES.indexOf(b.crime); },
        fields: [
          { key: "title", label: "제목", type: "text", title: true, required: true, maxLength: 80 },
          { key: "crime", label: "죄명", type: "select", options: CRIMES, meta: true },
          { key: "text", label: "문구", type: "textarea", required: true, rows: 5, maxLength: 3000, hideInCard: true }
        ]
      });
    }
  });

  crimePage({
    id: "cert-crime-phrase", tabLabel: "자주 쓰는 문구",
    render: function (view) {
      crimeHead(view, "cert-crime-phrase");
      var c = ui.card(view, { tab: "Phrases", tone: "t-2", title: "자주 쓰는 문구", wide: true });
      var sw = el("div", "archive-filters crime-areas"); c.body.appendChild(sw);
      var cur = H.safeGet("hds_crime_area");
      if (AREAS.indexOf(cur) === -1) { cur = AREAS[0]; }
      var boxes = {}, btns = {};
      function show(a) {
        cur = a; H.safeSet("hds_crime_area", a);
        AREAS.forEach(function (x) { boxes[x].hidden = x !== a; btns[x].classList.toggle("active", x === a); });
      }
      AREAS.forEach(function (a) {
        var b = el("button", "chip", a); b.type = "button"; b.setAttribute("data-area", a);
        b.addEventListener("click", function () { show(a); });
        btns[a] = b; sw.appendChild(b);
        var box = el("div", "crime-area"); boxes[a] = box; c.body.appendChild(box);
        ui.itemsPanel(box, {
          ref: CD("phrases"), scope: { key: "area", value: a }, grid: true, search: true, filters: ["tag"], filterCounts: true, textBtns: true,
          addLabel: "+ 문구 추가", actions: RK.copyAction("text"), itemExtra: phraseText, empty: "아직 문구가 없어요.",
          onItems: function (items) { btns[a].textContent = a + " " + items.length; },
          fields: [
            { key: "title", label: "제목", type: "text", title: true, required: true, maxLength: 80 },
            { key: "tag", label: "분류", type: "text", meta: true, maxLength: 40 },
            { key: "text", label: "문구", type: "textarea", required: true, rows: 5, maxLength: 3000, hideInCard: true }
          ]
        });
      });
      show(cur);
    }
  });

  crimePage({
    id: "cert-crime-prompt", tabLabel: "보고서 프롬프트",
    render: function (view) {
      crimeHead(view, "cert-crime-prompt");
      var c = ui.card(view, { tab: "Prompt", tone: "t-1", title: "보고서 작성 프롬프트 (내 말투)", wide: true });
      var tools = el("div", "items-tools");
      var copy = el("button", "copy-btn", "전체 복사"); copy.type = "button";
      var dl = el("button", "tool-btn", "파일로 내려받기 (.md)"); dl.type = "button";
      var edit = el("button", "tool-btn", "수정"); edit.type = "button";
      [copy, dl, edit].forEach(function (b) { tools.appendChild(b); });
      var pre = el("pre", "crime-prompt");
      var ta = el("textarea", "crime-prompt-edit"); ta.rows = 24; ta.hidden = true; ta.setAttribute("aria-label", "프롬프트");
      var acts = el("div", "actions"); acts.hidden = true;
      var save = el("button", "btn", "저장"); save.type = "button";
      var cancel = el("button", "btn ghost", "취소"); cancel.type = "button";
      acts.appendChild(save); acts.appendChild(cancel);
      [tools, pre, ta, acts].forEach(function (n) { c.body.appendChild(n); });
      var text = "";
      function mode(editing) { pre.hidden = editing; ta.hidden = !editing; acts.hidden = !editing; edit.classList.toggle("on", editing); }
      App.watchDoc(CD("prompt"), function (d) {
        text = d && d.text ? d.text : "";
        pre.textContent = text || "아직 프롬프트가 없어요.";
        if (ta.hidden) { ta.value = text; }
      });
      copy.addEventListener("click", function () { H.copyText(text, copy); });
      dl.addEventListener("click", function () {
        var url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
        var a = el("a"); a.href = url; a.download = "비행성예측보고서_작성지침.md";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      });
      edit.addEventListener("click", function () { ta.value = text; mode(ta.hidden); });
      cancel.addEventListener("click", function () { mode(false); });
      save.addEventListener("click", function () { App.setDoc(CD("prompt"), { text: ta.value }).then(function () { mode(false); }); });
    }
  });

  crimePage({
    id: "cert-crime-info", tabLabel: "자격 정보",
    render: function (view) {
      crimeHead(view, "cert-crime-info");
      var top = ui.grid(view, true);
      var o = ui.card(top, { tab: "Info", tone: "t-1", title: "자격 정보" });
      ui.fieldsPanel(o.body, {
        ref: CD("info"), docKey: "info",
        fields: [
          { key: "level", label: "자격", type: "text", maxLength: 60 },
          { key: "org", label: "발급 기관", type: "text", maxLength: 80 },
          { key: "certNo", label: "자격인증번호", type: "text", maxLength: 40 },
          { key: "issued", label: "취득일", type: "date" },
          { key: "status", label: "상태", type: "select", options: ["취득", "갱신 필요", "준비 중"] }
        ]
      });
      var up = ui.card(top, { tab: "Certificate", tone: "t-3", title: "자격증 파일" });
      ui.fileVault(up.body, { ref: CD("certfiles") });
      var f = ui.card(view, { tab: "Files", tone: "t-2", title: "자료 · 증빙 링크", wide: true });
      ui.itemsPanel(f.body, {
        ref: R("cert_crime_files"), views: ["table", "cards"], titleLink: "url", addLabel: "+ 링크 추가",
        quickFields: ["name", "url"], empty: "아직 링크가 없어요.",
        fields: [
          { key: "name", label: "이름", type: "text", title: true, required: true, col: true, maxLength: 100 },
          { key: "url", label: "링크", type: "url", col: true, required: true },
          { key: "date", label: "날짜", type: "date", col: true },
          { key: "memo", label: "메모", type: "text", col: true, maxLength: 160 }
        ]
      });
      CK.importCard(view, "");
    }
  });

  /* =========================================================
     AI — 도구 · 프롬프트 / 공부 노트 / 활용 기록
     ========================================================= */
  var AI_TABS = ["ai-tools", "ai-notes", "ai-log"];

  App.page({
    id: "ai-tools", title: "AI 도구 · 프롬프트", navLabel: "AI", tabLabel: "도구 · 프롬프트",
    render: function (view) {
      tabs(view, AI_TABS, "ai-tools");
      var t = ui.card(view, { tab: "Tools", tone: "t-1", title: "연구용 AI 도구", wide: true });
      ui.itemsPanel(t.body, {
        ref: R("aitools"), views: ["table", "cards"], titleLink: "url", addLabel: "+ 도구 추가", search: true,
        empty: "논문 작업에 쓰는 AI 도구를 추가하세요. (예: Claude, Elicit, Consensus, DeepL)",
        fields: [
          { key: "name", label: "도구", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "use", label: "주로 쓰는 곳", type: "text", col: true, maxLength: 120, placeholder: "예: 문헌 요약, 코드 점검" },
          { key: "url", label: "링크", type: "url", col: true },
          { key: "plan", label: "요금 · 계정", type: "text", col: true, maxLength: 60 },
          { key: "memo", label: "메모", type: "text", col: true, maxLength: 200 }
        ]
      });
      var p = ui.card(view, { tab: "Prompts", tone: "t-2", title: "자주 쓰는 프롬프트", wide: true });
      ui.itemsPanel(p.body, {
        ref: R("aiprompts"), grid: true, search: true, filters: ["kind"], addLabel: "+ 프롬프트 추가",
        empty: "자주 쓰는 프롬프트를 저장해 두고 [복사]로 바로 쓰세요.",
        actions: [{ label: "복사", run: function (it, btn) { H.copyText(it.text, btn); } }],
        fields: [
          { key: "title", label: "제목", type: "text", title: true, required: true, maxLength: 80 },
          { key: "kind", label: "분류", type: "select", options: ["문헌", "분석", "글쓰기", "번역", "코드", "기타"], meta: true },
          { key: "text", label: "프롬프트", type: "textarea", required: true, rows: 6, maxLength: 4000 }
        ]
      });
    }
  });

  App.page({
    id: "ai-notes", title: "AI · 머신러닝 공부 노트", navHidden: true, navParent: "ai-tools", tabLabel: "공부 노트",
    render: function (view) {
      tabs(view, AI_TABS, "ai-notes");
      var c = ui.card(view, { tab: "Notes", tone: "t-1", title: "AI · 머신러닝 공부 노트", wide: true });
      ui.itemsPanel(c.body, {
        ref: R("ainotes"), views: ["cards", "table"], search: true, filters: ["topic"], titleLink: "link", addLabel: "+ 노트 추가",
        empty: "SHAP · SMOTE · XGBoost처럼 비선형 연구에 쓰는 방법을 공부한 내용을 정리하세요.",
        fields: [
          { key: "title", label: "주제", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "topic", label: "분류", type: "select", options: ["SHAP · 설명가능성", "SMOTE · 불균형", "트리 모델 (XGBoost 등)", "교차검증 · 평가", "델파이", "기타"], meta: true, col: true },
          { key: "summary", label: "핵심 요약", type: "textarea", col: true },
          { key: "apply", label: "내 연구에 적용", type: "textarea" },
          { key: "link", label: "참고 자료 링크", type: "url" }
        ]
      });
    }
  });

  App.page({
    id: "ai-log", title: "AI 활용 기록", navHidden: true, navParent: "ai-tools", tabLabel: "활용 기록",
    render: function (view) {
      tabs(view, AI_TABS, "ai-log");
      var c = ui.card(view, { tab: "Log", tone: "t-1", title: "AI 활용 기록 (연구윤리 · 공개 대비)", wide: true });
      ui.itemsPanel(c.body, {
        ref: R("ailog"), views: ["table", "cards"], sort: newestFirst("date"), search: true, filters: ["purpose"], addLabel: "+ 기록 추가",
        empty: "어떤 작업에 어떤 AI를 썼는지 남겨 두면 논문 · 심사에서 AI 활용을 밝힐 때 바로 쓸 수 있어요.",
        hint: "학술지 · 학위논문은 AI 활용을 밝히도록 요구하는 경우가 많아요. '공개 필요'를 체크해 두면 나중에 모아 보기 쉬워요.",
        fields: [
          { key: "task", label: "작업", type: "text", title: true, required: true, col: true, maxLength: 140 },
          { key: "date", label: "날짜", type: "date", col: true, today: true },
          { key: "tool", label: "AI 도구", type: "text", col: true, maxLength: 60 },
          { key: "purpose", label: "용도", type: "select", options: ["문헌 검색", "요약", "번역", "코드", "분석 해석", "글 다듬기", "기타"], meta: true, col: true },
          { key: "check", label: "검증 방법 · 산출물", type: "text", col: true, maxLength: 200 },
          { key: "disclose", label: "공개 필요", type: "check", col: true }
        ]
      });
    }
  });
})(window.App);
