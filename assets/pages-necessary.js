/* Hello dear Sunny — Necessary › PDF 나누기: 큰 PDF(스캔한 교재 등)를 N쪽마다 / 약 N MB씩 / 직접 쪽 범위로 나눠서 받기.
   파일은 이 브라우저 안에서만 처리하고 어디에도 올리지 않아요(Firestore에도 저장 안 함).
   pdf-lib · JSZip은 이 페이지를 열 때만 cdnjs에서 불러와요(App.pdfTools.load). */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el, clear = H.clear;

  var LIBS = {
    PDFLib: "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
    JSZip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
  };
  var loading = {};
  function loadLib(name) {
    if (window[name]) { return Promise.resolve(window[name]); }
    if (!loading[name]) {
      loading[name] = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = LIBS[name]; s.async = true;
        s.onload = function () { if (window[name]) { resolve(window[name]); } else { reject(new Error(name)); } };
        s.onerror = function () { delete loading[name]; reject(new Error(name)); };
        document.head.appendChild(s);
      });
    }
    return loading[name];
  }
  App.pdfTools = { load: function () { return Promise.all([loadLib("PDFLib"), loadLib("JSZip")]); } };

  function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + "MB" : Math.max(1, Math.round(b / 1024)) + "KB"; }
  function baseName(n) { return String(n || "문서").replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "_"); }

  /* "1-6, 7-40, 41" → [[1,6],[7,40],[41,41]] (1부터 세는 쪽 번호). 틀린 곳이 있으면 문자열로 이유를 돌려줘요 */
  function parseRanges(text, total) {
    var out = [], bad = null;
    String(text || "").split(/[,，\s]+/).filter(Boolean).forEach(function (part) {
      var m = /^(\d+)(?:\s*[-~]\s*(\d+))?$/.exec(part);
      if (!m) { bad = bad || "\"" + part + "\"을(를) 알아볼 수 없어요. 예: 1-6, 7-40"; return; }
      var a = Number(m[1]), b = Number(m[2] || m[1]);
      if (a < 1 || b < a || b > total) { bad = bad || "\"" + part + "\" 범위가 1~" + total + "쪽을 벗어나요."; return; }
      out.push([a, b]);
    });
    if (!bad && !out.length) { bad = "쪽 범위를 적어 주세요. 예: 1-6, 7-40"; }
    return bad || out;
  }
  /* 나누는 방법 → 쪽 범위 목록 */
  function planRanges(mode, value, total, fileSize) {
    var n;
    if (mode === "ranges") { return parseRanges(value, total); }
    if (mode === "size") {
      var mb = Number(value);
      if (!(mb > 0)) { return "몇 MB씩 나눌지 숫자로 적어 주세요."; }
      /* 쪽마다 크기가 비슷하다고 보고 어림잡아요(스캔본은 거의 비슷해요) */
      n = Math.max(1, Math.floor(mb * 1048576 / (fileSize / total)));
    } else {
      n = Math.floor(Number(value));
      if (!(n >= 1)) { return "몇 쪽씩 나눌지 1 이상의 숫자로 적어 주세요."; }
    }
    var out = [];
    for (var a = 1; a <= total; a += n) { out.push([a, Math.min(total, a + n - 1)]); }
    return out;
  }
  App.pdfTools.parseRanges = parseRanges;
  App.pdfTools.planRanges = planRanges;

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = el("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  App.page({
    id: "necessary-pdf", title: "PDF 나누기",
    render: function (view) {
      var state = { file: null, bytes: null, doc: null, total: 0, parts: [], busy: false };

      var c = ui.card(view, { tab: "PDF", tone: "t-1", title: "✂️ PDF 나누기", wide: true });
      c.el.classList.add("pdfs-card");
      c.body.appendChild(el("p", "hint pdfs-safe", "🔒 파일은 이 브라우저 안에서만 나눠요. 어디에도 올라가지 않고, 이 페이지를 닫으면 사라져요."));

      /* 1. 파일 고르기 (누르거나 끌어다 놓기) */
      var drop = el("label", "pdfs-drop");
      var input = el("input"); input.type = "file"; input.accept = "application/pdf,.pdf"; input.className = "pdfs-input";
      drop.appendChild(input);
      drop.appendChild(el("strong", "", "PDF 파일을 여기에 끌어다 놓거나 눌러서 고르세요"));
      drop.appendChild(el("span", "", "스캔한 교재처럼 큰 파일(수백 MB)도 돼요. 크면 읽는 데 조금 걸려요."));
      c.body.appendChild(drop);
      var info = el("p", "pdfs-info"); info.hidden = true;
      c.body.appendChild(info);

      /* 2. 나누는 방법 */
      var opts = el("div", "pdfs-opts"); opts.hidden = true;
      var MODES = [
        { key: "pages", label: "쪽 수로", unit: "쪽마다", def: "20", hint: "예: 20쪽마다 한 파일" },
        { key: "size", label: "크기로", unit: "MB씩 (어림)", def: "10", hint: "예: 약 10MB씩. Claude에게 올릴 때는 10MB 안쪽이 좋아요." },
        { key: "ranges", label: "직접 범위", unit: "", def: "", hint: "예: 1-6, 7-40, 41-80 (쉼표로 구분)" }
      ];
      var mode = "pages";
      var modeRow = el("div", "pdfs-modes");
      var valIn = el("input", "pdfs-val"); valIn.type = "text"; valIn.inputMode = "numeric"; valIn.value = "20";
      var unit = el("span", "pdfs-unit", "쪽마다");
      var modeHint = el("p", "hint pdfs-mode-hint", MODES[0].hint);
      MODES.forEach(function (m) {
        var b = el("button", "chip pdfs-mode" + (m.key === mode ? " active" : ""), m.label); b.type = "button";
        b.setAttribute("data-mode", m.key);
        b.addEventListener("click", function () {
          mode = m.key;
          Array.prototype.forEach.call(modeRow.children, function (x) { x.classList.toggle("active", x === b); });
          valIn.value = m.def; unit.textContent = m.unit; modeHint.textContent = m.hint;
          valIn.inputMode = m.key === "ranges" ? "text" : "numeric";
          valIn.placeholder = m.key === "ranges" ? "1-6, 7-40" : "";
          preview();
        });
        modeRow.appendChild(b);
      });
      opts.appendChild(modeRow);
      var valRow = el("div", "pdfs-val-row");
      valRow.appendChild(valIn); valRow.appendChild(unit);
      opts.appendChild(valRow);
      opts.appendChild(modeHint);
      var plan = el("p", "pdfs-plan");
      opts.appendChild(plan);
      var go = el("button", "btn pdfs-go", "나누기"); go.type = "button";
      opts.appendChild(go);
      c.body.appendChild(opts);
      var status = el("p", "pdfs-status"); status.hidden = true;
      c.body.appendChild(status);

      /* 3. 결과 */
      var rc = ui.card(view, { tab: "Files", tone: "t-2", title: "나눈 파일", wide: true });
      rc.el.classList.add("pdfs-result");
      rc.el.hidden = true;
      var tc = ui.card(view, { tab: "Tip", tone: "t-3", title: "나눈 뒤에 할 일", wide: true });
      var tips = el("ol", "pdfs-tips");
      ["[모두 받기 (ZIP)]이나 파일마다 [받기]를 눌러 내려받아요.",
        "받은 파일을 G:\\내 드라이브\\취미\\수학 폴더에 넣어요(구글 드라이브에 자동으로 올라가요).",
        "Claude에게 \"올렸어\"라고 말하면 그 폴더에서 차례로 읽어요.",
        "EBSi 전용 파일(.ebsi)처럼 잠긴 파일은 나눌 수 없어요. EBSi에서 PDF로 받아 주세요."
      ].forEach(function (t) { tips.appendChild(el("li", "", t)); });
      tc.body.appendChild(tips);

      function setStatus(t, err) { status.hidden = !t; status.textContent = t || ""; status.classList.toggle("err", !!err); }
      function preview() {
        if (!state.total) { return; }
        var r = planRanges(mode, valIn.value, state.total, state.file.size);
        if (typeof r === "string") { plan.textContent = "⚠ " + r; plan.classList.add("err"); go.disabled = true; return; }
        plan.classList.remove("err"); go.disabled = state.busy;
        plan.textContent = "→ " + r.length + "개 파일로 나눠요" + (mode === "size" ? " (파일당 약 " + Math.round(state.total / r.length) + "쪽)" : "") + ": " +
          r.slice(0, 6).map(function (x) { return x[0] === x[1] ? x[0] + "쪽" : x[0] + "–" + x[1] + "쪽"; }).join(", ") + (r.length > 6 ? " …" : "");
      }
      valIn.addEventListener("input", preview);

      function pick(file) {
        if (!file) { return; }
        if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") { setStatus("PDF 파일만 나눌 수 있어요. (" + file.name + ")", true); return; }
        state.file = file; state.doc = null; state.total = 0; state.parts = [];
        opts.hidden = true; rc.el.hidden = true; info.hidden = false;
        info.textContent = "📄 " + file.name + " · " + fmtSize(file.size) + " · 읽는 중…";
        setStatus("");
        App.pdfTools.load().then(function () {
          return file.arrayBuffer();
        }).then(function (buf) {
          return window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: false, updateMetadata: false });
        }).then(function (doc) {
          if (state.file !== file) { return; }
          state.doc = doc; state.total = doc.getPageCount();
          info.textContent = "📄 " + file.name + " · " + fmtSize(file.size) + " · 전체 " + state.total + "쪽 (한 쪽에 약 " + fmtSize(file.size / state.total) + ")";
          opts.hidden = false; preview();
        }).catch(function (e) {
          if (state.file !== file) { return; }
          var msg = /encrypt/i.test(String(e && e.message)) ? "암호가 걸린 PDF라서 나눌 수 없어요." :
            (/^(PDFLib|JSZip)$/.test(String(e && e.message)) ? "나누기 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요." : "이 파일을 PDF로 읽지 못했어요. 파일이 깨졌거나 PDF가 아닐 수 있어요.");
          info.textContent = "📄 " + file.name + " · " + fmtSize(file.size);
          setStatus(msg, true);
        });
      }
      input.addEventListener("change", function () { pick(input.files && input.files[0]); });
      ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
      ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove("over"); }); });
      drop.addEventListener("drop", function (e) { e.preventDefault(); pick(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });

      go.addEventListener("click", function () {
        var r = planRanges(mode, valIn.value, state.total, state.file.size);
        if (typeof r === "string" || !state.doc || state.busy) { return; }
        state.busy = true; go.disabled = true; state.parts = [];
        var PDFDocument = window.PDFLib.PDFDocument, base = baseName(state.file.name);
        var width = String(r.length).length < 2 ? 2 : String(r.length).length;
        var i = 0;
        function next() {
          if (i >= r.length) { done(); return; }
          var a = r[i][0], b = r[i][1];
          setStatus("만드는 중… " + (i + 1) + " / " + r.length + " (" + a + "–" + b + "쪽)");
          PDFDocument.create().then(function (out) {
            var idx = []; for (var p = a - 1; p < b; p++) { idx.push(p); }
            return out.copyPages(state.doc, idx).then(function (pages) {
              pages.forEach(function (pg) { out.addPage(pg); });
              return out.save();
            });
          }).then(function (bytes) {
            var no = String(i + 1); while (no.length < width) { no = "0" + no; }
            state.parts.push({ name: base + "_" + no + "_p" + a + "-" + b + ".pdf", from: a, to: b, blob: new Blob([bytes], { type: "application/pdf" }) });
            i++;
            setTimeout(next, 0); /* 화면이 멈추지 않게 한 파일씩 숨 돌리기 */
          }).catch(function () {
            state.busy = false; go.disabled = false;
            setStatus("나누다가 문제가 생겼어요(" + a + "–" + b + "쪽). 쪽 수를 줄여서 다시 해 보세요.", true);
          });
        }
        function done() {
          state.busy = false; go.disabled = false;
          var target = mode === "size" ? Number(valIn.value) * 1048576 : 0;
          var over = target ? state.parts.filter(function (p) { return p.blob.size > target * 1.15; }).length : 0;
          setStatus("✅ " + state.parts.length + "개 파일로 나눴어요." + (over ? " 그중 " + over + "개는 목표보다 커요. MB 숫자를 줄여서 다시 나눠 보세요." : ""));
          paintResult();
        }
        next();
      });

      function paintResult() {
        clear(rc.body); rc.el.hidden = false;
        var total = state.parts.reduce(function (s, p) { return s + p.blob.size; }, 0);
        rc.count.textContent = state.parts.length + "개 · " + fmtSize(total);
        var bar = el("div", "pdfs-bar");
        var zipBtn = el("button", "btn pdfs-zip", "모두 받기 (ZIP)"); zipBtn.type = "button";
        zipBtn.addEventListener("click", function () {
          zipBtn.disabled = true; zipBtn.textContent = "ZIP 만드는 중…";
          var zip = new window.JSZip();
          state.parts.forEach(function (p) { zip.file(p.name, p.blob); });
          /* PDF 안의 그림은 이미 압축돼 있어서 STORE(압축 안 함)가 빠르고 크기도 거의 같아요 */
          zip.generateAsync({ type: "blob", compression: "STORE" }).then(function (blob) {
            download(blob, baseName(state.file.name) + "_나눔.zip");
          }).catch(function () { setStatus("ZIP을 만들지 못했어요. 파일마다 [받기]를 눌러 주세요.", true); })
            .then(function () { zipBtn.disabled = false; zipBtn.textContent = "모두 받기 (ZIP)"; });
        });
        bar.appendChild(zipBtn);
        bar.appendChild(el("span", "hint", "ZIP이 너무 크면 파일마다 받는 게 더 빨라요."));
        rc.body.appendChild(bar);
        var list = el("ol", "pdfs-list");
        state.parts.forEach(function (p) {
          var li = el("li", "pdfs-item");
          li.appendChild(el("span", "pdfs-name", p.name));
          li.appendChild(el("span", "pdfs-meta", (p.to - p.from + 1) + "쪽 · " + fmtSize(p.blob.size)));
          var b = el("button", "btn ghost pdfs-get", "받기"); b.type = "button";
          b.addEventListener("click", function () { download(p.blob, p.name); });
          li.appendChild(b);
          list.appendChild(li);
        });
        rc.body.appendChild(list);
      }

      /* 페이지를 열면 도구를 미리 불러 둬요 */
      App.pdfTools.load().catch(function () { /* 파일을 고를 때 다시 시도하고 안내해요 */ });
    }
  });
})(window.App);
