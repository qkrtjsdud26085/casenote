/* Hello dear Sunny — 연구 페이지 공통 도구 (IAS · 박사학위논문)
   연구 내용은 코드에 넣지 않고 Firestore(research/<prefix>_*)에만 저장합니다.
   이 저장소와 GitHub Pages 파일은 누구나 볼 수 있어서, 미출판 연구 자료가 공개되지 않도록 하기 위해서예요.
   처음 한 번은 각 개요 페이지의 '자료 불러오기'로 연구 폴더의 JSON 파일을 넣습니다. */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  function download(obj, name) {
    var url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
    var a = el("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* cfg: { prefix, docs, stages, name, fileName, homeId } */
  App.rkit = function (cfg) {
    var K = {};
    var D = K.D = function (name) { return App.doc("research/" + cfg.prefix + "_" + name); };
    var STAGES = cfg.stages;
    K.stageOf = function (d) { var i = STAGES.indexOf(d && d.stage); return i < 0 ? 0 : i; };
    K.stagePct = function (i) { return Math.round(i / (STAGES.length - 1) * 100); };

    /* ---------- import / export (the only way research data enters the site) ---------- */
    K.importData = function (data) {
      var docs = data && data.docs;
      if (!docs || typeof docs !== "object") { return Promise.reject(new Error(cfg.name + " 자료 파일이 아니에요 ('docs' 항목이 없어요).")); }
      var names = Object.keys(docs).filter(function (k) { return cfg.docs.indexOf(k) !== -1 && docs[k] && typeof docs[k] === "object"; });
      if (!names.length) { return Promise.reject(new Error("불러올 " + cfg.name + " 영역이 없어요.")); }
      var now = new Date().toISOString();
      return Promise.all(names.map(function (k) { return D(k).set(Object.assign({}, docs[k], { updatedAt: now })); }))
        .then(function () { return names.length; });
    };
    K.exportData = function () {
      return Promise.all(cfg.docs.map(function (k) {
        return D(k).get().then(function (s) { return [k, s.exists ? s.data() : null]; });
      })).then(function (pairs) {
        var docs = {};
        pairs.forEach(function (p) { if (p[1]) { docs[p[0]] = p[1]; } });
        return { version: 1, exportedAt: new Date().toISOString(), docs: docs };
      });
    };
    K.importCard = function (parent, hint) {
      var c = ui.card(parent, { tab: "Data", tone: "t-3", title: "자료 불러오기 · 백업", wide: true });
      c.body.appendChild(el("p", "hint", hint + " 불러오면 같은 영역의 기존 내용은 파일 내용으로 바뀌니, 먼저 '내보내기'로 백업해 두세요."));
      var row = el("div", "ias-import");
      var file = el("input"); file.type = "file"; file.accept = ".json,application/json"; file.setAttribute("aria-label", cfg.name + " 자료 JSON 파일");
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
          var n = data && data.docs ? Object.keys(data.docs).filter(function (k) { return cfg.docs.indexOf(k) !== -1; }).length : 0;
          if (!window.confirm("'" + f.name + "'의 " + n + "개 영역으로 " + cfg.name + " 자료를 바꿉니다. 계속할까요?")) { return null; }
          return K.importData(data);
        }).then(function (n) {
          if (n) { status.textContent = "불러오기 완료 · " + n + "개 영역"; }
        }).catch(function (err) { window.alert("불러오기 실패: " + err.message); })
          .then(function () { file.value = ""; });
      });
      exp.addEventListener("click", function () {
        K.exportData().then(function (obj) {
          download(obj, cfg.fileName + "_백업_" + H.todayStr() + ".json");
          status.textContent = "내보내기 완료 · " + Object.keys(obj.docs).length + "개 영역";
        }).catch(function (err) { window.alert("내보내기 실패: " + err.message); });
      });
    };
    K.emptyNotice = function (parent) {
      var box = el("div"); parent.appendChild(box);
      App.watchDoc(D("meta"), function (d) {
        H.clear(box);
        if (d) { box.className = ""; return; }
        box.className = "ias-notice";
        box.appendChild(document.createTextNode("아직 " + cfg.name + " 자료를 불러오지 않았어요. "));
        var a = el("a", "", (App.pages[cfg.homeId] ? App.pages[cfg.homeId].title : "개요") + " › 자료 불러오기");
        a.href = "#/" + cfg.homeId;
        a.addEventListener("click", function () {
          setTimeout(function () { var t = document.querySelector(".ias-import"); if (t && t.scrollIntoView) { t.scrollIntoView({ block: "center" }); } }, 150);
        });
        box.appendChild(a);
        box.appendChild(document.createTextNode("에서 '" + cfg.fileName + ".json' 파일을 선택하면 채워져요."));
      });
    };

    /* ---------- widgets ---------- */
    K.stageStepper = function (parent) {
      var prog = el("div"), row = el("div", "flow-row");
      parent.appendChild(prog); parent.appendChild(row);
      App.watchDoc(D("meta"), function (d) {
        H.clear(prog); H.clear(row);
        var cur = K.stageOf(d);
        prog.appendChild(ui.progress(K.stagePct(cur), "현재 단계 · " + STAGES[cur] + " (" + (cur + 1) + "/" + STAGES.length + ")"));
        STAGES.forEach(function (s, i) {
          var chip = el("button", "flow-chip" + (i < cur ? " done" : "") + (i === cur ? " active" : ""), s);
          chip.type = "button"; chip.title = "누르면 이 단계로 바뀝니다";
          chip.addEventListener("click", function () { App.setDoc(D("meta"), { stage: s }); });
          row.appendChild(chip);
          if (i < STAGES.length - 1) { row.appendChild(el("span", "flow-arrow", "→")); }
        });
      });
    };
    K.statTiles = function (parent, docName) {
      var ref = D(docName || "keystats");
      var tiles = el("div", "ias-tiles"); parent.appendChild(tiles);
      App.watchDoc(ref, function (d) {
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
        ref: ref, views: ["table", "cards"], addLabel: "+ 수치 추가", empty: "표시할 핵심 수치를 추가하세요.",
        fields: [
          { key: "value", label: "값", type: "text", title: true, required: true, col: true, maxLength: 40 },
          { key: "label", label: "지표", type: "text", col: true, maxLength: 60 },
          { key: "note", label: "설명", type: "text", col: true, maxLength: 160 }
        ]
      });
    };
    /* compact card for 박사 › 홈: stage, what to decide, next open tasks */
    K.summaryCard = function (parent, o) {
      var c = ui.card(parent, { tab: o.tab, tone: o.tone || "t-2", title: o.title, wide: true, link: cfg.homeId });
      var top = el("div"), todo = el("div");
      c.body.appendChild(top); c.body.appendChild(todo);
      App.watchDoc(D("meta"), function (d) {
        H.clear(top);
        if (!d) { top.appendChild(el("p", "hint", cfg.name + " 자료를 아직 불러오지 않았어요. " + (App.pages[cfg.homeId] ? App.pages[cfg.homeId].title : "개요") + " › 자료 불러오기에서 채울 수 있어요.")); return; }
        var info = d.info || {}, cur = K.stageOf(d);
        if (info.title) { top.appendChild(el("div", "mini-title", info.title + (info.journal ? " · " + info.journal : ""))); }
        top.appendChild(ui.progress(K.stagePct(cur), "현재 단계 · " + STAGES[cur] + " (" + (cur + 1) + "/" + STAGES.length + ")"));
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
    return K;
  };

  /* ---------- shared helpers ---------- */
  App.rkit.byDate = function (desc, key) {
    key = key || "date";
    return function (a, b) { var x = String(a[key] || ""), y = String(b[key] || ""); return desc ? y.localeCompare(x) : x.localeCompare(y); };
  };
  App.rkit.copyAction = function (key) { return [{ label: "복사", run: function (it, btn) { H.copyText(String(it[key] || ""), btn); } }]; };
  App.rkit.pathActions = function (it) {
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
  };
  /* in-page tabs for sections whose sub-pages are hidden from the dropdown (navHidden) */
  App.rkit.pageTabs = function (view, ids, current) {
    var nav = el("nav", "page-tabs"); nav.setAttribute("aria-label", "하위 페이지");
    ids.forEach(function (id) {
      var p = App.pages[id]; if (!p) { return; }
      var a = el("a", "page-tab" + (id === current ? " active" : ""), p.tabLabel || p.title);
      a.href = "#/" + id;
      if (id === current) { a.setAttribute("aria-current", "page"); }
      nav.appendChild(a);
    });
    view.appendChild(nav);
  };
  App.rkit.FILE_FIELDS = [
    { key: "name", label: "이름", type: "text", title: true, required: true, col: true, maxLength: 80 },
    { key: "kind", label: "구분", type: "select", options: ["원고", "번안", "신청서", "데이터", "분석 결과", "랩미팅", "참고문헌", "폴더", "기타"], meta: true, col: true },
    { key: "path", label: "경로 · 링크", type: "text", required: true, wide: true, col: true, hideInCard: true, maxLength: 400 },
    { key: "note", label: "메모", type: "text", col: true, maxLength: 200 }
  ];
})(window.App);
