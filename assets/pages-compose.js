/* Hello dear Sunny — 작가 › 집필 (한글 프로그램처럼 바로 쓰는 편집기 + 저장한 글 목록) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  /* index doc keeps the list (title · date · category · done); each body lives in its own doc so one long piece can't fill the index */
  var INDEX = "writer/compose";
  function bodyRef(id) { return App.doc("writer/compose_" + id); }
  var DRAFT_KEY = "hds_compose_draft";
  var CATS = ["소설", "에세이", "시", "동화", "시나리오", "기타"];
  var FONTS = [["바탕", "'Noto Serif KR', Batang, serif"], ["고딕", "'Noto Sans KR', 'Malgun Gothic', sans-serif"], ["바탕체", "Batang, BatangChe, serif"], ["궁서", "Gungsuh, GungsuhChe, serif"], ["고정폭", "'JetBrains Mono', monospace"]];
  var SIZES = [9, 10, 11, 12, 14, 16, 18, 20, 24, 28];
  var LINE = ["130", "160", "180", "200"];

  /* pasted or loaded HTML keeps its formatting but never scripts, frames or event handlers */
  function clean(html) {
    var t = document.createElement("template");
    t.innerHTML = String(html || "");
    Array.prototype.forEach.call(t.content.querySelectorAll("script, style, iframe, object, embed, link, meta, form, input, button, textarea, select"), function (n) { n.remove(); });
    Array.prototype.forEach.call(t.content.querySelectorAll("*"), function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        var name = a.name.toLowerCase();
        if (name.indexOf("on") === 0 || ((name === "href" || name === "src") && /^\s*javascript:/i.test(a.value))) { n.removeAttribute(a.name); }
      });
    });
    return t.innerHTML;
  }
  function counts(paper) {
    var text = (paper.innerText || "").replace(/\n/g, "");
    var all = text.length, noSpace = text.replace(/\s/g, "").length;
    return { all: all, noSpace: noSpace, sheets: all ? Math.ceil(all / 200) : 0 };
  }
  function fmtN(n) { return Number(n || 0).toLocaleString("ko-KR"); }
  function readDraft() { try { return JSON.parse(H.safeGet(DRAFT_KEY) || "null"); } catch (e) { return null; } }

  /* word-processor editor (한글 프로그램처럼): toolbar + white paper. Used by 작가 › 집필 and 개인 › 일기.
     o.onChange() on every edit, o.onSave() on Ctrl+S, o.placeholder. Returns { paper, html(), set(html, lh), lh(), counts() } */
  App.cleanHTML = clean;
  App.richEditor = function (parent, o) {
    o = o || {};
    var lh = "160";
    var bar = el("div", "cmp-bar"); bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "글자 모양");
    var paper = el("div", "cmp-paper");
    paper.contentEditable = "true"; paper.spellcheck = false;
    paper.setAttribute("role", "textbox"); paper.setAttribute("aria-multiline", "true"); paper.setAttribute("aria-label", o.label || "본문");
    paper.setAttribute("data-placeholder", o.placeholder || "여기에 바로 쓰세요.");
    function changed() { if (o.onChange) { o.onChange(); } }
    var savedRange = null;
    function keepRange() {
      var s = window.getSelection();
      if (s.rangeCount && paper.contains(s.getRangeAt(0).commonAncestorContainer)) { savedRange = s.getRangeAt(0).cloneRange(); }
    }
    function restoreRange() {
      paper.focus();
      if (savedRange) { var s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
    }
    document.addEventListener("selectionchange", keepRange);
    App.unsubs.push(function () { document.removeEventListener("selectionchange", keepRange); });
    function exec(cmd, val) {
      restoreRange();
      document.execCommand("styleWithCSS", false, true);
      document.execCommand(cmd, false, val === undefined ? null : val);
      keepRange(); changed();
    }
    function sep() { bar.appendChild(el("span", "cmp-sep")); }
    function btn(label, title, cmd, cls) {
      var b = el("button", "cmp-btn" + (cls ? " " + cls : ""), label); b.type = "button"; b.title = title; b.setAttribute("aria-label", title);
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () { if (typeof cmd === "function") { cmd(); } else { exec(cmd); } });
      bar.appendChild(b); return b;
    }
    function pickSel(title, opts, onPick) {
      var s = el("select", "cmp-sel"); s.title = title; s.setAttribute("aria-label", title);
      opts.forEach(function (x) { var op = el("option", "", x[0]); op.value = x[1]; s.appendChild(op); });
      s.addEventListener("change", function () { onPick(s.value); });
      bar.appendChild(s); return s;
    }
    function colorBtn(label, title, cmd, init) {
      var w = el("label", "cmp-btn cmp-color"); w.title = title;
      w.appendChild(el("span", "cmp-color-mark", label));
      var inp = el("input"); inp.type = "color"; inp.value = init; inp.setAttribute("aria-label", title);
      var mark = w.firstChild; mark.style.borderBottomColor = init;
      inp.addEventListener("input", function () { mark.style.borderBottomColor = inp.value; exec(cmd, inp.value); });
      w.appendChild(inp); bar.appendChild(w);
    }
    btn("↶", "실행 취소 (Ctrl+Z)", "undo"); btn("↷", "다시 실행 (Ctrl+Y)", "redo"); sep();
    pickSel("글꼴", FONTS, function (v) { exec("fontName", v); });
    var sizeSel = pickSel("글자 크기", SIZES.map(function (n) { return [n + "pt", String(n)]; }), function (v) {
      restoreRange();
      document.execCommand("styleWithCSS", false, false);
      document.execCommand("fontSize", false, "7");
      Array.prototype.forEach.call(paper.querySelectorAll("font[size='7']"), function (f) {
        var sp = el("span"); sp.style.fontSize = v + "pt";
        while (f.firstChild) { sp.appendChild(f.firstChild); }
        f.parentNode.replaceChild(sp, f);
      });
      keepRange(); changed();
    });
    sizeSel.value = "11"; sep();
    btn("가", "굵게 (Ctrl+B)", "bold", "b-bold"); btn("가", "기울임 (Ctrl+I)", "italic", "b-italic");
    btn("가", "밑줄 (Ctrl+U)", "underline", "b-under"); btn("가", "취소선", "strikeThrough", "b-strike");
    colorBtn("A", "글자색", "foreColor", "#b3261e"); colorBtn("형", "형광펜", "hiliteColor", "#fff176"); sep();
    btn("⇤", "왼쪽 정렬", "justifyLeft"); btn("≡", "가운데 정렬", "justifyCenter"); btn("⇥", "오른쪽 정렬", "justifyRight"); btn("☰", "양쪽 정렬", "justifyFull"); sep();
    var lhSel = pickSel("줄간격", LINE.map(function (n) { return ["줄간격 " + n + "%", n]; }), function (v) { setLh(v); changed(); paper.focus(); });
    btn("•", "글머리 기호", "insertUnorderedList"); btn("1.", "번호 매기기", "insertOrderedList");
    btn("→", "들여쓰기", "indent"); btn("←", "내어쓰기", "outdent");
    parent.appendChild(bar);
    var desk = el("div", "cmp-desk"); desk.appendChild(paper); parent.appendChild(desk);
    function setLh(v) { lh = v || "160"; paper.style.lineHeight = (Number(lh) / 100).toFixed(2); lhSel.value = lh; }
    setLh(lh);

    paper.addEventListener("input", changed);
    paper.addEventListener("paste", function (e) {
      var cd = e.clipboardData; if (!cd) { return; }
      var html = cd.getData("text/html");
      e.preventDefault();
      if (html) { document.execCommand("insertHTML", false, clean(html)); }
      else { document.execCommand("insertText", false, cd.getData("text/plain")); }
    });
    paper.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); document.execCommand("insertText", false, "    "); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) { e.preventDefault(); if (o.onSave) { o.onSave(); } }
    });
    return {
      paper: paper,
      html: function () { return paper.innerHTML; },
      set: function (html, v) { paper.innerHTML = clean(html || ""); setLh(v); savedRange = null; },
      lh: function () { return lh; },
      counts: function () { return counts(paper); }
    };
  };

  App.page({
    id: "writer-compose", title: "집필",
    render: function (view) {
      var list = [], cur = { id: "", lh: "160" }, dirty = false, draftTimer = null;

      var c = ui.card(view, { tab: "Write", tone: "t-2", title: "원고", wide: true });
      c.el.classList.add("cmp-card");

      /* ---------- 제목 · 작성 날짜 · 카테고리 · 완료 ---------- */
      var meta = el("div", "cmp-meta");
      function field(label, input, cls) {
        var lab = el("label", "cmp-f" + (cls ? " " + cls : ""));
        lab.appendChild(el("span", "f-label", label)); lab.appendChild(input);
        meta.appendChild(lab); return input;
      }
      var fTitle = field("제목", el("input"), "cmp-f-title"); fTitle.maxLength = 120; fTitle.placeholder = "제목을 적어 주세요";
      var fDate = field("작성 날짜", el("input")); fDate.type = "date";
      var fCat = field("카테고리", el("input")); fCat.maxLength = 30; fCat.placeholder = "골라 주세요";
      var dl = el("datalist"); dl.id = "cmpCats"; fCat.setAttribute("list", "cmpCats"); meta.appendChild(dl);
      var doneLab = el("label", "cmp-done");
      var fDone = el("input"); fDone.type = "checkbox";
      doneLab.appendChild(fDone); doneLab.appendChild(document.createTextNode(" 완료"));
      meta.appendChild(doneLab);
      c.body.appendChild(meta);
      function fillCats() {
        H.clear(dl);
        var seen = {};
        CATS.concat(list.map(function (w) { return w.cat; })).forEach(function (k) {
          if (!k || seen[k]) { return; } seen[k] = 1;
          var o = el("option"); o.value = k; dl.appendChild(o);
        });
      }

      /* ---------- toolbar + paper (shared with 개인 › 일기) ---------- */
      var ed = App.richEditor(c.body, { onChange: function () { changed(); }, onSave: function () { save(); } });
      var paper = ed.paper;
      [fTitle, fDate, fCat].forEach(function (i) { i.addEventListener("input", changed); });
      fDone.addEventListener("change", changed);

      /* ---------- status line · 새 글 · 저장 ---------- */
      var foot = el("div", "cmp-foot");
      var stat = el("span", "cmp-stat"); foot.appendChild(stat);
      var acts = el("span", "cmp-acts");
      var bNew = el("button", "btn ghost", "+ 새 글"); bNew.type = "button";
      var bSave = el("button", "btn", "저장"); bSave.type = "button"; bSave.title = "저장 (Ctrl+S)";
      acts.appendChild(bNew); acts.appendChild(bSave); foot.appendChild(acts);
      c.body.appendChild(foot);
      var note = "";
      function paintStat() {
        var n = counts(paper);
        stat.textContent = "글자 수 " + fmtN(n.all) + "자 (공백 제외 " + fmtN(n.noSpace) + "자) · 원고지 약 " + fmtN(n.sheets) + "매 · 3분마다 자동 저장" + (note ? " · " + note : "");
      }

      /* ---------- 저장한 글 ---------- */
      var lc = ui.card(view, { tab: "Saved", tone: "t-3", title: "저장한 글", wide: true });
      lc.el.classList.add("cmp-list-card");
      var listBox = el("div", "cmp-list"); lc.body.appendChild(listBox);

      function state() { return { id: cur.id, title: fTitle.value, date: fDate.value, cat: fCat.value, done: fDone.checked, html: paper.innerHTML, lh: ed.lh(), dirty: dirty }; }
      var edits = 0;  /* bumps on every change, so a save only clears `dirty` if nothing was typed meanwhile */
      function changed() {
        dirty = true; edits++; note = "임시 저장 중…"; paintStat();
        clearTimeout(draftTimer);
        draftTimer = setTimeout(function () {
          H.safeSet(DRAFT_KEY, JSON.stringify(state()));
          var d = new Date(); note = "저장 안 됨 · 임시 저장 " + H.pad2(d.getHours()) + ":" + H.pad2(d.getMinutes()); paintStat();
        }, 600);
      }
      function fill(s) {
        cur = { id: s.id || "" };
        fTitle.value = s.title || ""; fDate.value = s.date || H.todayStr(); fCat.value = s.cat || ""; fDone.checked = !!s.done;
        ed.set(s.html, s.lh);
        paintStat(); paintList();
      }
      function reset() {
        clearTimeout(draftTimer); dirty = false; note = "";
        fill({ date: H.todayStr() });
        H.safeSet(DRAFT_KEY, "");
      }
      function askDiscard() { return !dirty || window.confirm("저장하지 않은 내용이 있어요. 그래도 넘어갈까요?"); }
      bNew.addEventListener("click", function () { if (askDiscard()) { reset(); fTitle.focus(); } });

      /* auto: the 3-minute autosave — quiet (no pop-up), skips an empty new piece, never rewrites the title box */
      var saving = false;
      function save(auto) {
        auto = auto === true;
        if (saving || (auto && !dirty)) { return; }
        var s = state();
        if (auto && !s.id && !s.title.trim() && !(paper.innerText || "").trim()) { return; }
        var id = s.id || H.uid(), now = new Date().toISOString(), at = edits;
        var entry = { id: id, title: s.title.trim() || "제목 없음", date: s.date || H.todayStr(), cat: s.cat.trim(), done: !!s.done, chars: counts(paper).all, updatedAt: now };
        saving = true; bSave.disabled = true; note = auto ? "자동 저장 중…" : "저장 중…"; paintStat();
        bodyRef(id).set({ html: clean(s.html), lh: s.lh, updatedAt: now }).then(function () {
          return App.doc(INDEX).get();
        }).then(function (snap) {
          var items = (snap.exists && snap.data().items) || [];
          var i = items.map(function (w) { return w.id; }).indexOf(id);
          if (i === -1) { entry.createdAt = now; items.unshift(entry); } else { entry.createdAt = items[i].createdAt || now; items[i] = entry; }
          return App.doc(INDEX).set({ items: items, updatedAt: now }, { merge: true });
        }).then(function () {
          cur.id = id;
          if (!auto) { fTitle.value = entry.title; }
          if (edits === at) { dirty = false; clearTimeout(draftTimer); }
          H.safeSet(DRAFT_KEY, JSON.stringify(state()));
          var d = new Date(); note = (auto ? "자동 저장됨 · " : "저장됨 · ") + H.pad2(d.getHours()) + ":" + H.pad2(d.getMinutes());
          paintStat(); paintList();
        }).catch(function (err) {
          note = auto ? "자동 저장 실패 · 3분 뒤 다시 시도" : "저장 실패"; paintStat();
          if (!auto) { window.alert("저장 실패: " + err.message); } else { console.warn(err); }
        }).then(function () { saving = false; bSave.disabled = false; });
      }
      bSave.addEventListener("click", function () { save(false); });
      /* every 3 minutes, and when the window is hidden or the page is left */
      var autoTimer = setInterval(function () { save(true); }, 3 * 60 * 1000);
      function onHide() { if (document.visibilityState === "hidden") { save(true); } }
      document.addEventListener("visibilitychange", onHide);

      function open(w) {
        if (w.id === cur.id && !dirty) { paper.focus(); return; }
        if (!askDiscard()) { return; }
        bodyRef(w.id).get().then(function (snap) {
          var b = snap.exists ? snap.data() : {};
          clearTimeout(draftTimer); dirty = false; note = "불러옴";
          fill({ id: w.id, title: w.title, date: w.date, cat: w.cat, done: w.done, html: b.html, lh: b.lh });
          H.safeSet(DRAFT_KEY, JSON.stringify(state()));
          c.el.scrollIntoView({ behavior: "smooth", block: "start" });
        }).catch(function (err) { window.alert("불러오기 실패: " + err.message); });
      }
      function remove(w) {
        if (!window.confirm("'" + w.title + "' 글을 지울까요? 되돌릴 수 없어요.")) { return; }
        var items = list.filter(function (x) { return x.id !== w.id; });
        App.doc(INDEX).set({ items: items, updatedAt: new Date().toISOString() }, { merge: true })
          .then(function () { return bodyRef(w.id).delete(); })
          .then(function () { if (cur.id === w.id) { reset(); } })
          .catch(function (err) { window.alert("삭제 실패: " + err.message); });
      }
      function paintList() {
        H.clear(listBox);
        lc.count.textContent = list.length ? list.length + "편" : "";
        if (!list.length) { listBox.appendChild(ui.empty("아직 저장한 글이 없어요. 위에서 쓰고 [저장]을 누르면 여기에 쌓여요.")); return; }
        list.slice().sort(function (a, b) { return (b.date || "") + (b.updatedAt || "") < (a.date || "") + (a.updatedAt || "") ? -1 : 1; }).forEach(function (w) {
          var row = el("div", "cmp-row" + (w.id === cur.id ? " cur" : ""));
          var main = el("button", "cmp-open"); main.type = "button";
          main.appendChild(el("span", "cmp-row-title", w.title || "제목 없음"));
          if (w.cat) { main.appendChild(el("span", "cat-chip", w.cat)); }
          main.appendChild(el("span", "mini-sub", (w.date || "").slice(5).replace("-", ".")));
          main.appendChild(el("span", "mini-sub cmp-row-n", fmtN(w.chars) + "자"));
          var st = el("span", "status-chip cmp-state" + (w.done ? " done" : ""), w.done ? "완료" : "작성 중");
          main.appendChild(st);
          main.addEventListener("click", function () { open(w); });
          row.appendChild(main);
          var del = el("button", "icon-btn", "✕"); del.type = "button"; del.title = "삭제"; del.setAttribute("aria-label", (w.title || "글") + " 삭제");
          del.addEventListener("click", function () { remove(w); });
          row.appendChild(del);
          listBox.appendChild(row);
        });
      }

      /* restore an unsaved draft (e.g. the tab was closed before 저장) */
      var dr = readDraft();
      if (dr) { fill(dr); dirty = !!dr.dirty; note = dirty ? "저장 안 된 임시 글을 불러왔어요" : ""; paintStat(); } else { reset(); }

      App.watchDoc(App.doc(INDEX), function (d) { list = (d && d.items) || []; fillCats(); paintList(); });
      App.unsubs.push(function () {
        clearInterval(autoTimer); document.removeEventListener("visibilitychange", onHide); clearTimeout(draftTimer);
        if (dirty) { H.safeSet(DRAFT_KEY, JSON.stringify(state())); save(true); }
      });
    }
  });
})(window.App);
