/* Local self-test only (file:// + ?mock&selftest): walks every page and exercises add/edit/delete */
(function () {
  "use strict";
  var results = { ok: [], fail: [], errors: [] };
  var out = document.createElement("pre");
  out.id = "selftest";
  document.body.appendChild(out);
  window.addEventListener("error", function (e) { results.errors.push("onerror: " + e.message + " @" + String(e.filename || "").split("/").pop() + ":" + e.lineno); });
  window.addEventListener("unhandledrejection", function (e) { results.errors.push("rejection: " + (e.reason && e.reason.message || e.reason)); });
  console.error = function () { results.errors.push("console.error: " + Array.prototype.join.call(arguments, " ")); };
  window.confirm = function () { return true; };
  window.alert = function (m) { results.errors.push("alert: " + m); };
  window.__noAutofocus = true;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ok(name, cond, info) { (cond ? results.ok : results.fail).push(cond ? name : name + " :: " + (info || "")); }
  function P() { return App.proj; }
  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function submit(form) { form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); }
  function change(input) { input.dispatchEvent(new Event("change", { bubbles: true })); }
  function setVal(input, v) { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); }
  async function go(id) { location.hash = "#/" + id; await sleep(120); }
  function itemCount(p) { return $$(".item-card, .items-table tbody tr", p).length; }
  function fillForm(form) {
    $$("input, textarea, select", form).forEach(function (i) {
      if (i.tagName === "SELECT" || i.type === "checkbox") { return; }
      if (i.type === "number") { i.value = "7"; }
      else if (i.type === "date") { i.value = "2026-09-25"; }
      else if (i.type === "url") { i.value = "https://example.com/x"; }
      else { i.value = "테스트 " + Math.floor(Math.random() * 1000); }
    });
  }

  async function testPanels(id) {
    var n = $$("#view .items-panel").length;
    for (var pi = 0; pi < n; pi++) {
      var p = $$("#view .items-panel")[pi];
      var label = id + " panel#" + pi;
      var before = itemCount(p);
      var quick = $(".quick-add", p);
      if (quick) {
        var first = $("input", quick);
        first.value = "빠른 추가 항목";
        submit(quick);
      } else {
        var addBtn = $$(".items-tools .tool-btn", p).filter(function (b) { return b.textContent.charAt(0) === "+"; })[0];
        if (!addBtn) { ok(label + " add-button", false, "no + button"); continue; }
        addBtn.click(); await sleep(40);
        var form = $(".item-form", p);
        if (!form) { ok(label + " form", false, "form did not open"); continue; }
        fillForm(form); submit(form);
      }
      await sleep(80);
      p = $$("#view .items-panel")[pi];
      var after = itemCount(p);
      ok(label + " add", after === before + 1, before + "→" + after);
      var ed = $(".icon-btn[title='수정']", p);
      if (ed) {
        ed.click(); await sleep(40);
        var f2 = $(".item-form", p);
        ok(label + " edit-form", !!f2, "no edit form");
        if (f2) { var t = $("input:not([type=checkbox]):not([type=date]):not([type=number]), textarea", f2); if (t) { t.value = t.value + " (수정)"; } submit(f2); await sleep(60); }
        p = $$("#view .items-panel")[pi];
        ok(label + " edit-keeps-count", itemCount(p) === after, itemCount(p) + " vs " + after);
      }
      var del = $$(".icon-btn[title='삭제']", p).pop();
      if (del) {
        del.click(); await sleep(60);
        p = $$("#view .items-panel")[pi];
        ok(label + " delete", itemCount(p) === before, itemCount(p) + " vs " + before);
      }
    }
  }

  async function run() {
    for (var i = 0; i < 40 && !(window.App && App.owner && $("#view").children.length); i++) { await sleep(50); }
    ok("boot", !!(window.App && App.owner), "App.owner false");

    var ids = ["home"];
    App.MENU.forEach(function (g) { g.pages.forEach(function (p) { ids.push(p); }); });
    ok("page count", ids.length === 41, ids.length);
    for (var k = 0; k < ids.length; k++) {
      var id = ids[k];
      ok("registered " + id, !!App.pages[id], "missing page def");
      await go(id);
      var view = $("#view");
      ok("render " + id, view.children.length > 0 && !$(".error-card", view), $(".error-card", view) ? $(".error-card", view).textContent : "empty view");
      if (id === "home") { ok("home has no subnav", $("#subnav").hidden); }
      else {
        var act = $("#subnav a.active");
        ok("subnav-active " + id, !!act && act.getAttribute("data-page") === id, act ? act.getAttribute("data-page") : "none");
        ok("section-active " + id, !!$("#sections .active"), "no active section button");
      }
      if (id !== "home") { ok("head " + id, $("#pageHead .page-title") && $("#pageHead .page-title").textContent === App.pages[id].title, "title mismatch"); }
      if ($$("#view .items-panel").length) { await testPanels(id); }
    }

    /* custom flows */
    await go("home");
    ok("home tiles", $$("#view .tile").length === 6, $$("#view .tile").length);
    ok("top sections", $$("#sections .sec-btn").map(function (b) { return b.textContent; }).join(",") === "박사,작가,개인", $$("#sections .sec-btn").map(function (b) { return b.textContent; }).join(","));
    ok("home quote", !!$(".quote-text") && $(".quote-text").textContent.length > 4 && /—/.test($(".quote-author").textContent), $(".quote-author") && $(".quote-author").textContent);
    ok("quote data", App.QUOTES.length >= 30 && App.QUOTES.every(function (q) { return q.t && q.a && q.y; }), App.QUOTES.length);
    ok("home affiliation", /한국가이던스 대구점/.test($(".badges").textContent) && /범죄심리학과 석·박사 수료/.test($(".badges").textContent) && $$(".badge").length === 2);
    ok("home old profile removed", !$("#view [contenteditable]") && !$("#view .bio"));
    $("#sections .sec-btn[data-section='writer']").click(); await sleep(150);
    ok("section click -> writer", /#\/writer-/.test(location.hash) && !!$("#subnav .active"), location.hash);
    ok("subnav count writer", $$("#subnav a[data-page]").length === 11 && $$("#subnav .sub-group").length === 3 && $$("#subnav > *").length === 5, $$("#subnav a[data-page]").length + "/" + $$("#subnav .sub-group").length + "/" + $$("#subnav > *").length);
    $("#sections .sec-btn[data-section='thesis']").click(); await sleep(150);
    ok("subnav count thesis", $$("#subnav a[data-page]").length === 25, $$("#subnav a[data-page]").length);
    ok("thesis grouped menu", $$("#subnav .sub-group").length === 5 && $$("#subnav > *").length === 7, $$("#subnav .sub-group").length + "/" + $$("#subnav > *").length);
    var drop = $("#subnav .sub-drop"); drop.click(); ok("dropdown opens on click", drop.parentNode.classList.contains("open") && drop.getAttribute("aria-expanded") === "true");
    document.body.click(); ok("dropdown closes on outside click", !drop.parentNode.classList.contains("open"));
    await go("home");

    await go("ias-home");
    ok("ias empty notice", !!$("#view .ias-notice"));
    await App.ias.importData({ docs: { meta: { stage: "분석", info: { title: "테스트 IAS" } }, items: { items: [{ id: "i1", no: 1, final: "문항", factor: "죄책감 유발", flag: "삭제 검토" }] }, bogus: { x: 1 } } });
    await sleep(150);
    ok("ias import fills", !$("#view .ias-notice") && $("#view .flow-chip.active") && $("#view .flow-chip.active").textContent === "분석");
    await go("ias-items");
    ok("ias items table", $$("#view .items-table tbody tr").length === 1 && /삭제 검토 1/.test($("#view .items-summary").textContent), $("#view .items-summary").textContent);
    var iasExp = await App.ias.exportData();
    ok("ias export", iasExp.docs.meta && iasExp.docs.meta.info.title === "테스트 IAS" && !iasExp.docs.bogus);
    await go("thesis-home");
    ok("thesis-home ias card", /진행 중 논문 · IAS/.test($("#view").textContent) && /분석/.test($("#view").textContent));
    await go("home");

    /* 할 일 → Google Tasks (fake API) inside 일정 · 캘린더 */
    var realFetchT = window.fetch, gt = [], gtSeq = 0;
    window.fetch = function (url, opts) {
      url = String(url); opts = opts || {};
      if (url.indexOf("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks") === 0) {
        var m = url.match(/tasks\/([^/?]+)$/), method = opts.method || "GET", body = opts.body ? JSON.parse(opts.body) : null;
        function res(o, st) { return Promise.resolve({ ok: true, status: st || 200, json: function () { return Promise.resolve(o); } }); }
        if (method === "POST") { var nt = Object.assign({ id: "t" + (++gtSeq), status: "needsAction", position: String(gtSeq).padStart(5, "0") }, body); gt.push(nt); return res(nt); }
        if (method === "PATCH") { var x = gt.filter(function (q) { return q.id === decodeURIComponent(m[1]); })[0]; Object.assign(x, body); if (body.status === "completed") { x.completed = new Date().toISOString(); } return res(x); }
        if (method === "DELETE") { gt = gt.filter(function (q) { return q.id !== decodeURIComponent(m[1]); }); return res({}, 204); }
        return res({ items: gt.slice() });
      }
      return realFetchT.apply(window, arguments);
    };
    await App.col("todos").add({ text: "예전 할 일", done: false, createdAt: "2026-01-01T00:00:00Z" });
    await go("personal-calendar"); await sleep(120);
    ok("menu: no 할 일/메모/습관", !$("#subnav a[data-page='personal-todos']") && !$("#subnav a[data-page='personal-memos']") && !$("#subnav a[data-page='personal-habits']") && !!$("#subnav a[data-page='personal-budget']"));
    ok("calendar: no desc", !$("#pageHead .page-desc"));
    var todoC = cardBy("할 일 · Google Tasks");
    ok("todo card in calendar", !!todoC && /연결 안 됨/.test(todoC.textContent) && /예전 할 일 1개/.test(todoC.textContent));
    var tf = $("form.quick-add", todoC);
    setVal($("input", tf), "테스트 할 일"); $("input[type=date]", tf).value = "2026-10-01"; submit(tf); await sleep(250);
    ok("todo -> Google Tasks", gt.length === 1 && gt[0].title === "테스트 할 일" && gt[0].due === "2026-10-01T00:00:00.000Z", JSON.stringify(gt));
    ok("todo cache + list", window.__MOCK_STORE["personal/gtasks"].items.length === 1 && $$(".todo-item", cardBy("할 일 · Google Tasks")).length === 1 && /Google 연결됨/.test(cardBy("할 일 · Google Tasks").textContent));
    var tcb = $(".todo-item input[type=checkbox]", cardBy("할 일 · Google Tasks")); tcb.checked = true; change(tcb); await sleep(250);
    ok("todo done in Google", gt[0].status === "completed" && $(".todo-done", cardBy("할 일 · Google Tasks")).hidden === false, JSON.stringify(gt));
    var realConfirmT = window.confirm; window.confirm = function () { return true; };
    Array.prototype.filter.call(cardBy("할 일 · Google Tasks").querySelectorAll(".tool-btn"), function (b) { return /예전 할 일/.test(b.textContent); })[0].click(); await sleep(350);
    ok("legacy todos migrated", gt.some(function (q) { return q.title === "예전 할 일"; }) && !Object.keys(window.__MOCK_STORE).some(function (k) { return k.indexOf("todos/") === 0; }), JSON.stringify(gt));
    $(".todo-done .icon-btn", cardBy("할 일 · Google Tasks")).click(); await sleep(250);
    window.confirm = realConfirmT;
    ok("todo delete in Google", gt.length === 1 && gt[0].title === "예전 할 일", JSON.stringify(gt));
    var gC = cardBy("Google 캘린더 연동"), uC = cardBy("다가오는 일정 (전체)");
    ok("google/upcoming folded", gC.classList.contains("folded") && $(".card-body", gC).hidden && uC.classList.contains("folded"));
    $(".fold-btn", gC).click(); await sleep(30);
    ok("fold opens + remembered", !$(".card-body", gC).hidden && App.h.safeGet("hds_fold_gcal") === "1");
    $(".fold-btn", gC).click(); await sleep(30);
    await go("home"); await sleep(120);
    ok("home todo from Google", /예전 할 일/.test($("#view").textContent) && /남은 할 일/.test($("#view .tiles").textContent) && !$("#view .capture input[placeholder^='빠른 메모']"));
    window.fetch = realFetchT;
    await go("personal-calendar");
    var cell = $$("#view .cal-cell:not(.blank)")[14]; cell.click(); await sleep(60);
    var cf = $$("#view form.quick-add")[0];
    setVal($("input[placeholder='일정 제목']", cf), "테스트 일정"); submit(cf); await sleep(100);
    ok("calendar event", $$("#view .cal-dot").length >= 1 && $$("#view .upcoming-item").length >= 1, "dots=" + $$("#view .cal-dot").length);
    $$("#view .cal-head .tool-btn")[2].click(); await sleep(60);
    ok("calendar next-month", /\d+년 \d+월/.test($("#view .cal-title").textContent));

    await go("writer-log");
    var lf = $("#view form.quick-add:not(:first-child)");
    var lforms = $$("#view form.quick-add");
    lf = lforms[lforms.length - 1];
    setVal($("input[type=number]", lf), "800"); submit(lf); await sleep(80);
    ok("writing log add", $$("#view .log-item").length === 1 && $$("#view .bar").length === 7, $$("#view .log-item").length + "/" + $$("#view .bar").length);

    await go("thesis-overview");
    var titleIn = $("#view .fields-form input");
    titleIn.value = "테스트 논문 제목"; change(titleIn); await sleep(80);
    ok("fields save", window.__MOCK_STORE["research/thesis"] && window.__MOCK_STORE["research/thesis"].title === "테스트 논문 제목");
    var dl = $$("#view .fields-form input[type=date]")[0]; dl.value = "2026-12-31"; change(dl); await sleep(80);
    ok("deadline dday", $("#view .card-head .dday") && /D-/.test($("#view .card-head .dday").textContent), $("#view .card-head .dday") && $("#view .card-head .dday").textContent);

    await go("thesis-writing");
    ok("chapters default", $$("#view .item-card").length >= 6, $$("#view .item-card").length);
    $$("#view .tool-btn").filter(function (b) { return b.textContent.indexOf("양적 연구 표준 목차") !== -1; })[0].click(); await sleep(100);
    ok("chapters template", $$("#view .item-card").length === 9, $$("#view .item-card").length);
    var chip = $("#view .item-card .status-chip"); chip.click(); await sleep(80);
    ok("chapter status cycle", $("#view .item-card .status-chip").textContent !== "미착수");

    await go("thesis-concepts");
    $$("#view .tool-btn").filter(function (b) { return b.textContent.indexOf("기본 개념 예시") !== -1; })[0].click(); await sleep(100);
    ok("concept template", $$("#view .item-card").length === 6, $$("#view .item-card").length);

    /* thesis projects */
    function cardBy(title) { return $$("#view .card").filter(function (c) { return ($("h2", c) || {}).textContent === title; })[0]; }
    async function addVia(panelRoot, vals) {
      var addBtn = $$(".items-tools .tool-btn", panelRoot).filter(function (b) { return b.textContent.charAt(0) === "+"; })[0];
      addBtn.click(); await sleep(40);
      var form = $(".item-form", panelRoot);
      Object.keys(vals).forEach(function (k) { var i = $("[name='" + k + "']", form); if (i) { i.value = vals[k]; } });
      submit(form); await sleep(100);
    }
    App.h.safeSet("hds_proj", "p1");
    await go("thesis-home");
    ok("requirement default 0/2", /0\s*\/\s*2/.test($("#view .req-big").textContent), $("#view .req-big").textContent);
    ok("two default projects", $$("#view .items-panel")[0].querySelectorAll(".item-card").length === 2, $$("#view .items-panel")[0].querySelectorAll(".item-card").length);
    ok("stages by kind", App.proj.stagesFor({ kind: "실증 연구" }).length === 10 && App.proj.stagesFor({ kind: "척도 타당화" }).length === 11);
    $$("#view .items-panel")[0].querySelector(".item-card .copy-btn").click(); await sleep(200);
    ok("open project navigates", location.hash === "#/proj-overview" && $$("#view .proj-bar select option").length === 2, location.hash);
    ok("stepper chips", $$("#view .flow-chip").length === 11, $$("#view .flow-chip").length);
    ok("tasks grouped defaults", $$("#view .group-title").length >= 8, $$("#view .group-title").length);
    var foldersRoot = $(".items-panel", cardBy("자료 폴더 · 링크"));
    await addVia(foldersRoot, { name: "원자료", kind: "Google Drive", link: "https://drive.google.com/drive/folders/abc123" });
    await addVia($(".items-panel", cardBy("자료 폴더 · 링크")), { name: "분석 파일", kind: "내 컴퓨터 경로", link: "G:\내 드라이브\논문\분석" });
    var fc = cardBy("자료 폴더 · 링크");
    ok("folder link opens", !!$("a[href^='https://drive.google.com/drive/folders/abc123']", fc) && /폴더 열기/.test($("a[href^='https://drive.google.com']", fc).textContent));
    ok("folder path copy", !!$("code", fc) && /경로 복사/.test(fc.textContent), fc.textContent.slice(0, 200));
    $$("#view .flow-chip").filter(function (b) { return b.textContent === "게재 확정"; })[0].click(); await sleep(200);
    ok("stage saved", P().list.filter(function (p) { return p.id === "p1"; })[0].stage === "게재 확정");
    await go("thesis-home");
    ok("requirement counts accepted", /^1\s*\/\s*2/.test($("#view .req-big").textContent.trim()), $("#view .req-big").textContent);
    ok("global folders show project", /원자료/.test($("#view").textContent) && /학회지 논문 ①/.test($$("#view .card").filter(function (c) { return /논문 자료 폴더/.test(c.textContent); })[0].textContent));
    await go("proj-lit");
    var np = $(".items-panel", cardBy("문헌 노트 (이 프로젝트)"));
    await addVia(np, { cite: "테스트 서지 2026" });
    ok("scoped note visible", $$(".item-card", $(".items-panel", cardBy("문헌 노트 (이 프로젝트)"))).length === 1);
    var sel = $("#view .proj-bar select"); sel.value = "p2"; change(sel); await sleep(250);
    ok("project switched", $("#view .proj-bar select").value === "p2" && App.h.safeGet("hds_proj") === "p2");
    ok("scoped note hidden in other project", $$(".item-card", $(".items-panel", cardBy("문헌 노트 (이 프로젝트)"))).length === 0);
    await go("thesis-notes");
    ok("global notes aggregate", /테스트 서지 2026/.test($("#view").textContent));
    App.h.safeSet("hds_proj", "p1");
    await go("proj-translation");
    await addVia($(".items-panel", cardBy("문항 관리표")), { original: "I sometimes spread rumors", no: "1" });
    ok("item table row", $$("#view .items-table tbody tr").length >= 1 && /확정 0\/1/.test(cardBy("문항 관리표").textContent), cardBy("문항 관리표").textContent.slice(0, 160));
    await go("proj-analysis");
    await addVia($(".items-panel", cardBy("자료 수집 현황")), { name: "표본 1", target: "100", current: "40" });
    ok("sample progress", /40 \/ 100명/.test(cardBy("자료 수집 현황").textContent) && /전체 수집 40 \/ 목표 100명/.test(cardBy("자료 수집 현황").textContent));
    await addVia($(".items-panel", cardBy("모형 비교표 (CFA · SEM)")), { name: "bifactor", cfi: ".96" });
    var adopt = $("#view .items-table .cell-check", cardBy("모형 비교표 (CFA · SEM)")); adopt.checked = true; change(adopt); await sleep(120);
    ok("model adopted row", $$(".items-table tr.done", cardBy("모형 비교표 (CFA · SEM)")).length === 1);
    await go("proj-manuscript");
    ok("manuscript sections default", $$(".item-card", $(".items-panel", cardBy("원고 섹션 진행"))).length === 8);
    await go("proj-submit");
    await addVia($(".items-panel", cardBy("투고 후보 학술지 비교")), { name: "테스트 학술지" });
    ok("journal candidate", /테스트 학술지/.test(cardBy("투고 후보 학술지 비교").textContent));
    await go("thesis-refs");
    ok("scale text templates", $$("#view .card").some(function (c) { return /척도 타당화 결과 서술 문장/.test(c.textContent); }));

    await go("thesis-recommend");
    var rf = $("#view form.quick-add");
    setVal($("input", rf), "psychopathy"); submit(rf); await sleep(150);
    ok("interest add", $$("#view .interest-chip").length === 1, $$("#view .interest-chip").length);
    ok("interest scholar link", /scholar\.google\.com/.test($("#view .interest-chip a").href));

    /* google calendar (fake Google API responses) */
    var realFetch = window.fetch;
    var now = new Date();
    function at(h) { return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0).toISOString(); }
    function dk(n) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
    function ok200(obj) { return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(obj); } }); }
    var calls = [];
    window.fetch = function (url, opts) {
      url = String(url);
      if (url.indexOf("https://www.googleapis.com/calendar/v3") === 0) {
        calls.push(url);
        if (opts && opts.headers && opts.headers.Authorization !== "Bearer test-token") { return Promise.resolve({ ok: false, status: 401, json: function () { return Promise.resolve({ error: { message: "bad token" } }); } }); }
        if (url.indexOf("/users/me/calendarList") !== -1) { return ok200({ items: [{ id: "me@gmail.com", summary: "내 캘린더", primary: true }, { id: "hol", summary: "대한민국 휴일" }] }); }
        if (url.indexOf("/calendars/me%40gmail.com/events") !== -1) {
          return ok200({ items: [
            { id: "e1", summary: "구글 회의", start: { dateTime: at(14) }, end: { dateTime: at(15) }, htmlLink: "https://calendar.google.com/e1" },
            { id: "e2", summary: "종일 행사", start: { date: dk(0) }, end: { date: dk(2) } },
            { id: "e3", summary: "취소된 일정", status: "cancelled", start: { date: dk(1) }, end: { date: dk(2) } }
          ] });
        }
        return ok200({ items: [{ id: "h1", summary: "휴일 이벤트", start: { date: dk(3) }, end: { date: dk(4) } }] });
      }
      return realFetch.apply(window, arguments);
    };
    await go("personal-calendar");
    var gbtn = $$("#view .btn").filter(function (b) { return b.textContent.indexOf("Google 캘린더 연결") !== -1; })[0];
    ok("gcal connect button", !!gbtn);
    gbtn.click(); await sleep(400);
    var gd = window.__MOCK_STORE["personal/gcal"];
    ok("gcal synced", !!gd && gd.events.length === 2 && gd.calendars.length === 2, gd ? gd.events.length + "/" + gd.calendars.length : "no doc");
    ok("gcal primary on / other off", gd && gd.calendars[0].on === true && gd.calendars[1].on === false);
    ok("gcal cancelled skipped", gd && !gd.events.some(function (e) { return e.title === "취소된 일정"; }));
    ok("gcal all-day end inclusive", gd && gd.events.filter(function (e) { return e.title === "종일 행사"; })[0].end === dk(1), gd && JSON.stringify(gd.events.map(function (e) { return e.end; })));
    ok("gcal day list", /구글 회의/.test($("#view .card:nth-of-type(2)") ? $("#view .card:nth-of-type(2)").textContent : "") || $$("#view .upcoming-item").some(function (r) { return /구글 회의/.test(r.textContent); }));
    ok("gcal event link", $$("#view .upcoming-item a").some(function (a) { return /calendar\.google\.com/.test(a.href); }));
    ok("gcal status shown", /일정 2개/.test($$("#view .hint")[0].textContent + $$("#view .hint").map(function (h) { return h.textContent; }).join(" ")));
    var cbs = $$("#view input[type=checkbox]").filter(function (c) { return /가져오기/.test(c.getAttribute("aria-label") || ""); });
    ok("gcal calendar list", cbs.length === 2, cbs.length);
    cbs[1].checked = true; change(cbs[1]); await sleep(400);
    ok("gcal second calendar synced", window.__MOCK_STORE["personal/gcal"].events.length === 3, window.__MOCK_STORE["personal/gcal"].events.length);
    var selCat = $$("#view select").filter(function (s) { return /내 캘린더 분류/.test(s.getAttribute("aria-label") || ""); })[0];
    selCat.value = "회사"; change(selCat); await sleep(200);
    ok("gcal category saved", window.__MOCK_STORE["personal/gcal"].calendars[0].cat === "회사");

    await go("thesis-writing"); await sleep(150);
    ok("gcal not in thesis upcoming", !$$("#view .upcoming-item").some(function (r) { return /구글 회의/.test(r.textContent); }));
    await go("home"); await sleep(150);
    ok("gcal shows on home", $$("#view .mini-item").some(function (r) { return /구글 회의/.test(r.textContent); }));
    ok("gcal explain 403", /Calendar API/.test(App.gcal.explain({ status: 403, reason: "accessNotConfigured", message: "x" })));
    ok("gcal explain popup", /팝업/.test(App.gcal.explain({ code: "auth/popup-blocked" })));
    window.fetch = realFetch;

    /* ---------- 작가 섹션 ---------- */
    function pe(t, type, x, y) { t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, button: 0 })); }
    function key(t, k, extra) { t.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); }
    function tbtn(title) { return $$("#view .cv button").filter(function (b) { return b.title === title || b.title.indexOf(title) === 0; })[0]; }
    function nodesN() { return $$("#view .cv-node").length; }
    function linksN() { return $$("#view .cv-link").length; }
    function boardStore() { return window.__MOCK_STORE["writer/board_main"] || { nodes: [], links: [] }; }
    function tap(n) { var r = n.getBoundingClientRect(); pe(n, "pointerdown", r.left + 8, r.top + 8); pe(n, "pointerup", r.left + 8, r.top + 8); }

    await go("writer-desk");
    ok("desk cards", $$("#view .card").length >= 6 && !!$("#view .desk-prompt") && $("#view .desk-prompt").textContent.length > 8, $$("#view .card").length);
    var dq = $("#view form.quick-add");
    setVal($$("input", dq)[0], "책상에서 적은 글감"); submit(dq); await sleep(120);
    var ideasStore = window.__MOCK_STORE["writer/ideas"];
    ok("desk quick capture saves idea", !!ideasStore && ideasStore.items.some(function (x) { return x.text === "책상에서 적은 글감" && x.createdAt; }), JSON.stringify(ideasStore));
    $$("#view .items-tools .tool-btn").filter(function (b) { return b.textContent.indexOf("글감함에 저장") !== -1; })[0].click(); await sleep(120);
    ok("desk prompt -> idea", window.__MOCK_STORE["writer/ideas"].items.some(function (x) { return x.kind === "질문"; }));
    ok("desk recent ideas shown", $$("#view .upcoming-item").some(function (r) { return /책상에서 적은 글감/.test(r.textContent); }));

    await go("writer-canvas"); await sleep(150);
    ok("canvas mounts", !!$("#view .cv-view") && !!$("#view .cv-board select"), "no canvas");
    ok("canvas empty hint", !$("#view .cv-hint").hidden && $$("#view .cv-hint-btns .btn").length === 2);
    $$("#view .cv-hint-btns .btn")[0].click(); await sleep(120);
    ok("canvas starter template", nodesN() === 9 && linksN() === 8, nodesN() + "/" + linksN());
    ok("canvas hint hidden after nodes", $("#view .cv-hint").hidden);
    ok("canvas outline", /^- 이야기의 핵심\n {2}- /.test($("#view .cv").__outline()) && /- 인물/.test($("#view .cv").__outline()), $("#view .cv").__outline().slice(0, 80));

    var vw = $("#view .cv-view"), vr = vw.getBoundingClientRect();
    var nA = $$("#view .cv-node")[1], nB = $$("#view .cv-node")[2];
    tap(nA);
    ok("canvas select node", nA.classList.contains("sel") && !tbtn("선택한 아이디어에서 뻗어 나가기").disabled);
    var x0 = parseFloat(nA.style.left), rA = nA.getBoundingClientRect();
    pe(nA, "pointerdown", rA.left + 8, rA.top + 8);
    pe(vw, "pointermove", rA.left + 58, rA.top + 8);
    pe(vw, "pointerup", rA.left + 58, rA.top + 8);
    ok("canvas drag moves node", parseFloat(nA.style.left) > x0, x0 + "→" + nA.style.left);
    await sleep(700);
    ok("canvas autosave", boardStore().nodes.length === 9 && boardStore().links.length === 8 && !!boardStore().view, JSON.stringify(boardStore()).slice(0, 80));
    var l0 = linksN();
    tap(nA);
    tbtn("선택한 아이디어와 다른 아이디어를 선으로").click();
    ok("canvas link mode", nA.classList.contains("link-src"));
    tap(nB);
    ok("canvas link added", linksN() === l0 + 1, l0 + "→" + linksN());
    tap(nA);
    tbtn("선택한 아이디어와 다른 아이디어를 선으로").click(); tap(nB);
    ok("canvas link toggled off", linksN() === l0, l0 + "→" + linksN());
    tap(nA);
    var nBefore = nodesN(), lBefore = linksN();
    tbtn("선택한 아이디어에서 뻗어 나가기").click();
    var ta = $("#view .cv-edit");
    ok("canvas child opens editor", !!ta && nodesN() === nBefore + 1 && linksN() === lBefore + 1, nodesN() + "/" + linksN());
    ta.value = "새로 뻗은 가지"; key(ta, "Enter"); await sleep(60);
    ok("canvas child text saved", $$("#view .cv-node .cv-text").some(function (t) { return t.textContent === "새로 뻗은 가지"; }) && !$("#view .cv-edit"));
    var cnt = nodesN();
    tbtn("빈 아이디어 추가").click();
    var ta2 = $("#view .cv-edit"); ta2.value = "   "; key(ta2, "Enter"); await sleep(60);
    ok("canvas empty node discarded", nodesN() === cnt, cnt + "→" + nodesN());
    vw.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, clientX: vr.left + 30, clientY: vr.top + 30 }));
    var ta3 = $("#view .cv-edit"); ok("canvas dblclick adds", !!ta3 && nodesN() === cnt + 1);
    ta3.value = "더블클릭 아이디어"; key(ta3, "Enter"); await sleep(60);
    var newNode = $$("#view .cv-node").filter(function (n) { return /더블클릭/.test(n.textContent); })[0];
    tap(newNode);
    var c2 = nodesN(); key(vw, "Tab"); ok("canvas Tab adds child", nodesN() === c2 + 1 && !!$("#view .cv-edit"));
    var ta4 = $("#view .cv-edit"); ta4.value = "탭으로 만든 가지"; key(ta4, "Escape"); await sleep(40);
    ok("canvas Esc on new node discards", nodesN() === c2, c2 + "→" + nodesN());
    var pre = nodesN();
    newNode = $$("#view .cv-node").filter(function (n) { return /더블클릭/.test(n.textContent); })[0]; tap(newNode);
    key(vw, "Delete"); await sleep(40);
    ok("canvas Delete removes node", nodesN() === pre - 1, pre + "→" + nodesN());
    tbtn("되돌리기").click(); await sleep(40);
    ok("canvas undo restores", nodesN() === pre, nodesN());
    tap($$("#view .cv-node")[0]);
    $$("#view .cv-sw")[2].click();
    ok("canvas colour", $$("#view .cv-node")[0].classList.contains("cv-c2"));
    var ideasBefore = window.__MOCK_STORE["writer/ideas"].items.length;
    tbtn("선택한 아이디어를 글감 수집함으로").click(); await sleep(120);
    ok("canvas send to ideas", window.__MOCK_STORE["writer/ideas"].items.length === ideasBefore + 1 && window.__MOCK_STORE["writer/ideas"].items.some(function (x) { return (x.tags || []).indexOf("캔버스") !== -1; }));
    var z0 = $(".cv-zoom").textContent; tbtn("확대").click(); ok("canvas zoom", $(".cv-zoom").textContent !== z0, z0 + "→" + $(".cv-zoom").textContent);
    tbtn("모든 아이디어가 보이게").click(); ok("canvas fit", /%$/.test($(".cv-zoom").textContent));
    await sleep(700);
    window.prompt = function () { return "두 번째 캔버스"; };
    tbtn("새 캔버스 만들기").click(); await sleep(150);
    ok("canvas new board", $$("#view .cv-board option").length === 2 && nodesN() === 0 && !$("#view .cv-hint").hidden, $$("#view .cv-board option").length + "/" + nodesN());
    window.prompt = function () { return "이름 바꿈"; };
    tbtn("캔버스 이름 바꾸기").click(); await sleep(60);
    ok("canvas rename board", $$("#view .cv-board option").some(function (o) { return o.textContent === "이름 바꿈"; }));
    tbtn("이 캔버스 삭제").click(); await sleep(150);
    ok("canvas delete board", $$("#view .cv-board option").length === 1 && nodesN() > 0, $$("#view .cv-board option").length + "/" + nodesN());
    await go("writer-desk"); await go("writer-canvas"); await sleep(150);
    ok("canvas persists after reload", nodesN() >= 9 && linksN() >= 8, nodesN() + "/" + linksN());

    await go("writer-plot"); await sleep(100);
    ok("plot needs a work", !!$("#view .empty-state") && /작품/.test($(".proj-bar").textContent));
    await App.doc("writer/works").set({ items: [{ id: "w1", title: "테스트 장편", form: "소설", status: "집필중", genre: "스릴러" }, { id: "w2", title: "테스트 산문", form: "에세이", status: "구상" }] });
    await go("writer-plot"); await sleep(150);
    ok("plot switcher excludes essays", $$(".proj-bar option").length === 1 && $(".proj-bar select").value === "w1", $$(".proj-bar option").length);
    ok("plot renders panels", $$("#view .items-panel").length === 1 && $$("#view .fields-form").length === 1);
    var pf = $("#view .fields-form textarea"); pf.value = "테스트 로그라인"; change(pf); await sleep(80);
    ok("plot story saves per work", window.__MOCK_STORE["writer/wk_w1_story"] && window.__MOCK_STORE["writer/wk_w1_story"].premise === "테스트 로그라인");
    await testPanels("writer-plot");
    await go("writer-revise"); await sleep(150);
    ok("revise switcher lists all works", $$(".proj-bar option").length === 2, $$(".proj-bar option").length);
    ok("revise default checklist", $$("#view .items-panel .item-card").length === 16 && $$("#view .group-title").length === 4, $$("#view .items-panel .item-card").length + "/" + $$("#view .group-title").length);
    await testPanels("writer-revise");
    await go("writer-world"); await sleep(100);
    $$("#view .items-panel")[0].querySelectorAll(".items-tools .tool-btn").forEach(function (b) { if (b.textContent.charAt(0) === "+" && !$(".item-form")) { b.click(); } });
    await sleep(40);
    var wo = $$("#view .item-form select[name=work] option").map(function (o) { return o.textContent; }).join("|");
    ok("world work select lists works", wo === "(미지정)|테스트 장편|테스트 산문", wo);
    await go("writer-submit"); await sleep(100);
    $$("#view .items-tools .tool-btn").filter(function (b) { return b.textContent.charAt(0) === "+"; })[0].click(); await sleep(40);
    var sform = $("#view .item-form"); fillForm(sform); $("input[type=date]", sform).value = App.h.dateKey(App.h.addDays(new Date(), 5)); submit(sform); await sleep(100);
    ok("submission shows dday", !!$("#view .item-card .dday"), $("#view .item-card") && $("#view .item-card").textContent);
    await go("writer-desk"); await sleep(120);
    ok("desk shows work + deadline", $$("#view .desk-work").length >= 1 && $$("#view .upcoming-item").some(function (r) { return /D-/.test(r.textContent); }));
    await App.doc("writer/works").set({ items: [] });

    await go("personal-budget"); await sleep(120);
    var mk = App.budget.monthKey(new Date()), lk = "personal/ledger-" + mk;
    var bform = $("#view form.bud-form");
    setVal($("input.bud-money", bform), "12,500"); $$("input", bform).filter(function (i) { return /^내용/.test(i.placeholder); })[0].value = "점심"; submit(bform); await sleep(120);
    var led = window.__MOCK_STORE[lk];
    ok("budget entry saved", !!led && led.items.length === 1 && led.items[0].amount === 12500 && led.items[0].type === "지출", led && JSON.stringify(led.items));
    ok("budget entry listed", $$("#view .bud-entry").some(function (r) { return /점심/.test(r.textContent) && /12,500원/.test(r.textContent); }));
    ok("budget calendar amount", $$("#view .bud-cell.has").length === 1 && /1\.3만|1\.2만/.test($("#view .bud-cell.has").textContent), $("#view .bud-cell.has") && $("#view .bud-cell.has").textContent);
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "+ 고정지출 추가"; })[0].click(); await sleep(40);
    var fx = $$("#view form.item-form").filter(function (f) { return !f.classList.contains("bud-form"); })[0];
    var fxIn = $$("input", fx);
    fxIn[0].value = "월세"; setVal(fxIn[1], "500000"); fxIn[2].value = "31"; submit(fx); await sleep(120);
    ok("fixed saved", (window.__MOCK_STORE["personal/budget"].fixed || []).length === 1, JSON.stringify(window.__MOCK_STORE["personal/budget"]));
    var fcb = $("#view .bud-fixed input[type=checkbox]"); fcb.checked = true; change(fcb); await sleep(120);
    led = window.__MOCK_STORE[lk];
    ok("fixed reflected in ledger", led.items.length === 2 && led.items.some(function (i) { return i.fixedId && i.amount === 500000 && i.date === App.budget.fixedDate(mk, 31); }), JSON.stringify(led.items));
    ok("budget tiles", $$("#view .bud-tiles .tile").length === 6 && /512,500원/.test($("#view .bud-tiles").textContent), $("#view .bud-tiles").textContent);
    fcb = $("#view .bud-fixed input[type=checkbox]"); fcb.checked = false; change(fcb); await sleep(120);
    ok("fixed unreflected", window.__MOCK_STORE[lk].items.length === 1);
    var pasted = "항목\t월 금액\n월세\t400,000원\n정수기 렌탈\t40,000원\n클로드\t약 31,000원\n통신비\t30,000원 15일\n유독\t12,900원\n쿠팡 와우\t7,890원\n옵시디언\t약 7,000원\nT우주 (구글 AI 플러스)\t6,900원\n쓱7클럽\t2,900원\n합계\t약 538,600원";
    var pr = App.budget.parseFixed(pasted);
    ok("bulk parse", pr.length === 9 && pr.reduce(function (s, r) { return s + r.amount; }, 0) === 538590, JSON.stringify(pr));
    ok("bulk parse names", pr[2].name === "클로드" && pr[7].name === "T우주 (구글 AI 플러스)" && pr[8].name === "쓱7클럽" && pr[3].day === 15 && pr[0].cat === "주거 · 관리비" && pr[3].cat === "통신" && pr[4].cat === "구독", JSON.stringify(pr));
    var pr2 = App.budget.parseFixed("기름값 120,000원 1일\n차량관리비 30,000원 1일\n쿠팡 와우 7,890원 16일");
    ok("bulk parse car + day", pr2.length === 3 && pr2[0].cat === "교통" && pr2[1].cat === "교통" && pr2[1].day === 1 && pr2[2].day === 16 && pr2[2].name === "쿠팡 와우", JSON.stringify(pr2));
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "여러 개 붙여넣기"; })[0].click(); await sleep(40);
    var realAlert = window.alert; window.alert = function () {};
    var bulk = $("#view form.obs-import"); $("textarea", bulk).value = pasted; submit(bulk); await sleep(120);
    window.alert = realAlert;
    var fxs = window.__MOCK_STORE["personal/budget"].fixed;
    ok("bulk add (월세 dedup keeps 1)", fxs.length === 9 && fxs.filter(function (f) { return f.name === "월세"; })[0].amount === 400000, fxs.length);
    /* fixed income: day optional (미정) */
    ok("fixed view starts on 지출", $("#view .bud-sw h2").textContent === "고정지출" && $$("#view .bud-fixed").length === 9 && $$("#view .tool-btn").filter(function (b) { return b.textContent === "+ 고정수입 추가"; })[0].hidden);
    $$("#view .bud-arr")[1].click(); await sleep(60);
    ok("arrow -> 고정수입 view", $("#view .bud-sw h2").textContent === "고정수입" && /Income/i.test($("#view .bud-sw").closest(".card").querySelector(".tab-label").textContent) && $$("#view .bud-fixed").length === 0 && $$("#view .bud-dot")[1].classList.contains("on"), $("#view .bud-sw h2").textContent);
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "+ 고정수입 추가"; })[0].click(); await sleep(40);
    fx = $$("#view form.item-form").filter(function (f) { return !f.classList.contains("bud-form"); })[0]; fxIn = $$("input", fx);
    fxIn[0].value = "박사연구지원금"; setVal(fxIn[1], "1580000"); fxIn[2].value = ""; submit(fx); await sleep(120);
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "+ 고정수입 추가"; })[0].click(); await sleep(40);
    fx = $$("#view form.item-form").filter(function (f) { return !f.classList.contains("bud-form"); })[0]; fxIn = $$("input", fx);
    fxIn[0].value = "마테마타 수학학원"; setVal(fxIn[1], "400000"); fxIn[2].value = "13"; submit(fx); await sleep(120);
    fxs = window.__MOCK_STORE["personal/budget"].fixed;
    var incs = fxs.filter(function (f) { return f.kind === "수입"; });
    ok("fixed income saved", incs.length === 2 && incs.some(function (f) { return f.name === "박사연구지원금" && f.day === null && f.cat === "부수입"; }) && incs.some(function (f) { return f.day === 13; }), JSON.stringify(incs));
    ok("income view lists only income", $$("#view .bud-fixed").length === 2 && /입금일 미정/.test($("#view .bud-fixed-list").textContent) && /고정지출 빼고 남는 돈/.test($("#view .bud-sw").closest(".card").textContent), $("#view .bud-fixed-list").textContent);
    var icb = $$("#view .bud-fixed.inc input[type=checkbox]")[0]; icb.checked = true; change(icb); await sleep(120);
    led = window.__MOCK_STORE[lk];
    ok("fixed income reflected as 수입", led.items.some(function (i) { return i.fixedId && i.type === "수입"; }), JSON.stringify(led.items));
    $$("#view .bud-arr")[0].click(); await sleep(60);
    ok("arrow back -> 고정지출 view", $("#view .bud-sw h2").textContent === "고정지출" && $$("#view .bud-fixed").length === 9 && !$("#view .bud-fixed.inc"), $$("#view .bud-fixed").length);    /* reflect all expenses, then clear them all — income stays */
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "미반영 모두 이번 달에 반영"; })[0].click(); await sleep(120);
    var realConfirm = window.confirm; window.confirm = function () { return true; };
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "고정지출 전체 삭제"; })[0].click(); await sleep(150);
    window.confirm = realConfirm;
    fxs = window.__MOCK_STORE["personal/budget"].fixed; led = window.__MOCK_STORE[lk];
    ok("clear fixed expenses keeps income", fxs.length === 2 && fxs.every(function (f) { return f.kind === "수입"; }), JSON.stringify(fxs));
    ok("clear removes recorded fixed expenses only", led.items.filter(function (i) { return i.fixedId && i.type !== "수입"; }).length === 0 && led.items.some(function (i) { return i.fixedId && i.type === "수입"; }) && led.items.some(function (i) { return !i.fixedId; }), JSON.stringify(led.items));
    /* layout: ledger sits under the fixed card in the left column */
    var bcols = $$("#view .bud-col");
    ok("ledger left, calendar then fixed right", bcols[0].contains($("#view form.bud-form")) && !bcols[0].contains($("#view .bud-sw")) && bcols[1].contains($("#view .bud-cal")) && bcols[1].contains($("#view .bud-sw")) && (bcols[1].querySelector(".bud-cal").compareDocumentPosition(bcols[1].querySelector(".bud-sw")) & 4));
    ok("budget head: tabs, no desc", !$("#pageHead .page-desc") && $$("#pageHead .bud-tab").length === 2 && /on/.test($("#pageHead .bud-tab").className));
    /* 지출 filter hides fixed expenses; 고정지출 shows only them */
    var fixItem = { id: "fxT", date: App.budget.fixedDate(mk, 2), type: "지출", cat: "통신", amount: 30000, method: "카드", memo: "통신비", fixedId: "zzz" };
    await App.budget.ledgerRef(mk).set({ items: window.__MOCK_STORE[lk].items.concat([fixItem]) }, { merge: true }); await sleep(120);
    $$("#view .bud-ftypes .chip").filter(function (b) { return b.textContent === "지출"; })[0].click(); await sleep(40);
    ok("지출 filter excludes fixed", !$$("#view .bud-list .bud-entry").some(function (r) { return /통신비/.test(r.textContent); }) && $$("#view .bud-list .bud-entry").length > 0);
    $$("#view .bud-ftypes .chip").filter(function (b) { return b.textContent === "고정지출"; })[0].click(); await sleep(40);
    ok("고정지출 filter only fixed", $$("#view .bud-list .bud-entry").length >= 1 && $$("#view .bud-list .bud-entry").every(function (r) { return /고정지출/.test(r.textContent); }));
    $$("#view .bud-ftypes .chip").filter(function (b) { return b.textContent === "전체"; })[0].click(); await sleep(40);
    /* ledger: select all / select delete */
    var n0 = window.__MOCK_STORE[lk].items.length;
    var sa = $("#view .bud-selall input"); sa.checked = true; change(sa); await sleep(40);
    ok("ledger select all", $$("#view .bud-list .bud-pick").length === n0 && $$("#view .bud-list .bud-pick").every(function (c) { return c.checked; }) && /선택 삭제 \(/.test($("#view .bud-selbar .danger").textContent), $$("#view .bud-list .bud-pick").length + "/" + n0);
    sa = $("#view .bud-selall input"); sa.checked = false; change(sa); await sleep(40);
    ok("ledger select none", $$("#view .bud-list .bud-pick:checked").length === 0 && $("#view .bud-selbar .danger").disabled);
    var p1 = $$("#view .bud-list .bud-pick")[0]; p1.checked = true; change(p1); await sleep(40);
    realConfirm = window.confirm; window.confirm = function () { return true; };
    $("#view .bud-selbar .danger").click(); await sleep(120);
    ok("ledger select delete", window.__MOCK_STORE[lk].items.length === n0 - 1, window.__MOCK_STORE[lk].items.length + "/" + n0);
    /* fixed: 선택 mode on the 고정수입 view */
    $$("#view .bud-arr")[1].click(); await sleep(60);
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "선택"; })[0].click(); await sleep(40);
    ok("fixed pick mode", $$("#view .bud-fixed .bud-pick").length === 2 && $$("#view .tool-btn").filter(function (b) { return b.textContent === "+ 고정수입 추가"; })[0].hidden);
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "전체 선택"; })[0].click(); await sleep(40);
    ok("fixed pick all", $$("#view .bud-fixed .bud-pick:checked").length === 2 && $$("#view .tool-btn").some(function (b) { return b.textContent === "전체 해제"; }));
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "전체 해제"; })[0].click(); await sleep(40);
    var fp = $("#view .bud-fixed .bud-pick"); fp.checked = true; change(fp); await sleep(40);
    Array.prototype.filter.call($("#view .bud-sw").closest(".card").querySelectorAll(".tool-btn"), function (b) { return /^선택 삭제/.test(b.textContent); })[0].click(); await sleep(120);
    window.confirm = realConfirm;
    ok("fixed pick delete", window.__MOCK_STORE["personal/budget"].fixed.length === 1 && !$("#view .bud-fixed .bud-pick"), JSON.stringify(window.__MOCK_STORE["personal/budget"].fixed));
    $$("#view .bud-arr")[0].click(); await sleep(40);    /* phone payment notifications */
    var PN = App.budget.parseNotice, sep = new Date(2026, 8, 28);
    var n1 = PN("iM뱅크 09/27 13:52\n50813*03093\n입금 1,000,000\n잔액 1,189,248\n토스박선영", sep);
    ok("notice iM deposit", n1.ok && n1.type === "수입" && n1.amount === 1000000 && n1.date === "2026-09-27" && n1.time === "13:52" && n1.merchant === "토스박선영" && n1.source === "iM뱅크" && n1.method === "계좌이체", JSON.stringify(n1));
    var n2 = PN("[Web발신]\n신한카드(1234)승인 박*영 12,500원(일시불)09/27 13:52 스타벅스 누적1,234,567원", sep);
    ok("notice shinhan approval", n2.ok && n2.type === "지출" && n2.amount === 12500 && n2.merchant === "스타벅스" && n2.source === "신한카드(1234)" && !n2.cancel && App.budget.guessMerchantCat(n2.merchant, "지출") === "카페 · 간식", JSON.stringify(n2));
    var n3 = PN("신한카드(1234)취소 박*영 12,500원(일시불)09/28 09:10 스타벅스 누적1,222,067원", sep);
    ok("notice shinhan cancel", n3.ok && n3.cancel && n3.amount === 12500, JSON.stringify(n3));
    var n4 = PN("iM뱅크 12/30 10:00 50813*03093 출금 55,000 잔액 1,134,248 관리비", new Date(2027, 0, 3));
    ok("notice withdrawal + year rollover", n4.ok && n4.type === "지출" && n4.date === "2026-12-30" && n4.merchant === "관리비", JSON.stringify(n4));
    ok("notice unreadable", !PN("안녕하세요 광고 문자입니다").ok);
    var h1 = PN("[Web발신]\n현대카드 승인\n박*영\n45,000원 일시불\n09/27 18:20\n(주)이마트 성수점\n누적 1,234,567원", sep);
    ok("notice hyundai multiline", h1.ok && h1.type === "지출" && h1.amount === 45000 && h1.merchant === "이마트 성수점" && h1.source === "현대카드" && h1.time === "18:20", JSON.stringify(h1));
    var h2 = PN("현대카드(5678) 승인 박*영 12,000원 할부 3개월 09/26 11:05 쿠팡 누적1,000원", sep);
    ok("notice hyundai one line + 할부", h2.ok && h2.amount === 12000 && h2.merchant === "쿠팡" && h2.source === "현대카드(5678)", JSON.stringify(h2));
    var h3 = PN("현대카드 M 취소 박*영 45,000원 09/28 10:00 이마트 성수점", sep);
    ok("notice hyundai cancel", h3.ok && h3.cancel && h3.amount === 45000 && h3.merchant === "이마트 성수점", JSON.stringify(h3));
    var k1 = PN("[KB]09/27 13:52\n801202**178\n박선영\n전자금융입금\n1,000,000\n잔액1,189,248", sep);
    ok("notice KB deposit", k1.ok && k1.type === "수입" && k1.amount === 1000000 && k1.merchant === "박선영" && k1.source === "KB국민은행", JSON.stringify(k1));
    var k2 = PN("[KB]09/26 08:10 801202**178 스타벅스 체크카드출금 5,600 잔액1,183,648", sep);
    ok("notice KB check-card withdrawal", k2.ok && k2.type === "지출" && k2.amount === 5600 && k2.merchant === "스타벅스" && k2.source === "KB국민은행", JSON.stringify(k2));
    var d1 = PN("DGB대구은행 09/25 09:00 508-13-***093 출금 30,000원 잔액 159,248원 SKT통신요금", sep);
    ok("notice DGB -> iM뱅크", d1.ok && d1.type === "지출" && d1.amount === 30000 && d1.source === "iM뱅크" && /SKT통신요금/.test(d1.merchant), JSON.stringify(d1));
    var now2 = new Date(), md = String(now2.getMonth() + 1).padStart(2, "0") + "/" + String(now2.getDate()).padStart(2, "0");
    var shTxt = "신한카드(1234)승인 박*영 8,900원(일시불)" + md + " 12:01 메가MGC커피 누적1,000원";
    await App.col("budgetInbox").add({ text: shTxt, k: "x" });
    await App.col("budgetInbox").add({ text: "[Web발신] " + shTxt, k: "x" });
    await App.col("budgetInbox").add({ text: "iM뱅크 " + md + " 09:00 50813*03093 입금 400,000 잔액 1,589,248 마테마타", k: "x" });
    await App.col("budgetInbox").add({ text: "광고입니다", k: "x" });
    await sleep(150);
    ok("inbox shown + SMS/push merged", !$("#view .bud-inbox").hidden && $$("#view .bud-noti").length === 3 && $$("#view .bud-noti.bad").length === 1, $$("#view .bud-noti").length);
    var nBefore = window.__MOCK_STORE[lk].items.length;
    $$("#view .bud-inbox .btn").filter(function (b) { return /^모두 추가/.test(b.textContent); })[0].click(); await sleep(200);
    var ledNow = window.__MOCK_STORE[lk].items;
    ok("inbox add all", ledNow.length === nBefore + 2 && ledNow.some(function (i) { return i.memo === "메가MGC커피" && i.amount === 8900 && i.cat === "카페 · 간식" && /^noti:/.test(i.src); }) && ledNow.some(function (i) { return i.type === "수입" && i.amount === 400000; }), JSON.stringify(ledNow.slice(-2)));
    ok("inbox leaves unreadable only", Object.keys(window.__MOCK_STORE).filter(function (k) { return k.indexOf("budgetInbox/") === 0; }).length === 1 && $$("#view .bud-noti").length === 1);
    $("#view .bud-noti .icon-btn").click(); await sleep(120);
    ok("inbox empty -> hidden", $("#view .bud-inbox").hidden && !Object.keys(window.__MOCK_STORE).some(function (k) { return k.indexOf("budgetInbox/") === 0; }));    /* 월별 리포트 */
    await App.budget.ledgerRef(App.budget.monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1))).set({ items: [{ id: "pm1", date: "2000-01-01", type: "지출", cat: "식비", amount: 200000, method: "카드", memo: "지난달" }] });
    $$("#pageHead .bud-tab")[1].click(); await sleep(250);
    ok("report page", location.hash === "#/personal-budget-report" && $("#pageHead .bud-tab.on").textContent === "월별 리포트" && !$("#pageHead .page-desc"));
    ok("report chart lines", $$("#view .bud-chart path.bud-line").length === 2 && $$("#view .bud-chart circle.bud-dot-pt.exp").length === 12 && $$("#view .bud-rep-table tbody tr").length === 12, $$("#view .bud-chart path.bud-line").length + "/" + $$("#view .bud-chart circle.bud-dot-pt.exp").length);
    ok("report tiles", $$("#view .bud-tiles .tile").length === 6 && /200,000원/.test($("#view .bud-tiles").textContent), $("#view .bud-tiles").textContent);
    $$("#view .bud-rep-filters .chip").filter(function (b) { return b.textContent === "최근 6개월"; })[0].click(); await sleep(150);
    ok("report range 6", $$("#view .bud-chart circle.bud-dot-pt.exp").length === 6 && $$("#view .bud-rep-table tbody tr").length === 6);
    $$("#view .bud-legend-item")[1].click(); await sleep(60);
    ok("report legend toggle", $$("#view .bud-chart path.bud-line").length === 1);
    var hit = $$("#view .bud-hit").pop(); hit.dispatchEvent(new Event("mouseenter")); await sleep(30);
    ok("report tooltip", !$("#view .bud-tip").hidden && /지출/.test($("#view .bud-tip").textContent));
    $$("#view .bud-rep-table tbody a")[1].click(); await sleep(250);
    ok("report row opens that month", location.hash === "#/personal-budget" && /지난달/.test($("#view .bud-list").textContent), $("#view .bud-month").textContent);
    App.h.safeSet("hds_bud_range", "12");    await go("home");
    await sleep(80);
    ok("home reflects data", /이번 달 지출/.test($("#view .tiles").textContent) && $$("#view .tile-value").length === 6);

    document.title = "SELFTEST DONE";
    out.textContent = JSON.stringify({ passed: results.ok.length, failed: results.fail, errors: results.errors }, null, 1);
  }
  run().catch(function (e) {
    results.errors.push("run crashed: " + (e && e.stack || e));
    document.title = "SELFTEST DONE";
    out.textContent = JSON.stringify({ passed: results.ok.length, failed: results.fail, errors: results.errors }, null, 1);
  });
})();
