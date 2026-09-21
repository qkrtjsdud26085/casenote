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
    ok("page count", ids.length === 44, ids.length);
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
    ok("top sections", $$("#sections .sec-btn").map(function (b) { return b.textContent; }).join(",") === "박사,작가,개인,회사", $$("#sections .sec-btn").map(function (b) { return b.textContent; }).join(","));
    ok("home quote", !!$("#view .quote-text") && $("#view .quote-text").textContent.length > 4 && /—/.test($("#view .quote-author").textContent), $("#view .quote-author") && $("#view .quote-author").textContent);
    ok("quote data", App.QUOTES.length >= 30 && App.QUOTES.every(function (q) { return q.t && q.a && q.y; }), App.QUOTES.length);
    ok("home affiliation", /한국가이던스 대구점/.test($("#view .badges").textContent) && /범죄심리학과 석·박사 수료/.test($("#view .badges").textContent) && $$("#view .badge").length === 2);
    ok("home old profile removed", !$("#view [contenteditable]") && !$("#view .bio"));
    $("#sections .sec-btn[data-section='writer']").click(); await sleep(150);
    ok("section click -> writer", /#\/writer-/.test(location.hash) && !!$("#subnav .active"), location.hash);
    ok("subnav count writer", $$("#subnav a[data-page]").length === 11 && $$("#subnav .sub-group").length === 3 && $$("#subnav > *").length === 5, $$("#subnav a[data-page]").length + "/" + $$("#subnav .sub-group").length + "/" + $$("#subnav > *").length);
    $("#sections .sec-btn[data-section='thesis']").click(); await sleep(150);
    ok("subnav count thesis", $$("#subnav a[data-page]").length === 21, $$("#subnav a[data-page]").length);
    ok("thesis grouped menu", $$("#subnav .sub-group").length === 4 && $$("#subnav > *").length === 6, $$("#subnav .sub-group").length + "/" + $$("#subnav > *").length);
    var drop = $("#subnav .sub-drop"); drop.click(); ok("dropdown opens on click", drop.parentNode.classList.contains("open") && drop.getAttribute("aria-expanded") === "true");
    document.body.click(); ok("dropdown closes on outside click", !drop.parentNode.classList.contains("open"));
    await go("home");

    await go("personal-todos");
    var tf = $("#view form.quick-add");
    setVal($("input", tf), "테스트 할 일"); submit(tf); await sleep(80);
    ok("todo add", $$("#view .todo-item").length === 1, $$("#view .todo-item").length);
    var cb = $("#view .todo-item input[type=checkbox]"); cb.checked = true; change(cb); await sleep(80);
    ok("todo done", $$("#view .todo-item.done").length === 1);
    $$("#view .tool-btn").filter(function (b) { return b.textContent.indexOf("완료 항목 삭제") !== -1; })[0].click(); await sleep(80);
    ok("todo clear-done", $$("#view .todo-item").length === 0);

    await go("personal-memos");
    var mf = $("#view form.quick-add");
    setVal($("textarea", mf), "메모 본문"); submit(mf); await sleep(80);
    ok("memo add", $$("#view .memo-item").length === 1);
    $("#view .memo-item .icon-btn").click(); await sleep(80);
    ok("memo delete", $$("#view .memo-item").length === 0);

    await go("personal-habits");
    var hf = $("#view form.quick-add");
    setVal($("input", hf), "테스트 습관"); submit(hf); await sleep(80);
    ok("habit add", $$("#view .habit-item").length === 1);
    $$("#view .habit-dot").pop().click(); await sleep(80);
    ok("habit check", $$("#view .habit-dot.done").length === 1);

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

    await go("company-worklog");
    var of = $("#view form.obs-import");
    $("textarea", of).value = "## 9/16\n- [x] [[봉무초등학교]] 완료 항목\n- [ ] [[만촌초등학교]] 미완료 항목";
    submit(of); await sleep(100);
    ok("worklog import", $$("#view .obs-item").length === 2 && $$("#view .open-item").length === 1, $$("#view .obs-item").length + "/" + $$("#view .open-item").length);

    await go("company-flow");
    var ff = $("#view form.obs-import");
    $("textarea", ff).value = "## 1. 유선 마케팅\n첫째 내용\n\n## 2. 주문 접수\n**둘째** 내용";
    submit(ff); await sleep(100);
    ok("flow import", $$("#view .flow-chip").length === 2, $$("#view .flow-chip").length);
    $$("#view .flow-chip")[1].click(); await sleep(50);
    ok("flow detail", /둘째/.test($("#view .flow-detail").textContent));

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
    await go("company-pipeline"); await sleep(150);
    ok("gcal shows in company upcoming", $$("#view .upcoming-item").some(function (r) { return /구글 회의/.test(r.textContent); }));
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

    await go("company-billing");
    var bf = $$("#view .items-tools .tool-btn").filter(function (b) { return b.textContent.charAt(0) === "+"; })[0];
    bf.click(); await sleep(40);
    var bform = $("#view .item-form"); fillForm(bform); submit(bform); await sleep(80);
    var checks = $$("#view .items-table .cell-check");
    ok("billing checks", checks.length === 5, checks.length);
    checks.forEach(function (c) { c.checked = true; change(c); });
    await sleep(120);
    ok("billing row done", $$("#view .items-table tr.done").length === 1, $$("#view .items-table tr.done").length);

    await go("home");
    await sleep(80);
    ok("home reflects data", /미완료/.test($("#view .tiles").textContent) && $$("#view .tile-value").length === 6);

    document.title = "SELFTEST DONE";
    out.textContent = JSON.stringify({ passed: results.ok.length, failed: results.fail, errors: results.errors }, null, 1);
  }
  run().catch(function (e) {
    results.errors.push("run crashed: " + (e && e.stack || e));
    document.title = "SELFTEST DONE";
    out.textContent = JSON.stringify({ passed: results.ok.length, failed: results.fail, errors: results.errors }, null, 1);
  });
})();
