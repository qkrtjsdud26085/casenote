/* Hello dear Sunny — 박사 홈 + 논문 프로젝트 페이지 (학회지 논문 중심) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el, P = App.proj, TSTAT = App.TSTAT;
  var R = function (name) { return App.doc("research/" + name); };
  var CHECK_FIELDS = App.tpl.CHECK_FIELDS;

  function checklist(parent, ref, defaults, hint) {
    return ui.itemsPanel(parent, {
      ref: ref, fields: CHECK_FIELDS, defaults: defaults, checkKey: "done", dueKey: "due",
      quickFields: ["text", "due"], hint: hint, empty: "항목을 추가해 보세요."
    });
  }
  function texts(list) { return list.map(function (t) { return { text: t }; }); }

  /* ---------- shared field sets (same keys as the global pages, so data is shared) ---------- */
  var MEETING_FIELDS = [
    { key: "date", label: "면담일", type: "date", today: true, col: true },
    { key: "topic", label: "안건", type: "text", title: true, required: true, col: true, maxLength: 120 },
    { key: "discussed", label: "논의 내용", type: "textarea", col: true },
    { key: "feedback", label: "교수 피드백", type: "textarea", col: true },
    { key: "tasks", label: "다음까지 할 일", type: "textarea", col: true },
    { key: "next", label: "다음 면담일", type: "date", col: true }
  ];
  var FEEDBACK_FIELDS = [
    { key: "source", label: "출처", type: "select", options: ["지도교수", "1차 심사", "2차 심사", "편집위원", "공저자", "기타"], meta: true, col: true },
    { key: "comment", label: "의견", type: "textarea", title: true, required: true, col: true },
    { key: "plan", label: "대응 · 수정 계획", type: "textarea", col: true },
    { key: "where", label: "반영 위치 (장 · 쪽)", type: "text", maxLength: 80 },
    { key: "state", label: "상태", type: "select", options: ["미반영", "진행 중", "반영 완료"], col: true }
  ];
  var SUBMISSION_FIELDS = [
    { key: "title", label: "논문 제목", type: "text", title: true, required: true, col: true, maxLength: 200 },
    { key: "journal", label: "학술지", type: "text", col: true, maxLength: 120 },
    { key: "tier", label: "등재 구분", type: "select", options: ["KCI 등재", "KCI 등재후보", "SSCI", "SCOPUS", "기타"], meta: true, col: true },
    { key: "state", label: "상태", type: "select", options: ["준비 중", "투고", "심사 중", "수정 요청", "게재 확정", "게재됨", "반려"], col: true },
    { key: "submitted", label: "투고일", type: "date", col: true },
    { key: "decision", label: "결과일", type: "date" },
    { key: "memo", label: "메모", type: "textarea" }
  ];
  var NOTE_FIELDS = [
    { key: "cite", label: "서지 (저자, 연도, 제목)", type: "text", title: true, required: true, wide: true, col: true, maxLength: 300 },
    { key: "purpose", label: "연구 목적 · 문제", type: "textarea", col: true },
    { key: "theory", label: "이론 · 핵심 개념", type: "textarea" },
    { key: "method", label: "방법 (표본 · 측정 · 분석)", type: "textarea", col: true },
    { key: "findings", label: "주요 결과", type: "textarea", col: true },
    { key: "limits", label: "한계 · 비판", type: "textarea", col: true },
    { key: "relevance", label: "내 연구와의 연결", type: "textarea", col: true },
    { key: "quotes", label: "인용할 문장 (쪽수)", type: "textarea" },
    { key: "tags", label: "태그 (쉼표로 구분)", type: "tags", meta: true },
    { key: "state", label: "정리 상태", type: "select", options: ["읽는 중", "정리 완료", "재검토 필요"] }
  ];
  var ANALYSIS_LOG_FIELDS = [
    { key: "date", label: "날짜", type: "date", today: true, col: true },
    { key: "kind", label: "분석 유형", type: "select", title: true, col: true, options: ["기술통계", "신뢰도 · 타당도", "상관분석", "t검정 · ANOVA", "회귀분석", "매개 · 조절", "SEM · CFA", "질적 코딩", "기타"] },
    { key: "tool", label: "도구", type: "select", col: true, options: ["SPSS", "R", "Mplus", "AMOS", "jamovi", "Python", "NVivo", "기타"] },
    { key: "file", label: "파일 · 스크립트 위치", type: "text", maxLength: 200 },
    { key: "result", label: "결과 요약", type: "textarea", col: true },
    { key: "next", label: "후속 작업", type: "textarea" },
    { key: "state", label: "상태", type: "select", options: ["계획", "진행", "완료", "재분석 필요"], col: true }
  ];

  /* ---------- folders / links panel (whole 박사 area or one project) ---------- */
  function foldersPanel(parent, scope) {
    return ui.itemsPanel(parent, {
      ref: R("folders"), scope: scope || undefined, views: ["cards", "table"], search: true, addLabel: "+ 폴더 · 링크 추가",
      empty: "논문 자료 폴더(Google Drive 등)의 링크를 추가하면 여기서 바로 열 수 있어요.",
      hint: "Google Drive 폴더: 드라이브에서 폴더 우클릭 → 공유 → 링크 복사 후 붙여넣기. 내 컴퓨터 폴더는 웹에서 직접 열 수 없어서, 경로를 복사해 탐색기 주소창에 붙여넣는 방식이에요.",
      itemMeta: function (it) { return (!scope && it.project) ? [P.titleOf(it.project)] : []; },
      fields: [
        { key: "name", label: "이름 (예: 원자료, 분석 파일, 논문 초안, 참고문헌)", type: "text", title: true, required: true, col: true, maxLength: 80 },
        { key: "kind", label: "위치", type: "select", options: ["Google Drive", "내 컴퓨터 경로", "OneDrive", "기타 링크"], meta: true, col: true },
        { key: "link", label: "링크 또는 경로", type: "text", required: true, wide: true, col: true, hideInCard: true, maxLength: 400 },
        { key: "note", label: "메모", type: "text", col: true, maxLength: 160 }
      ],
      itemExtra: function (it) {
        var v = String(it.link || "").trim();
        if (!v) { return null; }
        var box = el("div", "folder-actions");
        if (/^https?:\/\//i.test(v)) {
          var a = el("a", "tool-btn", "폴더 열기 ↗"); a.href = v; a.target = "_blank"; a.rel = "noopener noreferrer";
          box.appendChild(a);
        } else {
          box.appendChild(el("code", "", v));
          var b = el("button", "tool-btn", "경로 복사"); b.type = "button";
          b.addEventListener("click", function () { H.copyText(v, b); });
          box.appendChild(b);
        }
        return box;
      }
    });
  }

  /* =========================================================
     박사 홈
     ========================================================= */
  App.page({
    id: "thesis-home", title: "박사 홈",
    desc: "졸업 요건(학회지 논문)부터 학위논문까지, 지금 무엇을 해야 하는지 한눈에 봅니다.",
    render: function (view) {
      var g = ui.grid(view, true);
      var grad = { required: 2 };

      var a = ui.card(g, { tab: "Requirement", tone: "t-1", title: "졸업 요건 · 학회지 논문", wide: true });
      var reqBox = el("div"); a.body.appendChild(reqBox);
      var reqForm = el("div", "req-form"); a.body.appendChild(reqForm);
      function drawReq() {
        H.clear(reqBox);
        var need = Number(grad.required) || 2;
        var done = P.list.filter(P.isAccepted);
        var papers = P.list.filter(function (p) { return p.type === "학회지 논문"; });
        var big = el("div", "req-big");
        big.appendChild(el("span", "req-num", String(done.length)));
        big.appendChild(el("span", "req-of", " / " + need + "편"));
        big.appendChild(el("span", "req-label", "게재 확정 이상"));
        reqBox.appendChild(big);
        reqBox.appendChild(ui.progress(Math.min(100, Math.round(done.length / need * 100)), "학회지 논문 " + done.length + "/" + need));
        reqBox.appendChild(el("p", "hint", done.length >= need
          ? "졸업 요건을 채웠어요. 이제 학위논문 단계로 넘어갈 수 있습니다 (학위논문 › 학위 로드맵)."
          : "요건까지 " + (need - done.length) + "편 남았어요. 진행 중인 학회지 논문 " + papers.filter(function (p) { return !P.isAccepted(p); }).length + "편 · 학위논문은 요건 충족 후 본격 착수합니다."));
      }
      ui.fieldsPanel(reqForm, {
        ref: R("grad"),
        fields: [
          { key: "required", label: "필요한 학회지 논문 편수", type: "number", placeholder: "2" },
          { key: "rule", label: "게재 인정 기준 (학과 규정 메모)", type: "text", maxLength: 200, wide: true, placeholder: "예: 등재(후보)지 게재 확정 증명서 제출 가능" }
        ],
        onData: function (src) { grad = src; drawReq(); }
      });

      var b = ui.card(g, { tab: "Projects", tone: "t-2", title: "논문 프로젝트", wide: true });
      var TASKS = {}, watched = {}, ctl = null;
      function nextTask(p) {
        var items = TASKS[p.id] || P.tasksFor(p.kind).map(function (t, i) { return Object.assign({ id: "d" + i }, t); });
        return items.filter(function (t) { return !t.done; })[0];
      }
      ctl = ui.itemsPanel(b.body, {
        ref: P.projectsRef(), defaults: P.DEFAULTS, views: ["cards", "table"], dueKey: "submitDue", addLabel: "+ 프로젝트 추가",
        hint: "프로젝트 이름은 ✎로 바꿀 수 있어요. 단계는 프로젝트 › 프로젝트 개요에서 바꿉니다.",
        actions: [{ label: "열기", run: function (it) { H.safeSet("hds_proj", it.id); App.go("proj-overview"); } }],
        fields: [
          { key: "title", label: "프로젝트 이름", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "type", label: "유형", type: "select", options: P.TYPES, meta: true, col: true },
          { key: "kind", label: "성격", type: "select", options: P.KINDS, meta: true, col: true },
          { key: "journal", label: "목표 학술지", type: "text", col: true, maxLength: 120 },
          { key: "submitDue", label: "목표 투고일", type: "date", col: true },
          { key: "note", label: "메모", type: "textarea" }
        ],
        itemExtra: function (it) {
          var wrap = el("div");
          wrap.appendChild(ui.progress(P.stagePct(it), "현재 단계 · " + P.stagesFor(it)[P.stageIndex(it)] + " · " + P.stagePct(it) + "%"));
          var nt = nextTask(it);
          if (nt) { wrap.appendChild(el("div", "mini-sub", "다음 할 일 · " + (nt.phase ? "[" + nt.phase + "] " : "") + nt.text)); }
          return wrap;
        },
        onItems: function (items) {
          P.list = items.length ? items : P.DEFAULTS.slice();
          drawReq();
          items.forEach(function (p) {
            if (watched[p.id]) { return; }
            watched[p.id] = true;
            App.watchDoc(P.ref(p.id, "tasks"), function (d) { TASKS[p.id] = d && d.items; if (ctl) { ctl.refresh(); } });
          });
        }
      });

      var c = ui.card(g, { tab: "Folders", tone: "t-3", title: "논문 자료 폴더 (전체)", wide: true });
      foldersPanel(c.body, null);
      var d = ui.card(g, { tab: "Upcoming", tone: "t-3", title: "논문 일정" });
      ui.upcoming(d.body, "논문", 6);
    }
  });

  /* =========================================================
     프로젝트 개요
     ========================================================= */
  P.page({
    id: "proj-overview", title: "프로젝트 개요",
    desc: "논문 한 편의 현재 단계, 작업 계획, 자료 폴더, 지도교수 면담을 한곳에서 관리합니다.",
    render: function (body, C) {
      var g = ui.grid(body, true);
      var s = ui.card(g, { tab: "Stage", tone: "t-1", title: "진행 단계", wide: true });
      P.stepper(s.body, C);

      var i = ui.card(g, { tab: "Info", tone: "t-2", title: "논문 정보" });
      ui.fieldsPanel(i.body, {
        ref: C.ref("meta"),
        fields: [
          { key: "engTitle", label: "영문 제목", type: "text", wide: true, maxLength: 200 },
          { key: "coauthors", label: "공저자 · 지도교수", type: "text", maxLength: 120 },
          { key: "journal", label: "목표 학술지", type: "text", maxLength: 120 },
          { key: "purpose", label: "한 문장 연구 목적", type: "textarea", rows: 2 },
          { key: "contribution", label: "이 논문의 기여 (무엇이 새로운가)", type: "textarea", rows: 2 },
          { key: "blocker", label: "지금 막힌 것 · 결정할 것", type: "textarea", rows: 2 }
        ]
      });
      var u = ui.card(g, { tab: "Upcoming", tone: "t-3", title: "논문 일정" });
      ui.upcoming(u.body, "논문", 6);

      var t = ui.card(g, { tab: "Plan", tone: "t-1", title: "작업 계획 (단계별)", wide: true });
      ui.itemsPanel(t.body, {
        ref: C.ref("tasks"), defaults: P.tasksFor(C.proj.kind), checkKey: "done", dueKey: "due", quickFields: ["text", "phase", "due"],
        groupBy: { key: "phase", order: P.MASTER, collapse: P.MASTER.filter(function (s) { return s !== C.proj.stage; }) },
        hint: "기본 계획은 템플릿이에요. 이미 끝낸 단계는 체크하고, 필요 없는 항목은 지우세요.",
        empty: "작업을 추가해 보세요.",
        fields: [
          { key: "text", label: "작업", type: "text", title: true, required: true, maxLength: 140 },
          { key: "phase", label: "단계", type: "select", options: P.MASTER, hideInCard: true },
          { key: "due", label: "목표일", type: "date" },
          { key: "note", label: "메모", type: "text", maxLength: 160 }
        ]
      });

      var f = ui.card(g, { tab: "Folders", tone: "t-2", title: "자료 폴더 · 링크", wide: true });
      foldersPanel(f.body, C.scope);

      var m = ui.card(g, { tab: "Advisor", tone: "t-3", title: "지도교수 면담 기록 (이 프로젝트)", wide: true });
      ui.itemsPanel(m.body, {
        ref: R("meetings"), scope: C.scope, views: ["cards", "table"], dueKey: "next", search: true, addLabel: "+ 면담 기록 추가", empty: "아직 면담 기록이 없습니다.",
        itemTitle: function (it) { return (it.date ? it.date + " · " : "") + (it.topic || "면담"); },
        sort: function (a, b2) { return String(b2.date || "").localeCompare(String(a.date || "")); },
        fields: MEETING_FIELDS
      });
    }
  });

  /* =========================================================
     문헌 · 이론
     ========================================================= */
  P.page({
    id: "proj-lit", title: "문헌 · 이론",
    desc: "핵심 개념 정의, 선행 척도·연구 비교, 문헌 노트를 프로젝트 단위로 정리합니다. 서론과 이론적 배경의 재료가 돼요.",
    render: function (body, C) {
      var g = ui.grid(body, true);
      var a = ui.card(g, { tab: "Concept", tone: "t-1", title: "개념 · 이론적 틀", wide: true });
      ui.fieldsPanel(a.body, {
        ref: C.ref("lit"),
        fields: [
          { key: "concept", label: "핵심 개념 정의 (학술적 정의와 조작적 정의)", type: "textarea", rows: 4 },
          { key: "framework", label: "이론적 틀 · 구성 요소", type: "textarea", rows: 4 },
          { key: "gap", label: "선행연구의 공백 — 이 연구가 왜 필요한가", type: "textarea", rows: 4 },
          { key: "hypo", label: "예상 결과 · 가설", type: "textarea", rows: 4 }
        ]
      });
      var b = ui.card(g, { tab: "Compare", tone: "t-2", title: C.isScale ? "선행 척도 · 선행연구 비교표" : "선행연구 비교표", wide: true });
      ui.itemsPanel(b.body, {
        ref: C.ref("compare"), views: ["table", "cards"], search: true, addLabel: "+ 비교 항목 추가", empty: "선행 척도(또는 연구)를 한 줄씩 정리해 보세요.",
        fields: [
          { key: "name", label: C.isScale ? "척도명 / 연구" : "연구", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "source", label: "출처 (저자 · 연도)", type: "text", col: true, maxLength: 120 },
          { key: "sample", label: "대상 · 표본", type: "text", col: true, maxLength: 160 },
          { key: "structure", label: C.isScale ? "요인구조 · 문항 수" : "방법 · 핵심 변인", type: "text", col: true, maxLength: 200 },
          { key: "result", label: "신뢰도 · 주요 결과", type: "textarea", col: true },
          { key: "limit", label: "한계 · 내 연구와의 차이", type: "textarea", col: true }
        ]
      });
      var n = ui.card(g, { tab: "Notes", tone: "t-3", title: "문헌 노트 (이 프로젝트)", wide: true });
      ui.itemsPanel(n.body, {
        ref: R("notes"), scope: C.scope, search: true, views: ["cards", "table"], statusKey: "state", timestamp: true, filters: ["state"],
        addLabel: "+ 문헌 노트 추가", empty: "아직 노트가 없습니다. 논문 한 편을 읽고 핵심을 정리해 보세요.",
        hint: "문헌함(전체)은 박사 › 문헌 · 자료에서 볼 수 있어요. 여기 노트는 전체 문헌 노트에도 함께 모입니다.",
        fields: NOTE_FIELDS
      });
    }
  });

  /* =========================================================
     연구 설계
     ========================================================= */
  P.page({
    id: "proj-design", title: "연구 설계",
    desc: "연구 목적, 표본 계획, 대상 척도, 준거 척도, IRB를 정리합니다. 방법 장의 초안 재료가 돼요.",
    render: function (body, C) {
      var g = ui.grid(body, true);
      var a = ui.card(g, { tab: "Aim", tone: "t-1", title: "연구 목적 · 문제" });
      ui.fieldsPanel(a.body, {
        ref: C.ref("design"), docKey: "core",
        fields: [
          { key: "purpose", label: "연구 목적", type: "textarea", rows: 3 },
          { key: "questions", label: C.isScale ? "연구 문제 (요인구조 · 신뢰도 · 타당도 …)" : "연구 문제 · 가설", type: "textarea", rows: 5 }
        ]
      });
      var s = ui.card(g, { tab: "Sample", tone: "t-2", title: "표본 계획" });
      ui.fieldsPanel(s.body, {
        ref: C.ref("design"), docKey: "sample",
        fields: [
          { key: "population", label: "모집단 · 대상", type: "text", maxLength: 160 },
          { key: "sampling", label: "표집 · 수집 방법", type: "text", maxLength: 160 },
          { key: "n1", label: C.isScale ? "표본 1 목표 (탐색)" : "목표 표본 수", type: "text", maxLength: 80 },
          { key: "n2", label: C.isScale ? "표본 2 목표 (확인)" : "추가 표본", type: "text", maxLength: 80 },
          { key: "retest", label: "재검사 표본 · 간격", type: "text", maxLength: 80 },
          { key: "justification", label: "표본 크기 산정 근거", type: "textarea", rows: 2 },
          { key: "criteria", label: "포함 · 제외 기준", type: "textarea", rows: 2 },
          { key: "procedure", label: "자료 수집 절차", type: "textarea", rows: 2 }
        ]
      });
      var sc = ui.card(g, { tab: "Scale", tone: "t-3", title: C.isScale ? "대상 척도 정보" : "핵심 측정도구", wide: true });
      ui.fieldsPanel(sc.body, {
        ref: C.ref("design"), docKey: "scale",
        fields: [
          { key: "name", label: "척도명", type: "text", maxLength: 120 },
          { key: "source", label: "원저자 · 연도 · 출처", type: "text", maxLength: 200 },
          { key: "items", label: "문항 수", type: "text", maxLength: 40 },
          { key: "factors", label: "하위요인", type: "text", maxLength: 200 },
          { key: "response", label: "응답 척도", type: "text", maxLength: 120 },
          { key: "orig", label: "원척도 신뢰도 · 타당도 보고", type: "text", maxLength: 200 },
          { key: "permission", label: "사용 허가", type: "select", options: ["확인 필요", "요청함", "허가 받음", "허가 불필요"] },
          { key: "permissionNote", label: "허가 메모 (회신 보관 위치 등)", type: "text", maxLength: 200 }
        ]
      });
      var cr = ui.card(g, { tab: "Criterion", tone: "t-2", title: C.isScale ? "타당도 검증용 준거 · 관련 척도" : "함께 측정하는 척도", wide: true });
      ui.itemsPanel(cr.body, {
        ref: C.ref("criterion"), views: ["table", "cards"], statusKey: "permission", addLabel: "+ 척도 추가", empty: "수렴 · 변별 · 준거 타당도를 확인할 척도를 추가하세요.",
        statusTones: { "확인 필요": 0, "요청함": 1, "허가 받음": 3, "허가 불필요": 3 },
        hint: C.isScale ? "예: 공격성 · 공감 · 충동성 · 사회적 바람직성 · 정서(우울·불안·스트레스) 척도 등. '기대 관계'에 예상 방향을 미리 적어 두면 결과 해석이 쉬워요." : "",
        fields: [
          { key: "name", label: "척도명", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "concept", label: "측정 개념", type: "text", col: true, maxLength: 120 },
          { key: "role", label: "역할", type: "select", options: ["수렴 타당도", "변별 타당도", "준거 타당도", "통제 · 기타"], col: true },
          { key: "expect", label: "기대 관계 (정 / 부 / 무관)", type: "text", col: true, maxLength: 80 },
          { key: "items", label: "문항 수", type: "number", col: true },
          { key: "permission", label: "사용 허가", type: "select", options: ["확인 필요", "요청함", "허가 받음", "허가 불필요"] }
        ]
      });
      var ir = ui.card(g, { tab: "IRB", tone: "t-1", title: "IRB · 연구윤리 체크리스트", wide: true });
      checklist(ir.body, C.ref("irb"), texts(["IRB 심의 신청서", "연구 설명문 · 연구참여 동의서", "개인정보 수집 · 이용 동의", "설문지 최종본 첨부", "자료 익명화 · 보관 · 폐기 계획", "측정도구 사용 허가 확인", "IRB 승인번호 · 승인일 기록"]), "학교 IRB 사무국의 최신 양식을 우선하세요. 동의서 문구 예시는 학위논문 › 연구윤리 · IRB에 있어요.");
    }
  });

  /* =========================================================
     번안 · 문항
     ========================================================= */
  P.page({
    id: "proj-translation", title: "번안 · 문항",
    desc: "척도 논문의 핵심 산출물인 문항표를 관리합니다. 번안(또는 문항 개발) 절차와 전문가 내용타당도 평가도 함께 기록해요.",
    render: function (body, C) {
      var g = ui.grid(body, true);
      if (!C.isScale) {
        var n = ui.card(g, { tab: "Notice", tone: "t-3", title: "척도 논문용 페이지예요", wide: true });
        n.body.appendChild(el("p", "hint", "이 프로젝트의 성격이 '" + (C.proj.kind || "기타") + "'라서 기본 화면에는 필요 없을 수 있어요. 박사 홈에서 프로젝트 성격을 '척도 타당화' 또는 '척도 개발'로 바꾸면 절차 템플릿이 그에 맞게 채워집니다. 문항표는 그대로 써도 돼요."));
      }
      var dev = C.proj.kind === "척도 개발";
      var st = ui.card(g, { tab: "Steps", tone: "t-1", title: dev ? "문항 개발 절차" : "번안 절차" });
      checklist(st.body, C.ref("steps"), texts(dev
        ? ["문항 풀 생성 (이론 · 선행 척도 근거)", "개념–문항 매핑표 작성", "전문가 내용타당도 평가 (CVI)", "문항 표현 정련 · 중복 제거", "예비조사 · 인지면담", "최종 문항 확정"]
        : ["원저자 사용 허가 요청 · 회신 보관", "번역자 선정 (심리학 전공 · 이중언어 2인)", "독립 정번역", "번역본 통합 · 불일치 조정", "역번역 (이중언어 전문가, 원문 미공개)", "원문–역번역 대조 · 원저자 검토", "전문가 내용타당도 평가 (CVI)", "예비조사 (인지면담 · 소표본)", "최종 문항 확정"]));

      var ex = ui.card(g, { tab: "Experts", tone: "t-2", title: "전문가 내용타당도 평가 (CVI)" });
      ui.itemsPanel(ex.body, {
        ref: C.ref("experts"), views: ["cards", "table"], statusKey: "state", addLabel: "+ 전문가 추가", empty: "평가를 의뢰한 전문가를 기록하세요. (이름 대신 익명 코드를 써도 좋아요)",
        statusTones: { "의뢰 전": 0, "의뢰함": 1, "회수": 2, "반영 완료": 3 },
        summary: function (items) { return items.length ? "회수 이상 " + items.filter(function (x) { return x.state === "회수" || x.state === "반영 완료"; }).length + "/" + items.length : null; },
        fields: [
          { key: "code", label: "전문가 (코드)", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "field", label: "전공 · 소속", type: "text", col: true, maxLength: 100 },
          { key: "sent", label: "의뢰일", type: "date", col: true },
          { key: "returned", label: "회수일", type: "date", col: true },
          { key: "state", label: "상태", type: "select", options: ["의뢰 전", "의뢰함", "회수", "반영 완료"], col: true },
          { key: "memo", label: "메모", type: "textarea" }
        ]
      });

      var it = ui.card(g, { tab: "Items", tone: "t-3", title: "문항 관리표", wide: true });
      ui.itemsPanel(it.body, {
        ref: C.ref("items"), views: ["table", "cards"], search: true, statusKey: "state", filters: ["factor", "state"], addLabel: "+ 문항 추가",
        empty: "문항을 한 줄씩 추가해 원문 · 번역 · 역번역 · 확정 문항을 나란히 관리하세요.",
        statusTones: { "미검토": 0, "수정 중": 1, "확정": 3 },
        itemTitle: function (x) { return (x.no ? x.no + ". " : "") + String(x.final || x.original || x.t1 || "").slice(0, 70); },
        sort: function (a, b) { return String(a.no || "").localeCompare(String(b.no || ""), "ko", { numeric: true }); },
        summary: function (items) {
          return items.length ? ui.progress(Math.round(items.filter(function (x) { return x.state === "확정"; }).length / items.length * 100), "확정 " + items.filter(function (x) { return x.state === "확정"; }).length + "/" + items.length + "문항") : null;
        },
        fields: [
          { key: "no", label: "번호", type: "text", col: true, hideInCard: true, maxLength: 12 },
          { key: "original", label: dev ? "출처 문항 · 초안" : "원문 (영어)", type: "textarea", title: true, required: true, col: true },
          { key: "t1", label: dev ? "수정안" : "번역 (1차)", type: "textarea", col: true },
          { key: "back", label: "역번역", type: "textarea", col: true },
          { key: "note", label: "검토 의견", type: "textarea", col: true },
          { key: "final", label: "확정 문항", type: "textarea", col: true },
          { key: "factor", label: "하위요인 · 개념", type: "text", col: true, meta: true, maxLength: 60 },
          { key: "state", label: "상태", type: "select", options: ["미검토", "수정 중", "확정"], col: true }
        ]
      });
    }
  });

  /* =========================================================
     자료 · 분석
     ========================================================= */
  var SCALE_RULES = [
    { label: "요인분석 적합성", text: "KMO ≥ .60 (.80 이상이면 양호) · Bartlett 구형성 검정 p < .05" },
    { label: "요인 수 · 부하량", text: "요인 수는 평행분석 · MAP · 스크리 · 해석 가능성을 종합해 결정 / 요인부하량 ≥ .40 (표본 크기에 따라 .30 이상도 사용) · 교차부하량과 .20 이상 차이 (관행)" },
    { label: "서열형 자료", text: "리커트 5점 이하 문항: polychoric 상관 + WLSMV(또는 DWLS) 추정을 우선 검토" },
    { label: "모형 적합도", text: "CFI · TLI ≥ .90 수용 / .95 양호 · RMSEA ≤ .08 수용 / .06 양호 · SRMR ≤ .08 (Hu & Bentler, 1999). 모형 비교는 ΔCFI · AIC/BIC 등 병행" },
    { label: "bifactor 해석", text: "일반요인 vs 특수요인 근거로 ECV · ωH · PUC 등 bifactor 지표를 함께 보고 (Bifactor Indices Calculator 활용)" },
    { label: "신뢰도", text: "Cronbach's α · McDonald's ω ≥ .70 (연구 목적에 따라 상이) · 재검사 r / ICC ≥ .70 (2~4주 간격이 관행)" },
    { label: "수렴 · 변별 타당도", text: "AVE ≥ .50 · CR ≥ .70 (Fornell & Larcker, 1981) / 이론적으로 기대한 방향과 크기의 상관을 사전에 적어 두고 비교" },
    { label: "측정동일성", text: "형태 → 요인부하량 → 절편 동일성 순서로 검증, ΔCFI ≤ .010 (Cheung & Rensvold, 2002)" }
  ];
  P.page({
    id: "proj-analysis", title: "자료 · 분석",
    desc: "표본별 수집 현황, 분석 단계, 모형 비교표, 신뢰도 · 타당도 요약을 한 화면에서 관리합니다.",
    render: function (body, C) {
      var g = ui.grid(body, true);
      var sm = ui.card(g, { tab: "Samples", tone: "t-1", title: "자료 수집 현황", wide: true });
      ui.itemsPanel(sm.body, {
        ref: C.ref("samples"), views: ["cards", "table"], statusKey: "state", addLabel: "+ 표본 추가", empty: "표본별(예비 · 탐색 · 확인 · 재검사) 목표와 현재 인원을 기록하세요.",
        statusTones: { "계획": 0, "수집 중": 1, "완료": 3 },
        itemExtra: function (x) {
          var t = Number(x.target) || 0; if (!t) { return null; }
          var c = Number(x.current) || 0;
          return ui.progress(Math.min(100, Math.round(c / t * 100)), c + " / " + t + "명");
        },
        summary: function (items) {
          var t = 0, c = 0; items.forEach(function (x) { t += Number(x.target) || 0; c += Number(x.current) || 0; });
          return t ? "전체 수집 " + c + " / 목표 " + t + "명" : null;
        },
        fields: [
          { key: "name", label: "표본 이름", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "purpose", label: "용도", type: "select", options: ["예비조사", "표본 1 (탐색)", "표본 2 (확인)", "재검사", "기타"], meta: true, col: true },
          { key: "target", label: "목표 인원", type: "number", col: true, hideInCard: true },
          { key: "current", label: "현재 인원", type: "number", col: true, hideInCard: true },
          { key: "source", label: "수집 방법 · 플랫폼", type: "text", maxLength: 120 },
          { key: "period", label: "수집 기간", type: "text", maxLength: 80 },
          { key: "state", label: "상태", type: "select", options: ["계획", "수집 중", "완료"], col: true }
        ]
      });

      var plan = ui.card(g, { tab: "Plan", tone: "t-2", title: "분석 단계 체크리스트" });
      checklist(plan.body, C.ref("analysisplan"), texts(C.isScale
        ? ["문항 분석 (기술통계 · 왜도 · 첨도 · 문항-총점 상관)", "자료 특성 확인 (서열형 → polychoric · WLSMV 고려)", "표본 분할 여부 결정 (탐색 / 확인)", "EFA: KMO · Bartlett · 평행분석 · 회전 방법 결정", "CFA: 경쟁 모형 지정 (단일 · 다요인 · 2차 · bifactor)", "적합도 기준 사전 결정 · 모형 비교", "필요 시 ESEM · bifactor 지표 · Rasch", "신뢰도 (α · ω · 재검사)", "수렴 · 변별 · 준거 타당도", "측정동일성 (성별 등)", "결과표 정리 · 스크립트 백업"]
        : ["기술통계 · 가정 검토", "주요 가설 검증", "효과크기 · 신뢰구간", "추가 · 사후 분석", "결과표 정리 · 스크립트 백업"]), "분석 결정(기준 · 모형)은 결과를 보기 전에 적어 두면 심사에서 설득력이 커져요.");

      var rr = ui.card(g, { tab: "Ref", tone: "t-3", title: C.isScale ? "척도 분석 기준값 (복사 가능)" : "기준값" });
      ui.refList(rr.body, SCALE_RULES);

      var md = ui.card(g, { tab: "Models", tone: "t-1", title: "모형 비교표 (CFA · SEM)", wide: true });
      ui.itemsPanel(md.body, {
        ref: C.ref("models"), views: ["table", "cards"], addLabel: "+ 모형 추가", empty: "모형(1요인 · 다요인 · 2차 · bifactor …)별 적합도를 기록하세요.",
        rowDone: function (x) { return !!x.adopted; },
        fields: [
          { key: "name", label: "모형", type: "text", title: true, required: true, col: true, maxLength: 100 },
          { key: "chi", label: "χ²", type: "text", col: true, maxLength: 20 },
          { key: "df", label: "df", type: "text", col: true, maxLength: 10 },
          { key: "cfi", label: "CFI", type: "text", col: true, maxLength: 10 },
          { key: "tli", label: "TLI", type: "text", col: true, maxLength: 10 },
          { key: "rmsea", label: "RMSEA [90% CI]", type: "text", col: true, maxLength: 40 },
          { key: "srmr", label: "SRMR", type: "text", col: true, maxLength: 10 },
          { key: "note", label: "메모", type: "text", maxLength: 200 },
          { key: "adopted", label: "채택", type: "check", col: true }
        ]
      });

      var rl = ui.card(g, { tab: "Reliability", tone: "t-2", title: "신뢰도 · 타당도 요약", wide: true });
      ui.itemsPanel(rl.body, {
        ref: C.ref("reliability"), views: ["table", "cards"], addLabel: "+ 항목 추가", empty: "전체 척도와 하위요인별 신뢰도 · 타당도 지표를 기록하세요.",
        fields: [
          { key: "name", label: "척도 · 하위요인", type: "text", title: true, required: true, col: true, maxLength: 100 },
          { key: "items", label: "문항 수", type: "number", col: true },
          { key: "alpha", label: "α", type: "text", col: true, maxLength: 10 },
          { key: "omega", label: "ω", type: "text", col: true, maxLength: 10 },
          { key: "retest", label: "재검사 r / ICC", type: "text", col: true, maxLength: 20 },
          { key: "ave", label: "AVE", type: "text", col: true, maxLength: 10 },
          { key: "cr", label: "CR", type: "text", col: true, maxLength: 10 },
          { key: "note", label: "메모", type: "text", maxLength: 200 }
        ]
      });

      var lg = ui.card(g, { tab: "Log", tone: "t-3", title: "분석 로그 (이 프로젝트)", wide: true });
      ui.itemsPanel(lg.body, {
        ref: R("analysis"), scope: C.scope, views: ["table", "cards"], search: true, statusKey: "state", filters: ["kind"],
        addLabel: "+ 분석 기록 추가", empty: "분석을 돌릴 때마다 한 줄씩 남겨 두세요. (파일 · 스크립트 위치가 특히 중요해요)",
        statusTones: { "계획": 0, "진행": 1, "완료": 3, "재분석 필요": 2 },
        itemTitle: function (x) { return (x.date ? x.date + " · " : "") + (x.kind || ""); },
        sort: function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); },
        fields: ANALYSIS_LOG_FIELDS
      });
    }
  });

  /* =========================================================
     원고 작성
     ========================================================= */
  P.page({
    id: "proj-manuscript", title: "원고 작성",
    desc: "목표 학술지의 투고 규정, 섹션별 진행, 투고 전 체크리스트, 집필 기록을 관리합니다.",
    render: function (body, C) {
      var g = ui.grid(body, true);
      var r = ui.card(g, { tab: "Rules", tone: "t-1", title: "목표 학술지 투고 규정" });
      ui.fieldsPanel(r.body, {
        ref: C.ref("rules"),
        fields: [
          { key: "journal", label: "학술지", type: "text", maxLength: 120, wide: true },
          { key: "limit", label: "분량 제한", type: "text", maxLength: 80 },
          { key: "abstractLimit", label: "초록 분량 · 주제어 수", type: "text", maxLength: 80 },
          { key: "refStyle", label: "참고문헌 · 인용 양식", type: "text", maxLength: 80 },
          { key: "anonymize", label: "익명 처리 규정", type: "text", maxLength: 120 },
          { key: "via", label: "투고 방법 (시스템 · 이메일)", type: "text", maxLength: 120 },
          { key: "fee", label: "심사료 · 게재료", type: "text", maxLength: 80 },
          { key: "deadline", label: "마감 · 발행 일정", type: "text", maxLength: 120 }
        ]
      });
      var w = ui.card(g, { tab: "Daily", tone: "t-2", title: "집필 기록 (이 프로젝트)" });
      ui.writingLog(w.body, { ref: C.ref("log"), goal: 1500, unit: "자" });

      var s = ui.card(g, { tab: "Sections", tone: "t-1", title: "원고 섹션 진행", wide: true });
      ui.itemsPanel(s.body, {
        ref: C.ref("sections"), views: ["cards", "table"], statusKey: "status", addLabel: "+ 섹션 추가",
        defaults: [
          { name: "국문 초록", note: "목적 · 방법 · 주요 결과 · 시사점" }, { name: "서론", note: "필요성 · 목적" }, { name: "이론적 배경 · 문헌 고찰" },
          { name: "방법", note: "연구 대상 · 측정 도구 · 절차 · 분석" }, { name: "결과", note: "표 · 그림 포함" }, { name: "논의 및 결론", note: "시사점 · 제한점 · 후속 연구" },
          { name: "참고문헌" }, { name: "영문 초록", note: "국문 초록과 내용 일치" }
        ],
        statusTones: { "미착수": 0, "집필중": 1, "초안 완료": 2, "수정중": 1, "완료": 3 },
        fields: [
          { key: "name", label: "섹션", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "status", label: "상태", type: "select", options: TSTAT, col: true },
          { key: "target", label: "목표 분량", type: "number", col: true, hideInCard: true },
          { key: "current", label: "현재 분량", type: "number", col: true, hideInCard: true },
          { key: "note", label: "포함할 내용 · 메모", type: "textarea" }
        ],
        itemExtra: function (x) {
          var t = Number(x.target) || 0; if (!t) { return null; }
          var c = Number(x.current) || 0;
          return ui.progress(Math.min(100, Math.round(c / t * 100)), c + " / " + t);
        },
        summary: function (items) {
          if (!items.length) { return null; }
          var pct = App.chaptersPct(items);
          return ui.progress(pct, "원고 진행률 " + pct + "% · 완료 " + items.filter(function (c) { return c.status === "완료"; }).length + "/" + items.length);
        }
      });

      var pc = ui.card(g, { tab: "Pre-submit", tone: "t-3", title: "투고 전 체크리스트", wide: true });
      checklist(pc.body, C.ref("precheck"), texts(["학술지 분량 · 양식 규정 확인", "저자 정보 익명 처리 (본문 · 파일 속성)", "유사도 검사 결과 확인", "참고문헌 형식 통일 · 본문 인용과 대조", "표 · 그림 번호와 본문 일치", "국문 · 영문 초록 일치 · 주제어", "IRB 승인번호 명시", "공저자 · 기여 확인", "저작권 이양 동의서 준비"]), "타당화 결과 서술 문장 예시는 박사 › 참고 템플릿에 있어요.");
    }
  });

  /* =========================================================
     투고 · 심사
     ========================================================= */
  P.page({
    id: "proj-submit", title: "투고 · 심사",
    desc: "투고할 학술지를 비교해 고르고, 투고 기록과 심사 의견 대응, 게재 이후 절차까지 관리합니다.",
    render: function (body, C) {
      var g = ui.grid(body, true);
      var j = ui.card(g, { tab: "Journals", tone: "t-1", title: "투고 후보 학술지 비교", wide: true });
      ui.itemsPanel(j.body, {
        ref: R("journals"), scope: C.scope, views: ["table", "cards"], statusKey: "state", search: true, addLabel: "+ 학술지 추가",
        empty: "후보 학술지를 추가해 규정 · 심사 기간 · 게재료를 비교해 보세요.",
        statusTones: { "후보": 0, "1순위": 2, "투고함": 3, "제외": 0 },
        dueKey: "deadline",
        fields: [
          { key: "name", label: "학술지", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "society", label: "학회", type: "text", col: true, maxLength: 80 },
          { key: "tier", label: "등재 구분", type: "select", options: ["KCI 등재", "KCI 등재후보", "기타"], meta: true, col: true },
          { key: "mode", label: "접수 방식", type: "select", options: ["상시", "정기 마감"], col: true },
          { key: "deadline", label: "다음 마감", type: "date", col: true },
          { key: "review", label: "심사 기간", type: "text", col: true, maxLength: 60 },
          { key: "fee", label: "심사료 · 게재료", type: "text", col: true, maxLength: 80 },
          { key: "limit", label: "분량 규정", type: "text", maxLength: 80 },
          { key: "fit", label: "주제 적합도", type: "select", options: ["높음", "보통", "낮음"], col: true },
          { key: "memo", label: "메모", type: "textarea" },
          { key: "state", label: "상태", type: "select", options: ["후보", "1순위", "투고함", "제외"], col: true }
        ]
      });
      var s = ui.card(g, { tab: "Submissions", tone: "t-2", title: "투고 기록 (이 프로젝트)", wide: true });
      ui.itemsPanel(s.body, {
        ref: R("submissions"), scope: C.scope, views: ["cards", "table"], statusKey: "state", search: true, addLabel: "+ 투고 기록 추가", empty: "투고하면 여기에 기록하세요.",
        statusTones: { "준비 중": 0, "투고": 1, "심사 중": 1, "수정 요청": 2, "게재 확정": 2, "게재됨": 3, "반려": 0 },
        hint: "상태를 '게재 확정'으로 바꾼 뒤, 프로젝트 개요의 진행 단계도 '게재 확정'으로 바꾸면 박사 홈의 졸업 요건 현황에 반영돼요.",
        fields: SUBMISSION_FIELDS
      });
      var f = ui.card(g, { tab: "Reviews", tone: "t-3", title: "심사 · 지도 의견 대응표", wide: true });
      ui.itemsPanel(f.body, {
        ref: R("feedback"), scope: C.scope, views: ["cards", "table"], statusKey: "state", search: true, filters: ["source"], addLabel: "+ 의견 추가", empty: "받은 의견을 적어 두고 대응 여부를 체크하세요.",
        statusTones: { "미반영": 0, "진행 중": 1, "반영 완료": 3 },
        itemTitle: function (x) { return String(x.comment || "").slice(0, 60); },
        summary: function (items) { return items.length ? "반영 완료 " + items.filter(function (x) { return x.state === "반영 완료"; }).length + "/" + items.length : null; },
        fields: FEEDBACK_FIELDS
      });
      var a = ui.card(g, { tab: "After", tone: "t-1", title: "게재 이후 체크리스트", wide: true });
      checklist(a.body, C.ref("after"), texts(["게재 확정서 확보 (졸업 요건 제출용)", "게재료 납부 · 최종 교정", "프로젝트 단계를 '게재 확정' / '게재 완료'로 변경", "CV · 발표 · 게재 이력에 추가", "학과 졸업 요건 서류 제출", "학회 발표 · 공개 여부 확인"]));
    }
  });
})(window.App);
