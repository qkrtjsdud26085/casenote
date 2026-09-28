/* Hello dear Sunny — IAS › 현재 진행중 › 오늘 논문 작성 기록
   한글(.hwpx) 파일을 브라우저 안에서 읽어 구조별 글자 수를 날짜별로 기록하고, 메모를 참고문헌으로 모읍니다.
   원고 내용은 Firestore(research/ias_drafttext · ias_draftlog)에만 저장합니다. */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;
  var TEXT = function () { return App.doc("research/ias_drafttext"); };
  var LOG = function () { return App.doc("research/ias_draftlog"); };
  var MAX_BYTES = 900000;

  /* ---------- .hwpx (zip) ---------- */
  function unzip(buf) {
    var v = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder("utf-8");
    var eocd = -1;
    for (var i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) { if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) { return Promise.reject(new Error("hwpx 파일이 아니에요.")); }
    var n = v.getUint16(eocd + 10, true), p = v.getUint32(eocd + 16, true), jobs = {};
    for (var k = 0; k < n; k++) {
      if (v.getUint32(p, true) !== 0x02014b50) { break; }
      var method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
      var nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
      var name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      var start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
      if (/^Contents\/(section\d+|header)\.xml$/.test(name)) { jobs[name] = inflate(u8.subarray(start, start + csize), method); }
      p += 46 + nl + xl + cl;
    }
    var names = Object.keys(jobs);
    return Promise.all(names.map(function (k2) { return jobs[k2]; })).then(function (texts) {
      var out = {}; names.forEach(function (k2, j) { out[k2] = texts[j]; }); return out;
    });
  }
  function inflate(bytes, method) {
    if (method === 0) { return Promise.resolve(new TextDecoder("utf-8").decode(bytes)); }
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  }
  function kids(node, name) { return Array.prototype.filter.call(node.children, function (c) { return !name || c.localName === name; }); }
  /* text of one paragraph; memo fields go to memos, footnotes are skipped */
  function paraText(p, memos) {
    var s = "";
    (function walk(n) {
      kids(n).forEach(function (c) {
        var ln = c.localName;
        if (ln === "t") { s += c.textContent; return; }
        if (ln === "fieldBegin" && c.getAttribute("type") === "MEMO") {
          kids(c, "subList").forEach(function (sl) { kids(sl, "p").forEach(function (mp) { var m = paraText(mp, []).trim(); if (m) { memos.push(m); } }); });
          return;
        }
        if (ln === "footNote" || ln === "endNote" || ln === "parameters") { return; }
        if (ln === "p" && s && !/\s$/.test(s)) { s += " "; }
        walk(c);
      });
    })(p);
    return s;
  }
  function parseHwpx(buf) {
    return unzip(buf).then(function (files) {
      var xp = new DOMParser(), styles = {};
      if (files["Contents/header.xml"]) {
        Array.prototype.forEach.call(xp.parseFromString(files["Contents/header.xml"], "application/xml").getElementsByTagNameNS("*", "style"), function (st) {
          var m = /(?:개요|Outline)\s*(\d)/i.exec((st.getAttribute("name") || "") + " " + (st.getAttribute("engName") || ""));
          if (m) { styles[st.getAttribute("id")] = Math.min(3, Number(m[1])); }
        });
      }
      var secs = Object.keys(files).filter(function (k) { return /section\d+/.test(k); })
        .sort(function (a, b) { return Number(/\d+/.exec(a)[0]) - Number(/\d+/.exec(b)[0]); });
      if (!secs.length) { throw new Error("본문을 찾지 못했어요."); }
      var lines = [], lv = [], memos = [];
      secs.forEach(function (k) {
        var root = xp.parseFromString(files[k], "application/xml").documentElement;
        kids(root, "p").forEach(function (p) {
          lines.push(paraText(p, memos).replace(/\s+$/, ""));
          lv.push(styles[p.getAttribute("styleIDRef")] || 0);
        });
      });
      return { lines: lines, lv: lv, memos: memos };
    });
  }

  /* ---------- structure ---------- */
  var SPECIAL = /^(국문\s*초록|초\s*록|요\s*약|abstract|목\s*차|서\s*론|결\s*론|참\s*고\s*문\s*헌|references|부\s*록|appendix)$/i;
  var REFHEAD = /^(참\s*고\s*문\s*헌|references)$/i;
  var TOP = /^(제\s*\d+\s*장|[Ⅰ-Ⅹ]+\.?\s*\S|(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s)/;
  function headLevel(line, hasTop) {
    var s = line.trim();
    if (!s || s.length > 60 || /[다요]\.$/.test(s)) { return 0; }
    if (SPECIAL.test(s)) { return 1; }
    if (TOP.test(s)) { return 1; }
    if (/^제\s*\d+\s*절/.test(s) || /^\d+\.\d+\.?\s/.test(s)) { return /^\d+\.\d+\.\d+\.?\s/.test(s) ? 3 : 2; }
    if (/^\d+\.\s*\S/.test(s)) { return hasTop ? 2 : 1; }
    if (/^[가-하]\.\s*\S/.test(s)) { return 3; }
    return 0;
  }
  function withLevels(lines, lv) {
    var hasTop = lines.some(function (l) { return TOP.test(l.trim()); });
    return lines.map(function (l, i) { return (lv && lv[i]) || headLevel(l, hasTop); });
  }
  /* sections with own counts (n: 공백 포함, ns: 공백 제외); lines after 참고문헌 become references */
  function structure(lines, lv) {
    var levels = withLevels(lines, lv), secs = [], refs = [], inRefs = false;
    var cur = { t: "(첫 제목 전)", lv: 1, n: 0, ns: 0, line: 0 };
    secs.push(cur);
    lines.forEach(function (l, i) {
      var s = l.trim();
      if (levels[i]) {
        if (REFHEAD.test(s)) { inRefs = true; return; }
        if (inRefs && !SPECIAL.test(s)) { if (s) { refs.push(s); } return; }
        inRefs = false;
        cur = { t: s, lv: levels[i], n: 0, ns: 0, line: i }; secs.push(cur);
      } else if (inRefs) { if (s) { refs.push(s); } return; }
      cur.n += l.length; cur.ns += l.replace(/\s/g, "").length;
    });
    if (!secs[0].n) { secs.shift(); }
    return { secs: secs, refs: refs, levels: levels };
  }
  /* own count + every deeper section below it */
  function sums(secs, key) {
    return secs.map(function (s, i) {
      var t = s[key];
      for (var j = i + 1; j < secs.length && secs[j].lv > s.lv; j++) { t += secs[j][key]; }
      return t;
    });
  }
  function titleKey(t) { return String(t || "").replace(/^(제\s*\d+\s*[장절]|[Ⅰ-Ⅹ]+\.?|(I|II|III|IV|V|VI|VII|VIII|IX|X)\.|\d+(\.\d+)*\.?|[가-하]\.)\s*/, "").replace(/\s+/g, ""); }

  /* ---------- references ---------- */
  function refKey(r) { return r.toLowerCase().replace(/[\s.,·:;'"“”‘’()\[\]-]/g, ""); }
  function isKo(r) { return /^[\s"'“‘(]*[가-힣]/.test(r); }
  function sortRefs(list, koFirst) {
    var seen = {}, ko = [], en = [];
    list.forEach(function (r) {
      r = String(r).replace(/^\s*(\[\d+\]|\d+[.)])\s*/, "").trim();
      var k = refKey(r); if (!k || seen[k]) { return; } seen[k] = 1;
      (isKo(r) ? ko : en).push(r);
    });
    ko.sort(function (a, b) { return a.localeCompare(b, "ko"); });
    en.sort(function (a, b) { return a.localeCompare(b, "en", { sensitivity: "base" }); });
    return koFirst === false ? en.concat(ko) : ko.concat(en);
  }

  /* ---------- save ---------- */
  function record(data) {
    var text = data.lines.join("\n");
    if (new Blob([text]).size > MAX_BYTES) { window.alert("원고가 너무 길어서 저장할 수 없어요."); return Promise.resolve(false); }
    var st = structure(data.lines, data.lv);
    var refs = sortRefs((data.memos || []).concat(st.refs));
    var day = { total: 0, totalNs: 0, secs: st.secs.map(function (s) { return { t: s.t, lv: s.lv, n: s.n, ns: s.ns }; }), at: new Date().toISOString() };
    st.secs.forEach(function (s) { day.total += s.n; day.totalNs += s.ns; });
    var days = {}; days[H.todayStr()] = day;
    return Promise.all([
      App.setDoc(TEXT(), { lines: data.lines, lv: data.lv || [], refs: refs, file: data.file || "", fileModified: data.fileModified || 0, savedAt: day.at }),
      App.setDoc(LOG(), { days: days })
    ]).then(function () { return true; });
  }
  function readFile(file) {
    return file.arrayBuffer().then(parseHwpx).then(function (d) {
      d.file = file.name; d.fileModified = file.lastModified; return record(d);
    });
  }

  /* ---------- linked file (Edge/Chrome keeps the handle, so edits can be re-read) ---------- */
  function idb(mode, val) {
    return new Promise(function (res) {
      try {
        var rq = indexedDB.open("hds-draft", 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore("kv"); };
        rq.onsuccess = function () {
          try {
            var tx = rq.result.transaction("kv", mode === "get" ? "readonly" : "readwrite"), s = tx.objectStore("kv");
            var r = mode === "get" ? s.get("handle") : s.put(val, "handle");
            r.onsuccess = function () { res(mode === "get" ? r.result : true); };
            r.onerror = function () { res(null); };
          } catch (e) { res(null); }
        };
        rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }

  App.draft = { parseHwpx: parseHwpx, structure: structure, sortRefs: sortRefs, record: record, readFile: readFile, titleKey: titleKey };

  /* ---------- page ---------- */
  var TABS = ["ias-home", "ias-flow", "ias-items", "ias-writing"];
  App.page({
    id: "ias-writing", title: "오늘 논문 작성 기록", navHidden: true, navParent: "ias-home", tabLabel: "오늘 논문 작성 기록",
    render: function (view) {
      App.rkit.pageTabs(view, TABS, "ias-writing");
      var grid = el("div", "draft-grid"); view.appendChild(grid);
      var left = el("div", "draft-col"), right = el("div", "draft-col draft-right");
      grid.appendChild(left); grid.appendChild(right);
      var noSpace = H.safeGet("hds_draft_ns") === "1", koFirst = H.safeGet("hds_draft_en") !== "1";
      var text = null, log = null, handle = null;

      /* 1. 오늘 */
      var today = ui.card(left, { tab: "Today", tone: "t-2", title: "오늘 쓴 양", wide: true });
      var stats = el("div", "draft-stats"); today.body.appendChild(stats);
      var bar = el("div", "draft-bar"); today.body.appendChild(bar);
      var linkBtn = el("button", "btn", "한글 파일 연결"); linkBtn.type = "button";
      var rereadBtn = el("button", "tool-btn", "다시 읽기"); rereadBtn.type = "button"; rereadBtn.hidden = true;
      var fileIn = el("input"); fileIn.type = "file"; fileIn.accept = ".hwpx"; fileIn.hidden = true;
      var spBtn = el("button", "tool-btn", ""); spBtn.type = "button";
      bar.appendChild(linkBtn); bar.appendChild(rereadBtn); bar.appendChild(spBtn); bar.appendChild(fileIn);
      var status = el("p", "draft-status"); today.body.appendChild(status);
      var paste = el("details", "draft-paste"); paste.appendChild(el("summary", "", "붙여넣기로 기록"));
      var ta = el("textarea"); ta.rows = 5; ta.setAttribute("aria-label", "논문 내용 붙여넣기");
      var pasteBtn = el("button", "tool-btn", "기록"); pasteBtn.type = "button";
      paste.appendChild(ta); paste.appendChild(pasteBtn); today.body.appendChild(paste);

      /* 2~4 */
      var sc = ui.card(left, { tab: "Structure", tone: "t-1", title: "구조별 글자 수", wide: true });
      var lc = ui.card(left, { tab: "Log", tone: "t-3", title: "날짜별 기록", wide: true });
      var rc = ui.card(left, { tab: "Refs", tone: "t-1", title: "참고문헌 (메모)", wide: true });
      var rbar = el("div", "draft-bar"); rc.body.appendChild(rbar);
      var koBtn = el("button", "tool-btn", "가나다 먼저"), enBtn = el("button", "tool-btn", "abc 먼저"), cpBtn = el("button", "copy-btn", "복사");
      [koBtn, enBtn, cpBtn].forEach(function (b) { b.type = "button"; rbar.appendChild(b); });
      var rlist = el("ol", "draft-refs"); rc.body.appendChild(rlist);

      /* 5. 오른쪽 전체 */
      var vc = ui.card(right, { tab: "Draft", tone: "t-2", title: "논문 전체", wide: true });
      var pane = el("div", "draft-view"); vc.body.appendChild(pane);

      function fmt(n) { return Number(n || 0).toLocaleString("ko-KR"); }
      function signed(n) { return n > 0 ? "+" + fmt(n) : n < 0 ? "−" + fmt(-n) : "0"; }
      function dayKeys() { return Object.keys((log && log.days) || {}).sort(); }
      function prevDay(k) { var ks = dayKeys().filter(function (x) { return x < k; }); return ks.length ? log.days[ks[ks.length - 1]] : null; }
      /* per-section change vs. the previous recorded day, matched by title without numbering */
      function deltas(day, prev) {
        var key = noSpace ? "ns" : "n", tot = sums(day.secs, key);
        var pmap = {};
        if (prev) { var pt = sums(prev.secs, key); prev.secs.forEach(function (s, i) { pmap[s.lv + "|" + titleKey(s.t)] = pt[i]; }); }
        return day.secs.map(function (s, i) { var k = s.lv + "|" + titleKey(s.t); return { sum: tot[i], d: tot[i] - (pmap[k] || 0) }; });
      }
      function dayTotal(d) { return d ? (noSpace ? d.totalNs : d.total) : 0; }

      function drawStats() {
        H.clear(stats);
        var tk = H.todayStr(), d = log && log.days && log.days[tk], last = dayKeys().slice(-1)[0];
        var cur = d || (last && log.days[last]);
        var add = d ? dayTotal(d) - dayTotal(prevDay(tk)) : 0;
        [["오늘", signed(add) + "자"], ["전체", fmt(dayTotal(cur)) + "자"], ["기록한 날", dayKeys().length + "일"]].forEach(function (x) {
          var b = el("div", "draft-stat"); b.appendChild(el("span", "draft-stat-label", x[0])); b.appendChild(el("strong", "", x[1])); stats.appendChild(b);
        });
        spBtn.textContent = noSpace ? "공백 제외" : "공백 포함";
        status.textContent = text && text.savedAt ? (text.file ? text.file + " · " : "") + H.fmtDateTime(text.savedAt) + " 기록" : "";
      }
      function drawStructure() {
        H.clear(sc.body);
        var tk = H.todayStr(), d = log && log.days && (log.days[tk] || log.days[dayKeys().slice(-1)[0]]);
        if (!d) { sc.body.appendChild(ui.empty("아직 기록이 없어요.")); return; }
        var ds = deltas(d, prevDay(d === log.days[tk] ? tk : dayKeys().slice(-1)[0]));
        var wrap = el("div", "table-wrap"), t = el("table", "items-table draft-table"); wrap.appendChild(t);
        var hr = el("tr"); ["구조", "글자 수", "오늘"].forEach(function (h) { hr.appendChild(el("th", "", h)); }); t.appendChild(hr);
        d.secs.forEach(function (s, i) {
          var tr = el("tr", "lv-" + s.lv);
          var a = el("td", "draft-sec", s.t); a.style.paddingLeft = (10 + (s.lv - 1) * 16) + "px";
          a.addEventListener("click", function () { jump(s.t); });
          tr.appendChild(a);
          tr.appendChild(el("td", "narrow num", fmt(ds[i].sum)));
          tr.appendChild(el("td", "narrow num" + (ds[i].d > 0 ? " up" : ""), d === (log.days[tk]) ? signed(ds[i].d) : "–"));
          t.appendChild(tr);
        });
        sc.body.appendChild(wrap);
        sc.count.textContent = fmt(dayTotal(d)) + "자";
      }
      function drawLog() {
        H.clear(lc.body);
        var ks = dayKeys();
        if (!ks.length) { lc.body.appendChild(ui.empty("아직 기록이 없어요.")); return; }
        var wrap = el("div", "table-wrap"), t = el("table", "items-table draft-table"); wrap.appendChild(t);
        var hr = el("tr"); ["날짜", "전체", "그날 쓴 양", "가장 많이 쓴 곳"].forEach(function (h) { hr.appendChild(el("th", "", h)); }); t.appendChild(hr);
        ks.slice().reverse().forEach(function (k) {
          var d = log.days[k], pv = prevDay(k), best = -1;
          d.secs.forEach(function (s, i) { if (best < 0 || ownD(d, pv, i) > ownD(d, pv, best)) { best = i; } });
          var tr = el("tr");
          tr.appendChild(el("td", "narrow", k.slice(5).replace("-", "/") + " (" + H.DOW[H.parseKey(k).getDay()] + ")"));
          tr.appendChild(el("td", "narrow num", fmt(dayTotal(d))));
          tr.appendChild(el("td", "narrow num" + (dayTotal(d) - dayTotal(pv) > 0 ? " up" : ""), signed(dayTotal(d) - dayTotal(pv))));
          tr.appendChild(el("td", "", best >= 0 && ownD(d, pv, best) > 0 ? d.secs[best].t : "–"));
          t.appendChild(tr);
        });
        lc.body.appendChild(wrap);
      }
      /* change in a section's own text (not its sub-sections) */
      function ownD(d, pv, i) {
        var key = noSpace ? "ns" : "n", s = d.secs[i], k = s.lv + "|" + titleKey(s.t), before = 0;
        if (pv) { pv.secs.forEach(function (p) { if (p.lv + "|" + titleKey(p.t) === k) { before = p[key]; } }); }
        return s[key] - before;
      }
      function drawRefs() {
        H.clear(rlist);
        var refs = sortRefs((text && text.refs) || [], koFirst);
        koBtn.classList.toggle("on", koFirst); enBtn.classList.toggle("on", !koFirst);
        rc.count.textContent = refs.length + "개";
        if (!refs.length) { rlist.appendChild(el("li", "empty-state", "메모가 없어요.")); return; }
        refs.forEach(function (r) { rlist.appendChild(el("li", "", r)); });
      }
      function drawText() {
        H.clear(pane);
        if (!text || !text.lines || !text.lines.length) { pane.appendChild(ui.empty("아직 불러온 원고가 없어요.")); return; }
        var levels = withLevels(text.lines, text.lv);
        text.lines.forEach(function (l, i) {
          if (!l.trim()) { return; }
          var node = levels[i] ? el("h" + (levels[i] + 2), "draft-h", l.trim()) : el("p", "", l);
          if (levels[i]) { node.setAttribute("data-head", l.trim()); }
          pane.appendChild(node);
        });
      }
      function jump(t) {
        var hs = pane.querySelectorAll(".draft-h");
        for (var i = 0; i < hs.length; i++) { if (hs[i].getAttribute("data-head") === t) { pane.scrollTop = hs[i].offsetTop - pane.offsetTop - 8; return; } }
      }
      function drawAll() { drawStats(); drawStructure(); drawLog(); drawRefs(); }

      function fail(e) { status.textContent = "읽지 못했어요: " + (e && e.message ? e.message : e); }
      function readHandle(force) {
        if (!handle) { return Promise.resolve(); }
        return handle.getFile().then(function (f) {
          if (!force && text && text.file === f.name && text.fileModified === f.lastModified) { return; }
          return readFile(f);
        }).catch(fail);
      }
      function setHandle(h) {
        handle = h; rereadBtn.hidden = !h;
        linkBtn.textContent = h ? "다른 파일 연결" : "한글 파일 연결";
      }
      linkBtn.addEventListener("click", function () {
        if (!window.showOpenFilePicker) { fileIn.click(); return; }
        window.showOpenFilePicker({ types: [{ description: "한글 문서", accept: { "application/octet-stream": [".hwpx"] } }] }).then(function (hs) {
          setHandle(hs[0]); idb("put", hs[0]); return readHandle(true);
        }).catch(function (e) { if (e && e.name !== "AbortError") { fail(e); } });
      });
      rereadBtn.addEventListener("click", function () {
        if (!handle) { return; }
        var q = handle.requestPermission ? handle.requestPermission({ mode: "read" }) : Promise.resolve("granted");
        q.then(function (p) { if (p === "granted") { return readHandle(true); } }).catch(fail);
      });
      fileIn.addEventListener("change", function () { if (fileIn.files[0]) { readFile(fileIn.files[0]).catch(fail); } fileIn.value = ""; });
      pasteBtn.addEventListener("click", function () {
        if (!ta.value.trim()) { return; }
        record({ lines: ta.value.replace(/\r\n?/g, "\n").split("\n"), lv: [], memos: [], file: "", fileModified: 0 }).then(function (ok) { if (ok) { ta.value = ""; paste.open = false; } });
      });
      spBtn.addEventListener("click", function () { noSpace = !noSpace; H.safeSet("hds_draft_ns", noSpace ? "1" : "0"); drawAll(); });
      koBtn.addEventListener("click", function () { koFirst = true; H.safeSet("hds_draft_en", "0"); drawRefs(); });
      enBtn.addEventListener("click", function () { koFirst = false; H.safeSet("hds_draft_en", "1"); drawRefs(); });
      cpBtn.addEventListener("click", function () { H.copyText(sortRefs((text && text.refs) || [], koFirst).join("\n"), cpBtn); });

      App.watchDoc(TEXT(), function (d) { text = d; drawText(); drawAll(); });
      App.watchDoc(LOG(), function (d) { log = d; drawAll(); });

      /* reopen the linked file; while this page is open, re-read it when it changes */
      idb("get").then(function (h) {
        if (!h || !h.getFile) { return; }
        setHandle(h);
        var q = h.queryPermission ? h.queryPermission({ mode: "read" }) : Promise.resolve("granted");
        q.then(function (p) {
          if (p !== "granted") { status.textContent = h.name + " · [다시 읽기]를 누르면 이어서 확인해요"; return; }
          readHandle(false);
          var timer = setInterval(function () { if (!document.hidden) { readHandle(false); } }, 10000);
          App.unsubs.push(function () { clearInterval(timer); });
        });
      });
    }
  });
})(window.App);
