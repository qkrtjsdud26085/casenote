/* Hello dear Sunny — IAS 척도 타당화 (학회지 논문) 전용 페이지
   연구 내용(문항 · 결과 · 원고)은 코드에 넣지 않고 Firestore(research/ias_*)에만 저장합니다.
   이 저장소와 GitHub Pages 파일은 누구나 볼 수 있어서, 미출판 연구 자료가 공개되지 않도록 하기 위해서예요.
   처음 한 번은 IAS 대시보드의 '자료 불러오기'로 IAS 폴더의 JSON 파일을 넣습니다. */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el, TSTAT = App.TSTAT;
  var D = function (name) { return App.doc("research/ias_" + name); };
  var DOCS = ["meta", "keystats", "timeline", "next", "decisions", "files", "items", "translog", "sample", "models", "bifactor",
    "rel", "rasch", "corr", "interp", "sentences", "sections", "discussion", "lit", "qa", "submit", "log"];
  var STAGES = ["원척도 검토", "번안", "자료 수집", "분석", "원고 작성", "지도교수 검토", "투고", "심사 · 수정", "게재 확정"];
  var FACTORS = ["사회적 배제", "악의적 유머", "죄책감 유발"];
  var FLAGS = ["적합", "과적합 검토", "삭제 검토"];
  var CHECK_FIELDS = App.tpl.CHECK_FIELDS;

  function stageOf(d) { var i = STAGES.indexOf(d && d.stage); return i < 0 ? 0 : i; }
  function stagePct(i) { return Math.round(i / (STAGES.length - 1) * 100); }
  function byDate(desc) { return function (a, b) { var x = String(a.date || ""), y = String(b.date || ""); return desc ? y.localeCompare(x) : x.localeCompare(y); }; }
  function byNo(a, b) { return (Number(a.no) || 0) - (Number(b.no) || 0); }
  function copyAction(key) { return [{ label: "복사", run: function (it, btn) { H.copyText(String(it[key] || ""), btn); } }]; }

  /* ---------- import / export (the only way research data enters the site) ---------- */
  function importData(data) {
    var docs = data && data.docs;
    if (!docs || typeof docs !== "object") { return Promise.reject(new Error("IAS 자료 파일이 아니에요 ('docs' 항목이 없어요).")); }
    var names = Object.keys(docs).filter(function (k) { return DOCS.indexOf(k) !== -1 && docs[k] && typeof docs[k] === "object"; });
    if (!names.length) { return Promise.reject(new Error("불러올 IAS 영역이 없어요.")); }
    var now = new Date().toISOString();
    return Promise.all(names.map(function (k) { return D(k).set(Object.assign({}, docs[k], { updatedAt: now })); }))
      .then(function () { return names.length; });
  }
  function exportData() {
    return Promise.all(DOCS.map(function (k) {
      return D(k).get().then(function (s) { return [k, s.exists ? s.data() : null]; });
    })).then(function (pairs) {
      var docs = {};
      pairs.forEach(function (p) { if (p[1]) { docs[p[0]] = p[1]; } });
      return { version: 1, exportedAt: new Date().toISOString(), docs: docs };
    });
  }
  function download(obj, name) {
    var url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
    var a = el("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  App.ias = { importData: importData, exportData: exportData, DOCS: DOCS, STAGES: STAGES };

  function importCard(parent) {
    var c = ui.card(parent, { tab: "Data", tone: "t-3", title: "자료 불러오기 · 백업", wide: true });
    c.body.appendChild(el("p", "hint", "문항 · 분석 결과 같은 미출판 연구 자료는 홈페이지 코드(공개)에 넣지 않고, 로그인해야 보이는 내 데이터베이스에만 저장해요. IAS 폴더의 'IAS_홈페이지자료.json'을 불러오면 모든 IAS 페이지가 채워집니다. 불러오면 같은 영역의 기존 내용은 파일 내용으로 바뀌니, 먼저 '내보내기'로 백업해 두세요."));
    var row = el("div", "ias-import");
    var file = el("input"); file.type = "file"; file.accept = ".json,application/json"; file.setAttribute("aria-label", "IAS 자료 JSON 파일");
    var exp = el("button", "tool-btn", "현재 자료 내보내기 (백업)"); exp.type = "button";
    var status = el("span", "prog-label");
    row.appendChild(file); row.appendChild(exp); row.appendChild(status);
    c.body.appendChild(row);
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) { return; }
      f.text().then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { throw new Error("JSON 형식이 아니에요: " + e.message); }
        var n = data && data.docs ? Object.keys(data.docs).filter(function (k) { return DOCS.indexOf(k) !== -1; }).length : 0;
        if (!window.confirm("'" + f.name + "'의 " + n + "개 영역으로 IAS 자료를 바꿉니다. 계속할까요?")) { return null; }
        return importData(data);
      }).then(function (n) {
        if (n) { status.textContent = "불러오기 완료 · " + n + "개 영역"; }
      }).catch(function (err) { window.alert("불러오기 실패: " + err.message); })
        .then(function () { file.value = ""; });
    });
    exp.addEventListener("click", function () {
      exportData().then(function (obj) {
        download(obj, "IAS_홈페이지자료_백업_" + H.todayStr() + ".json");
        status.textContent = "내보내기 완료 · " + Object.keys(obj.docs).length + "개 영역";
      }).catch(function (err) { window.alert("내보내기 실패: " + err.message); });
    });
  }
  function emptyNotice(parent) {
    var box = el("div"); parent.appendChild(box);
    App.watchDoc(D("meta"), function (d) {
      H.clear(box);
      if (d) { box.className = ""; return; }
      box.className = "ias-notice";
      box.appendChild(document.createTextNode("아직 IAS 자료를 불러오지 않았어요. "));
      var a = el("a", "", "IAS 대시보드 › 자료 불러오기");
      a.href = "#/ias-home";
      a.addEventListener("click", function () {
        setTimeout(function () { var t = document.querySelector(".ias-import"); if (t && t.scrollIntoView) { t.scrollIntoView({ block: "center" }); } }, 150);
      });
      box.appendChild(a);
      box.appendChild(document.createTextNode("에서 IAS 폴더의 JSON 파일을 선택하면 채워져요."));
    });
  }

  /* ---------- small widgets ---------- */
  function stageStepper(parent) {
    var prog = el("div"), row = el("div", "flow-row");
    parent.appendChild(prog); parent.appendChild(row);
    App.watchDoc(D("meta"), function (d) {
      H.clear(prog); H.clear(row);
      var cur = stageOf(d);
      prog.appendChild(ui.progress(stagePct(cur), "현재 단계 · " + STAGES[cur] + " (" + (cur + 1) + "/" + STAGES.length + ")"));
      STAGES.forEach(function (s, i) {
        var chip = el("button", "flow-chip" + (i < cur ? " done" : "") + (i === cur ? " active" : ""), s);
        chip.type = "button"; chip.title = "누르면 이 단계로 바뀝니다";
        chip.addEventListener("click", function () { App.setDoc(D("meta"), { stage: s }); });
        row.appendChild(chip);
        if (i < STAGES.length - 1) { row.appendChild(el("span", "flow-arrow", "→")); }
      });
    });
  }
  function statTiles(parent) {
    var tiles = el("div", "ias-tiles"); parent.appendChild(tiles);
    App.watchDoc(D("keystats"), function (d) {
      H.clear(tiles);
      var items = d && d.items ? d.items : [];
      if (!items.length) { tiles.appendChild(ui.empty("핵심 수치가 아직 없어요.")); return; }
      items.forEach(function (it) {
        var t = el("div", "ias-tile");
        t.appendChild(el("div", "v", it.value || "—"));
        t.appendChild(el("div", "l", it.label || ""));
        if (it.note) { t.appendChild(el("div", "n", it.note)); }
        tiles.appendChild(t);
      });
    });
    var det = el("details", "ias-edit");
    det.appendChild(el("summary", "", "수치 고치기"));
    parent.appendChild(det);
    ui.itemsPanel(det, {
      ref: D("keystats"), views: ["table", "cards"], addLabel: "+ 수치 추가", empty: "표시할 핵심 수치를 추가하세요.",
      fields: [
        { key: "value", label: "값", type: "text", title: true, required: true, col: true, maxLength: 40 },
        { key: "label", label: "지표", type: "text", col: true, maxLength: 60 },
        { key: "note", label: "설명", type: "text", col: true, maxLength: 160 }
      ]
    });
  }
  function pathActions(it) {
    var v = String(it.path || "").trim();
    if (!v) { return null; }
    var box = el("div", "folder-actions");
    if (/^https?:\/\//i.test(v)) {
      var a = el("a", "tool-btn", "열기 ↗"); a.href = v; a.target = "_blank"; a.rel = "noopener noreferrer"; box.appendChild(a);
    } else {
      box.appendChild(el("code", "", v));
      var b = el("button", "tool-btn", "경로 복사"); b.type = "button";
      b.addEventListener("click", function () { H.copyText(v, b); });
      box.appendChild(b);
    }
    return box;
  }
  function openLinkedProject() {
    var list = (App.proj && App.proj.list) || [];
    var p = list.filter(function (x) { return /IAS|간접/i.test(x.title || ""); })[0] || list.filter(function (x) { return x.kind === "척도 타당화"; })[0];
    if (!p) { window.alert("연결할 논문 프로젝트를 찾지 못했어요. 박사 홈의 논문 프로젝트 이름에 'IAS'를 넣어 주세요."); return; }
    H.safeSet("hds_proj", p.id); App.go("proj-overview");
  }

  /* =========================================================
     박사 홈 요약 카드
     ========================================================= */
  App.iasSummaryCard = function (parent) {
    var c = ui.card(parent, { tab: "IAS", tone: "t-2", title: "진행 중 논문 · IAS 척도 타당화", wide: true, link: "ias-home" });
    var top = el("div"), todo = el("div");
    c.body.appendChild(top); c.body.appendChild(todo);
    App.watchDoc(D("meta"), function (d) {
      H.clear(top);
      if (!d) { top.appendChild(el("p", "hint", "IAS 자료를 아직 불러오지 않았어요. IAS 대시보드 › 자료 불러오기에서 채울 수 있어요.")); return; }
      var info = d.info || {}, cur = stageOf(d);
      if (info.title) { top.appendChild(el("div", "mini-title", info.title + (info.journal ? " · " + info.journal : ""))); }
      top.appendChild(ui.progress(stagePct(cur), "현재 단계 · " + STAGES[cur] + " (" + (cur + 1) + "/" + STAGES.length + ")"));
      if (info.blocker) { top.appendChild(el("p", "hint", "결정할 것 · " + info.blocker)); }
    });
    App.watchDoc(D("next"), function (d) {
      H.clear(todo);
      var open = (d && d.items ? d.items : []).filter(function (x) { return !x.done; });
      if (!open.length) { return; }
      todo.appendChild(el("div", "mini-title", "다음 할 일 · 남은 " + open.length + "개"));
      open.slice(0, 3).forEach(function (x) {
        var line = el("div", "mini-sub", "• " + (x.area ? "[" + x.area + "] " : "") + x.text);
        if (x.due) { line.appendChild(document.createTextNode(" ")); line.appendChild(H.ddayEl(x.due)); }
        todo.appendChild(line);
      });
    });
  };

  /* =========================================================
     1. IAS 대시보드
     ========================================================= */
  App.page({
    id: "ias-home", title: "IAS 대시보드",
    desc: "간접적 공격성 척도 가해자판(IAS-A) 한국판 타당화 논문의 현재 단계, 핵심 수치, 다음 할 일, 결정 기록, 파일 위치를 한눈에 봅니다.",
    render: function (view) {
      emptyNotice(view);
      var g = ui.grid(view, true);

      var o = ui.card(g, { tab: "Paper", tone: "t-1", title: "논문 개요 · 진행 단계", wide: true });
      var dd = o.count; dd.className = "dday";
      stageStepper(o.body);
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
      statTiles(k.body);

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
        itemExtra: pathActions,
        fields: [
          { key: "name", label: "이름", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "kind", label: "구분", type: "select", options: ["원고", "번안", "데이터", "분석 결과", "랩미팅", "참고문헌", "폴더"], meta: true, col: true },
          { key: "path", label: "경로 · 링크", type: "text", required: true, wide: true, col: true, hideInCard: true, maxLength: 400 },
          { key: "note", label: "메모", type: "text", col: true, maxLength: 200 }
        ]
      });

      importCard(g);
    }
  });

  /* =========================================================
     2. 문항 · 번안
     ========================================================= */
  App.page({
    id: "ias-items", title: "IAS 문항 · 번안",
    desc: "25문항의 원문 · 번역 과정(1~3차) · 최종 문항과 문항별 분석 지표(요인부하량, Rasch 적합도)를 한 표에서 봅니다.",
    render: function (view) {
      emptyNotice(view);
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
     3. 분석 결과
     ========================================================= */
  var CRITERIA = [
    { label: "bifactor 단일차원 판단", text: "ECV ≥ .70 (특히 PUC가 낮을수록) · ωH ≥ .80이면 총점을 단일 구인으로 해석 (Rodriguez, Reise, & Haviland, 2016)" },
    { label: "특수요인 음수 · 소멸 적재", text: "일반요인 모형에서 특수요인 적재가 음수이거나 불규칙하면 실질적 단일차원의 과적합 신호 (Eid, Geiser, Koch, & Heene, 2017)" },
    { label: "Rasch 문항 적합도", text: "Infit · Outfit MNSQ .60 초과 1.40 미만 (이윤수 · 조대연, 2019) / 더 엄격히 .75~1.30 (홍세희 · 조용래, 2006)" },
    { label: "Rasch 일차원성 (PCAR)", text: "측정치 설명분산 ≥ 40%가 양호 · 첫 번째 잔차 대비 고유값 < 2.0 (Linacre)" },
    { label: "Rasch 분리지수 · 신뢰도", text: "분리지수 ≥ 2.0 (Bond & Fox, 2007) · 분리신뢰도 ≥ .80 우수" },
    { label: "응답범주 기능", text: "범주별 관측 ≥ 10회 · 평균 측정치와 단계조정값이 단조 증가 · 범주 Outfit < 2.0 (Linacre, 2002)" },
    { label: "CFA 적합도", text: "CFI · TLI ≥ .95 · RMSEA ≤ .06 · SRMR ≤ .08 (Hu & Bentler, 1999). 모형 비교는 같은 추정법(WLSMV)으로, 차이검정은 DIFFTEST" }
  ];
  App.page({
    id: "ias-results", title: "IAS 분석 결과",
    desc: "표본 특성, 요인구조(EFA · CFA · bifactor), 신뢰도, Rasch 분석, 수렴타당도 상관을 정리하고 결과 문장 초안을 복사해 쓸 수 있어요.",
    render: function (view) {
      emptyNotice(view);
      var g = ui.grid(view, true);

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

      var ra = ui.card(g, { tab: "Rasch", tone: "t-1", title: "Rasch 평정척도모형", wide: true });
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
    id: "ias-manuscript", title: "IAS 원고 · 문헌",
    desc: "원고 섹션별 진행, 논의 · 한계 포인트, 핵심 선행연구, 예상 심사 질문과 대응, 투고 준비를 관리합니다.",
    render: function (view) {
      emptyNotice(view);
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
