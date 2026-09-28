/* Hello dear Sunny — 진행중 프로젝트 ① IAS 척도 타당화 (학회지 논문)
   연구 자료는 Firestore(research/ias_*)에만 저장합니다 (research-kit.js 참고). */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, RK = App.rkit;
  var DOCS = ["meta", "keystats", "timeline", "next", "decisions", "files", "items", "translog", "sample", "models", "bifactor",
    "rel", "rasch", "corr", "interp", "sentences", "sections", "discussion", "lit", "qa", "submit", "log", "process", "irt", "irtcheck"];
  var STAGES = ["원척도 검토", "번안", "자료 수집", "분석", "원고 작성", "지도교수 검토", "투고", "심사 · 수정", "게재 확정"];
  var FACTORS = ["사회적 배제", "악의적 유머", "죄책감 유발"];
  var FLAGS = ["적합", "과적합 검토", "삭제 검토"];
  var TABS = ["ias-home", "ias-flow", "ias-items", "ias-writing"];
  var K = RK({ prefix: "ias", docs: DOCS, stages: STAGES, name: "IAS", fileName: "IAS_홈페이지자료", homeId: "ias-home" });
  var D = K.D;
  function byNo(a, b) { return (Number(a.no) || 0) - (Number(b.no) || 0); }
  function head(view, id) { RK.pageTabs(view, TABS, id); }
  App.ias = { importData: K.importData, exportData: K.exportData, DOCS: DOCS, STAGES: STAGES };

  App.iasSummaryCard = function (parent) {
    K.summaryCard(parent, { tab: "IAS", title: "진행중 프로젝트 ① · IAS 척도 타당화" });
  };

  /* =========================================================
     1. 개요 · 진행 단계
     ========================================================= */
  App.page({
    id: "ias-home", title: "IAS 척도 타당화", navLabel: "IAS 척도 타당화", tabLabel: "개요 · 진행 단계",
    render: function (view) {
      head(view, "ias-home");
      var o = ui.card(view, { tab: "Paper", tone: "t-1", title: "논문 개요 · 진행 단계", wide: true });
      var dd = o.count; dd.className = "dday";
      K.stageStepper(o.body);
      ui.fieldsPanel(o.body, {
        ref: D("meta"), docKey: "info",
        fields: [
          { key: "title", label: "국문 제목 (가제)", type: "text", wide: true, maxLength: 200 },
          { key: "engTitle", label: "영문 제목", type: "text", wide: true, maxLength: 200 },
          { key: "authors", label: "저자 · 지도교수", type: "text", maxLength: 120 },
          { key: "journal", label: "목표 학술지", type: "text", maxLength: 120 },
          { key: "submitDue", label: "목표 투고일", type: "date" }
        ],
        onData: function (src) {
          if (!src.submitDue) { dd.textContent = ""; dd.className = "dday"; return; }
          var i = H.ddayInfo(src.submitDue); dd.textContent = "투고 " + i.text; dd.className = "dday " + i.cls;
        }
      });
    }
  });

  /* =========================================================
     2. 연구 흐름 (research-flow.js · research/ias_process)
     ========================================================= */
  App.page({
    id: "ias-flow", title: "IAS 연구 흐름", navHidden: true, navParent: "ias-home", tabLabel: "연구 흐름",
    render: function (view) {
      head(view, "ias-flow");
      var c = ui.card(view, { tab: "Process", tone: "t-1", title: "연구 프로세스", wide: true });
      ui.researchFlow(c.body, { ref: D("process") });
    }
  });

  /* =========================================================
     3. 문항표
     ========================================================= */
  App.page({
    id: "ias-items", title: "IAS 문항표", navHidden: true, navParent: "ias-home", tabLabel: "문항표",
    render: function (view) {
      head(view, "ias-items");
      var it = ui.card(view, { tab: "Items", tone: "t-2", title: "문항표 (IAS-A · 25문항)", wide: true });
      it.el.classList.add("ias-items-card");
      ui.itemsPanel(it.body, {
        ref: D("items"), views: ["table", "cards"], search: true, statusKey: "flag", filters: ["factor", "flag"], addLabel: "+ 문항 추가",
        statusTones: { "적합": 3, "과적합 검토": 0, "삭제 검토": 1 },
        sort: byNo, empty: "문항이 없어요.",
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
    }
  });
})(window.App);
