/* Hello dear Sunny — 진행중 프로젝트 ① IAS 척도 타당화 (학회지 논문)
   연구 자료는 Firestore(research/ias_*)에만 저장합니다 (research-kit.js 참고). */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el, TSTAT = App.TSTAT, RK = App.rkit;
  var DOCS = ["meta", "keystats", "timeline", "next", "decisions", "files", "items", "translog", "sample", "models", "bifactor",
    "rel", "rasch", "corr", "interp", "sentences", "sections", "discussion", "lit", "qa", "submit", "log", "process", "irt", "irtcheck"];
  var STAGES = ["원척도 검토", "번안", "자료 수집", "분석", "원고 작성", "지도교수 검토", "투고", "심사 · 수정", "게재 확정"];
  var FACTORS = ["사회적 배제", "악의적 유머", "죄책감 유발"];
  var FLAGS = ["적합", "과적합 검토", "삭제 검토"];
  var CHECK_FIELDS = App.tpl.CHECK_FIELDS;
  var TABS = ["ias-home", "ias-flow", "ias-items", "ias-results", "ias-manuscript"];
  var K = RK({ prefix: "ias", docs: DOCS, stages: STAGES, name: "IAS", fileName: "IAS_홈페이지자료", homeId: "ias-home" });
  var D = K.D, byDate = RK.byDate, copyAction = RK.copyAction;
  function byNo(a, b) { return (Number(a.no) || 0) - (Number(b.no) || 0); }
  function head(view, id) { RK.pageTabs(view, TABS, id); K.emptyNotice(view); }
  App.ias = { importData: K.importData, exportData: K.exportData, DOCS: DOCS, STAGES: STAGES };

  function openLinkedProject() {
    var list = (App.proj && App.proj.list) || [];
    var p = list.filter(function (x) { return /IAS|간접/i.test(x.title || ""); })[0] || list.filter(function (x) { return x.kind === "척도 타당화"; })[0];
    if (!p) { window.alert("연결할 논문 프로젝트를 찾지 못했어요. 박사 › 홈의 논문 프로젝트 이름에 'IAS'를 넣어 주세요."); return; }
    H.safeSet("hds_proj", p.id); App.go("proj-overview");
  }

  App.iasSummaryCard = function (parent) {
    K.summaryCard(parent, { tab: "IAS", title: "진행중 프로젝트 ① · IAS 척도 타당화" });
  };

  /* =========================================================
     1. IAS 대시보드
     ========================================================= */
  App.page({
    id: "ias-home", title: "IAS 대시보드", navLabel: "1차 연구 기록", tabLabel: "대시보드",
    desc: "간접적 공격성 척도 가해자판(IAS-A) 한국판 타당화 논문의 현재 단계, 핵심 수치, 다음 할 일, 결정 기록, 파일 위치를 한눈에 봅니다.",
    render: function (view) {
      head(view, "ias-home");
      var g = ui.grid(view, true);

      var o = ui.card(g, { tab: "Paper", tone: "t-1", title: "논문 개요 · 진행 단계", wide: true });
      var dd = o.count; dd.className = "dday";
      K.stageStepper(o.body);
      ui.fieldsPanel(o.body, {
        ref: D("meta"), docKey: "info",
        fields: [
          { key: "title", label: "국문 제목 (가제)", type: "text", wide: true, maxLength: 200 },
          { key: "engTitle", label: "영문 제목", type: "text", wide: true, maxLength: 200 },
          { key: "authors", label: "저자 · 지도교수", type: "text", maxLength: 120 },
          { key: "journal", label: "목표 학술지", type: "text", maxLength: 120 },
          { key: "submitDue", label: "목표 투고일", type: "date" },
          { key: "purpose", label: "한 문장 연구 목적", type: "textarea", rows: 2 },
          { key: "contribution", label: "이 논문의 기여 (무엇이 새로운가)", type: "textarea", rows: 3 },
          { key: "blocker", label: "지금 막힌 것 · 결정할 것", type: "textarea", rows: 3 }
        ],
        onData: function (src) {
          if (!src.submitDue) { dd.textContent = ""; dd.className = "dday"; return; }
          var i = H.ddayInfo(src.submitDue); dd.textContent = "투고 " + i.text; dd.className = "dday " + i.cls;
        }
      });
      var link = el("button", "tool-btn", "일반 논문 프로젝트 화면(작업 계획 · 투고 기록)으로 →"); link.type = "button";
      link.addEventListener("click", openLinkedProject);
      o.body.appendChild(link);

      var k = ui.card(g, { tab: "Numbers", tone: "t-2", title: "핵심 수치", wide: true });
      K.statTiles(k.body);

      var n = ui.card(g, { tab: "Next", tone: "t-1", title: "다음 할 일" });
      ui.itemsPanel(n.body, {
        ref: D("next"), checkKey: "done", dueKey: "due", quickFields: ["text", "area", "due"], filters: ["area"],
        empty: "다음에 할 일을 추가하세요.", hint: "분석 재확인 → 원고 → 투고 준비 순서로 정리돼 있어요. 끝난 일은 체크하세요.",
        fields: [
          { key: "text", label: "할 일", type: "text", title: true, required: true, maxLength: 160 },
          { key: "area", label: "영역", type: "select", options: ["분석", "원고", "번안 · 방법", "투고", "기타"], meta: true },
          { key: "due", label: "목표일", type: "date" },
          { key: "note", label: "메모 · 근거", type: "textarea" }
        ]
      });

      var dc = ui.card(g, { tab: "Decisions", tone: "t-3", title: "결정 기록 (심사 대응용 근거)" });
      ui.itemsPanel(dc.body, {
        ref: D("decisions"), views: ["cards", "table"], statusKey: "state", search: true, addLabel: "+ 결정 추가",
        statusTones: { "검토 중": 1, "확정": 3, "보류": 0 },
        sort: byDate(true), empty: "분석 · 번안에서 내린 결정과 근거를 남겨 두세요.",
        hint: "‘왜 이렇게 했는가’를 근거 문헌과 함께 적어 두면 방법 · 논의를 쓰고 심사에 답할 때 그대로 쓸 수 있어요.",
        fields: [
          { key: "decision", label: "결정", type: "text", title: true, required: true, maxLength: 160 },
          { key: "date", label: "날짜", type: "date", today: true, meta: true, col: true },
          { key: "rationale", label: "근거 · 수치", type: "textarea", col: true },
          { key: "refs", label: "근거 문헌", type: "textarea", col: true },
          { key: "state", label: "상태", type: "select", options: ["검토 중", "확정", "보류"], col: true }
        ]
      });

      var t = ui.card(g, { tab: "Timeline", tone: "t-2", title: "지금까지의 진행 기록", wide: true });
      ui.itemsPanel(t.body, {
        ref: D("timeline"), views: ["table", "cards"], sort: byDate(false), addLabel: "+ 기록 추가", search: true,
        empty: "진행 기록이 없어요.",
        itemTitle: function (it) { return it.title || ""; },
        fields: [
          { key: "date", label: "날짜", type: "date", today: true, col: true },
          { key: "title", label: "한 일", type: "text", title: true, required: true, col: true, maxLength: 140 },
          { key: "detail", label: "내용", type: "textarea", col: true },
          { key: "where", label: "관련 파일", type: "text", col: true, maxLength: 200 }
        ]
      });

      var f = ui.card(g, { tab: "Files", tone: "t-3", title: "파일 위치", wide: true });
      ui.itemsPanel(f.body, {
        ref: D("files"), views: ["cards", "table"], search: true, addLabel: "+ 파일 · 폴더 추가", grid: true,
        empty: "자료 파일 경로를 추가하세요.",
        hint: "내 컴퓨터(Google Drive 동기화) 경로는 웹에서 바로 열 수 없어서 '경로 복사' 후 탐색기 주소창에 붙여넣어 여세요.",
        itemExtra: RK.pathActions,
        fields: [
          { key: "name", label: "이름", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "kind", label: "구분", type: "select", options: ["원고", "번안", "데이터", "분석 결과", "랩미팅", "참고문헌", "폴더"], meta: true, col: true },
          { key: "path", label: "경로 · 링크", type: "text", required: true, wide: true, col: true, hideInCard: true, maxLength: 400 },
          { key: "note", label: "메모", type: "text", col: true, maxLength: 200 }
        ]
      });

      K.importCard(g, "문항 · 분석 결과 같은 미출판 연구 자료는 홈페이지 코드(공개)에 넣지 않고, 로그인해야 보이는 내 데이터베이스에만 저장해요. IAS 폴더의 'IAS_홈페이지자료.json'을 불러오면 모든 IAS 페이지가 채워집니다.");
    }
  });

  /* =========================================================
     2. 문항 · 번안
     ========================================================= */
  App.page({
    id: "ias-items", title: "IAS 문항 · 번안", navHidden: true, navParent: "ias-home", tabLabel: "문항 · 번안",
    desc: "25문항의 원문 · 번역 과정(1~3차) · 최종 문항과 문항별 분석 지표(요인부하량, Rasch 적합도)를 한 표에서 봅니다.",
    render: function (view) {
      head(view, "ias-items");
      var g = ui.grid(view, true);

      var gd = ui.card(g, { tab: "Guide", tone: "t-1", title: "지시문 · 응답 척도", wide: true });
      ui.fieldsPanel(gd.body, {
        ref: D("meta"), docKey: "guide",
        fields: [
          { key: "instruction", label: "최종 지시문", type: "textarea", rows: 4 },
          { key: "response", label: "응답 척도", type: "textarea", rows: 3 },
          { key: "origin", label: "원척도 정보 (저자 · 요인 · 문항 수)", type: "textarea", rows: 2 }
        ]
      });

      var it = ui.card(g, { tab: "Items", tone: "t-2", title: "문항표 (IAS-A · 25문항)", wide: true });
      it.el.classList.add("ias-items-card");
      ui.itemsPanel(it.body, {
        ref: D("items"), views: ["table", "cards"], search: true, statusKey: "flag", filters: ["factor", "flag"], addLabel: "+ 문항 추가",
        statusTones: { "적합": 3, "과적합 검토": 0, "삭제 검토": 1 },
        sort: byNo, empty: "문항이 없어요. IAS 대시보드에서 자료를 불러오세요.",
        hint: "λ = 단일요인 CFA 표준화 부하량 · Infit/Outfit = Rasch 적합도 (기준 .60 초과 1.40 미만; 이윤수 · 조대연, 2019). '과적합(Outfit < .60)'은 대개 덜 심각하지만 기준을 논문에 명시해야 해요.",
        itemTitle: function (x) { return (x.no ? x.no + ". " : "") + (x.final || ""); },
        summary: function (items) {
          if (!items.length) { return null; }
          var m = {}; items.forEach(function (x) { m[x.factor] = (m[x.factor] || 0) + 1; });
          var del = items.filter(function (x) { return x.flag === "삭제 검토"; }).length;
          return items.length + "문항 · " + FACTORS.map(function (f) { return f + " " + (m[f] || 0); }).join(" · ") + (del ? " · 삭제 검토 " + del : "");
        },
        fields: [
          { key: "no", label: "번호", type: "number", hideInCard: true },
          { key: "final", label: "최종 문항", type: "textarea", title: true, required: true, col: true },
          { key: "factor", label: "원척도 요인", type: "select", options: FACTORS, meta: true, col: true },
          { key: "original", label: "원문 (영어)", type: "textarea", col: true },
          { key: "lambda", label: "λ (1요인)", type: "text", col: true, maxLength: 10 },
          { key: "diff", label: "Rasch 난이도", type: "text", maxLength: 10 },
          { key: "infit", label: "Infit", type: "text", col: true, maxLength: 10 },
          { key: "outfit", label: "Outfit", type: "text", col: true, maxLength: 10 },
          { key: "flag", label: "판정", type: "select", options: FLAGS, col: true },
          { key: "t1", label: "1차 번역", type: "textarea" },
          { key: "t2", label: "2차 번역", type: "textarea" },
          { key: "t3", label: "3차 번역", type: "textarea" },
          { key: "note", label: "번안 · 분석 메모", type: "textarea" }
        ]
      });

      var tl = ui.card(g, { tab: "Process", tone: "t-3", title: "번안 과정 기록", wide: true });
      ui.itemsPanel(tl.body, {
        ref: D("translog"), views: ["cards", "table"], sort: byDate(false), addLabel: "+ 번안 기록 추가",
        empty: "번안 단계별 기록을 남겨 두세요.",
        hint: "방법 절의 '번안 절차' 문단 재료예요. 원저자 허가 · 역번역 · 전문가 검토 여부는 심사에서 꼭 묻는 부분이라 빠짐없이 기록하세요.",
        fields: [
          { key: "date", label: "날짜", type: "date", today: true, meta: true, col: true },
          { key: "step", label: "단계", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "detail", label: "내용 · 결정", type: "textarea", col: true },
          { key: "file", label: "파일", type: "text", maxLength: 200 }
        ]
      });
    }
  });

  /* =========================================================
     IAS › 현재 진행중 (내용은 아직 정하지 않은 빈 자리)
     ========================================================= */
  App.page({
    id: "ias-current", title: "IAS 척도 타당화 · 현재 진행중", navLabel: "현재 진행중", tabLabel: "현재 진행중",
    render: function (view) {
      RK.pageTabs(view, ["ias-current", "ias-writing"], "ias-current");
      var c = ui.card(view, { tab: "Now", tone: "t-2", title: "현재 진행중", wide: true });
      c.body.appendChild(ui.empty("아직 비어 있어요."));
    }
  });

  /* =========================================================
     1-1. 연구 흐름 (research-flow.js · research/ias_process)
     ========================================================= */
  App.page({
    id: "ias-flow", title: "IAS 연구 흐름", navHidden: true, navParent: "ias-home", tabLabel: "연구 흐름",
    render: function (view) {
      head(view, "ias-flow");
      var c = ui.card(view, { tab: "Process", tone: "t-1", title: "연구 프로세스", wide: true });
      ui.researchFlow(c.body, { ref: D("process") });
      var n = ui.card(view, { tab: "IRT", tone: "t-2", title: "IRT 재분석 체크리스트", wide: true });
      ui.itemsPanel(n.body, {
        ref: D("irtcheck"), checkKey: "done", views: ["table", "cards"], filters: ["step"], addLabel: "+ 항목 추가", reorder: { resetLabel: "기본 순서로" },
        empty: "아직 항목이 없어요.",
        fields: [
          { key: "text", label: "할 일", type: "text", title: true, required: true, col: true, maxLength: 200 },
          { key: "step", label: "단계", type: "text", meta: true, col: true, maxLength: 30 },
          { key: "tool", label: "도구 · 코드", type: "text", col: true, maxLength: 120 },
          { key: "note", label: "판단 기준 · 메모", type: "textarea", rows: 2 }
        ]
      });
      K.importCard(view, "", "자료 불러오기 · 백업");
    }
  });

  /* =========================================================
     3. 분석 결과
     ========================================================= */
  var CRITERIA = [
    { label: "bifactor 단일차원 판단", text: "ECV ≥ .70 (특히 PUC가 낮을수록) · ωH ≥ .80이면 총점을 단일 구인으로 해석 (Rodriguez, Reise, & Haviland, 2016)" },
    { label: "특수요인 음수 · 소멸 적재", text: "일반요인 모형에서 특수요인 적재가 음수이거나 불규칙하면 실질적 단일차원의 과적합 신호 (Eid, Geiser, Koch, & Heene, 2017)" },
    { label: "Rasch 문항 적합도", text: "Infit · Outfit MNSQ .60 초과 1.40 미만 (이윤수 · 조대연, 2019) / 더 엄격히 .75~1.30 (홍세희 · 조용래, 2006)" },
    { label: "Rasch 일차원성 (PCAR)", text: "측정치 설명분산 ≥ 40%가 양호 · 첫 번째 잔차 대비 고유값 < 2.0 (Linacre)" },
    { label: "Rasch 분리지수 · 신뢰도", text: "분리지수 ≥ 2.0 (Bond & Fox, 2007) · 분리신뢰도 ≥ .80 우수" },
    { label: "응답범주 기능", text: "범주별 관측 ≥ 10회 · 평균 측정치와 단계조정값이 단조 증가 · 범주 Outfit < 2.0 (Linacre, 2002)" },
    { label: "CFA 적합도", text: "CFI · TLI ≥ .95 · RMSEA ≤ .06 · SRMR ≤ .08 (Hu & Bentler, 1999). 모형 비교는 같은 추정법(WLSMV)으로, 차이검정은 DIFFTEST" },
    { label: "IRT 전체 적합도 (M2)", text: "M2 통계량의 RMSEA2 ≤ .05 양호 · ≤ .089 수용 (Maydeu-Olivares & Joe, 2014), SRMSR ≤ .05, CFI ≥ .95" },
    { label: "IRT 문항 적합도", text: "S-X² (Orlando & Thissen, 2000) 다중비교 보정 후 p ≥ .01 · 문항별 RMSEA(S-X²) ≤ .05" },
    { label: "국소독립성", text: "Yen의 Q3 잔차상관: 평균 Q3보다 .20 이상 크면 국소의존 의심 (Christensen, Makransky, & Horton, 2017) · LD-χ² > 10 주의 (Chen & Thissen, 1997)" },
    { label: "변별도 a (로지스틱 척도)", text: "0.65~1.34 보통 · 1.35~1.69 높음 · ≥ 1.70 매우 높음 (Baker, 2001)" },
    { label: "GRM 문턱값 b", text: "b1 < b2 < b3 < b4 순서가 지켜져야 함(GRM은 구조상 항상 순서). 범주 반응곡선에서 최빈 구간이 없는 범주는 통합 검토" },
    { label: "DIF (성별)", text: "순서형 로지스틱 회귀 McFadden 의사 R² 변화 ≥ .02 · 또는 다집단 IRT 우도비 검정 + 효과크기(ETSSD 등) (Choi, Gibbons, & Crane, 2011)" },
    { label: "모형 비교 (GRM · GPCM · PCM)", text: "내포 모형은 우도비 검정, 비내포는 AIC · BIC. 변별도가 문항마다 다르면 Rasch(PCM · RSM)보다 GRM 채택 근거" }
  ];
  App.page({
    id: "ias-results", title: "IAS 분석 결과", navHidden: true, navParent: "ias-home", tabLabel: "분석 결과",
    desc: "표본 특성, 요인구조(EFA · CFA · bifactor), 신뢰도, Rasch 분석, 수렴타당도 상관을 정리하고 결과 문장 초안을 복사해 쓸 수 있어요.",
    render: function (view) {
      head(view, "ias-results");
      var g = ui.grid(view, true);

      var ir = ui.card(g, { tab: "IRT", tone: "t-2", title: "IRT 등급반응모형 (GRM) — 재분석", wide: true });
      ui.fieldsPanel(ir.body, {
        ref: D("irt"), docKey: "info",
        fields: [
          { key: "model", label: "모형 · 추정", type: "text", wide: true, maxLength: 200 },
          { key: "software", label: "프로그램 · 패키지", type: "text", maxLength: 120 },
          { key: "cats", label: "응답범주", type: "text", maxLength: 120 },
          { key: "assume", label: "가정 점검 (일차원성 · 국소독립 · 단조성)", type: "textarea", rows: 2 },
          { key: "fit", label: "전체 적합도 (M2 · RMSEA2 · CFI · SRMSR)", type: "text", wide: true, maxLength: 200 },
          { key: "compare", label: "모형 비교 (GRM vs GPCM vs PCM)", type: "text", wide: true, maxLength: 200 },
          { key: "info", label: "검사정보함수 · 측정오차 (어느 θ 구간에서 정밀한가)", type: "textarea", rows: 2 },
          { key: "rel", label: "경험적 신뢰도 · EAP θ", type: "text", maxLength: 120 },
          { key: "dif", label: "성별 DIF", type: "text", maxLength: 200 },
          { key: "note", label: "해석 · 결정", type: "textarea", rows: 3 }
        ]
      });
      ir.body.appendChild(el("div", "mini-title", "문항 모수 (a · b1~b4 · S-X²)"));
      ui.itemsPanel(ir.body, {
        ref: D("irt"), views: ["table", "cards"], filters: ["flag"], search: true, addLabel: "+ 문항 추가", empty: "IRT 분석 후 문항 모수를 채워 넣으세요.",
        sort: byNo,
        fields: [
          { key: "no", label: "번호", type: "number", col: true, step: 1 },
          { key: "item", label: "문항", type: "text", title: true, required: true, col: true, maxLength: 160 },
          { key: "a", label: "a", type: "text", col: true, maxLength: 10 },
          { key: "b1", label: "b1", type: "text", col: true, maxLength: 10 },
          { key: "b2", label: "b2", type: "text", col: true, maxLength: 10 },
          { key: "b3", label: "b3", type: "text", col: true, maxLength: 10 },
          { key: "b4", label: "b4", type: "text", col: true, maxLength: 10 },
          { key: "sx2", label: "S-X² p", type: "text", col: true, maxLength: 12 },
          { key: "dif", label: "DIF", type: "text", col: true, maxLength: 20 },
          { key: "flag", label: "판단", type: "select", options: ["분석 전", "적합", "검토", "삭제 검토"], col: true },
          { key: "note", label: "메모", type: "text", maxLength: 200 }
        ]
      });


      var s = ui.card(g, { tab: "Sample", tone: "t-1", title: "표본 · 자료 수집" });
      ui.fieldsPanel(s.body, {
        ref: D("sample"), docKey: "info",
        fields: [
          { key: "source", label: "수집 방법 · 기관", type: "text", wide: true, maxLength: 160 },
          { key: "population", label: "대상", type: "text", maxLength: 120 },
          { key: "n", label: "최종 표본 수", type: "text", maxLength: 40 },
          { key: "period", label: "수집 시기", type: "text", maxLength: 80 },
          { key: "note", label: "메모", type: "textarea", rows: 2 }
        ]
      });
      var s2 = ui.card(g, { tab: "Demographics", tone: "t-2", title: "인구통계 (표 1 재료)" });
      ui.itemsPanel(s2.body, {
        ref: D("sample"), views: ["table", "cards"], filters: ["variable"], addLabel: "+ 행 추가", empty: "인구통계 행이 없어요.",
        fields: [
          { key: "variable", label: "변인", type: "text", meta: true, col: true, maxLength: 40 },
          { key: "cat", label: "범주", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "n", label: "n", type: "text", col: true, maxLength: 10 },
          { key: "pct", label: "%", type: "text", col: true, maxLength: 10 }
        ]
      });

      var m = ui.card(g, { tab: "Models", tone: "t-1", title: "요인구조 · 모형 비교 (표 2 재료)", wide: true });
      ui.fieldsPanel(m.body, {
        ref: D("models"), docKey: "info",
        fields: [
          { key: "suitability", label: "요인분석 적합성 (KMO · Bartlett)", type: "text", wide: true, maxLength: 200 },
          { key: "eigen", label: "차원성 (고유값 · 설명분산)", type: "text", wide: true, maxLength: 200 },
          { key: "estimator", label: "추정법 · 상관행렬", type: "text", wide: true, maxLength: 200 },
          { key: "note", label: "해석 · 확인할 점", type: "textarea", rows: 3 }
        ]
      });
      ui.itemsPanel(m.body, {
        ref: D("models"), views: ["table", "cards"], addLabel: "+ 모형 추가", empty: "모형 적합도를 기록하세요.",
        rowDone: function (x) { return !!x.adopted; },
        fields: [
          { key: "name", label: "모형", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "chi", label: "χ²", type: "text", col: true, maxLength: 20 },
          { key: "df", label: "df", type: "text", col: true, maxLength: 10 },
          { key: "cfi", label: "CFI", type: "text", col: true, maxLength: 10 },
          { key: "tli", label: "TLI", type: "text", col: true, maxLength: 10 },
          { key: "rmsea", label: "RMSEA", type: "text", col: true, maxLength: 20 },
          { key: "srmr", label: "SRMR", type: "text", col: true, maxLength: 10 },
          { key: "note", label: "메모", type: "text", col: true, maxLength: 200 },
          { key: "adopted", label: "채택", type: "check", col: true }
        ]
      });

      var b = ui.card(g, { tab: "Bifactor", tone: "t-2", title: "bifactor 지표" });
      ui.itemsPanel(b.body, {
        ref: D("bifactor"), views: ["table", "cards"], addLabel: "+ 지표 추가", empty: "bifactor 지표를 기록하세요.",
        hint: "G = 일반요인(간접적 공격성) · GI 죄책감 유발 · MH 악의적 유머 · SE 사회적 배제 (Bifactor Indices Calculator)",
        fields: [
          { key: "index", label: "지표", type: "text", title: true, required: true, col: true, maxLength: 30 },
          { key: "g", label: "G", type: "text", col: true, maxLength: 10 },
          { key: "gi", label: "GI", type: "text", col: true, maxLength: 10 },
          { key: "mh", label: "MH", type: "text", col: true, maxLength: 10 },
          { key: "se", label: "SE", type: "text", col: true, maxLength: 10 },
          { key: "note", label: "해석", type: "text", maxLength: 200 }
        ]
      });

      var r = ui.card(g, { tab: "Reliability", tone: "t-3", title: "신뢰도 · 하위요인 상관" });
      ui.fieldsPanel(r.body, {
        ref: D("rel"), docKey: "info",
        fields: [{ key: "inter", label: "하위요인 간 상관", type: "textarea", rows: 2 }]
      });
      ui.itemsPanel(r.body, {
        ref: D("rel"), views: ["table", "cards"], addLabel: "+ 행 추가", empty: "신뢰도 값을 기록하세요.",
        fields: [
          { key: "name", label: "척도 · 하위요인", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "items", label: "문항 수", type: "text", col: true, maxLength: 10 },
          { key: "alpha", label: "α", type: "text", col: true, maxLength: 10 },
          { key: "omega", label: "ω", type: "text", col: true, maxLength: 10 },
          { key: "note", label: "메모", type: "text", maxLength: 160 }
        ]
      });

      var ra = ui.card(g, { tab: "Rasch", tone: "t-3", title: "Rasch 평정척도모형 (이전 분석 · 참고)", wide: true });
      ui.fieldsPanel(ra.body, {
        ref: D("rasch"), docKey: "summary",
        fields: [
          { key: "dimension", label: "일차원성 (PCAR)", type: "text", wide: true, maxLength: 200 },
          { key: "separation", label: "분리지수 · 분리신뢰도", type: "text", wide: true, maxLength: 200 },
          { key: "note", label: "해석 · 후속 조치", type: "textarea", rows: 3 }
        ]
      });
      ra.body.appendChild(el("div", "mini-title", "응답범주 기능"));
      ui.itemsPanel(ra.body, {
        ref: D("rasch"), views: ["table", "cards"], filters: ["set"], addLabel: "+ 범주 추가", empty: "응답범주 분석 결과를 기록하세요.",
        hint: "문항별 난이도 · 적합도는 'IAS 문항 · 번안'의 문항표에 있어요.",
        fields: [
          { key: "set", label: "분석", type: "text", meta: true, col: true, maxLength: 40 },
          { key: "cat", label: "범주", type: "text", title: true, required: true, col: true, maxLength: 30 },
          { key: "freq", label: "빈도(%)", type: "text", col: true, maxLength: 30 },
          { key: "measure", label: "평균 측정치", type: "text", col: true, maxLength: 10 },
          { key: "infit", label: "Infit", type: "text", col: true, maxLength: 10 },
          { key: "outfit", label: "Outfit", type: "text", col: true, maxLength: 10 },
          { key: "step", label: "단계조정값", type: "text", col: true, maxLength: 10 }
        ]
      });

      var c = ui.card(g, { tab: "Validity", tone: "t-2", title: "수렴타당도 · 상관 (표 5 재료)", wide: true });
      ui.fieldsPanel(c.body, {
        ref: D("corr"), docKey: "info",
        fields: [{ key: "note", label: "분석 정보 · 해석", type: "textarea", rows: 3 }]
      });
      ui.itemsPanel(c.body, {
        ref: D("corr"), views: ["table", "cards"], filters: ["scale"], addLabel: "+ 상관 추가", empty: "준거 척도와의 상관을 기록하세요.",
        fields: [
          { key: "scale", label: "준거 척도", type: "text", meta: true, col: true, maxLength: 60 },
          { key: "sub", label: "하위척도", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "total", label: "IAS 총점 r", type: "text", col: true, maxLength: 10 },
          { key: "g", label: "죄책감 유발", type: "text", col: true, maxLength: 10 },
          { key: "h", label: "악의적 유머", type: "text", col: true, maxLength: 10 },
          { key: "s", label: "사회적 배제", type: "text", col: true, maxLength: 10 },
          { key: "role", label: "역할", type: "select", options: ["수렴", "변별", "준거", "기타"], col: true }
        ]
      });

      var ip = ui.card(g, { tab: "Interpret", tone: "t-3", title: "해석 메모 · 근거" });
      ui.itemsPanel(ip.body, {
        ref: D("interp"), views: ["cards", "table"], search: true, addLabel: "+ 해석 추가", empty: "결과 해석과 근거 문헌을 기록하세요.",
        fields: [
          { key: "topic", label: "주제", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "content", label: "해석", type: "textarea", col: true },
          { key: "refs", label: "근거 문헌", type: "textarea", col: true }
        ]
      });
      var cr = ui.card(g, { tab: "Criteria", tone: "t-1", title: "판단 기준 (복사 가능)" });
      ui.refList(cr.body, CRITERIA);

      var st = ui.card(g, { tab: "Draft", tone: "t-2", title: "결과 서술 문장 초안 (실제 수치 반영 · 복사)", wide: true });
      ui.itemsPanel(st.body, {
        ref: D("sentences"), views: ["cards", "table"], addLabel: "+ 문장 추가", actions: copyAction("text"),
        empty: "결과 문장을 추가하세요.", hint: "재분석으로 수치가 바뀌면 ✎로 함께 고쳐 두세요.",
        fields: [
          { key: "label", label: "항목", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "text", label: "문장", type: "textarea", col: true }
        ]
      });
    }
  });

  /* =========================================================
     4. 원고 · 문헌
     ========================================================= */
  App.page({
    id: "ias-manuscript", title: "IAS 원고 · 문헌", navHidden: true, navParent: "ias-home", tabLabel: "원고 · 문헌",
    desc: "원고 섹션별 진행, 논의 · 한계 포인트, 핵심 선행연구, 예상 심사 질문과 대응, 투고 준비를 관리합니다.",
    render: function (view) {
      head(view, "ias-manuscript");
      var g = ui.grid(view, true);

      var sc = ui.card(g, { tab: "Sections", tone: "t-1", title: "원고 섹션 진행", wide: true });
      ui.itemsPanel(sc.body, {
        ref: D("sections"), views: ["cards", "table"], statusKey: "status", addLabel: "+ 섹션 추가", empty: "원고 섹션을 추가하세요.",
        statusTones: { "미착수": 0, "집필중": 1, "초안 완료": 2, "수정중": 1, "완료": 3 },
        hint: "상태 칩을 누르면 미착수 → 집필중 → 초안 완료 → 수정중 → 완료 순으로 바뀝니다.",
        fields: [
          { key: "name", label: "섹션", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "status", label: "상태", type: "select", options: TSTAT, col: true },
          { key: "note", label: "담을 내용 · 현재 메모", type: "textarea", col: true }
        ],
        summary: function (items) {
          if (!items.length) { return null; }
          var pct = App.chaptersPct(items);
          return ui.progress(pct, "원고 진행률 " + pct + "% · 완료 " + items.filter(function (x) { return x.status === "완료"; }).length + "/" + items.length);
        }
      });

      var w = ui.card(g, { tab: "Daily", tone: "t-2", title: "집필 기록 (IAS 논문)" });
      ui.writingLog(w.body, { ref: D("log"), goal: 1000, unit: "자" });

      var dsc = ui.card(g, { tab: "Discussion", tone: "t-3", title: "논의 · 시사점 · 한계" });
      ui.itemsPanel(dsc.body, {
        ref: D("discussion"), views: ["cards", "table"], filters: ["kind"], addLabel: "+ 포인트 추가", empty: "논의에 쓸 포인트를 추가하세요.",
        itemTitle: function (x) { return x.text || ""; },
        fields: [
          { key: "kind", label: "구분", type: "select", options: ["논의", "시사점", "한계", "후속 연구"], meta: true, col: true },
          { key: "text", label: "내용", type: "textarea", title: true, required: true, col: true },
          { key: "refs", label: "근거 · 연결 문헌", type: "textarea", col: true }
        ]
      });

      var q = ui.card(g, { tab: "Reviewer", tone: "t-1", title: "예상 심사 질문 · 대응", wide: true });
      ui.itemsPanel(q.body, {
        ref: D("qa"), views: ["cards", "table"], statusKey: "state", addLabel: "+ 질문 추가", empty: "심사위원이 물을 만한 질문을 미리 적어 두세요.",
        statusTones: { "대응 준비 전": 1, "보완 필요": 2, "대응 완료": 3 },
        hint: "투고 전에 스스로 심사위원이 되어 보는 목록이에요. '보완 필요'는 추가 분석이나 원고 수정이 필요한 항목입니다.",
        fields: [
          { key: "q", label: "예상 질문", type: "textarea", title: true, required: true, col: true },
          { key: "a", label: "대응 · 근거", type: "textarea", col: true },
          { key: "state", label: "상태", type: "select", options: ["대응 준비 전", "보완 필요", "대응 완료"], col: true }
        ]
      });

      var l = ui.card(g, { tab: "Literature", tone: "t-2", title: "핵심 선행연구", wide: true });
      ui.itemsPanel(l.body, {
        ref: D("lit"), views: ["cards", "table"], search: true, filters: ["role"], statusKey: "state", grid: true, addLabel: "+ 문헌 추가",
        statusTones: { "읽을 예정": 0, "정리 필요": 1, "정리 완료": 3 }, empty: "선행연구를 추가하세요.",
        fields: [
          { key: "cite", label: "서지", type: "text", title: true, required: true, col: true, maxLength: 300 },
          { key: "role", label: "역할", type: "select", options: ["원척도", "번안 · 타당화", "관련 연구", "방법론", "국내 연구", "배경"], meta: true, col: true },
          { key: "summary", label: "핵심 내용", type: "textarea", col: true },
          { key: "use", label: "내 논문에서 쓰는 곳", type: "textarea", col: true },
          { key: "state", label: "정리 상태", type: "select", options: ["읽을 예정", "정리 필요", "정리 완료"], col: true }
        ]
      });

      var sb = ui.card(g, { tab: "Submit", tone: "t-3", title: "투고 준비 체크리스트", wide: true });
      ui.itemsPanel(sb.body, {
        ref: D("submit"), fields: CHECK_FIELDS, checkKey: "done", dueKey: "due", quickFields: ["text", "due"],
        empty: "투고 준비 항목을 추가하세요.", hint: "학술지를 정하면 투고 규정(분량 · 양식 · 익명 처리)부터 확인하세요."
      });
    }
  });
})(window.App);
