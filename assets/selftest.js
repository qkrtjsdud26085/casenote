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
    ok("page count", ids.length === 28, ids.length);
    for (var k = 0; k < ids.length; k++) {
      var id = ids[k];
      ok("registered " + id, !!App.pages[id], "missing page def");
      await go(id);
      var view = $("#view");
      ok("render " + id, view.children.length > 0 && !$(".error-card", view), $(".error-card", view) ? $(".error-card", view).textContent : "empty view");
      var act = $("#nav .active");
      ok("nav-active " + id, !!act && act.getAttribute("data-page") === id, act ? act.getAttribute("data-page") : "none");
      if (id !== "home") { ok("head " + id, $("#pageHead .page-title") && $("#pageHead .page-title").textContent === App.pages[id].title, "title mismatch"); }
      if ($$("#view .items-panel").length) { await testPanels(id); }
    }

    /* custom flows */
    await go("home");
    ok("home tiles", $$("#view .tile").length === 6, $$("#view .tile").length);

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
