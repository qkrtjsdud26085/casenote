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
    ok("page count", ids.length === 63, ids.length);
    for (var k = 0; k < ids.length; k++) {
      var id = ids[k];
      ok("registered " + id, !!App.pages[id], "missing page def");
      await go(id);
      var view = $("#view");
      ok("render " + id, view.children.length > 0 && !$(".error-card", view), $(".error-card", view) ? $(".error-card", view).textContent : "empty view");
      if (id === "home") { ok("home has no subnav", $("#subnav").hidden); }
      else {
        var act = $("#subnav a.active");
        ok("subnav-active " + id, !!act && act.getAttribute("data-page") === (App.pages[id].navParent || id), act ? act.getAttribute("data-page") : "none");
        ok("section-active " + id, !!$("#sections .active"), "no active section button");
      }
      if (id !== "home") { ok("head " + id, $("#pageHead .page-title") && $("#pageHead .page-title").textContent === App.pages[id].title, "title mismatch"); }
      if ($$("#view .items-panel").length) { await testPanels(id); }
    }

    /* custom flows */
    await go("home");
    ok("home tiles", $$("#view .tile").length === 6, $$("#view .tile").length);
    ok("top sections", $$("#sections .sec-btn").map(function (b) { return b.textContent; }).join(",") === "박사,작가,개인", $$("#sections .sec-btn").map(function (b) { return b.textContent; }).join(","));
    ok("logo quote", !!$("#brandQuote .quote-text") && $("#brandQuote .quote-text").textContent.length > 4 && /— .+ · .+/.test($("#brandQuote .quote-author").textContent) && !$("#homeStrip .quote-box"), $("#brandQuote").textContent);
    ok("quote data", App.QUOTES.length >= 30 && App.QUOTES.every(function (q) { return q.t && q.a && q.y; }), App.QUOTES.length);
    ok("home affiliation", /한국가이던스 대구점/.test($(".badges").textContent) && /범죄심리학과 석·박사 수료/.test($(".badges").textContent) && $$(".badge").length === 2);
    ok("home old profile removed", !$("#view [contenteditable]") && !$("#view .bio"));
    $("#sections .sec-btn[data-section='writer']").click(); await sleep(150);
    ok("section click -> writer", /#\/writer-/.test(location.hash) && !!$("#subnav .active"), location.hash);
    ok("subnav count writer", $$("#subnav a[data-page]").length === 11 && $$("#subnav .sub-group").length === 3 && $$("#subnav > *").length === 5, $$("#subnav a[data-page]").length + "/" + $$("#subnav .sub-group").length + "/" + $$("#subnav > *").length);
    $("#sections .sec-btn[data-section='thesis']").click(); await sleep(150);
    ok("subnav count thesis", $$("#subnav a[data-page]").length === 31 && !$("#subnav a[data-link]"), $$("#subnav a[data-page]").length);
    ok("thesis grouped menu", $$("#subnav .sub-group").length === 4 && $$("#subnav > *").length === 6 && $$("#subnav > *").map(function (n) { return (n.querySelector(".sub-drop") || n).textContent; }).join("|") === "홈|IAS 척도 타당화|비선형 공격성 임계점|자격증|AI|기타 자료", $$("#subnav > *").map(function (n) { return (n.querySelector(".sub-drop") || n).textContent; }).join("|"));
    var drop = $("#subnav .sub-caret"); drop.click(); ok("dropdown opens on click", drop.parentNode.classList.contains("open") && drop.getAttribute("aria-expanded") === "true");
    document.body.click(); ok("dropdown closes on outside click", !drop.parentNode.classList.contains("open"));
    var goLinks = $$("#subnav .sub-go");
    ok("group labels go to first page", goLinks.length === 3 && goLinks[0].getAttribute("href") === "#/ias-home" && goLinks[1].getAttribute("href") === "#/diss-overview" && goLinks[2].getAttribute("href") === "#/cert-list" && !$("#subnav .sub-group .sub-drop:not(.sub-go)").matches(".sub-go"), goLinks.map(function (a) { return a.getAttribute("href"); }).join(","));
    goLinks[2].click(); await sleep(150);
    ok("자격증 label opens 전체 현황", location.hash === "#/cert-list" && $$("#subnav .sub-group")[2].classList.contains("active"), location.hash);
    ok("IAS menu items", $$("#subnav .sub-group")[0].querySelectorAll(".sub-item").length === 2 && /1차 연구 기록/.test($$("#subnav .sub-group")[0].textContent) && /현재 진행중/.test($$("#subnav .sub-group")[0].textContent));
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
    ok("thesis-home: no IAS / 학위논문 / 프로젝트 cards", !/진행중 프로젝트 ① · IAS/.test($("#view").textContent) && !/박사학위논문 · 비선형/.test($("#view").textContent) && !cardBy("논문 프로젝트") && !$("#pageHead .page-desc"));
    ok("nav labels", $$("#subnav .sub-group")[1].querySelectorAll(".sub-item").length === 3 && /연구계획서 내용 전체/.test($$("#subnav .sub-group")[1].textContent) && !$("#subnav a[data-page='cert-crime-guide']") && /연구재단 선정/.test($$("#subnav .sub-group")[1].textContent) && /현재 진행중/.test($$("#subnav .sub-group")[1].textContent) && $$("#subnav .sub-group")[2].querySelectorAll(".sub-item").length === 4 && /전체 현황/.test($$("#subnav .sub-group")[2].textContent) && /범죄심리사/.test($$("#subnav .sub-group")[2].textContent) && /피해상담사/.test($$("#subnav .sub-group")[2].textContent) && /임상심리사/.test($$("#subnav .sub-group")[2].textContent) && !$("#subnav a[data-page='ias-items']") && !$("#subnav a[data-page='diss-design']") && !$("#subnav a[data-page='cert-study']") && !$("#subnav a[data-page='ai-log']"));
    await go("diss-design"); ok("diss tabs under 연구재단 선정", $("#subnav a.active").getAttribute("data-page") === "diss-overview" && $$("#view .page-tab").length === 5);
    /* 연구 흐름도 (research-flow.js): template, accordion, editing, sub-steps */
    await go("diss-current");
    ok("diss-current flow", $$("#view .rf-track > .rf-step").length === 6 && $$("#view .rf-sub").length === 3 && !!$("#view .rf-feedback") && $("#subnav a.active").getAttribute("data-page") === "diss-current" && !!cardBy("연구 시작 체크리스트"));
    ok("flow template placeholders", /\[분석 1\]/.test($("#view .rf-track").textContent) && $$("#view .rf-step")[4].classList.contains("has-sub"));
    $$("#view .rf-node")[1].click(); await sleep(40);
    ok("flow accordion opens", !$("#view .rf-panel").hidden && /선행연구 검토/.test($("#view .rf-panel").textContent) && $$("#view .rf-node")[1].getAttribute("aria-expanded") === "true");
    $$("#view .rf-node")[1].click(); await sleep(40);
    ok("flow accordion closes", $("#view .rf-panel").hidden);
    $$("#view .rf-sub")[1].click(); await sleep(40);
    ok("flow sub opens", /5-2/.test($("#view .rf-panel").textContent));
    $("#view .rf-feedback").click(); await sleep(40);
    ok("flow feedback opens", /지속적 피드백/.test($("#view .rf-panel").textContent));
    $$("#view .rf-tools .tool-btn")[0].click(); await sleep(40);
    ok("flow edit mode", $("#view .rf").classList.contains("editing") && !!$("#view .rf-sub-add"));
    $("#view .rf-sub-add").click(); await sleep(120);
    var fdoc = window.__MOCK_STORE["research/diss_process"];
    ok("flow add sub saves", !!fdoc && fdoc.steps[4].sub.length === 4 && $$("#view .rf-track .rf-sub:not(.rf-sub-add)").length === 4, fdoc && fdoc.steps[4].sub.length);
    var tIn = $("#view .rf-panel input[type=text]"); tIn.value = "문턱값 분석"; change(tIn); await sleep(120);
    ok("flow edit title saves", window.__MOCK_STORE["research/diss_process"].steps[4].sub[3].title === "문턱값 분석");
    var stSel = $("#view .rf-panel select"); stSel.value = "done"; change(stSel); await sleep(120);
    ok("flow status saves", window.__MOCK_STORE["research/diss_process"].steps[4].sub[3].status === "done" && $$("#view .rf-track .rf-sub")[3].getAttribute("data-status") === "done");
    var delSub = $$("#view .rf-panel .tool-btn").filter(function (b) { return /삭제/.test(b.textContent); })[0]; delSub.click(); await sleep(120);
    ok("flow delete sub", window.__MOCK_STORE["research/diss_process"].steps[4].sub.length === 3);
    await App.diss.importData({ docs: { process: { steps: [{ key: "a", title: "하나", hint: "h", detail: "d", status: "done" }, { key: "b", title: "둘", hint: "", detail: "", status: "now", sub: [] }], feedback: { title: "검증", detail: "x" } } } });
    await sleep(150);
    ok("flow import", $$("#view .rf-track > .rf-step").length === 2 && $$("#view .rf-step")[0].getAttribute("data-status") === "done" && /검증/.test($("#view .rf-feedback").textContent));
    await go("ias-flow");
    ok("ias flow tab", $("#view .page-tab.active").textContent === "연구 흐름" && $$("#view .rf-step").length === 6 && !!cardBy("IRT 재분석 체크리스트") && $("#subnav a.active").getAttribute("data-page") === "ias-home");
    await go("ias-results");
    ok("ias IRT card", !!cardBy("IRT 등급반응모형 (GRM) — 재분석") && !!cardBy("Rasch 평정척도모형 (이전 분석 · 참고)") && /IRT 전체 적합도/.test(cardBy("판단 기준 (복사 가능)").textContent));

    await go("cert-list");
    await App.doc("research/certs").set({ items: [{ id: "c1", name: "먼 시험", exam: App.h.dateKey(App.h.addDays(new Date(), 60)) }, { id: "c2", name: "가까운 시험", exam: App.h.dateKey(App.h.addDays(new Date(), 5)), status: "접수 완료" }] }); await sleep(150);
    var certF = cardBy("자격증 목록 · 일정");
    ok("cert tabs + table", $$("#view .page-tab").length === 3 && !!$(".items-table", certF) && $$(".items-table th", certF).map(function (h) { return h.textContent; }).slice(0, 4).join("|") === "자격증|발급 기관|상태|접수 마감");
    ok("cert nearest exam first", $$(".items-table tbody tr", cardBy("자격증 목록 · 일정"))[0].children[0].textContent === "가까운 시험" && /D-5/.test($(".items-table tbody tr", cardBy("자격증 목록 · 일정")).textContent) && /다음 시험 가까운 시험/.test(cardBy("자격증 목록 · 일정").textContent));
    await go("cert-study");
    var lf = $(".quick-add", cardBy("공부 기록")); $("input[aria-label='범위 · 내용']", lf).value = "기출 1회"; $("input[aria-label='자격증']", lf).value = "임상심리사"; $("input[type=number]", lf).value = "2.5"; submit(lf); await sleep(120);
    ok("cert study log + hours", /임상심리사 2\.5h/.test(cardBy("공부 기록").textContent), cardBy("공부 기록").textContent.slice(0, 120));
    await go("cert-files"); ok("cert files page", $("#subnav a.active").getAttribute("data-page") === "cert-list" && !!cardBy("취득 증빙 파일 링크"));
    await go("cert-victim"); ok("cert-victim page", $$("#pageHead .cert-head-tabs .bud-tab").length === 3 && $("#pageHead .bud-tab.on").textContent === "피해상담사" && !$("#view .page-tab") && !!cardBy("피해상담사 자격 정보 · 목표"));
    await go("cert-clinical"); ok("cert-clinical page", $$("#pageHead .cert-head-tabs .bud-tab").length === 3 && !!cardBy("임상심리사 자격 정보 · 목표"));
    ok("clinical exam links", $$(".item-card", cardBy("기출문제 바로가기")).length === 5 && /q-net\.or\.kr.*jmCd=9540/.test($$(".item-card a", cardBy("기출문제 바로가기")).map(function (a) { return a.href; }).join(" ")));
    var ddf = $(".quick-add", cardBy("시험 D-day")); $("input", ddf).value = "필기"; $("input[type=date]", ddf).value = App.h.dateKey(App.h.addDays(new Date(), 10)); submit(ddf); await sleep(150);
    ok("clinical D-day", /D-10/.test($(".dday-big-num", cardBy("시험 D-day")).textContent) && /필기/.test($(".dday-big-name", cardBy("시험 D-day")).textContent), $(".dday-big", cardBy("시험 D-day")).textContent);
    /* 범죄심리사: 5 in-page tabs, title switcher, stats, filters, copy, schedule → Google Calendar */
    await go("cert-crime");
    ok("crime head tabs", $("#pageHead .page-title").textContent === "범죄심리사" && $$("#pageHead .cert-head-tabs .bud-tab").map(function (a) { return a.textContent; }).join("|") === "범죄심리사|피해상담사|임상심리사" && $("#pageHead .bud-tab.on").textContent === "범죄심리사");
    ok("crime inner tabs", $$("#view .page-tab").map(function (a) { return a.textContent; }).join("|") === "면담 기록|선도 대책|자주 쓰는 문구|보고서 프롬프트|자격 정보" && $("#subnav a.active").getAttribute("data-page") === "cert-crime");
    var cm = App.h.dateKey(new Date()).slice(0, 7);
    await App.doc("research/crime_sessions").set({ items: [
      { id: "a1", date: "2024-03-09", people: 2, crimes: "절도 2", place: "수성경찰서", status: "최종 제출" },
      { id: "a2", date: "2025-12-06", people: 3, crimes: "도박 3", status: "최종 제출" },
      { id: "a3", date: cm + "-01", people: 1, crimes: "절도", status: "1차 작성" },
      { id: "a4", date: "2099-01-01", time: "10:00", people: 4, status: "예정" }] });
    await sleep(150);
    ok("crime total = done people", /전체 면담\s*6건/.test($("#view .crime-tiles").textContent) && $$("#view .crime-tile").length === 4, $("#view .crime-tiles").textContent);
    ok("crime month bars", $$("#view .crime-bar-col").length === 12 && !!$$("#view .crime-bar-col")[11].querySelector(".crime-bar-v") && $$("#view .crime-bar-col")[11].querySelector(".crime-bar-v").textContent === "1");
    ok("crime upcoming", $$("#view .upcoming-item").length === 1 && /4명/.test($("#view .upcoming-item").textContent));
    ok("crime list summary", /면담 3일 · 6명 · 예정 1건/.test(cardBy("면담 목록").textContent), cardBy("면담 목록").textContent.slice(0, 80));
    var realFetchC = window.fetch, evs = [];
    window.fetch = function (url, opts) {
      if (String(url).indexOf("https://www.googleapis.com/calendar/v3/calendars/primary/events") === 0) { evs.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ id: "e1" }); } }); }
      return realFetchC.apply(window, arguments);
    };
    var sf = $("#view form.crime-sched");
    $("input[type=date]", sf).value = "2099-02-03"; $$("input[type=time]", sf)[0].value = "14:00"; $$("input[type=time]", sf)[1].value = "16:30";
    $("input[type=number]", sf).value = "3"; $("input[aria-label='장소']", sf).value = "테스트서";
    submit(sf); await sleep(400);
    window.fetch = realFetchC;
    var cs = window.__MOCK_STORE["research/crime_sessions"].items, added = cs.filter(function (x) { return x.date === "2099-02-03"; })[0];
    ok("crime schedule -> calendar", evs.length === 1 && evs[0].summary === "범죄심리사 면담 3명" && /T14:00:00$/.test(evs[0].start.dateTime) && /T16:30:00$/.test(evs[0].end.dateTime) && evs[0].location === "테스트서", JSON.stringify(evs));
    ok("crime schedule -> record", !!added && added.status === "예정" && added.people === 3 && added.gcal === true && $$("#view .upcoming-item").length === 2, JSON.stringify(added));
    await go("cert-crime-guide");
    ok("crime guide tab", $("#view .page-tab.active").textContent === "선도 대책" && $("#pageHead .page-title").textContent === "범죄심리사" && $("#subnav a.active").getAttribute("data-page") === "cert-crime");
    await App.doc("research/crime_guide").set({ items: [{ id: "g1", crime: "도박", title: "도박 예방", text: "도박 예방 교육 프로그램에 참여할 것을 권고한다." }, { id: "g2", crime: "절도·재산", title: "준법", text: "준법교육" }, { id: "g3", crime: "도박", title: "점검", text: "거래 내역 점검" }] });
    await sleep(150);
    var gchips = $$("#view .archive-filters .chip").map(function (b) { return b.textContent; });
    ok("guide filter counts", gchips.join("|") === "전체3|절도·재산1|도박2", gchips.join("|"));
    $$("#view .archive-filters .chip")[2].click(); await sleep(60);
    ok("guide filter works", $$("#view .item-card").length === 2);
    ok("guide text buttons", $$("#view .item-card")[0].querySelector(".copy-btn").textContent === "복사" && $("#view .item-card .icon-btn[title='수정']").textContent === "수정" && $("#view .item-card .icon-btn[title='삭제']").textContent === "삭제" && /도박 예방 교육/.test($("#view .item-card .phrase-text").textContent));
    await go("cert-crime-phrase");
    await App.doc("research/crime_phrases").set({ items: [{ id: "p1", area: "면담 태도", tag: "긍정", title: "협조", text: "협조적" }, { id: "p2", area: "PAI 검사", tag: "타당도", title: "ICN", text: "ICN 적절" }, { id: "p3", area: "PAI 검사", tag: "임상", title: "ANX", text: "ANX" }] });
    await sleep(150);
    var areaBtns = $$("#view .crime-areas .chip");
    ok("phrase areas", areaBtns.map(function (b) { return b.textContent; }).join("|") === "면담 태도 1|PAI 검사 2|가정환경 0|비행환경 0", areaBtns.map(function (b) { return b.textContent; }).join("|"));
    areaBtns[1].click(); await sleep(60);
    var visArea = $$("#view .crime-area").filter(function (b) { return !b.hidden; });
    ok("phrase area switch", visArea.length === 1 && $$(".item-card", visArea[0]).length === 2);
    var addB = $$(".items-tools .tool-btn", visArea[0]).filter(function (b) { return b.textContent === "+ 문구 추가"; })[0]; addB.click(); await sleep(40);
    var pf = $(".item-form", visArea[0]); $("input[name=title]", pf).value = "새 PAI"; $("textarea[name=text]", pf).value = "새 문구"; submit(pf); await sleep(120);
    ok("phrase add keeps area", window.__MOCK_STORE["research/crime_phrases"].items.some(function (x) { return x.title === "새 PAI" && x.area === "PAI 검사"; }));
    App.h.safeSet("hds_crime_area", "면담 태도");
    await go("cert-crime-prompt");
    await App.doc("research/crime_prompt").set({ text: "# 지침\n피면담자는 ~" }); await sleep(120);
    ok("prompt shows", /피면담자는/.test($("#view .crime-prompt").textContent));
    $$("#view .tool-btn").filter(function (b) { return b.textContent === "수정"; })[0].click(); await sleep(30);
    $("#view .crime-prompt-edit").value = "고친 지침"; $$("#view .btn").filter(function (b) { return b.textContent === "저장"; })[0].click(); await sleep(120);
    ok("prompt edit saves", window.__MOCK_STORE["research/crime_prompt"].text === "고친 지침" && $("#view .crime-prompt").textContent === "고친 지침" && !$("#view .crime-prompt").hidden);
    await go("cert-crime-info");
    ok("crime info page", !!cardBy("자격 정보") && !!cardBy("자격증 파일") && !!cardBy("자료 불러오기 · 백업") && !$("#view .card .hint"));
    var fvIn = $("input[type=file]", cardBy("자격증 파일")), dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], "자격증.png", { type: "image/png" }));
    fvIn.files = dt.files; change(fvIn);
    /* reading the file is async: wait for the saved list instead of a fixed delay */
    for (var fvWait = 0; fvWait < 40 && !(window.__MOCK_STORE["research/crime_certfiles"] && window.__MOCK_STORE["research/crime_certfiles"].items.length); fvWait++) { await sleep(100); }
    await sleep(150);
    var fvDoc = window.__MOCK_STORE["research/crime_certfiles"];
    ok("file upload", !!fvDoc && fvDoc.items.length === 1 && fvDoc.items[0].name === "자격증.png" && !!window.__MOCK_STORE["research/file_" + fvDoc.items[0].id + "_0"] && $$(".fv-item", cardBy("자격증 파일")).length === 1, JSON.stringify(fvDoc));
    var fvId = fvDoc.items[0].id;
    $$(".fv-item .copy-btn", cardBy("자격증 파일")).filter(function (b) { return b.textContent === "삭제"; })[0].click(); await sleep(300);
    ok("file delete", window.__MOCK_STORE["research/crime_certfiles"].items.length === 0 && !window.__MOCK_STORE["research/file_" + fvId + "_0"] && !!$(".empty-state", cardBy("자격증 파일")));
    await go("ias-current"); ok("ias current page", !!$("#view .empty-state") && $("#subnav a.active").getAttribute("data-page") === "ias-current");
    /* 연구계획서 내용 전체 */
    await go("diss-plan");
    ok("plan empty", !!$("#view .plan-doc .empty-state") && $("#subnav a.active").getAttribute("data-page") === "diss-plan");
    await App.diss.importData({ docs: { plan: { blocks: [{ type: "h2", text: "Ⅰ. 연구 요약" }, { type: "table", rows: [{ cells: [{ t: "연구\n과제명", h: true, rs: 2 }, { t: "국 문", h: true }, { t: "제목" }] }, { cells: [{ t: "영 문", h: true }, { t: "Title" }] }] }, { type: "p", lead: "연구대상", text: "일반인" }, { type: "footnote", text: "1) 각주" }, { type: "refs", items: ["A", "B"] }] } } });
    await sleep(150);
    ok("plan renders", $$("#view .plan-doc .plan-table th[rowspan='2']").length === 1 && /연구대상 : 일반인/.test($("#view .plan-doc").textContent) && $$("#view .plan-refs li").length === 2 && !!$("#view .plan-footnote"));
    /* light / dark switch */
    var themeBefore = document.documentElement.getAttribute("data-theme");
    $("#themeBtn").click();
    var themeAfter = document.documentElement.getAttribute("data-theme");
    ok("theme toggle", (themeAfter === "light" || themeAfter === "dark") && App.h.safeGet("hds_theme") === themeAfter && /라이트|다크/.test($("#themeBtn").textContent));
    if (themeBefore) { document.documentElement.setAttribute("data-theme", themeBefore); } else { document.documentElement.removeAttribute("data-theme"); }
    try { localStorage.removeItem("hds_theme"); } catch (e) { /* ignore */ }
    await go("ai-tools"); ok("ai tabs", $$("#view .page-tab").length === 3 && !!cardBy("연구용 AI 도구") && !!cardBy("자주 쓰는 프롬프트") && $("#subnav a.active").textContent === "AI");
    await go("ai-notes"); ok("ai notes page", !!cardBy("AI · 머신러닝 공부 노트") && $("#subnav a.active").getAttribute("data-page") === "ai-tools");
    await go("ai-log"); ok("ai log page", !!cardBy("AI 활용 기록 (연구윤리 · 공개 대비)") && /공개 필요/.test($("#view").textContent));
    await go("ias-results");
    ok("ias tabs", $$("#view .page-tab").length === 5 && $("#view .page-tab.active").textContent === "분석 결과" && $("#subnav a.active").getAttribute("data-page") === "ias-home");
    await go("diss-overview");
    ok("diss empty notice", !!$("#view .ias-notice") && $$("#view .page-tab").length === 5);
    await App.diss.importData({ docs: { meta: { stage: "선행연구 · 변수 선정", info: { title: "테스트 박사" } }, schedule: { items: [{ id: "s1", task: "선행연구", start: "2026-09-01", end: "2027-01-31" }, { id: "s2", task: "델파이", start: "2027-08-01", end: "2028-02-01" }] }, flow: { items: [{ id: "f1", label: "연구 1" }, { id: "f2", label: "연구 2" }] } } });
    await sleep(150);
    ok("diss import fills", !$("#view .ias-notice") && $("#view .flow-chip.active") && $("#view .flow-chip.active").textContent === "선행연구 · 변수 선정" && $$("#view .diss-gantt-row").length === 2 && $$("#view .diss-flow").length === 2);
    var dExp = await App.diss.exportData();
    ok("diss export", dExp.docs.meta.info.title === "테스트 박사" && !dExp.docs.items);
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
    App.gtasks.clearToken();  /* start disconnected even when the tab kept a token from an earlier run */
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
    /* the calendar shows dated Google Tasks and can create one from the day form */
    var todayK = App.h.todayStr(), dayForm = $("#view .cal-day form.quick-add");
    $$("#view .cal-cell:not(.blank)").filter(function (c) { return c.classList.contains("today"); })[0].click(); await sleep(60);
    dayForm = $("#view .cal-day form.quick-add");
    $("select", dayForm).value = "할 일"; setVal($("input[placeholder='일정 제목']", dayForm), "달력에서 만든 할 일"); submit(dayForm); await sleep(300);
    ok("calendar day form -> Google Task", gt.some(function (q) { return q.title === "달력에서 만든 할 일" && q.due === todayK + "T00:00:00.000Z"; }) && !Object.keys(window.__MOCK_STORE).some(function (k) { return k.indexOf("schedule/") === 0 && window.__MOCK_STORE[k].title === "달력에서 만든 할 일"; }), JSON.stringify(gt));
    ok("task shows on calendar", !!$("#view .cal-cell.today .cal-dot[data-kind='task']") && $$("#view .cal-day .upcoming-item").some(function (r) { return /달력에서 만든 할 일/.test(r.textContent) && /Google 할 일/.test(r.textContent) && r.querySelector("input[type=checkbox]"); }));
    var dayTaskCb = $$("#view .cal-day .upcoming-item").filter(function (r) { return /달력에서 만든 할 일/.test(r.textContent); })[0].querySelector("input[type=checkbox]");
    dayTaskCb.checked = true; change(dayTaskCb); await sleep(300);
    ok("task checked from calendar", gt.filter(function (q) { return q.title === "달력에서 만든 할 일"; })[0].status === "completed");
    /* one dot per item: add two events today → 2 yellow + 1 blue */
    await App.col("schedule").add({ date: todayK, title: "점 테스트 1", cat: "개인" });
    await App.col("schedule").add({ date: todayK, title: "점 테스트 2", cat: "논문" });
    await sleep(150);
    var tc = $("#view .cal-cell.today");
    ok("dot per item, yellow events + blue tasks", $$(".cal-dot[data-kind='event']", tc).length === 2 && $$(".cal-dot[data-kind='task']", tc).length === 1 && /일정 2 · 할 일 1/.test(tc.title) && !!$("#view .cal-legend"), $$(".cal-dot", tc).length + " / " + tc.title.split("\n")[0]);
    var dotCol = function (k) { return getComputedStyle($(".cal-dot[data-kind='" + k + "']", tc)).backgroundColor; };
    ok("dot colors differ", dotCol("event") !== dotCol("task") && dotCol("event") !== "rgba(0, 0, 0, 0)", dotCol("event") + " / " + dotCol("task"));
    ok("one Google connection covers tasks", App.gcal.scopes.indexOf("https://www.googleapis.com/auth/tasks") !== -1);    ok("월별 리포트 hidden from menu bar", !$("#subnav a[data-page='personal-budget-report']") && !!$("#subnav a[data-page='personal-budget']"));
    ok("no Day card; to-do + memo beside calendar", !cardBy("선택한 날") && $("#view .cal-right").contains(cardBy("할 일 · Google Tasks")) && $("#view .cal-right").contains(cardBy("메모")) && $("#view .cal-left").contains($("#view .cal-day form.quick-add")));
    var calH = $("#view .cal-left").getBoundingClientRect().height, rightH = $("#view .cal-right").getBoundingClientRect().height;
    ok("right column not taller than calendar", window.innerWidth <= 900 || rightH <= calH + 1, rightH + " vs " + calH);
    var qn = $("#view textarea.quicknote"); qn.focus(); setVal(qn, "장보기: 우유"); qn.blur(); await sleep(150);
    ok("memo autosaves", window.__MOCK_STORE["personal/quicknote"] && window.__MOCK_STORE["personal/quicknote"].text === "장보기: 우유" && /저장됨/.test(cardBy("메모").textContent), JSON.stringify(window.__MOCK_STORE["personal/quicknote"]));
    var gC = cardBy("Google 캘린더 연동"), uC = cardBy("다가오는 일정");
    ok("google + upcoming share a row", gC.parentNode === uC.parentNode && gC.parentNode.classList.contains("cal-bottom") && gC.classList.contains("cal-mini") && (window.innerWidth <= 640 || Math.abs(gC.getBoundingClientRect().top - uC.getBoundingClientRect().top) < 2));
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
    var reqCard = cardBy("졸업 요건");
    ok("requirement table only", !$(".item-card", reqCard) && $$(".items-table tbody tr", reqCard).length === 6 && $$(".items-table th", reqCard).map(function (h) { return h.textContent; }).slice(0, 5).join("|") === "완료|요건|종류|메모|목표일" && /논문 0\/2/.test($(".items-summary", reqCard).textContent) && !$$(".items-tools .tool-btn", reqCard).some(function (b) { return b.textContent === "카드"; }), $$(".items-table th", reqCard).map(function (h) { return h.textContent; }).join("|"));
    ok("requirement kind select", $$(".quick-add select option", reqCard).map(function (o) { return o.value; }).join(",") === App.proj.REQ_KINDS.join(","));
    var rq = $$(".quick-add input, .quick-add select", reqCard).map(function (n) { return n.type === "date" ? "date" : (n.getAttribute("aria-label") || ""); });
    ok("memo sits left of the date", rq.indexOf("메모") !== -1 && rq.indexOf("메모") === rq.indexOf("date") - 1, rq.join("|"));
    var reqCb = $(".items-table .cell-check", reqCard); reqCb.checked = true; change(reqCb); await sleep(120);
    ok("requirement check saves", /논문 1\/2/.test($(".items-summary", cardBy("졸업 요건")).textContent), $(".items-summary", cardBy("졸업 요건")).textContent);
    function reqAdd(text, days) {
      var f = $(".quick-add", cardBy("졸업 요건"));
      $("input:not([type=date])", f).value = text; $("input[type=date]", f).value = App.h.dateKey(App.h.addDays(new Date(), days)); submit(f);
    }
    reqAdd("먼 요건", 40); await sleep(100); reqAdd("가까운 요건", 3); await sleep(120);
    var reqRows = function () { return $$(".items-table tbody tr", cardBy("졸업 요건")).map(function (r) { return r.children[1].textContent; }); };
    ok("nearest target date on top", reqRows()[0] === "가까운 요건" && reqRows()[1] === "먼 요건" && /D-3/.test($(".items-table tbody tr", cardBy("졸업 요건")).textContent), reqRows().join(" / "));
    $(".items-table tbody tr .move-btn[aria-label='아래로 이동']", cardBy("졸업 요건")).click(); await sleep(120);
    ok("manual reorder sticks", reqRows()[0] === "먼 요건" && reqRows()[1] === "가까운 요건" && window.__MOCK_STORE["research/gradreqs"].manualOrder === true, reqRows().join(" / "));
    $$(".items-tools .tool-btn", cardBy("졸업 요건")).filter(function (b) { return /목표일 가까운 순/.test(b.textContent); })[0].click(); await sleep(120);
    ok("reset to date order", reqRows()[0] === "가까운 요건" && window.__MOCK_STORE["research/gradreqs"].manualOrder === false, reqRows().join(" / "));
    ok("page title 홈", $("#pageHead .page-title").textContent === "홈" && $("#subnav a.active").textContent === "홈");
    ok("stages by kind", App.proj.stagesFor({ kind: "실증 연구" }).length === 10 && App.proj.stagesFor({ kind: "척도 타당화" }).length === 11);
    await go("proj-overview"); await sleep(200);
    ok("open project page", location.hash === "#/proj-overview" && $$("#view .proj-bar select option").length === 2, location.hash);    ok("stepper chips", $$("#view .flow-chip").length === 11, $$("#view .flow-chip").length);
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
    ok("requirement shows accepted papers", /게재 확정 1편/.test(cardBy("졸업 요건").textContent), cardBy("졸업 요건").textContent.slice(-120));
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
    ok("inbox add all", ledNow.length === nBefore + 2 && ledNow.some(function (i) { return i.memo === "메가커피" && i.rawm === "메가MGC커피" && i.amount === 8900 && i.cat === "카페 · 간식" && /^noti:/.test(i.src); }) && ledNow.some(function (i) { return i.type === "수입" && i.amount === 400000; }), JSON.stringify(ledNow.slice(-2)));
    ok("inbox leaves unreadable only", Object.keys(window.__MOCK_STORE).filter(function (k) { return k.indexOf("budgetInbox/") === 0; }).length === 1 && $$("#view .bud-noti").length === 1);
    $("#view .bud-noti .icon-btn").click(); await sleep(120);
    ok("inbox empty -> hidden", $("#view .bud-inbox").hidden && !Object.keys(window.__MOCK_STORE).some(function (k) { return k.indexOf("budgetInbox/") === 0; }));
    /* merchant clean-up, rules, memory, auto-add, raw text */
    var BG = App.budget;
    ok("clean merchant names", BG.cleanMerchant("메가MGC커피") === "메가커피" && BG.cleanMerchant("(주)우아한형제들") === "배달의민족" && BG.cleanMerchant("KG이니시스 코리아세븐") === "세븐일레븐" && BG.cleanMerchant("주식회사 비바리퍼블리카") === "토스" && BG.cleanMerchant("나이스페이먼츠") === "나이스페이먼츠" && BG.merchantKey("메가 MGC-커피") === "메가mgc커피",
      [BG.cleanMerchant("메가MGC커피"), BG.cleanMerchant("(주)우아한형제들"), BG.cleanMerchant("KG이니시스 코리아세븐"), BG.cleanMerchant("주식회사 비바리퍼블리카")].join(" / "));
    ok("word rules: 관리비 before 통신", BG.ruleCat("케이티텔레캅") === "주거 · 관리비" && BG.ruleCat("KT 통신요금") === "통신" && BG.ruleCat("김밥천국") === "식비" && BG.ruleCat("넷플릭스") === "구독" && BG.ruleCat("삼성화재") === "보험" && BG.ruleCat("정형외과의원") === "의료 · 건강",
      [BG.ruleCat("케이티텔레캅"), BG.ruleCat("KT 통신요금"), BG.ruleCat("넷플릭스")].join(" / "));
    var mem = (window.__MOCK_STORE["personal/budget"].merchants || {})[BG.merchantKey("메가MGC커피")];
    ok("merchant remembered on add", mem && mem.name === "메가커피" && mem.cat === "카페 · 간식", JSON.stringify(window.__MOCK_STORE["personal/budget"].merchants));
    await App.col("budgetInbox").add({ text: "신한카드(1234)승인 박*영 4,500원(일시불)" + md + " 15:30 메가MGC커피 누적1,000원", k: "x" }); await sleep(150);
    var memRow = $$("#view .bud-noti")[0];
    ok("remembered merchant shown", /기억한 가게/.test(memRow.textContent) && $(".bud-noti-name-in", memRow).value === "메가커피");
    setVal($(".bud-noti-name-in", memRow), "메가커피 성수점");
    $$(".tool-btn", memRow).filter(function (b) { return b.textContent === "추가"; })[0].click(); await sleep(200);
    ok("renamed in inbox → remembered", window.__MOCK_STORE["personal/budget"].merchants[BG.merchantKey("메가MGC커피")].name === "메가커피 성수점" && window.__MOCK_STORE[lk].items.some(function (i) { return i.memo === "메가커피 성수점" && i.amount === 4500; }));
    var megaRow = $$("#view .bud-list .bud-entry").filter(function (r) { return /메가커피 성수점/.test(r.textContent); })[0];
    $(".icon-btn[title='수정']", megaRow).click(); await sleep(60);
    var bfEdit = $("#view form.bud-form");
    $$("input", bfEdit).filter(function (i) { return /^내용/.test(i.placeholder); })[0].value = "메가커피 역삼";
    $$("select", bfEdit).filter(function (s) { return s.getAttribute("aria-label") === "분류"; })[0].value = "식비";
    submit(bfEdit); await sleep(200);
    var mem2 = window.__MOCK_STORE["personal/budget"].merchants[BG.merchantKey("메가MGC커피")];
    ok("ledger edit updates memory", mem2.name === "메가커피 역삼" && mem2.cat === "식비", JSON.stringify(mem2));
    await App.col("budgetInbox").add({ text: "신한카드(1234)승인 박*영 3,200원(일시불)" + md + " 16:00 GS25 성수점 누적1,000원", k: "x" });
    await App.col("budgetInbox").add({ text: "신한카드(1234)승인 박*영 7,700원(일시불)" + md + " 16:10 알수없는상점 누적1,000원", k: "x" });
    await sleep(150);
    ok("raw toggle + copy-all", !!Array.prototype.filter.call($$("#view .bud-inbox .tool-btn"), function (b) { return b.textContent === "원문 모두 복사"; })[0] && $$("#view .bud-noti .raw-btn").length === 2);
    $("#view .bud-noti .raw-btn").click(); await sleep(40);
    ok("raw line shows original", $$("#view .bud-noti-rawline").length === 1 && /승인/.test($("#view .bud-noti-rawline").textContent));
    var autoCb = $("#view .bud-auto input"); autoCb.checked = true; change(autoCb); await sleep(300);
    ok("auto-add only sure notices", window.__MOCK_STORE["personal/budget"].autoAdd === true && window.__MOCK_STORE[lk].items.some(function (i) { return i.memo === "GS25 성수점" && i.cat === "식비" && i.amount === 3200; }) && !window.__MOCK_STORE[lk].items.some(function (i) { return i.amount === 7700; }) && $$("#view .bud-noti").length === 1 && /알수없는상점/.test($("#view .bud-noti").textContent), $$("#view .bud-noti").length);
    autoCb = $("#view .bud-auto input"); autoCb.checked = false; change(autoCb); await sleep(100);
    $("#view .bud-noti .icon-btn").click(); await sleep(120);    /* 월별 리포트 */
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
