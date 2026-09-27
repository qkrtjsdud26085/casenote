/* Hello dear Sunny — 박사 › 비선형 공격성 임계점 [현재 진행중] · 자격증 · AI
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
     비선형 공격성 임계점 › 현재 진행중 (비워 둔 자리)
     ========================================================= */
  App.page({
    id: "diss-current", title: "비선형 공격성 임계점 · 현재 진행중", navLabel: "현재 진행중",
    render: function (view) {
      var c = ui.card(view, { tab: "Now", tone: "t-2", title: "현재 진행중" });
      c.body.appendChild(ui.empty("아직 비어 있는 페이지예요. 연구재단 선정 이후 실제로 진행하는 내용을 어떻게 정리할지 정해지면 여기에 채워요."));
      var a = el("a", "more-link", "연구재단 선정 내용 보기 →"); a.href = "#/diss-overview";
      var p = el("p", "hint"); p.style.marginTop = "12px"; p.appendChild(a);
      c.body.appendChild(p);
    }
  });

  /* =========================================================
     자격증 — 목록 · 일정 / 공부 계획 · 기록 / 증빙 파일
     ========================================================= */
  var CERT_TABS = ["cert-list", "cert-study", "cert-files"];
  var CERT_STATUS = ["관심", "준비 중", "접수 완료", "응시 완료", "합격", "불합격", "취득"];

  App.page({
    id: "cert-list", title: "자격증", navLabel: "자격증", tabLabel: "목록 · 일정",
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
