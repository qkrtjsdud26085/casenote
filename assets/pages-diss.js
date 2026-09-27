/* Hello dear Sunny — 박사학위논문 (연구재단 연구활동계획서 기반) · 진행중 프로젝트 ②와 같은 연구
   연구 자료는 Firestore(research/diss_*)에만 저장합니다 (research-kit.js 참고). */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el, RK = App.rkit;
  var DOCS = ["meta", "keystats", "flow", "schedule", "next", "decisions", "files", "vars", "models", "experts", "anacheck",
    "lit", "concepts", "nrf", "nrfdocs", "prep", "log"];
  var STAGES = ["연구 계획", "연구재단 신청", "선행연구 · 변수 선정", "설문 구성 · IRB", "패널 자료 수집", "전처리 · 모델링",
    "SHAP · SMOTE 해석", "델파이 1라운드", "델파이 2라운드 · CVR", "논문 작성", "심사", "학위 취득"];
  var CHECK_FIELDS = App.tpl.CHECK_FIELDS;
  var TABS = ["diss-overview", "diss-design", "diss-analysis", "diss-lit", "diss-nrf"];
  var K = RK({ prefix: "diss", docs: DOCS, stages: STAGES, name: "박사학위논문", fileName: "박사학위논문_홈페이지자료", homeId: "diss-overview" });
  var D = K.D, byDate = RK.byDate;
  function head(view, id) { RK.pageTabs(view, TABS, id); K.emptyNotice(view); }
  App.diss = { importData: K.importData, exportData: K.exportData, DOCS: DOCS, STAGES: STAGES };
  App.dissSummaryCard = function (parent) {
    K.summaryCard(parent, { tab: "Dissertation", tone: "t-1", title: "박사학위논문 · 비선형 공격성 임계점 (SHAP · SMOTE)" });
  };

  /* ---------- research flow chips (연구 흐름) ---------- */
  function flowChips(parent) {
    var row = el("div", "flow-row"); parent.appendChild(row);
    App.watchDoc(D("flow"), function (d) {
      H.clear(row);
      var items = d && d.items ? d.items : [];
      if (!items.length) { row.appendChild(ui.empty("연구 흐름 단계를 추가하세요.")); return; }
      items.forEach(function (it, i) {
        var chip = el("div", "flow-chip diss-flow" + (it.done ? " done" : ""));
        chip.appendChild(el("div", "", it.label || ""));
        if (it.sub) { chip.appendChild(el("div", "mini-sub", it.sub)); }
        row.appendChild(chip);
        if (i < items.length - 1) { row.appendChild(el("span", "flow-arrow", "→")); }
      });
    });
    var det = el("details", "ias-edit");
    det.appendChild(el("summary", "", "흐름 고치기"));
    parent.appendChild(det);
    ui.itemsPanel(det, {
      ref: D("flow"), views: ["table", "cards"], addLabel: "+ 단계 추가", empty: "연구 흐름 단계를 추가하세요.",
      fields: [
        { key: "label", label: "단계", type: "text", title: true, required: true, col: true, maxLength: 40 },
        { key: "sub", label: "설명", type: "text", col: true, maxLength: 80 },
        { key: "done", label: "완료", type: "check", col: true }
      ]
    });
  }

  /* ---------- schedule gantt (추진 일정) ---------- */
  function gantt(parent) {
    var box = el("div", "diss-gantt"); parent.appendChild(box);
    App.watchDoc(D("schedule"), function (d) {
      H.clear(box);
      var items = (d && d.items ? d.items : []).filter(function (x) { return x.start && x.end; });
      if (!items.length) { return; }
      var t = function (s) { return H.parseKey(s).getTime(); };
      var min = Math.min.apply(null, items.map(function (x) { return t(x.start); }));
      var max = Math.max.apply(null, items.map(function (x) { return t(x.end); }));
      var span = Math.max(1, max - min), now = Date.now();
      items.slice().sort(byDate(false, "start")).forEach(function (x) {
        var row = el("div", "diss-gantt-row");
        row.appendChild(el("span", "diss-gantt-label", x.task || ""));
        var track = el("div", "diss-gantt-track");
        var bar = el("span", "diss-gantt-bar" + (x.done ? " done" : (t(x.start) <= now && now <= t(x.end) ? " now" : "")));
        bar.style.left = ((t(x.start) - min) / span * 100) + "%";
        bar.style.width = Math.max(1.5, (t(x.end) - t(x.start)) / span * 100) + "%";
        bar.title = x.start + " ~ " + x.end;
        track.appendChild(bar);
        if (min <= now && now <= max) { var m = el("span", "diss-gantt-today"); m.style.left = ((now - min) / span * 100) + "%"; track.appendChild(m); }
        row.appendChild(track);
        box.appendChild(row);
      });
    });
  }

  /* =========================================================
     1. 개요 · 로드맵
     ========================================================= */
  App.page({
    id: "diss-overview", title: "박사학위논문 개요", navLabel: "개요 · 로드맵", tabLabel: "개요 · 로드맵",
    desc: "일반인의 비선형적 공격성 임계점을 머신러닝(SHAP · SMOTE)과 델파이로 밝히는 박사학위논문의 목표, 흐름, 일정, 할 일을 한눈에 봅니다.",
    render: function (view) {
      head(view, "diss-overview");
      var g = ui.grid(view, true);

      var o = ui.card(g, { tab: "Dissertation", tone: "t-1", title: "과제 정보 · 진행 단계", wide: true });
      K.stageStepper(o.body);
      ui.fieldsPanel(o.body, {
        ref: D("meta"), docKey: "info",
        fields: [
          { key: "title", label: "국문 제목", type: "text", wide: true, maxLength: 200 },
          { key: "engTitle", label: "영문 제목", type: "text", wide: true, maxLength: 200 },
          { key: "period", label: "연구 기간", type: "text", maxLength: 60 },
          { key: "advisor", label: "지도교수", type: "text", maxLength: 60 },
          { key: "keywords", label: "키워드", type: "text", wide: true, maxLength: 200 },
          { key: "blocker", label: "지금 막힌 것 · 결정할 것", type: "textarea", rows: 2 }
        ]
      });

      var k = ui.card(g, { tab: "Numbers", tone: "t-2", title: "연구 설계 한눈에", wide: true });
      K.statTiles(k.body);

      var f = ui.card(g, { tab: "Flow", tone: "t-3", title: "연구 흐름", wide: true });
      flowChips(f.body);

      var a = ui.card(g, { tab: "Abstract", tone: "t-1", title: "연구 목표 · 요약 · 기대효과", wide: true });
      ui.fieldsPanel(a.body, {
        ref: D("meta"), docKey: "info",
        fields: [
          { key: "purpose", label: "연구 목표", type: "textarea", rows: 6 },
          { key: "summary", label: "연구 요약", type: "textarea", rows: 6 },
          { key: "effect", label: "기대효과", type: "textarea", rows: 5 }
        ]
      });

      var s = ui.card(g, { tab: "Schedule", tone: "t-2", title: "추진 일정", wide: true });
      gantt(s.body);
      ui.itemsPanel(s.body, {
        ref: D("schedule"), views: ["table", "cards"], checkKey: "done", addLabel: "+ 일정 추가", filters: ["year"],
        sort: byDate(false, "start"), empty: "추진 일정을 추가하세요.",
        hint: "연구재단 연구활동계획서의 4. 연구 추진 일정 기준이에요. 실제 진행에 맞게 기간을 고치세요.",
        fields: [
          { key: "task", label: "내용", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "year", label: "구분", type: "text", meta: true, col: true, maxLength: 30 },
          { key: "start", label: "시작", type: "date", col: true },
          { key: "end", label: "종료", type: "date", col: true },
          { key: "note", label: "메모", type: "text", maxLength: 160 }
        ]
      });

      var n = ui.card(g, { tab: "Next", tone: "t-1", title: "지금 할 일" });
      ui.itemsPanel(n.body, {
        ref: D("next"), checkKey: "done", dueKey: "due", quickFields: ["text", "area", "due"], filters: ["area"],
        empty: "다음에 할 일을 추가하세요.",
        fields: [
          { key: "text", label: "할 일", type: "text", title: true, required: true, maxLength: 160 },
          { key: "area", label: "영역", type: "select", options: ["문헌 · 변수", "설문 · 자료", "분석", "델파이", "연구재단", "역량", "기타"], meta: true },
          { key: "due", label: "목표일", type: "date" },
          { key: "note", label: "메모 · 근거", type: "textarea" }
        ]
      });

      var dc = ui.card(g, { tab: "Decisions", tone: "t-3", title: "결정 기록 · 지도 의견" });
      ui.itemsPanel(dc.body, {
        ref: D("decisions"), views: ["cards", "table"], statusKey: "state", search: true, addLabel: "+ 기록 추가",
        statusTones: { "검토 중": 1, "확정": 3, "보류": 0 }, sort: byDate(true), empty: "설계에서 내린 결정과 근거를 남겨 두세요.",
        fields: [
          { key: "decision", label: "결정 · 의견", type: "text", title: true, required: true, maxLength: 160 },
          { key: "date", label: "날짜", type: "date", today: true, meta: true, col: true },
          { key: "rationale", label: "근거", type: "textarea", col: true },
          { key: "state", label: "상태", type: "select", options: ["검토 중", "확정", "보류"], col: true }
        ]
      });

      var w = ui.card(g, { tab: "Daily", tone: "t-2", title: "집필 기록 (박사학위논문)" });
      ui.writingLog(w.body, { ref: D("log"), goal: 1000, unit: "자" });

      K.importCard(g, "연구계획 · 변수 · 분석 설계 같은 미출판 연구 내용은 홈페이지 코드(공개)에 넣지 않고, 로그인해야 보이는 내 데이터베이스에만 저장해요. 연구재단 폴더의 '박사학위논문_홈페이지자료.json'을 불러오면 박사학위논문 페이지가 모두 채워집니다.");
    }
  });

  /* =========================================================
     2. 연구 설계 · 변수
     ========================================================= */
  App.page({
    id: "diss-design", title: "박사학위논문 연구 설계", navLabel: "연구 설계 · 변수", tabLabel: "연구 설계 · 변수",
    desc: "필요성과 이론적 틀, 연구 1의 대상 · 표집, 예측변수(다차원적 위험 요인군)와 타겟변수를 정리합니다. 서론과 방법 장의 재료예요.",
    render: function (view) {
      head(view, "diss-design");
      var g = ui.grid(view, true);

      var b = ui.card(g, { tab: "Background", tone: "t-1", title: "연구의 필요성", wide: true });
      ui.fieldsPanel(b.body, {
        ref: D("meta"), docKey: "background",
        fields: [
          { key: "cases", label: "사회적 배경 (일상 속 비병리적 공격성)", type: "textarea", rows: 4 },
          { key: "gap", label: "선행연구의 한계 (선형 모델)", type: "textarea", rows: 3 },
          { key: "xai", label: "왜 설명 가능한 AI인가", type: "textarea", rows: 3 },
          { key: "rnr", label: "실무적 의의 (RNR · 개별 기제)", type: "textarea", rows: 3 }
        ]
      });

      var t = ui.card(g, { tab: "Theory", tone: "t-2", title: "이론적 틀" });
      ui.fieldsPanel(t.body, {
        ref: D("meta"), docKey: "theory",
        fields: [
          { key: "definition", label: "공격성 · 폭력의 정의", type: "textarea", rows: 3 },
          { key: "gam", label: "일반 공격성 모델 (GAM)", type: "textarea", rows: 4 },
          { key: "hotcool", label: "Hot/Cool 이중체계", type: "textarea", rows: 4 },
          { key: "scope", label: "연구 범위 · 제외 기준", type: "textarea", rows: 3 }
        ]
      });

      var s = ui.card(g, { tab: "Sample", tone: "t-3", title: "연구 1 · 대상과 자료 수집" });
      ui.fieldsPanel(s.body, {
        ref: D("meta"), docKey: "design",
        fields: [
          { key: "population", label: "대상", type: "text", wide: true, maxLength: 160 },
          { key: "n", label: "표본 수 · 구성", type: "text", wide: true, maxLength: 160 },
          { key: "sampling", label: "수집 방법", type: "text", wide: true, maxLength: 200 },
          { key: "reward", label: "사례비", type: "text", maxLength: 60 },
          { key: "items", label: "설문 분량", type: "text", maxLength: 60 },
          { key: "note", label: "메모 (IRB · 업체 등)", type: "textarea", rows: 3 }
        ]
      });

      var v = ui.card(g, { tab: "Variables", tone: "t-1", title: "변수 표 (표 1 재료)", wide: true });
      ui.itemsPanel(v.body, {
        ref: D("vars"), views: ["table", "cards"], search: true, filters: ["group", "state"], statusKey: "state", addLabel: "+ 변수 추가",
        statusTones: { "후보": 0, "확정": 3, "제외": 1 }, empty: "예측변수와 타겟변수를 추가하세요.",
        hint: "연구재단 계획서 <표 1> 기준이에요. 선행연구를 볼 때마다 후보를 추가하고, 확정되면 상태를 바꾸세요. 자료형(이분 · 연속 · 범주)은 전처리 방식을 정하는 데 쓰여요.",
        fields: [
          { key: "name", label: "변수", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "group", label: "구분", type: "select", options: ["정적 요인", "동적 요인", "타겟변수", "인구통계"], meta: true, col: true },
          { key: "scale", label: "측정 도구 · 출처", type: "text", col: true, maxLength: 200 },
          { key: "type", label: "자료형", type: "select", options: ["연속형", "범주형", "이분형", "미정"], col: true },
          { key: "state", label: "상태", type: "select", options: ["후보", "확정", "제외"], col: true },
          { key: "note", label: "메모", type: "text", maxLength: 200 }
        ]
      });
    }
  });

  /* =========================================================
     3. 분석 계획 (ML · 델파이)
     ========================================================= */
  App.page({
    id: "diss-analysis", title: "박사학위논문 분석 계획", navLabel: "분석 계획 (ML · 델파이)", tabLabel: "분석 계획",
    desc: "연구 1 머신러닝(로지스틱 회귀 · Random Forest · XGBoost, SMOTE, SHAP)과 연구 2 델파이의 설계, 모델 결과, 전문가 패널을 관리합니다.",
    render: function (view) {
      head(view, "diss-analysis");
      var g = ui.grid(view, true);

      var ml = ui.card(g, { tab: "Study 1", tone: "t-1", title: "연구 1 · 학습 설계" });
      ui.fieldsPanel(ml.body, {
        ref: D("meta"), docKey: "ml",
        fields: [
          { key: "target", label: "타겟 정의 (공격성 발현 기준)", type: "textarea", rows: 2 },
          { key: "split", label: "데이터 분할", type: "text", maxLength: 120 },
          { key: "cv", label: "교차검증 · 튜닝", type: "text", maxLength: 160 },
          { key: "metric", label: "성능 지표", type: "text", maxLength: 160 },
          { key: "smote", label: "불균형 처리 (SMOTE)", type: "textarea", rows: 2 },
          { key: "shap", label: "SHAP 해석 계획", type: "textarea", rows: 3 },
          { key: "note", label: "메모 · 보완할 점", type: "textarea", rows: 3 }
        ]
      });

      var dl = ui.card(g, { tab: "Study 2", tone: "t-2", title: "연구 2 · 델파이 설계" });
      ui.fieldsPanel(dl.body, {
        ref: D("meta"), docKey: "delphi",
        fields: [
          { key: "panel", label: "패널 선정 기준", type: "textarea", rows: 2 },
          { key: "size", label: "규모 · 섭외", type: "text", maxLength: 160 },
          { key: "round1", label: "1라운드", type: "textarea", rows: 3 },
          { key: "round2", label: "2라운드", type: "textarea", rows: 3 },
          { key: "cvr", label: "합의 판단 (CVR)", type: "textarea", rows: 2 }
        ]
      });

      var m = ui.card(g, { tab: "Models", tone: "t-3", title: "모델 비교표 (표 2 재료)", wide: true });
      ui.itemsPanel(m.body, {
        ref: D("models"), views: ["table", "cards"], addLabel: "+ 모델 추가", empty: "비교할 모델을 추가하세요.",
        rowDone: function (x) { return !!x.best; },
        hint: "결과 칸(AUC 등)은 분석 후 채우고, 최적 모델에 체크하세요.",
        fields: [
          { key: "name", label: "모델", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "family", label: "계열", type: "text", col: true, maxLength: 40 },
          { key: "reason", label: "선정 이유", type: "textarea", col: true },
          { key: "params", label: "하이퍼파라미터", type: "text", col: true, maxLength: 200 },
          { key: "auc", label: "AUC", type: "text", col: true, maxLength: 20 },
          { key: "other", label: "기타 지표 (F1 · 재현율 등)", type: "text", col: true, maxLength: 120 },
          { key: "best", label: "최적", type: "check", col: true }
        ]
      });

      var c = ui.card(g, { tab: "Check", tone: "t-1", title: "분석 단계 체크리스트" });
      ui.itemsPanel(c.body, {
        ref: D("anacheck"), fields: CHECK_FIELDS, checkKey: "done", dueKey: "due", quickFields: ["text", "due"],
        empty: "분석 단계를 추가하세요.", hint: "SMOTE는 학습용 데이터에만 적용하고 테스트 데이터에는 쓰지 않아요 (정보 누수 방지)."
      });

      var e = ui.card(g, { tab: "Panel", tone: "t-2", title: "델파이 전문가 패널" });
      ui.itemsPanel(e.body, {
        ref: D("experts"), views: ["table", "cards"], statusKey: "state", addLabel: "+ 전문가 추가",
        statusTones: { "후보": 0, "요청함": 1, "수락": 2, "1R 완료": 2, "2R 완료": 3, "거절": 0 },
        empty: "섭외할 전문가를 추가하세요. (이름 대신 익명 코드를 써도 좋아요)",
        summary: function (items) { return items.length ? "수락 이상 " + items.filter(function (x) { return ["수락", "1R 완료", "2R 완료"].indexOf(x.state) !== -1; }).length + "/" + items.length + "명" : null; },
        fields: [
          { key: "code", label: "전문가 (코드)", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "field", label: "소속 · 분야", type: "text", col: true, maxLength: 120 },
          { key: "papers", label: "최근 5년 법심리 논문 수", type: "number", col: true },
          { key: "state", label: "상태", type: "select", options: ["후보", "요청함", "수락", "1R 완료", "2R 완료", "거절"], col: true },
          { key: "memo", label: "메모", type: "textarea" }
        ]
      });
    }
  });

  /* =========================================================
     4. 문헌 · 이론
     ========================================================= */
  App.page({
    id: "diss-lit", title: "박사학위논문 문헌", navLabel: "문헌 · 이론", tabLabel: "문헌 · 이론",
    desc: "연구재단 폴더의 참고문헌(서론 · 방법론 · 선행 머신러닝 연구)과 핵심 개념을 정리합니다.",
    render: function (view) {
      head(view, "diss-lit");
      var g = ui.grid(view, true);
      var l = ui.card(g, { tab: "Literature", tone: "t-1", title: "참고문헌", wide: true });
      ui.itemsPanel(l.body, {
        ref: D("lit"), views: ["cards", "table"], search: true, filters: ["area", "state"], statusKey: "state", grid: true, addLabel: "+ 문헌 추가",
        statusTones: { "읽을 예정": 0, "정리 필요": 1, "정리 완료": 3 }, empty: "참고문헌을 추가하세요.",
        summary: function (items) { return items.length ? "총 " + items.length + "편 · 정리 완료 " + items.filter(function (x) { return x.state === "정리 완료"; }).length : null; },
        fields: [
          { key: "cite", label: "서지", type: "text", title: true, required: true, col: true, maxLength: 400 },
          { key: "area", label: "영역", type: "select", options: ["서론 · 이론", "방법론 · 머신러닝", "선행 머신러닝 연구", "측정 도구", "델파이", "정책 · 통계", "기타"], meta: true, col: true },
          { key: "summary", label: "핵심 내용", type: "textarea", col: true },
          { key: "use", label: "논문에서 쓰는 곳", type: "text", col: true, maxLength: 200 },
          { key: "file", label: "PDF 위치", type: "text", maxLength: 300 },
          { key: "state", label: "정리 상태", type: "select", options: ["읽을 예정", "정리 필요", "정리 완료"], col: true }
        ]
      });
      var c = ui.card(g, { tab: "Concepts", tone: "t-2", title: "핵심 개념 · 용어", wide: true });
      ui.itemsPanel(c.body, {
        ref: D("concepts"), views: ["cards", "table"], search: true, grid: true, addLabel: "+ 개념 추가", empty: "핵심 개념을 추가하세요.",
        fields: [
          { key: "term", label: "용어", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "definition", label: "정의 · 설명", type: "textarea", col: true },
          { key: "source", label: "출처", type: "text", col: true, maxLength: 200 }
        ]
      });
    }
  });

  /* =========================================================
     5. 연구재단 신청 · 파일
     ========================================================= */
  App.page({
    id: "diss-nrf", title: "연구재단 신청 · 파일", navLabel: "연구재단 신청 · 파일", tabLabel: "연구재단 · 파일",
    desc: "한국연구재단 박사과정생 연구장려금 신청 이력과 제출 서류, 연구 역량 준비, 연구재단 폴더의 파일 위치를 관리합니다.",
    render: function (view) {
      head(view, "diss-nrf");
      var g = ui.grid(view, true);
      var h = ui.card(g, { tab: "NRF", tone: "t-1", title: "연구장려금 신청 이력", wide: true });
      ui.itemsPanel(h.body, {
        ref: D("nrf"), views: ["cards", "table"], statusKey: "state", addLabel: "+ 신청 추가", sort: byDate(true),
        statusTones: { "준비 중": 0, "제출": 1, "결과 대기": 1, "선정": 3, "미선정": 0 }, empty: "신청 기록을 추가하세요.",
        fields: [
          { key: "title", label: "사업 · 과제", type: "text", title: true, required: true, col: true, maxLength: 200 },
          { key: "date", label: "제출일", type: "date", meta: true, col: true },
          { key: "state", label: "상태", type: "select", options: ["준비 중", "제출", "결과 대기", "선정", "미선정"], col: true },
          { key: "docs", label: "제출 서류", type: "textarea", col: true },
          { key: "note", label: "메모 · 평가 의견", type: "textarea" }
        ]
      });
      var d = ui.card(g, { tab: "Checklist", tone: "t-2", title: "다음 신청 준비 체크리스트" });
      ui.itemsPanel(d.body, {
        ref: D("nrfdocs"), fields: CHECK_FIELDS, checkKey: "done", dueKey: "due", quickFields: ["text", "due"],
        empty: "준비할 서류를 추가하세요.", hint: "매년 2~3월 공고 · 요강을 먼저 확인하세요 (서식이 해마다 조금씩 바뀌어요)."
      });
      var p = ui.card(g, { tab: "Growth", tone: "t-3", title: "연구 역량 준비" });
      ui.itemsPanel(p.body, {
        ref: D("prep"), views: ["cards", "table"], statusKey: "state", addLabel: "+ 항목 추가",
        statusTones: { "계획": 0, "진행 중": 1, "완료": 3 }, empty: "자격증 · 교육 · 선행 분석 등을 추가하세요.",
        fields: [
          { key: "name", label: "항목", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "kind", label: "구분", type: "select", options: ["자격증", "교육 과정", "선행 연구", "도구 · 시스템", "학술활동", "기타"], meta: true, col: true },
          { key: "when", label: "시기", type: "text", col: true, maxLength: 60 },
          { key: "state", label: "상태", type: "select", options: ["계획", "진행 중", "완료"], col: true },
          { key: "note", label: "메모", type: "textarea" }
        ]
      });
      var f = ui.card(g, { tab: "Files", tone: "t-1", title: "연구재단 폴더 파일", wide: true });
      ui.itemsPanel(f.body, {
        ref: D("files"), views: ["cards", "table"], search: true, filters: ["kind"], addLabel: "+ 파일 · 폴더 추가", grid: true,
        empty: "파일 경로를 추가하세요.", itemExtra: RK.pathActions, fields: RK.FILE_FIELDS,
        hint: "내 컴퓨터(Google Drive 동기화) 경로는 '경로 복사' 후 탐색기 주소창에 붙여넣어 여세요."
      });
    }
  });
})(window.App);
