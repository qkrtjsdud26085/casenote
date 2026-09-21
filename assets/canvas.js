/* Hello dear Sunny — 아이디어 캔버스 (마인드맵 · 자유 배치 보드)
   App.canvas(parent, cfg) — cfg: { boardsRef, boardRef(id), onSendIdea(text) } */
(function (App) {
  "use strict";
  var H = App.h, el = H.el;

  var COLORS = [
    { name: "아이디어" }, { name: "주제 · 핵심" }, { name: "인물" },
    { name: "장면 · 사건" }, { name: "질문 · 미해결" }, { name: "소재 · 자료" }
  ];
  var K_MIN = 0.3, K_MAX = 2;

  var STARTERS = [
    { label: "소설 구상 틀", nodes: [
      ["이야기의 핵심", 0, 0, 1],
      ["인물", 260, -150, 2], ["사건", 260, -50, 3], ["배경 · 시공간", 260, 50, 5], ["갈등", 260, 150, 4],
      ["주인공은 무엇을 원하는가?", 540, -190, 4], ["결정적 결함은?", 540, -110, 4],
      ["기폭 사건", 540, -20, 3], ["결말의 방향", 540, 150, 4]
    ], links: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [1, 6], [2, 7], [4, 8]] },
    { label: "에세이 구상 틀", nodes: [
      ["이 글이 하고 싶은 말 (한 문장)", 0, 0, 1],
      ["경험 · 장면", 300, -130, 3], ["그때의 감정", 300, -30, 0], ["생각 · 성찰", 300, 70, 0], ["끌어올 자료 · 인용", 300, 170, 5],
      ["첫 문장 후보", 590, -130, 4], ["독자에게 남기고 싶은 것", 590, 70, 4]
    ], links: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [3, 6]] }
  ];

  App.canvas = function (parent, cfg) {
    var S = { nodes: [], links: [], view: { x: 40, y: 40, k: 1 } };
    var boards = [], boardId = null, boardUnsub = null;
    var sel = null, selLink = null, linking = false;
    var dragging = false, panning = false, editing = false, loaded = false;
    var undo = [], saveTimer = null, inflight = 0;
    var els = {};

    var root = el("div", "cv");
    var tools = el("div", "cv-tools");
    var tools2 = el("div", "cv-tools");
    var viewEl = el("div", "cv-view"); viewEl.tabIndex = 0;
    viewEl.setAttribute("aria-label", "아이디어 캔버스. 빈 곳을 두 번 누르면 아이디어가 추가됩니다.");
    var world = el("div", "cv-world");
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg"); svg.setAttribute("class", "cv-links");
    world.appendChild(svg);
    viewEl.appendChild(world);
    var hint = el("div", "cv-hint");
    viewEl.appendChild(hint);
    var status = el("span", "cv-status", "");
    root.appendChild(tools); root.appendChild(tools2); root.appendChild(viewEl);
    parent.appendChild(root);

    function tb(label, title, fn, cls) {
      var b = el("button", "tool-btn" + (cls ? " " + cls : ""), label); b.type = "button"; b.title = title || label;
      b.addEventListener("click", fn);
      return b;
    }
    function uid() { return H.uid() + Math.floor(Math.random() * 100); }
    function snapshot() { return JSON.stringify({ nodes: S.nodes, links: S.links }); }
    function pushUndo() { undo.push(snapshot()); if (undo.length > 40) { undo.shift(); } syncTools(); }
    function nodeById(id) { return S.nodes.filter(function (n) { return n.id === id; })[0]; }
    function viewSize() { return { w: viewEl.clientWidth || 800, h: viewEl.clientHeight || 500 }; }
    function sizeOf(n) {
      var e = els[n.id];
      return { w: (e && e.offsetWidth) || 150, h: (e && e.offsetHeight) || 40 };
    }
    function toWorld(cx, cy) {
      var r = viewEl.getBoundingClientRect();
      return { x: (cx - r.left - S.view.x) / S.view.k, y: (cy - r.top - S.view.y) / S.view.k };
    }

    /* ---------- persistence ---------- */
    function setStatus(t) { status.textContent = t; }
    function scheduleSave() {
      if (!boardId) { return; }
      setStatus("저장 중…");
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flush, 500);
    }
    function flush() {
      if (!boardId) { return; }
      clearTimeout(saveTimer); saveTimer = null;
      inflight++;
      cfg.boardRef(boardId).set({ nodes: S.nodes, links: S.links, view: S.view, updatedAt: new Date().toISOString() })
        .then(function () { var d = new Date(); setStatus("저장됨 · " + H.pad2(d.getHours()) + ":" + H.pad2(d.getMinutes())); })
        .catch(function (err) { window.alert("저장 실패: " + err.message); })
        .then(function () { inflight--; });
    }
    App.unsubs.push(function () { if (saveTimer) { flush(); } });

    /* ---------- rendering ---------- */
    function applyView() {
      var v = S.view;
      world.style.transform = "translate(" + v.x + "px," + v.y + "px) scale(" + v.k + ")";
      viewEl.style.backgroundPosition = v.x + "px " + v.y + "px";
      viewEl.style.backgroundSize = (24 * v.k) + "px " + (24 * v.k) + "px";
      zoomLabel.textContent = Math.round(v.k * 100) + "%";
    }
    function nodeClass(n) { return "cv-node cv-c" + (n.color || 0) + (n.id === sel ? " sel" : "") + (linking && n.id === sel ? " link-src" : ""); }
    function renderNodes() {
      Object.keys(els).forEach(function (k) { if (els[k].parentNode) { els[k].parentNode.removeChild(els[k]); } });
      els = {};
      S.nodes.forEach(function (n) {
        var e = el("div", nodeClass(n));
        e.setAttribute("data-id", n.id);
        e.style.left = n.x + "px"; e.style.top = n.y + "px";
        e.appendChild(el("div", "cv-text", n.text || ""));
        world.appendChild(e);
        els[n.id] = e;
      });
      drawLinks();
      hint.hidden = S.nodes.length > 0;
      syncTools();
    }
    function restyle() {
      S.nodes.forEach(function (n) { if (els[n.id]) { els[n.id].className = nodeClass(n); } });
      drawLinks(); syncTools();
    }
    function anchors(a, b) {
      var sa = sizeOf(a), sb = sizeOf(b);
      var ax = a.x + sa.w / 2, ay = a.y + sa.h / 2, bx = b.x + sb.w / 2, by = b.y + sb.h / 2;
      var dx = bx - ax, dy = by - ay;
      var horizontal = Math.abs(dx) / ((sa.w + sb.w) / 2) >= Math.abs(dy) / ((sa.h + sb.h) / 2);
      var p;
      if (horizontal) {
        var off = Math.max(40, Math.abs(dx) / 2);
        var s1 = dx >= 0 ? a.x + sa.w : a.x, e1 = dx >= 0 ? b.x : b.x + sb.w, sg = dx >= 0 ? 1 : -1;
        p = "M" + s1 + " " + ay + " C" + (s1 + sg * off) + " " + ay + "," + (e1 - sg * off) + " " + by + "," + e1 + " " + by;
      } else {
        var off2 = Math.max(30, Math.abs(dy) / 2);
        var s2 = dy >= 0 ? a.y + sa.h : a.y, e2 = dy >= 0 ? b.y : b.y + sb.h, sg2 = dy >= 0 ? 1 : -1;
        p = "M" + ax + " " + s2 + " C" + ax + " " + (s2 + sg2 * off2) + "," + bx + " " + (e2 - sg2 * off2) + "," + bx + " " + e2;
      }
      return p;
    }
    function linkKey(l) { return l.a + ">" + l.b; }
    function drawLinks() {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      S.links.forEach(function (l) {
        var a = nodeById(l.a), b = nodeById(l.b);
        if (!a || !b) { return; }
        var d = anchors(a, b);
        var vis = document.createElementNS(svgNS, "path");
        vis.setAttribute("d", d); vis.setAttribute("class", "cv-link" + (selLink === linkKey(l) ? " sel" : ""));
        var hit = document.createElementNS(svgNS, "path");
        hit.setAttribute("d", d); hit.setAttribute("class", "cv-link-hit"); hit.setAttribute("data-link", linkKey(l));
        svg.appendChild(vis); svg.appendChild(hit);
      });
    }

    /* ---------- mutations ---------- */
    function commit() { scheduleSave(); }
    function freeSpot(x, y) {
      var guard = 0;
      while (guard++ < 60 && S.nodes.some(function (n) { return Math.abs(n.x - x) < 170 && Math.abs(n.y - y) < 50; })) { y += 56; }
      return { x: x, y: y };
    }
    function addNode(x, y, color, parentId) {
      pushUndo();
      var p = freeSpot(x, y);
      var n = { id: uid(), x: Math.round(p.x), y: Math.round(p.y), text: "", color: color || 0 };
      S.nodes.push(n);
      if (parentId) { S.links.push({ a: parentId, b: n.id }); }
      sel = n.id; selLink = null;
      renderNodes();
      startEdit(n.id, true);
      return n;
    }
    function centerSpot() {
      var vs = viewSize();
      return { x: (vs.w / 2 - S.view.x) / S.view.k - 70, y: (vs.h / 2 - S.view.y) / S.view.k - 20 };
    }
    function addFree() { var c = centerSpot(); addNode(c.x, c.y, 0, null); }
    function addChild() {
      var p = sel && nodeById(sel);
      if (!p) { addFree(); return; }
      addNode(p.x + sizeOf(p).w + 70, p.y + S.links.filter(function (l) { return l.a === p.id; }).length * 56, p.color, p.id);
    }
    function addSibling() {
      var n = sel && nodeById(sel);
      if (!n) { addFree(); return; }
      var up = S.links.filter(function (l) { return l.b === n.id; })[0];
      addNode(n.x, n.y + sizeOf(n).h + 16, n.color, up ? up.a : null);
    }
    function deleteSel() {
      if (selLink) {
        pushUndo();
        S.links = S.links.filter(function (l) { return linkKey(l) !== selLink; });
        selLink = null; drawLinks(); syncTools(); commit(); return;
      }
      if (!sel) { return; }
      pushUndo();
      var id = sel;
      S.nodes = S.nodes.filter(function (n) { return n.id !== id; });
      S.links = S.links.filter(function (l) { return l.a !== id && l.b !== id; });
      sel = null; linking = false;
      renderNodes(); commit();
    }
    function toggleLink(a, b) {
      if (a === b) { return; }
      pushUndo();
      var had = S.links.some(function (l) { return (l.a === a && l.b === b) || (l.a === b && l.b === a); });
      if (had) { S.links = S.links.filter(function (l) { return !((l.a === a && l.b === b) || (l.a === b && l.b === a)); }); }
      else { S.links.push({ a: a, b: b }); }
      drawLinks(); commit();
    }
    function setColor(c) {
      var n = sel && nodeById(sel);
      if (!n) { return; }
      pushUndo(); n.color = c; restyle(); commit();
    }
    function doUndo() {
      var s = undo.pop();
      if (!s) { return; }
      var d = JSON.parse(s);
      S.nodes = d.nodes; S.links = d.links; sel = null; selLink = null; linking = false;
      renderNodes(); commit();
    }

    /* ---------- editing ---------- */
    function startEdit(id, isNew) {
      var n = nodeById(id), e = els[id];
      if (!n || !e || editing) { return; }
      editing = true;
      var ta = el("textarea", "cv-edit");
      ta.value = n.text || ""; ta.rows = 1; ta.maxLength = 500;
      ta.setAttribute("aria-label", "아이디어 내용");
      var t = e.querySelector(".cv-text");
      e.replaceChild(ta, t);
      var done = false;
      function fit() { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }
      function finish(save, thenChild) {
        if (done) { return; }
        done = true; editing = false;
        var v = ta.value.trim();
        if (save && v !== (n.text || "")) {
          if (!isNew) { pushUndo(); }
          n.text = v;
        }
        if (!n.text) {
          S.nodes = S.nodes.filter(function (x) { return x.id !== id; });
          S.links = S.links.filter(function (l) { return l.a !== id && l.b !== id; });
          sel = null; renderNodes(); commit(); return;
        }
        renderNodes(); commit();
        viewEl.focus({ preventScroll: true });
        if (thenChild) { addChild(); }
      }
      ta.addEventListener("input", fit);
      ta.addEventListener("blur", function () { finish(true); });
      ta.addEventListener("keydown", function (ev) {
        ev.stopPropagation();
        if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); finish(true); }
        else if (ev.key === "Tab" && !ev.isComposing) { ev.preventDefault(); finish(true, true); }
        else if (ev.key === "Escape") { ev.preventDefault(); ta.value = n.text || ""; finish(false); }
      });
      if (!window.__noAutofocus) { ta.focus(); ta.select(); }
      fit();
      drawLinks();
      ta.__finish = finish;
      e.__ta = ta;
    }
    function commitEditing() { var e = sel && els[sel]; if (e && e.__ta) { e.__ta.blur(); } }

    /* ---------- view: fit / zoom ---------- */
    function fit() {
      if (!S.nodes.length) { S.view = { x: 40, y: 40, k: 1 }; applyView(); scheduleSave(); return; }
      var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      S.nodes.forEach(function (n) { var s = sizeOf(n); minx = Math.min(minx, n.x); miny = Math.min(miny, n.y); maxx = Math.max(maxx, n.x + s.w); maxy = Math.max(maxy, n.y + s.h); });
      var vs = viewSize(), pad = 50;
      var k = Math.max(K_MIN, Math.min(1.2, (vs.w - pad * 2) / Math.max(1, maxx - minx), (vs.h - pad * 2) / Math.max(1, maxy - miny)));
      S.view = { k: k, x: (vs.w - (maxx - minx) * k) / 2 - minx * k, y: (vs.h - (maxy - miny) * k) / 2 - miny * k };
      applyView(); scheduleSave();
    }
    function zoomAt(factor, cx, cy) {
      var v = S.view, nk = Math.max(K_MIN, Math.min(K_MAX, v.k * factor));
      if (nk === v.k) { return; }
      var f = nk / v.k;
      v.x = cx - (cx - v.x) * f; v.y = cy - (cy - v.y) * f; v.k = nk;
      applyView(); scheduleSave();
    }
    function zoomCenter(f) { var vs = viewSize(); zoomAt(f, vs.w / 2, vs.h / 2); }

    /* ---------- pointer interaction ---------- */
    var drag = null;
    viewEl.addEventListener("pointerdown", function (ev) {
      if (ev.button > 0) { return; }
      var link = ev.target.closest && ev.target.closest(".cv-link-hit");
      var nodeEl = ev.target.closest && ev.target.closest(".cv-node");
      if (editing && !(nodeEl && nodeEl.querySelector("textarea"))) { commitEditing(); }
      if (link) {
        sel = null; selLink = link.getAttribute("data-link"); linking = false; restyle(); viewEl.focus({ preventScroll: true }); return;
      }
      if (nodeEl) {
        if (nodeEl.querySelector("textarea")) { return; }
        var id = nodeEl.getAttribute("data-id");
        if (linking && sel && sel !== id) { toggleLink(sel, id); linking = false; restyle(); return; }
        sel = id; selLink = null;
        var n = nodeById(id);
        drag = { kind: "node", id: id, sx: ev.clientX, sy: ev.clientY, ox: n.x, oy: n.y, moved: false, snap: snapshot() };
        try { viewEl.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        restyle(); viewEl.focus({ preventScroll: true });
        return;
      }
      if (linking) { linking = false; }
      sel = null; selLink = null; restyle();
      drag = { kind: "pan", sx: ev.clientX, sy: ev.clientY, ox: S.view.x, oy: S.view.y, moved: false };
      try { viewEl.setPointerCapture(ev.pointerId); } catch (e2) { /* ignore */ }
      viewEl.classList.add("panning");
      viewEl.focus({ preventScroll: true });
    });
    viewEl.addEventListener("pointermove", function (ev) {
      if (!drag) { return; }
      var dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) { return; }
      drag.moved = true;
      if (drag.kind === "node") {
        dragging = true;
        var n = nodeById(drag.id);
        n.x = Math.round(drag.ox + dx / S.view.k); n.y = Math.round(drag.oy + dy / S.view.k);
        els[n.id].style.left = n.x + "px"; els[n.id].style.top = n.y + "px";
        drawLinks();
      } else {
        panning = true;
        S.view.x = drag.ox + dx; S.view.y = drag.oy + dy; applyView();
      }
    });
    function endDrag() {
      if (!drag) { return; }
      var d = drag; drag = null;
      viewEl.classList.remove("panning");
      if (d.kind === "node" && d.moved) { undo.push(d.snap); if (undo.length > 40) { undo.shift(); } commit(); }
      if (d.kind === "pan" && d.moved) { scheduleSave(); }
      dragging = false; panning = false;
      syncTools();
    }
    viewEl.addEventListener("pointerup", endDrag);
    viewEl.addEventListener("pointercancel", endDrag);
    viewEl.addEventListener("dblclick", function (ev) {
      var nodeEl = ev.target.closest && ev.target.closest(".cv-node");
      if (nodeEl) { sel = nodeEl.getAttribute("data-id"); if (!nodeEl.querySelector("textarea")) { startEdit(sel, false); } return; }
      if (ev.target.closest && ev.target.closest(".cv-link-hit")) { return; }
      if (ev.target.closest && ev.target.closest(".cv-hint")) { return; }
      var p = toWorld(ev.clientX, ev.clientY);
      addNode(p.x - 60, p.y - 18, 0, null);
    });
    viewEl.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      var r = viewEl.getBoundingClientRect();
      zoomAt(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX - r.left, ev.clientY - r.top);
    }, { passive: false });
    viewEl.addEventListener("keydown", function (ev) {
      if (editing) { return; }
      var k = ev.key;
      if ((ev.ctrlKey || ev.metaKey) && (k === "z" || k === "Z")) { ev.preventDefault(); doUndo(); return; }
      if (k === "Tab") { ev.preventDefault(); addChild(); }
      else if (k === "Enter") { ev.preventDefault(); if (ev.shiftKey) { addSibling(); } else if (sel) { startEdit(sel, false); } else { addFree(); } }
      else if (k === "F2" && sel) { ev.preventDefault(); startEdit(sel, false); }
      else if (k === "Delete" || k === "Backspace") { ev.preventDefault(); deleteSel(); }
      else if (k === "Escape") { linking = false; sel = null; selLink = null; restyle(); }
    });

    /* ---------- toolbars ---------- */
    var boardSel = el("select"); boardSel.setAttribute("aria-label", "캔버스 선택");
    boardSel.addEventListener("change", function () { openBoard(boardSel.value); });
    var bNew = tb("+ 새 캔버스", "새 캔버스 만들기", function () {
      var name = window.prompt("새 캔버스 이름", "새 캔버스");
      if (!name || !name.trim()) { return; }
      var id = "b" + uid();
      boards = boards.concat([{ id: id, title: name.trim().slice(0, 40) }]);
      saveBoards(); H.safeSet("hds_board", id); openBoard(id);
    });
    var bRename = tb("이름", "캔버스 이름 바꾸기", function () {
      var b = boards.filter(function (x) { return x.id === boardId; })[0];
      var name = b && window.prompt("캔버스 이름", b.title);
      if (!name || !name.trim()) { return; }
      boards = boards.map(function (x) { return x.id === boardId ? Object.assign({}, x, { title: name.trim().slice(0, 40) }) : x; });
      saveBoards(); drawBoardSel();
    });
    var bDel = tb("삭제", "이 캔버스 삭제", function () {
      if (boards.length < 2) { window.alert("마지막 캔버스는 삭제할 수 없어요. 내용을 비우려면 아이디어를 지워 주세요."); return; }
      if (!window.confirm("이 캔버스와 안의 아이디어를 모두 삭제할까요?")) { return; }
      var gone = boardId;
      boards = boards.filter(function (x) { return x.id !== gone; });
      saveBoards();
      cfg.boardRef(gone).delete().catch(function () { /* ignore */ });
      openBoard(boards[0].id);
    });
    var lab = el("label", "cv-board"); lab.appendChild(el("span", "f-label", "캔버스")); lab.appendChild(boardSel);
    [lab, bNew, bRename, bDel, status].forEach(function (n) { tools.appendChild(n); });

    var tAdd = tb("+ 아이디어", "빈 아이디어 추가 (빈 곳 더블클릭도 가능)", addFree, "primary");
    var tChild = tb("+ 하위", "선택한 아이디어에서 뻗어 나가기 (Tab)", addChild);
    var tSib = tb("+ 같은 층", "선택한 아이디어와 같은 층에 추가 (Shift+Enter)", addSibling);
    var tLink = tb("연결", "선택한 아이디어와 다른 아이디어를 선으로 잇기 · 다시 잇는 선은 끊어져요", function () {
      if (!sel) { return; }
      linking = !linking; restyle();
    });
    var tEdit = tb("수정", "내용 고치기 (F2 · 더블클릭)", function () { if (sel) { startEdit(sel, false); } });
    var tDel = tb("삭제", "선택한 아이디어 또는 선 삭제 (Delete)", deleteSel);
    var tUndo = tb("↶ 되돌리기", "되돌리기 (Ctrl+Z)", doUndo);
    var sw = el("span", "cv-swatches");
    var swBtns = COLORS.map(function (c, i) {
      var b = el("button", "cv-sw cv-c" + i); b.type = "button"; b.title = c.name; b.setAttribute("aria-label", "색: " + c.name);
      b.addEventListener("click", function () { setColor(i); });
      sw.appendChild(b); return b;
    });
    var tSend = tb("→ 글감함", "선택한 아이디어를 글감 수집함으로 보내기", function () {
      var n = sel && nodeById(sel);
      if (!n || !cfg.onSendIdea) { return; }
      cfg.onSendIdea(n.text).then(function () { setStatus("글감 수집함에 보냈어요"); });
    });
    var zoomLabel = el("span", "cv-zoom", "100%");
    var tOut = tb("−", "축소", function () { zoomCenter(1 / 1.2); });
    var tIn = tb("+", "확대", function () { zoomCenter(1.2); });
    var tFit = tb("전체 보기", "모든 아이디어가 보이게 맞추기", fit);
    var tCopy = tb("개요 복사", "연결 관계를 들여쓰기 목록(개요)으로 복사", function () { H.copyText(outline(), tCopy); });
    [tAdd, tChild, tSib, tLink, tEdit, sw, tSend, tDel, tUndo].forEach(function (n) { tools2.appendChild(n); });
    var zoomBox = el("span", "cv-zoombox");
    [tOut, zoomLabel, tIn, tFit, tCopy].forEach(function (n) { zoomBox.appendChild(n); });
    tools2.appendChild(zoomBox);

    function syncTools() {
      var has = !!sel, node = sel && nodeById(sel);
      [tChild, tSib, tLink, tEdit, tSend].forEach(function (b) { b.disabled = !has; });
      tDel.disabled = !(has || selLink);
      tUndo.disabled = !undo.length;
      tLink.classList.toggle("on", linking);
      tLink.textContent = linking ? "연결 중… (대상을 누르세요)" : "연결";
      swBtns.forEach(function (b, i) { b.disabled = !has; b.classList.toggle("on", !!node && (node.color || 0) === i); });
    }

    function outline() {
      var incoming = {}, byId = {};
      S.nodes.forEach(function (n) { byId[n.id] = n; });
      S.links.forEach(function (l) { incoming[l.b] = true; });
      function byPos(a, b) { return (a.y - b.y) || (a.x - b.x); }
      var seen = {}, lines = [];
      function walk(n, d) {
        if (seen[n.id]) { return; }
        seen[n.id] = true;
        lines.push(new Array(d + 1).join("  ") + "- " + String(n.text || "").replace(/\s*\n\s*/g, " "));
        S.links.filter(function (l) { return l.a === n.id && byId[l.b]; }).map(function (l) { return byId[l.b]; }).sort(byPos).forEach(function (c) { walk(c, d + 1); });
      }
      S.nodes.filter(function (n) { return !incoming[n.id]; }).sort(byPos).forEach(function (n) { walk(n, 0); });
      S.nodes.slice().sort(byPos).forEach(function (n) { walk(n, 0); });
      return lines.join("\n");
    }
    root.__outline = outline;

    /* ---------- starter templates ---------- */
    var hintBtns = el("div", "cv-hint-btns");
    STARTERS.forEach(function (s) {
      var b = el("button", "btn", s.label + " 불러오기"); b.type = "button";
      b.addEventListener("click", function () {
        pushUndo();
        var vs = viewSize(), ids = [];
        S.nodes = s.nodes.map(function (t, i) { var n = { id: uid() + i, text: t[0], x: t[1] + 40, y: t[2] + vs.h / 2 - 20, color: t[3] }; ids.push(n.id); return n; });
        S.links = s.links.map(function (p) { return { a: ids[p[0]], b: ids[p[1]] }; });
        S.view = { x: 20, y: 0, k: 1 };
        renderNodes(); applyView(); fitSoon(); commit();
      });
      hintBtns.appendChild(b);
    });
    function fitSoon() { setTimeout(fit, 0); }
    var hintTitle = el("p", "cv-hint-title", "빈 캔버스예요");
    var hintText = el("p", "", "빈 곳을 두 번 누르거나 [+ 아이디어]로 시작하세요. 아이디어를 고르고 Tab을 누르면 가지가 뻗어요.");
    hint.appendChild(hintTitle); hint.appendChild(hintText); hint.appendChild(hintBtns);

    /* ---------- boards ---------- */
    function drawBoardSel() {
      while (boardSel.firstChild) { boardSel.removeChild(boardSel.firstChild); }
      boards.forEach(function (b) { var o = el("option", "", b.title); o.value = b.id; boardSel.appendChild(o); });
      boardSel.value = boardId;
    }
    function saveBoards() {
      cfg.boardsRef.set({ items: boards, updatedAt: new Date().toISOString() }, { merge: true })
        .catch(function (err) { window.alert("저장 실패: " + err.message); });
    }
    function openBoard(id) {
      if (saveTimer) { flush(); }
      if (boardUnsub) { boardUnsub(); boardUnsub = null; }
      boardId = id; loaded = false; sel = null; selLink = null; linking = false; undo = [];
      H.safeSet("hds_board", id);
      drawBoardSel();
      boardUnsub = App.watchDoc(cfg.boardRef(id), function (d) {
        if (loaded && (saveTimer || inflight || dragging || panning || editing)) { return; }
        var first = !loaded; loaded = true;
        if (!d) { d = { nodes: [], links: [], view: { x: 40, y: 40, k: 1 } }; }
        var same = JSON.stringify({ nodes: d.nodes || [], links: d.links || [] }) === snapshot();
        if (!first && same) { return; }
        S.nodes = (d.nodes || []).map(function (n) { return { id: n.id, x: Number(n.x) || 0, y: Number(n.y) || 0, text: String(n.text || ""), color: Number(n.color) || 0 }; });
        S.links = (d.links || []).filter(function (l) { return l && l.a && l.b; });
        if (first && d.view) { S.view = { x: Number(d.view.x) || 0, y: Number(d.view.y) || 0, k: Math.max(K_MIN, Math.min(K_MAX, Number(d.view.k) || 1)) }; }
        if (sel && !nodeById(sel)) { sel = null; }
        renderNodes(); applyView();
        if (first) { setStatus(""); }
      });
    }
    App.watchDoc(cfg.boardsRef, function (d) {
      var list = d && d.items && d.items.length ? d.items : [{ id: "main", title: "자유 캔버스" }];
      boards = list;
      if (!boardId) {
        var want = H.safeGet("hds_board");
        openBoard(boards.some(function (b) { return b.id === want; }) ? want : boards[0].id);
      } else { drawBoardSel(); }
    });
    applyView();

    return { root: root, outline: outline, state: S, fit: fit };
  };
})(window.App);
