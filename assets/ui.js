/* Hello dear Sunny — UI kit: cards, generic item lists/tables, field forms, checklists, logs */
(function (App) {
  "use strict";
  var H = App.h;
  var el = H.el, clear = H.clear;
  var ui = App.ui;

  /* ---------- basic building blocks ---------- */
  ui.grid = function (parent, cols2) {
    var g = el("div", "desk-grid" + (cols2 ? " cols-2" : ""));
    parent.appendChild(g);
    return g;
  };
  ui.card = function (parent, o) {
    var c = el("article", "card" + (o.wide ? " wide-card" : ""));
    if (o.tab) { c.appendChild(el("span", "tab-label " + (o.tone || "t-3"), o.tab)); }
    var head = el("div", "card-head");
    head.appendChild(el("h2", "", o.title));
    var right = el("span", "count");
    if (o.link) {
      var a = el("a", "more-link", "더 보기 →"); a.href = "#/" + o.link;
      head.appendChild(a);
    } else { head.appendChild(right); }
    c.appendChild(head);
    if (o.desc) { c.appendChild(el("p", "card-desc", o.desc)); }
    var body = el("div", "card-body");
    c.appendChild(body);
    parent.appendChild(c);
    return { el: c, head: head, body: body, count: right };
  };
  ui.progress = function (pct, label) {
    var row = el("div", "prog-row");
    var bar = el("div", "prog"); var fill = el("span"); fill.style.width = Math.max(0, Math.min(100, pct)) + "%"; bar.appendChild(fill);
    row.appendChild(bar);
    row.appendChild(el("span", "prog-label", label || (Math.round(pct) + "%")));
    return row;
  };
  ui.empty = function (text) { return el("p", "empty-state", text); };

  /* ---------- form inputs shared by items panel and fields panel ---------- */
  function makeInput(f, value) {
    var input;
    if (f.type === "textarea") {
      input = el("textarea"); input.rows = f.rows || 3; input.value = value == null ? "" : value;
    } else if (f.type === "select") {
      input = el("select");
      (f.options || []).forEach(function (o) { var op = el("option", "", o); op.value = o; input.appendChild(op); });
      input.value = (value !== undefined && value !== null && value !== "") ? value : (f.options || [""])[0];
    } else if (f.type === "check") {
      input = el("input"); input.type = "checkbox"; input.checked = !!value;
    } else {
      input = el("input");
      input.type = f.type === "number" ? "number" : (f.type === "date" ? "date" : (f.type === "url" ? "url" : "text"));
      if (f.type === "number") { input.min = f.min != null ? f.min : 0; input.step = f.step || "any"; }
      input.value = value == null ? "" : (Array.isArray(value) ? value.join(", ") : value);
    }
    if (f.placeholder) { input.placeholder = f.placeholder; }
    if (f.maxLength) { input.maxLength = f.maxLength; }
    input.name = f.key;
    if (f.required && f.type !== "check") { input.required = true; }
    return input;
  }
  function readInput(f, input) {
    if (f.type === "check") { return !!input.checked; }
    var v = input.value;
    if (f.type === "number") { return v === "" ? "" : Number(v); }
    if (f.type === "tags") { return String(v).split(",").map(function (t) { return t.trim(); }).filter(Boolean); }
    if (f.type === "url") { var s = H.safeUrl(v); if (v.trim() && !s) { window.alert("링크는 http(s):// 로 시작하거나 DOI(10.xxxx/...) 형식이어야 해요."); } return s; }
    return String(v).trim();
  }
  function defaultVal(f) {
    if (typeof f.default === "function") { return f.default(); }
    if (f.default !== undefined) { return f.default; }
    if (f.today) { return H.todayStr(); }
    return f.type === "check" ? false : "";
  }
  function fmtVal(f, v) {
    if (v === undefined || v === null || v === "") { return ""; }
    if (f.type === "check") { return v ? "✓" : ""; }
    if (Array.isArray(v)) { return v.join(", "); }
    return String(v);
  }
  function tone(options, cur, custom) {
    if (custom && custom[cur] !== undefined) { return custom[cur]; }
    var i = options.indexOf(cur), n = options.length;
    if (i <= 0 || n < 2) { return 0; }
    if (i === n - 1) { return 3; }
    if (i === n - 2 && n >= 4) { return 2; }
    return 1;
  }
  ui.tone = tone;

  /* ---------- generic items panel ---------- */
  ui.itemsPanel = function (parent, cfg) {
    var fields = cfg.fields;
    var itemsKey = cfg.itemsKey || "items";
    var titleField = fields.filter(function (f) { return f.title; })[0] || fields[0];
    var statusField = cfg.statusKey ? fields.filter(function (f) { return f.key === cfg.statusKey; })[0] : null;
    var views = cfg.views ? (Array.isArray(cfg.views) ? cfg.views : [cfg.views]) : ["cards"];
    var state = { items: [], exists: false, view: views[0], q: "", formOpen: false, editId: null, filters: {} };
    var filterKeys = cfg.filters || [];

    var root = el("div", "items-panel");
    var toolsEl = el("div", "items-tools");
    var filtersEl = el("div");
    var hintEl = cfg.hint ? el("p", "hint", cfg.hint) : null;
    var quickEl = el("div");
    var formHost = el("div");
    var summaryEl = el("div", "items-summary");
    var progEl = el("div");
    var listEl = el("div");
    root.appendChild(toolsEl);
    root.appendChild(filtersEl);
    if (hintEl) { root.appendChild(hintEl); }
    root.appendChild(quickEl); root.appendChild(formHost); root.appendChild(summaryEl); root.appendChild(progEl); root.appendChild(listEl);
    parent.appendChild(root);

    function withIds(arr) { return arr.map(function (x, i) { return Object.assign({ id: "d" + i }, x); }); }
    function persist(items) {
      state.items = items; state.exists = true;
      renderFilters(); renderSummary(); renderList();
      if (cfg.onItems) { cfg.onItems(state.items); }
      var payload = {}; payload[itemsKey] = items; payload.updatedAt = new Date().toISOString();
      return cfg.ref.set(payload, { merge: true }).catch(function (err) { window.alert("저장 실패: " + err.message); });
    }
    function isDone(it) { return cfg.checkKey ? !!it[cfg.checkKey] : (cfg.rowDone ? cfg.rowDone(it) : false); }
    function titleText(it) { return cfg.itemTitle ? cfg.itemTitle(it) : (it[titleField.key] || "(제목 없음)"); }
    function valueFor(it, key) {
      var f = fields.filter(function (x) { return x.key === key; })[0];
      var v = it[key];
      if ((v === undefined || v === "") && f && f.type === "select") { return f.options[0]; }
      return v === undefined ? "" : v;
    }
    function visibleItems() {
      var arr = state.items.slice();
      filterKeys.forEach(function (k) {
        var want = state.filters[k];
        if (want) { arr = arr.filter(function (it) { return valueFor(it, k) === want; }); }
      });
      if (state.q) {
        var q = state.q.toLowerCase();
        arr = arr.filter(function (it) {
          return Object.keys(it).map(function (k) { var v = it[k]; return typeof v === "string" ? v : (Array.isArray(v) ? v.join(" ") : ""); }).join(" ").toLowerCase().indexOf(q) !== -1;
        });
      }
      if (cfg.sort) { arr.sort(cfg.sort); }
      return arr;
    }
    function renderFilters() {
      clear(filtersEl);
      filterKeys.forEach(function (k) {
        var f = fields.filter(function (x) { return x.key === k; })[0];
        var values = f && f.type === "select" ? f.options.slice() : [];
        state.items.forEach(function (it) { var v = valueFor(it, k); if (v && values.indexOf(v) === -1) { values.push(v); } });
        if (values.length < 2) { return; }
        var row = el("div", "archive-filters");
        ["전체"].concat(values).forEach(function (v) {
          var on = (v === "전체" && !state.filters[k]) || state.filters[k] === v;
          var b = el("button", "chip" + (on ? " active" : ""), v); b.type = "button";
          b.addEventListener("click", function () { state.filters[k] = v === "전체" ? "" : v; renderFilters(); renderList(); });
          row.appendChild(b);
        });
        filtersEl.appendChild(row);
      });
    }

    /* tools */
    function renderTools() {
      clear(toolsEl);
      if (!cfg.quickFields) {
        var add = el("button", "tool-btn" + (state.formOpen && !state.editId ? " on" : ""), cfg.addLabel || "+ 추가"); add.type = "button";
        add.addEventListener("click", function () {
          if (state.formOpen && !state.editId) { state.formOpen = false; } else { state.formOpen = true; state.editId = null; }
          renderTools(); renderForm();
        });
        toolsEl.appendChild(add);
      }
      if (cfg.search) {
        var s = el("input"); s.type = "search"; s.placeholder = "검색"; s.value = state.q; s.setAttribute("aria-label", "검색");
        s.addEventListener("input", function () { state.q = s.value; renderList(); });
        toolsEl.appendChild(s);
      }
      if (views.length > 1) {
        views.forEach(function (v) {
          var b = el("button", "tool-btn" + (state.view === v ? " on" : ""), v === "table" ? "표" : "카드"); b.type = "button";
          b.addEventListener("click", function () { state.view = v; renderTools(); renderList(); });
          toolsEl.appendChild(b);
        });
      }
      (cfg.templates || []).forEach(function (t) {
        var b = el("button", "tool-btn", t.label); b.type = "button";
        b.addEventListener("click", function () {
          if (t.mode === "append") { persist(state.items.concat(withIds(t.items).map(function (x, i) { return Object.assign({}, x, { id: H.uid() + i }); }))); return; }
          if (state.items.length && !window.confirm("현재 목록을 이 템플릿으로 바꿀까요?")) { return; }
          persist(withIds(t.items));
        });
        toolsEl.appendChild(b);
      });
      if (cfg.defaults) {
        var r = el("button", "tool-btn", "기본 템플릿으로 되돌리기"); r.type = "button";
        r.addEventListener("click", function () { if (window.confirm("현재 목록을 기본 템플릿으로 되돌릴까요?")) { persist(withIds(cfg.defaults)); } });
        toolsEl.appendChild(r);
      }
      toolsEl.hidden = !toolsEl.firstChild;
    }

    /* quick add */
    function renderQuick() {
      clear(quickEl);
      if (!cfg.quickFields) { return; }
      var form = el("form", "quick-add");
      var inputs = {};
      cfg.quickFields.forEach(function (k) {
        var f = fields.filter(function (x) { return x.key === k; })[0];
        var inp = makeInput(f, defaultVal(f));
        if (!inp.placeholder) { inp.placeholder = f.label; }
        inp.title = f.label; inp.setAttribute("aria-label", f.label);
        if (f.type === "date") { inp.classList.add("w-date"); }
        inputs[k] = { f: f, input: inp };
        form.appendChild(inp);
      });
      var btn = el("button", "btn", "추가"); btn.type = "submit"; form.appendChild(btn);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var item = { id: H.uid() };
        fields.forEach(function (f) { item[f.key] = defaultVal(f); });
        cfg.quickFields.forEach(function (k) { item[k] = readInput(inputs[k].f, inputs[k].input); });
        if (!String(item[titleField.key] || "").trim()) { return; }
        persist(state.items.concat([item]));
        cfg.quickFields.forEach(function (k) { if (inputs[k].f.type !== "date") { inputs[k].input.value = ""; } else { inputs[k].input.value = ""; } });
      });
      quickEl.appendChild(form);
    }

    /* full form (add / edit) */
    function renderForm() {
      clear(formHost);
      if (!state.formOpen) { return; }
      var item = state.editId ? state.items.filter(function (x) { return x.id === state.editId; })[0] : null;
      var form = el("form", "item-form");
      var inputs = {};
      fields.forEach(function (f) {
        var wide = f.wide || f.type === "textarea";
        var lab = el("label", "f" + (wide ? " wide" : "") + (f.type === "check" ? " check" : ""));
        var input = makeInput(f, item ? item[f.key] : defaultVal(f));
        if (f.type === "check") { lab.appendChild(input); lab.appendChild(el("span", "f-label", f.label)); }
        else { lab.appendChild(el("span", "f-label", f.label + (f.required ? " *" : ""))); lab.appendChild(input); }
        inputs[f.key] = input;
        form.appendChild(lab);
      });
      var actions = el("div", "actions");
      var save = el("button", "btn", item ? "수정 저장" : "저장"); save.type = "submit";
      var cancel = el("button", "btn ghost", "취소"); cancel.type = "button";
      cancel.addEventListener("click", function () { state.formOpen = false; state.editId = null; renderTools(); renderForm(); });
      actions.appendChild(save); actions.appendChild(cancel);
      form.appendChild(actions);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var vals = {};
        fields.forEach(function (f) { vals[f.key] = readInput(f, inputs[f.key]); });
        if (!String(vals[titleField.key] || "").trim()) { return; }
        var next;
        if (item) { next = state.items.map(function (x) { return x.id === item.id ? Object.assign({}, x, vals) : x; }); }
        else {
          var created = Object.assign({ id: H.uid() }, vals);
          if (cfg.timestamp) { created.createdAt = new Date().toISOString(); }
          next = state.items.concat([created]);
        }
        state.formOpen = false; state.editId = null;
        renderTools(); renderForm();
        persist(next);
      });
      formHost.appendChild(form);
      var first = form.querySelector("input:not([type=checkbox]), textarea, select");
      if (first && !item && !window.__noAutofocus) { first.focus(); }
    }

    /* list rendering */
    function statusChip(it) {
      var opts = statusField.options;
      var cur = it[statusField.key] || opts[0];
      var b = el("button", "status-chip", cur); b.type = "button";
      b.setAttribute("data-tone", String(tone(opts, cur, cfg.statusTones)));
      b.title = "누르면 다음 상태로 바뀝니다";
      b.addEventListener("click", function () {
        var next = opts[(opts.indexOf(cur) + 1) % opts.length];
        persist(state.items.map(function (x) { if (x.id !== it.id) { return x; } var y = Object.assign({}, x); y[statusField.key] = next; return y; }));
      });
      return b;
    }
    function btns(it) {
      var box = el("div", "item-btns");
      (cfg.actions || []).forEach(function (a) {
        var b = el("button", "copy-btn", a.label); b.type = "button";
        b.addEventListener("click", function () { a.run(it, b); });
        box.appendChild(b);
      });
      var ed = el("button", "icon-btn", "✎"); ed.type = "button"; ed.title = "수정";
      ed.addEventListener("click", function () { state.formOpen = true; state.editId = it.id; renderTools(); renderForm(); formHost.scrollIntoView && formHost.scrollIntoView({ block: "nearest" }); });
      var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제";
      del.addEventListener("click", function () {
        if (!window.confirm("'" + String(titleText(it)).slice(0, 40) + "' 항목을 삭제할까요?")) { return; }
        persist(state.items.filter(function (x) { return x.id !== it.id; }));
      });
      box.appendChild(ed); box.appendChild(del);
      return box;
    }
    function titleNode(it) {
      var t = el("div", "item-title");
      var url = cfg.titleLink ? H.safeUrl(it[cfg.titleLink]) : "";
      if (url) { var a = el("a", "", titleText(it)); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; t.appendChild(a); }
      else { t.textContent = titleText(it); }
      return t;
    }
    function cardFor(it) {
      var card = el("div", "item-card" + (isDone(it) ? " done" : ""));
      var head = el("div", "item-head");
      if (cfg.checkKey) {
        var cb = el("input"); cb.type = "checkbox"; cb.checked = !!it[cfg.checkKey];
        cb.setAttribute("aria-label", "완료");
        cb.addEventListener("change", function () {
          persist(state.items.map(function (x) { if (x.id !== it.id) { return x; } var y = Object.assign({}, x); y[cfg.checkKey] = cb.checked; return y; }));
        });
        head.appendChild(cb);
      }
      head.appendChild(titleNode(it));
      if (statusField) { head.appendChild(statusChip(it)); }
      if (cfg.dueKey && it[cfg.dueKey] && !isDone(it)) { head.appendChild(H.ddayEl(it[cfg.dueKey])); }
      head.appendChild(btns(it));
      card.appendChild(head);
      var metas = fields.filter(function (f) { return f.meta && it[f.key] !== undefined && it[f.key] !== "" && !(Array.isArray(it[f.key]) && !it[f.key].length); });
      var extraMeta = cfg.itemMeta ? cfg.itemMeta(it) : [];
      if (metas.length || extraMeta.length) {
        var m = el("div", "item-meta");
        metas.forEach(function (f) { m.appendChild(el("span", "", fmtVal(f, it[f.key]))); });
        extraMeta.forEach(function (t) { m.appendChild(el("span", "", t)); });
        card.appendChild(m);
      }
      var rows = fields.filter(function (f) {
        if (f === titleField || f === statusField || f.meta || f.hideInCard) { return false; }
        if (f.key === cfg.checkKey || f.key === cfg.dueKey) { return false; }
        return it[f.key] !== undefined && it[f.key] !== "" && it[f.key] !== false;
      });
      if (rows.length) {
        var box = el("div", "item-rows");
        rows.forEach(function (f) {
          var r = el("div", "item-row");
          r.appendChild(el("span", "item-label", f.label));
          var txt = el("span", "item-text");
          var url = f.type === "url" ? H.safeUrl(it[f.key]) : "";
          if (url) { var a = el("a", "", it[f.key]); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; txt.appendChild(a); }
          else { txt.textContent = fmtVal(f, it[f.key]); }
          r.appendChild(txt);
          box.appendChild(r);
        });
        card.appendChild(box);
      }
      if (cfg.itemExtra) { var ex = cfg.itemExtra(it); if (ex) { var w = el("div", "item-extra"); w.appendChild(ex); card.appendChild(w); } }
      return card;
    }
    function tableFor(items) {
      var cols = fields.filter(function (f) { return f.col || f === titleField; });
      if (!cols.length) { cols = [titleField]; }
      var wrap = el("div", "table-wrap");
      var table = el("table", "items-table");
      var thead = el("thead"); var trh = el("tr");
      cols.forEach(function (f) { trh.appendChild(el("th", "", f.label)); });
      if (statusField && cols.indexOf(statusField) === -1) { trh.appendChild(el("th", "", statusField.label)); }
      trh.appendChild(el("th", "", ""));
      thead.appendChild(trh); table.appendChild(thead);
      var tbody = el("tbody");
      items.forEach(function (it) {
        var tr = el("tr", isDone(it) ? "done" : "");
        cols.forEach(function (f) {
          var td = el("td", (f.type === "check" || f.type === "date" || f.type === "number" || f === statusField) ? "narrow" : "");
          if (f === titleField) { td.className = ""; td.appendChild(titleNode(it)); td.firstChild.style.fontWeight = "600"; }
          else if (f.type === "check") {
            var cb = el("input", "cell-check"); cb.type = "checkbox"; cb.checked = !!it[f.key]; cb.setAttribute("aria-label", f.label);
            cb.addEventListener("change", function () {
              persist(state.items.map(function (x) { if (x.id !== it.id) { return x; } var y = Object.assign({}, x); y[f.key] = cb.checked; return y; }));
            });
            td.appendChild(cb);
          } else if (f === statusField) { td.appendChild(statusChip(it)); }
          else if (f.type === "url") {
            var u = H.safeUrl(it[f.key]);
            if (u) { var a = el("a", "", "링크"); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; td.appendChild(a); }
          } else { td.textContent = fmtVal(f, it[f.key]); }
          tr.appendChild(td);
        });
        if (statusField && cols.indexOf(statusField) === -1) { var tds = el("td", "narrow"); tds.appendChild(statusChip(it)); tr.appendChild(tds); }
        var tdb = el("td", "narrow"); tdb.appendChild(btns(it)); tr.appendChild(tdb);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); wrap.appendChild(table);
      return wrap;
    }
    function renderList() {
      clear(listEl);
      var items = visibleItems();
      if (!items.length) {
        listEl.appendChild(ui.empty(state.q ? "검색 결과가 없습니다." : (cfg.empty || "아직 항목이 없습니다.")));
        return;
      }
      if (state.view === "table") { listEl.appendChild(tableFor(items)); return; }
      if (cfg.groupBy) {
        var g = cfg.groupBy;
        var wrapAll = el("div", "items-list");
        g.order.forEach(function (name) {
          var part = items.filter(function (it) { return (it[g.key] || g.order[0]) === name; });
          if (!part.length) { return; }
          var collapse = (g.collapse || []).indexOf(name) !== -1;
          var wrap = el(collapse ? "details" : "div", "group");
          wrap.appendChild(el(collapse ? "summary" : "div", "group-title", name + " · " + part.length));
          var inner = el("div", "items-list");
          part.forEach(function (it) { inner.appendChild(cardFor(it)); });
          wrap.appendChild(inner);
          wrapAll.appendChild(wrap);
        });
        listEl.appendChild(wrapAll);
        return;
      }
      var box = el("div", "items-list" + (cfg.grid ? " grid" : ""));
      items.forEach(function (it) { box.appendChild(cardFor(it)); });
      listEl.appendChild(box);
    }
    function renderSummary() {
      clear(summaryEl); clear(progEl);
      summaryEl.hidden = true;
      if (cfg.summary) {
        var s = cfg.summary(state.items);
        if (s) { summaryEl.hidden = false; if (typeof s === "string") { summaryEl.textContent = s; } else { summaryEl.appendChild(s); } }
      }
      if (cfg.checkKey && state.items.length) {
        var done = state.items.filter(function (x) { return x[cfg.checkKey]; }).length;
        var pct = Math.round(done / state.items.length * 100);
        progEl.appendChild(ui.progress(pct, done + "/" + state.items.length + " 완료 · " + pct + "%"));
      }
    }
    function renderAll() {
      renderTools(); renderForm(); renderFilters(); renderSummary(); renderList();
      if (cfg.onItems) { cfg.onItems(state.items); }
    }
    renderQuick();
    renderAll();

    App.watchDoc(cfg.ref, function (data) {
      if (data && Array.isArray(data[itemsKey])) { state.items = data[itemsKey]; state.exists = true; }
      else if (cfg.defaults) { state.items = withIds(cfg.defaults); state.exists = false; }
      else { state.items = []; state.exists = false; }
      renderFilters(); renderSummary(); renderList();
      if (cfg.onItems) { cfg.onItems(state.items); }
    });
    return { items: function () { return state.items; }, root: root };
  };

  /* ---------- fields panel (single document of labeled text areas) ---------- */
  ui.fieldsPanel = function (parent, cfg) {
    var form = el("div", "fields-form");
    var status = el("div", "fields-status");
    var inputs = {};
    cfg.fields.forEach(function (f) {
      var lab = el("label", "f" + ((f.wide || f.type === "textarea") ? " wide" : ""));
      lab.appendChild(el("span", "f-label", f.label));
      var input = makeInput(f, "");
      input.addEventListener("change", save);
      lab.appendChild(input);
      form.appendChild(lab);
      inputs[f.key] = input;
    });
    parent.appendChild(form); parent.appendChild(status);
    function values() { var v = {}; cfg.fields.forEach(function (f) { v[f.key] = readInput(f, inputs[f.key]); }); return v; }
    function save() {
      var vals = values();
      var payload = {};
      if (cfg.docKey) { payload[cfg.docKey] = vals; } else { Object.keys(vals).forEach(function (k) { payload[k] = vals[k]; }); }
      payload.updatedAt = new Date().toISOString();
      cfg.ref.set(payload, { merge: true }).then(function () {
        var d = new Date(); status.textContent = "저장됨 · " + H.pad2(d.getHours()) + ":" + H.pad2(d.getMinutes());
      }).catch(function (err) { window.alert("저장 실패: " + err.message); });
      if (cfg.onSave) { cfg.onSave(vals); }
    }
    App.watchDoc(cfg.ref, function (data) {
      var src = data ? (cfg.docKey ? data[cfg.docKey] : data) : null;
      src = src || {};
      cfg.fields.forEach(function (f) {
        var input = inputs[f.key];
        if (document.activeElement === input) { return; }
        var v = src[f.key];
        if (f.type === "check") { input.checked = !!v; }
        else if (f.type === "select") { input.value = (v !== undefined && v !== "") ? v : f.options[0]; }
        else { input.value = v == null ? "" : v; }
      });
      if (cfg.onData) { cfg.onData(src, data); }
    });
    return { inputs: inputs };
  };

  /* ---------- static copyable references ---------- */
  ui.refList = function (parent, items) {
    var ul = el("ul", "ref-list");
    items.forEach(function (it) {
      var li = el("li", "ref-item");
      var main = el("div", "ref-main");
      if (it.label) { main.appendChild(el("div", "ref-label", it.label)); }
      main.appendChild(el("div", "ref-text", it.text));
      li.appendChild(main);
      var b = el("button", "copy-btn", "복사"); b.type = "button";
      b.addEventListener("click", function () { H.copyText(it.text, b); });
      li.appendChild(b);
      ul.appendChild(li);
    });
    parent.appendChild(ul);
    return ul;
  };

  /* ---------- daily writing log (thesis and creative writing share this) ---------- */
  ui.writingLog = function (parent, cfg) {
    var LOG = { goal: cfg.goal || 1000, entries: [] };
    var progHost = el("div");
    var goalRow = el("div", "quick-add");
    var goalEl = el("input", "w-sm"); goalEl.type = "number"; goalEl.min = 0; goalEl.step = 100; goalEl.placeholder = "목표"; goalEl.setAttribute("aria-label", "하루 목표");
    goalRow.appendChild(goalEl); goalRow.appendChild(el("span", "prog-label", (cfg.unit || "자") + " · 하루 목표"));
    var stats = el("div", "stat-row");
    var mSpan = el("span"); mSpan.appendChild(document.createTextNode("이번 달 ")); var mNum = el("strong", "", "0"); mSpan.appendChild(mNum); mSpan.appendChild(document.createTextNode(cfg.unit || "자"));
    var sSpan = el("span"); sSpan.appendChild(document.createTextNode("연속 ")); var sNum = el("strong", "", "0"); sSpan.appendChild(sNum); sSpan.appendChild(document.createTextNode("일"));
    stats.appendChild(mSpan); stats.appendChild(sSpan);
    var bars = el("div", "bars");
    var form = el("form", "quick-add");
    var dateEl = el("input", "w-date"); dateEl.type = "date"; dateEl.required = true; dateEl.value = H.todayStr();
    var countEl = el("input", "w-sm"); countEl.type = "number"; countEl.min = 0; countEl.required = true; countEl.placeholder = cfg.unit || "글자수";
    var noteEl = el("input"); noteEl.placeholder = "메모 (선택)"; noteEl.maxLength = 80;
    var addBtn = el("button", "btn", "기록"); addBtn.type = "submit";
    [dateEl, countEl, noteEl, addBtn].forEach(function (n) { form.appendChild(n); });
    var list = el("div", "plain-list");
    [progHost, goalRow, stats, bars, form, list].forEach(function (n) { parent.appendChild(n); });
    var todayCountEl = cfg.todayEl || null;

    function save(next) {
      LOG = next; render();
      return cfg.ref.set({ goal: next.goal || 0, entries: next.entries, updatedAt: new Date().toISOString() }, { merge: true })
        .catch(function (err) { window.alert("저장 실패: " + err.message); });
    }
    function sums() { var s = {}; (LOG.entries || []).forEach(function (en) { s[en.date] = (s[en.date] || 0) + (Number(en.count) || 0); }); return s; }
    var fmtN = function (n) { return Number(n).toLocaleString("ko-KR"); };
    function render() {
      if (document.activeElement !== goalEl) { goalEl.value = LOG.goal || ""; }
      var s = sums(), today = H.todayStr(), goal = Number(LOG.goal) || 0, tc = s[today] || 0;
      clear(progHost);
      var pct = goal ? Math.min(100, Math.round(tc / goal * 100)) : 0;
      progHost.appendChild(ui.progress(pct, goal ? "오늘 " + fmtN(tc) + " / " + fmtN(goal) + (cfg.unit || "자") + " (" + pct + "%)" : "목표를 입력하세요"));
      if (todayCountEl) { todayCountEl.textContent = "오늘 " + fmtN(tc) + (cfg.unit || "자"); }
      var month = 0; Object.keys(s).forEach(function (k) { if (k.indexOf(today.slice(0, 7)) === 0) { month += s[k]; } });
      mNum.textContent = fmtN(month);
      var streak = 0, cur = new Date();
      if (!s[H.dateKey(cur)]) { cur = H.addDays(cur, -1); }
      while (s[H.dateKey(cur)]) { streak++; cur = H.addDays(cur, -1); }
      sNum.textContent = streak;
      var days = []; for (var i = 6; i >= 0; i--) { days.push(H.addDays(new Date(), -i)); }
      var max = Math.max(goal, 1); days.forEach(function (d) { max = Math.max(max, s[H.dateKey(d)] || 0); });
      clear(bars);
      days.forEach(function (d) {
        var k = H.dateKey(d), v = s[k] || 0;
        var col = el("div", "bar-col"), wrap = el("div", "bar-wrap"), bar = el("div", "bar" + (k === today ? " today" : ""));
        bar.style.height = Math.round(v / max * 100) + "%"; bar.title = k + " · " + fmtN(v) + (cfg.unit || "자");
        wrap.appendChild(bar); col.appendChild(wrap); col.appendChild(el("div", "bar-label", H.DOW[d.getDay()])); bars.appendChild(col);
      });
      clear(list);
      var entries = (LOG.entries || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)); }).slice(0, 15);
      if (!entries.length) { list.appendChild(ui.empty("아직 기록이 없습니다. 오늘 쓴 분량을 남겨보세요.")); return; }
      entries.forEach(function (en) {
        var li = el("div", "log-item");
        li.appendChild(el("span", "log-date", en.date.slice(5).replace("-", "/")));
        li.appendChild(el("span", "log-count", fmtN(Number(en.count) || 0) + (cfg.unit || "자")));
        li.appendChild(el("span", "log-note", en.note || ""));
        var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제";
        del.addEventListener("click", function () { save(Object.assign({}, LOG, { entries: LOG.entries.filter(function (x) { return x.id !== en.id; }) })); });
        li.appendChild(del); list.appendChild(li);
      });
    }
    goalEl.addEventListener("change", function () { save(Object.assign({}, LOG, { goal: Math.max(0, Number(goalEl.value) || 0) })); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!dateEl.value || countEl.value === "") { return; }
      var entry = { id: H.uid(), date: dateEl.value, count: Number(countEl.value), note: noteEl.value.trim() };
      save(Object.assign({}, LOG, { entries: (LOG.entries || []).concat([entry]) }));
      countEl.value = ""; noteEl.value = "";
    });
    render();
    App.watchDoc(cfg.ref, function (d) {
      d = d || {};
      LOG = { goal: typeof d.goal === "number" ? d.goal : (cfg.goal || 1000), entries: d.entries || [] };
      render();
      if (cfg.onData) { cfg.onData(LOG, sums()); }
    });
  };

  /* ---------- upcoming schedule filtered by category ---------- */
  ui.upcoming = function (parent, cat, limit) {
    var ul = el("div", "plain-list");
    parent.appendChild(ul);
    App.watchQuery(App.col("schedule").orderBy("date", "asc"), function (items) {
      clear(ul);
      var t = H.todayStr();
      var list = items.filter(function (s) { return (cat === "*" || (s.cat || "개인") === cat) && s.date >= t; }).slice(0, limit || 5);
      if (!list.length) { ul.appendChild(ui.empty(cat === "*" ? "예정된 일정이 없습니다." : "예정된 일정이 없습니다. 개인 › 일정 · 캘린더에서 '" + cat + "' 분류로 추가하면 여기에도 보여요.")); return; }
      list.forEach(function (s) {
        var li = el("div", "upcoming-item");
        li.appendChild(H.ddayEl(s.date));
        li.appendChild(el("span", "u-title", s.title));
        if (cat === "*") { var c = el("span", "cat-chip", s.cat || "개인"); c.setAttribute("data-cat", s.cat || "개인"); li.appendChild(c); }
        li.appendChild(el("span", "u-date", s.date.slice(5).replace("-", "/")));
        ul.appendChild(li);
      });
    });
  };
})(window.App);
