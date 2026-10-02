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
    ok("page count", ids.length === 38, ids.length);
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
    ok("home tiles", $$("#view .tile").length === 4 && $$("#view .tile-label").map(function (n) { return n.textContent; }).join("|") === "진행 중 논문|오늘 집필|오늘 지출|이번 달 지출", $$("#view .tile-label").map(function (n) { return n.textContent; }).join("|"));
    ok("home first row", $$("#view > .desk-grid")[0].children.length === 2 && /Today/.test($$("#view > .desk-grid")[0].children[0].textContent) && $$("#view > .desk-grid")[0].children[1].classList.contains("mood-card") && $$("#view .mood-btn").length === 8 && !$("#view .mood-week") && $$("#view .mood-more").map(function (a) { return a.getAttribute("href"); }).join(",") === "#/personal-diary,#/personal-weekly" && !$("#view .mood-diary"));
    $$("#view .mood-btn")[1].click(); await sleep(60);
    var md0 = $("#view .mood-memo"); md0.value = "테스트 일기"; md0.dispatchEvent(new Event("input")); md0.dispatchEvent(new Event("blur")); await sleep(80);
    var moodDay = ((window.__MOCK_STORE["personal/mood"] || {}).days || {})[App.h.todayStr()] || {};
    ok("mood saves", moodDay.mood === "😊" && moodDay.note === "테스트 일기" && $("#view .mood-btn.on").textContent === "😊", JSON.stringify(moodDay));
    await App.doc("personal/mood").set({ days: { "2026-01-05": { mood: "😢", note: "옛날 일기" } } }, { merge: true });
    await go("personal-weekly"); await sleep(150);
    var todayRow = $("#view .mood-wrow.today");
    ok("weekly mood week", $$("#view .mood-wrow").length === 7 && !!todayRow && /😊/.test(todayRow.textContent) && /테스트 일기/.test(todayRow.textContent), todayRow && todayRow.textContent);
    for (var mi = 0; mi < 40 && $("#view .mcal-nav .mcal-label", cardBy("기분 달력")).textContent !== "2026년 1월"; mi++) { $("#view .mcal-nav .tool-btn", cardBy("기분 달력")).click(); await sleep(10); }
    $("#view .mcal-day[data-date='2026-01-05']").click(); await sleep(30);
    ok("mood calendar shows old day", /😢/.test($("#view .mcal-day[data-date='2026-01-05']").textContent) && /옛날 일기/.test($("#view .mcal-detail").textContent) && /1월 5일/.test($("#view .mcal-detail").textContent), $("#view .mcal-detail").textContent);
    /* 일정 · 캘린더 기분 → 같은 기록 · 달력 칸 이모티콘 */
    await go("personal-calendar"); await sleep(150);
    var tK = App.h.todayStr();
    $$(".mood-btn", cardBy("오늘의 기분"))[3].click(); await sleep(100);
    ok("calendar mood -> shared record + day cell", ((window.__MOCK_STORE["personal/mood"].days || {})[tK] || {}).mood === "😐" && /😐/.test(($("#view .cal-cell.today .cal-mood") || {}).textContent) && /😐/.test($("#view .cal-right .mood-strip-day.on").textContent) && /오늘 일기 쓰기/.test($("#view .cal-right .mood-more").textContent));
    /* 일기 */
    App.h.safeSet("hds_diary_backup", "");
    await go("personal-diary"); await sleep(200);
    ok("diary page", $("#subnav a.active").getAttribute("data-page") === "personal-diary" && $$("#subnav a[data-page]").map(function (a) { return a.textContent; }).join("|") === "일정 · 캘린더|가계부|일기|주간 리뷰" && !!$("#view .diary-card .cmp-paper") && /3분마다 자동 저장/.test($("#view .cmp-stat").textContent) && $("#view .diary-card .mood-btn.on").textContent === "😐" && /오늘/.test($("#view .diary-date").textContent), $$("#subnav a[data-page]").map(function (a) { return a.textContent; }).join("|"));
    var dp = $("#view .diary-card .cmp-paper"); dp.innerHTML = "<p>오늘의 테스트 일기</p>"; dp.dispatchEvent(new Event("input"));
    $("#view .diary-card .cmp-acts .btn").click(); await sleep(250);
    ok("diary saves", /오늘의 테스트 일기/.test((window.__MOCK_STORE["personal/diary_" + tK] || {}).html) && window.__MOCK_STORE["personal/diary"].days[tK].chars > 0 && $$("#view .cmp-row").length === 1 && /마지막 저장/.test($("#view .cmp-stat").textContent), $("#view .cmp-stat").textContent);
    dp = $("#view .diary-card .cmp-paper"); dp.innerHTML = "<p>나갈 때 저장 확인</p>"; dp.dispatchEvent(new Event("input")); await sleep(1100);
    await go("personal-weekly"); await sleep(250);
    ok("diary saves when leaving the page", /나갈 때 저장 확인/.test(window.__MOCK_STORE["personal/diary_" + tK].html));
    await go("personal-diary"); await sleep(200);
    $("#view .diary-head .tool-btn").click(); await sleep(200);
    ok("diary previous day is empty", $("#view .diary-card .cmp-paper").textContent === "" && !/오늘/.test($("#view .diary-date").textContent) && !$("#view .diary-card .mood-btn.on"));
    $("#view .cmp-open").click(); await sleep(200);
    ok("diary list opens that day", /나갈 때 저장 확인/.test($("#view .diary-card .cmp-paper").textContent) && /오늘/.test($("#view .diary-date").textContent));
    await go("home");
    ok("top sections", $$("#sections .sec-btn").map(function (b) { return b.textContent; }).join(",") === "박사,작가,개인", $$("#sections .sec-btn").map(function (b) { return b.textContent; }).join(","));
    ok("logo quote", !!$("#brandQuote .quote-text") && $("#brandQuote .quote-text").textContent.length > 4 && /— .+ · .+/.test($("#brandQuote .quote-author").textContent) && !$("#homeStrip .quote-box"), $("#brandQuote").textContent);
    ok("quote data", App.QUOTES.length >= 30 && App.QUOTES.every(function (q) { return q.t && q.a && q.y; }), App.QUOTES.length);
    ok("home affiliation", !/한국가이던스/.test($(".badges").textContent) && /범죄심리학과 석·박사 수료/.test($(".badges").textContent) && $$(".badge").length === 1);
    ok("home old profile removed", !$("#view [contenteditable]") && !$("#view .bio"));
    $("#sections .sec-btn[data-section='writer']").click(); await sleep(150);
    ok("section click -> writer", /#\/writer-/.test(location.hash) && !!$("#subnav .active"), location.hash);
    ok("subnav count writer", $$("#subnav a[data-page]").length === 6 && $$("#subnav > a[data-page]").map(function (a) { return a.textContent; }).join("|") === "집필 책상|글쓰기 기록|집필|Capture|아이디어 캔버스|문장 · 독서 노트" && $$("#subnav .sub-group").length === 0 && $$("#subnav > *").length === 6, $$("#subnav a[data-page]").length + "/" + $$("#subnav .sub-group").length + "/" + $$("#subnav > *").length);
    $("#sections .sec-btn[data-section='thesis']").click(); await sleep(150);
    ok("subnav count thesis", $$("#subnav a[data-page]").length === 5 && !$("#subnav a[data-page=thesis-home]") && !$("#subnav a[data-link]"), $$("#subnav a[data-page]").length);
    ok("thesis grouped menu", $$("#subnav .sub-group").length === 1 && $$("#subnav > *").map(function (n) { return (n.querySelector(".sub-drop") || n).textContent; }).join("|") === "논문|자격증|AI" && !$("#subnav .sub-row"), $$("#subnav > *").map(function (n) { return (n.querySelector(".sub-drop") || n).textContent; }).join("|"));
    var drop = $("#subnav .sub-caret"); drop.click(); ok("dropdown opens on click", drop.parentNode.classList.contains("open") && drop.getAttribute("aria-expanded") === "true");
    document.body.click(); ok("dropdown closes on outside click", !drop.parentNode.classList.contains("open"));
    var goLinks = $$("#subnav .sub-go");
    ok("group labels go to first page", goLinks.length === 1 && goLinks[0].getAttribute("href") === "#/cert-list" && $("#subnav a.sub-parent").getAttribute("href") === "#/ias-home", goLinks.map(function (a) { return a.getAttribute("href"); }).join(","));
    goLinks[0].click(); await sleep(150);
    ok("자격증 label opens 전체 현황", location.hash === "#/cert-list" && $$("#subnav .sub-group")[0].classList.contains("active"), location.hash);
    await go("ias-home");
    ok("논문 menu rows", $$("#subnav .sub-row").length === 1 && $$("#subnav .sub-row > *").map(function (n) { return (n.querySelector(".sub-go") || n).textContent; }).join("|") === "① IAS 척도 타당화|② 비선형 공격성 임계점|논문 추천" && $("#subnav a.active").getAttribute("data-page") === "ias-home" && $$("#view .page-tab").map(function (a) { return a.textContent; }).join("|") === "개요 · 진행 단계|연구 흐름|문항표|오늘 논문 작성 기록" && !cardBy("핵심 수치") && !cardBy("파일 위치"), $$("#view .page-tab").map(function (a) { return a.textContent; }).join("|"));
    await go("home");

    await go("ias-home");
    ok("ias no import card", !$("#view .ias-notice") && !$("#view .ias-import"));
    await App.ias.importData({ docs: { meta: { stage: "분석", info: { title: "테스트 IAS" } }, items: { items: [{ id: "i1", no: 1, final: "문항", factor: "죄책감 유발", flag: "삭제 검토" }] }, bogus: { x: 1 } } });
    await sleep(150);
    ok("ias import fills", $("#view .flow-chip.active") && $("#view .flow-chip.active").textContent === "분석");
    await go("ias-items");
    ok("ias items table", $$("#view .items-table tbody tr").length === 1 && /삭제 검토 1/.test($("#view .items-summary").textContent), $("#view .items-summary").textContent);
    var iasExp = await App.ias.exportData();
    ok("ias export", iasExp.docs.meta && iasExp.docs.meta.info.title === "테스트 IAS" && !iasExp.docs.bogus);
    ok("thesis-home and 기타 자료 removed", !App.pages["thesis-home"] && !App.pages["proj-overview"] && !App.pages["thesis-writing"] && !App.proj && !!App.pages["thesis-recommend"] && App.MENU[0].pages[0] === "ias-home");
    await go("ai-tools");
    ok("nav labels", $$("#subnav .sub-group")[0].querySelectorAll(".sub-item").length === 4 && /전체 현황/.test($$("#subnav .sub-group")[0].textContent) && /범죄심리사/.test($$("#subnav .sub-group")[0].textContent) && /피해상담사/.test($$("#subnav .sub-group")[0].textContent) && /임상심리사/.test($$("#subnav .sub-group")[0].textContent) && !$("#subnav a[data-page='cert-crime-guide']") && !$("#subnav a[data-page='cert-study']") && !$("#subnav a[data-page='ai-log']"));
    await go("diss-overview");
    var dg = $("#subnav .sub-row .sub-group"); dg.classList.add("open");
    var dm = $(".sub-menu", dg).getBoundingClientRect(), gapEl = document.elementFromPoint(dm.left + 20, dm.top - 3);
    ok("dropdown gap keeps hover (bridge)", !!gapEl && dg.contains(gapEl), gapEl && gapEl.className);
    dg.classList.remove("open");
    ok("diss menu rows", $$("#subnav .sub-row .sub-group.active .sub-item").map(function (a) { return a.textContent; }).join("|") === "연구재단 선정|현재 진행중" && $("#subnav .sub-row .sub-go").getAttribute("href") === "#/diss-overview" && !$("#subnav a[data-page='diss-design']") && !$("#subnav a[data-page='ias-items']"), $$("#subnav .sub-row .sub-item").map(function (a) { return a.textContent; }).join("|"));
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
    ok("ias flow tab", $("#view .page-tab.active").textContent === "연구 흐름" && $$("#view .rf-step").length === 6 && !cardBy("IRT 재분석 체크리스트") && $("#subnav a.active").getAttribute("data-page") === "ias-home");
    ok("ias removed pages", !App.pages["ias-results"] && !App.pages["ias-manuscript"] && !App.pages["ias-current"]);


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
    await go("cert-clinical"); ok("cert-clinical page", $$("#pageHead .cert-head-tabs .bud-tab").length === 3 && !!cardBy("임상심리사 자격 정보 · D-day") && $$("#view .card").length === 2 && $$("#view > .desk-grid > .card").map(function (c) { return $("h2", c).textContent; }).join("|") === "임상심리사 자격 정보 · D-day|기출문제 바로가기");
    ok("clinical exam links", $$(".item-card", cardBy("기출문제 바로가기")).length === 5 && /q-net\.or\.kr.*jmCd=9540/.test($$(".item-card a", cardBy("기출문제 바로가기")).map(function (a) { return a.href; }).join(" ")));
    var ddf = $(".quick-add", cardBy("임상심리사 자격 정보 · D-day")); $("input", ddf).value = "필기"; $("input[type=date]", ddf).value = App.h.dateKey(App.h.addDays(new Date(), 10)); submit(ddf); await sleep(150);
    ok("clinical D-day", /D-10/.test($(".dday-big-num", cardBy("임상심리사 자격 정보 · D-day")).textContent) && /필기/.test($(".dday-big-name", cardBy("임상심리사 자격 정보 · D-day")).textContent), $(".dday-big", cardBy("임상심리사 자격 정보 · D-day")).textContent);
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

    /* 오늘 논문 작성 기록: structure, references, hwpx memos */
    var dst = App.draft.structure(["Ⅰ. 서론", "첫 문단이다.", "1. 연구의 필요성", "필요하다 필요하다.", "Ⅱ. 이론적 배경", "배경 문단이다.", "참고문헌", "홍길동 (2020). 가 연구.", "Adams, B. (2019). Title."]);
    ok("draft structure", dst.secs.map(function (x) { return x.lv + x.t; }).join("|") === "1Ⅰ. 서론|21. 연구의 필요성|1Ⅱ. 이론적 배경" && dst.secs[1].n === "1. 연구의 필요성".length + "필요하다 필요하다.".length && dst.secs[1].ns === "1.연구의필요성필요하다필요하다.".length && dst.refs.length === 2, JSON.stringify(dst.secs));
    var drefs = App.draft.sortRefs(["Baron, R. (1994). A.", "[3] 김철수 (2019). 나.", "가나다 (2018). 다.", "baron, r (1994) a", "Adams, B. (2019)."]);
    ok("draft refs sort + dedupe", drefs.join("|") === "가나다 (2018). 다.|김철수 (2019). 나.|Adams, B. (2019).|Baron, R. (1994). A." && App.draft.sortRefs(drefs, false)[0] === "Adams, B. (2019).", drefs.join("|"));
    function zipStored(files) {
      var enc = new TextEncoder(), parts = [], cd = [], off = 0;
      Object.keys(files).forEach(function (n) {
        var nb = enc.encode(n), d = enc.encode(files[n]);
        var h = new Uint8Array(30 + nb.length), v = new DataView(h.buffer); v.setUint32(0, 0x04034b50, true); v.setUint32(18, d.length, true); v.setUint32(22, d.length, true); v.setUint16(26, nb.length, true); h.set(nb, 30);
        var c = new Uint8Array(46 + nb.length), w = new DataView(c.buffer); w.setUint32(0, 0x02014b50, true); w.setUint32(20, d.length, true); w.setUint32(24, d.length, true); w.setUint16(28, nb.length, true); w.setUint32(42, off, true); c.set(nb, 46);
        parts.push(h, d); cd.push(c); off += h.length + d.length;
      });
      var cdLen = cd.reduce(function (a, c) { return a + c.length; }, 0), e = new Uint8Array(22), ev = new DataView(e.buffer);
      ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, cd.length, true); ev.setUint16(10, cd.length, true); ev.setUint32(12, cdLen, true); ev.setUint32(16, off, true);
      return new Blob(parts.concat(cd, [e])).arrayBuffer();
    }
    var HP = ' xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"';
    var hx = await zipStored({
      "Contents/header.xml": '<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"><hh:styles><hh:style id="0" name="바탕글"/><hh:style id="1" name="개요 1" engName="Outline 1"/></hh:styles></hh:head>',
      "Contents/section0.xml": '<hs:sec' + HP + '><hp:p styleIDRef="1"><hp:run><hp:t>연구 배경</hp:t></hp:run></hp:p><hp:p styleIDRef="0"><hp:run><hp:t>본문 첫 문장이다.</hp:t><hp:ctrl><hp:fieldBegin type="MEMO"><hp:parameters><hp:stringParam name="Author">x</hp:stringParam></hp:parameters><hp:subList><hp:p><hp:run><hp:t>Baron, R. A. (1994). Human aggression.</hp:t></hp:run></hp:p></hp:subList></hp:fieldBegin></hp:ctrl><hp:t>이어지는 글.</hp:t></hp:run></hp:p></hs:sec>'
    });
    var hp = await App.draft.parseHwpx(hx);
    ok("hwpx parse: body, outline style, memo", hp.lines.join("|") === "연구 배경|본문 첫 문장이다.이어지는 글." && hp.lv.join(",") === "1,0" && hp.memos.join("|") === "Baron, R. A. (1994). Human aggression.", JSON.stringify(hp));
    hp.file = "t.hwpx"; hp.fileModified = 1;
    await App.draft.record(hp);
    await go("ias-writing"); await sleep(150);
    var dlog = window.__MOCK_STORE["research/ias_draftlog"], dtx = window.__MOCK_STORE["research/ias_drafttext"];
    ok("draft record", dlog && dlog.days[App.h.todayStr()].secs[0].t === "연구 배경" && dtx.refs.length === 1 && dtx.file === "t.hwpx", JSON.stringify(dlog));
    ok("draft page", $$("#view .draft-table")[0].querySelectorAll("tr").length === 2 && $$("#view .draft-refs li").length === 1 && $$("#view .draft-view .draft-h").length === 1 && $("#subnav a.active").getAttribute("data-page") === "ias-home" && $$("#view .page-tab").length === 4);
    /* 연구계획서 내용 전체 */
    await go("diss-overview");
    ok("plan empty (inside 개요)", !!$("#view .plan-doc .empty-state") && !!cardBy("연구계획서 내용 전체") && $("#subnav a.active").getAttribute("data-page") === "diss-overview" && !App.pages["diss-plan"]);
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
    await go("ias-items");
    ok("ias tabs", $$("#view .page-tab").length === 4 && $("#view .page-tab.active").textContent === "문항표" && $("#subnav a.active").getAttribute("data-page") === "ias-home" && !cardBy("번안 과정 기록"));
    await go("diss-overview");
    ok("diss empty notice", !!$("#view .ias-notice") && $$("#view .page-tab").length === 5);
    await App.diss.importData({ docs: { meta: { stage: "선행연구 · 변수 선정", info: { title: "테스트 박사" } }, schedule: { items: [{ id: "s1", task: "선행연구", year: "1차년도", start: "2026-09-01", end: "2027-01-31" }, { id: "s2", task: "델파이", year: "2차년도 상반기", start: "2027-08-01", end: "2028-02-01" }] }, flow: { items: [{ id: "f1", label: "연구 1" }, { id: "f2", label: "연구 2" }] } } });
    await sleep(150);
    ok("diss import fills", !$("#view .ias-notice") && !$("#view .flow-chip.active") && $$("#view .diss-phase").map(function (p) { return p.textContent; }).join("|") === "1차년도|2차년도 상반기" && $$("#view .diss-phase-line").length === 4 && !$(".items-panel", cardBy("추진 일정")) && !cardBy("지금 할 일") && !cardBy("결정 기록 · 지도 의견") && !cardBy("집필 기록 (박사학위논문)") && !cardBy("연구 흐름") && !!cardBy("연구 설계 · 흐름 한눈에") && /테스트 박사/.test($$("input", cardBy("과제 정보")).map(function (i) { return i.value; }).join(" ")) && $$("#view .diss-gantt-row:not(.diss-gantt-head)").length === 2 && $$("#view .diss-gantt-head").length === 1 && $$("#view .diss-flow").length === 2);
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
    var todoC = $("#view .todo-sec");
    ok("todo card in calendar", !!todoC && /연결 안 됨/.test(todoC.textContent) && /예전 할 일 1개/.test(todoC.textContent));
    var tf = $("form.quick-add", todoC);
    setVal($("textarea.todo-text", tf), "테스트 할 일"); $("input[type=date]", tf).value = "2026-10-01"; submit(tf); await sleep(250);
    ok("todo -> Google Tasks", gt.length === 1 && gt[0].title === "테스트 할 일" && gt[0].due === "2026-10-01T00:00:00.000Z", JSON.stringify(gt));
    ok("todo cache + list", window.__MOCK_STORE["personal/gtasks"].items.length === 1 && $$(".todo-item", $("#view .todo-sec")).length === 1 && /Google 연결됨/.test($("#view .todo-sec").textContent));
    var tcb = $(".todo-item input[type=checkbox]", $("#view .todo-sec")); tcb.checked = true; change(tcb); await sleep(250);
    ok("todo done in Google", gt[0].status === "completed" && $(".todo-done", $("#view .todo-sec")).hidden === false, JSON.stringify(gt));
    var realConfirmT = window.confirm; window.confirm = function () { return true; };
    Array.prototype.filter.call($("#view .todo-sec").querySelectorAll(".tool-btn"), function (b) { return /예전 할 일/.test(b.textContent); })[0].click(); await sleep(350);
    ok("legacy todos migrated", gt.some(function (q) { return q.title === "예전 할 일"; }) && !Object.keys(window.__MOCK_STORE).some(function (k) { return k.indexOf("todos/") === 0; }), JSON.stringify(gt));
    $(".todo-done .icon-btn", $("#view .todo-sec")).click(); await sleep(250);
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
    ok("calendar + to-do in one card, mood on the right", !cardBy("선택한 날") && cardBy("캘린더 · 할 일").contains($("#view .todo-sec")) && $("#view .cal-right").contains(cardBy("오늘의 기분")) && $$("#view .cal-right .mood-btn").length === 8 && $$("#view .cal-right .mood-strip-day").length === 7 && !cardBy("메모") && !cardBy("다가오는 일정") && $("#view .cal-left").contains($("#view .cal-day form.quick-add")));
    var tf = $("#view .todo-form");
    ok("todo: 2-line box, date · memo · add on one line", tf.querySelector("textarea.todo-text").rows === 2 && $$(".todo-line2 > *", tf).length === 3 && (function () { var r = $$(".todo-line2 > *", tf).map(function (n) { var b = n.getBoundingClientRect(); return b.top + b.height / 2; }); return Math.abs(r[0] - r[1]) < 3 && Math.abs(r[1] - r[2]) < 3; })());
    ok("daily sync bar when not synced today", !$("#view .gsync-bar").hidden && /지금 동기화/.test($("#view .gsync-bar").textContent));
    var calH = $("#view .cal-left").getBoundingClientRect().height, rightH = $("#view .cal-right").getBoundingClientRect().height;
    ok("mood card no taller than the calendar card", window.innerWidth <= 900 || rightH <= calH + 1, rightH + " vs " + calH);


    var gC = cardBy("Google 캘린더 연동");
    ok("google card in bottom row", gC.parentNode.classList.contains("cal-bottom") && gC.classList.contains("cal-mini"));
    ok("google folded", gC.classList.contains("folded") && $(".card-body", gC).hidden);
    $(".fold-btn", gC).click(); await sleep(30);
    ok("fold opens + remembered", !$(".card-body", gC).hidden && App.h.safeGet("hds_fold_gcal") === "1");
    $(".fold-btn", gC).click(); await sleep(30);
    await go("home"); await sleep(120);
    ok("home todo from Google", /예전 할 일/.test($("#view").textContent) && !/남은 할 일|졸업 요건/.test($("#view .tiles").textContent) && !$("#view .capture input[placeholder^='빠른 메모']"));
    window.fetch = realFetchT;
    await go("personal-calendar");
    var cell = $$("#view .cal-cell:not(.blank)")[14]; cell.click(); await sleep(60);
    var cf = $$("#view form.quick-add")[0];
    setVal($("input[placeholder='일정 제목']", cf), "테스트 일정"); submit(cf); await sleep(100);
    ok("calendar event", $$("#view .cal-dot").length >= 1 && $$("#view .upcoming-item").length >= 1, "dots=" + $$("#view .cal-dot").length);
    $$("#view .cal-head .tool-btn")[2].click(); await sleep(60);
    ok("calendar next-month", /\d+년 \d+월/.test($("#view .cal-title").textContent));

    await go("writer-desk");
    var lf = $$("#view form.quick-add").filter(function (x) { return !!$("input.w-date", x); })[0];
    setVal($("input[type=number]", lf), "800"); submit(lf); await sleep(80);
    ok("writing log add", $$("#view .log-item").length === 1 && $$("#view .bar").length === 7, $$("#view .log-item").length + "/" + $$("#view .bar").length);

    /* thesis projects */
    function cardBy(title) { return $$("#view .card").filter(function (c) { return ($("h2", c) || {}).textContent === title; })[0]; }
    async function addVia(panelRoot, vals) {
      var addBtn = $$(".items-tools .tool-btn", panelRoot).filter(function (b) { return b.textContent.charAt(0) === "+"; })[0];
      addBtn.click(); await sleep(40);
      var form = $(".item-form", panelRoot);
      Object.keys(vals).forEach(function (k) { var i = $("[name='" + k + "']", form); if (i) { i.value = vals[k]; } });
      submit(form); await sleep(100);
    }

    /* 1차년도 보고서 */
    await go("diss-report1"); await sleep(150);
    ok("report1 page", $$("#view .page-tab").length === 2 && $("#view .page-tab.active").textContent === "1차년도 보고서" && $$("#view .r1-due").length === 2 && !!cardBy("1. 연구진행상황") && !!cardBy("2. 연구지도내용") && !!cardBy("3. 기타") && !!cardBy("지도 기록") && !!cardBy("연구 성과") && !!cardBy("사사표기 문구") && $$(".items-table tbody tr", cardBy("제출 일정")).length === 6 && $("#subnav a.active").getAttribute("data-page") === "diss-current");
    var r1d = $("textarea", cardBy("1. 연구진행상황").querySelector(".f.wide:last-of-type") || cardBy("1. 연구진행상황"));
    var r1ta = $$("textarea", cardBy("1. 연구진행상황")); r1ta[r1ta.length - 1].value = "자료 수집 60% 완료"; change(r1ta[r1ta.length - 1]); await sleep(200);
    var r1doc = window.__MOCK_STORE["research/diss_report1"];
    ok("report1 draft saves", !!r1doc && r1doc.s1 && r1doc.s1.draft === "자료 수집 60% 완료" && /자/.test(cardBy("1. 연구진행상황").querySelector(".count").textContent), JSON.stringify(r1doc));
    await go("diss-current"); ok("diss-current tabs", $$("#view .page-tab").length === 2 && $("#view .page-tab.active").textContent === "현재 진행중");
    /* 집필 책상 = 공모 · 투고 현황 + 책상 카드 */
    await go("writer-desk"); await sleep(150);
    var cBar = $("#view .contest-bar"), presetFresh = App.writer.PRESETS.filter(function (p) { return p.deadline >= App.h.todayStr(); }).length;
    ok("desk order: 오늘의 집필 | 글감 → 공모 → 작품", $$("#view .card h2").map(function (h) { return h.textContent; }).join("|") === "오늘의 집필|글감 빨리 적기|마감 다가오는 공모|지금 쓰고 있는 작품" && !cardBy("공모 · 투고 현황") && !cardBy("글쓰기 일정") && !!$(".bars", cardBy("오늘의 집필")) && !cardBy("공모 · 투고 마감") && !!cardBy("글감 빨리 적기") && $("#view .capture-text").rows >= 6);
    ok("contest presets offered", presetFresh === 0 ? cBar.hidden : (!cBar.hidden && /새 공모/.test(cBar.textContent)));
    if (presetFresh) {
      $(".btn", cBar).click(); await sleep(300);
      ok("contest presets added", window.__MOCK_STORE["writer/submissions"].items.filter(function (x) { return x.preset; }).length === presetFresh && cBar.hidden);
      ok("contest cards", $$("#view .contest").length === presetFresh && /D-/.test($("#view .contest-dday").textContent) && $$("#view .contest .contest-chip").length > 0);
      var cc = $("#view .contest-check input"); cc.checked = true; change(cc); await sleep(250);
      ok("contest checklist saves", window.__MOCK_STORE["writer/submissions"].items.some(function (x) { return x.checks && Object.keys(x.checks).some(function (k) { return x.checks[k]; }); }));
      delete window.__MOCK_STORE["writer/submissions"];
    }
    /* 카드 분석 */
    var cmk = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0"), cspend = {}; cspend[cmk] = { t1: 350000 };
    await App.cardsImport({ cards: [{ id: "t1", name: "테스트 체크", type: "체크", perf: 300000, benefits: [{ area: "카페", rate: "10% 할인" }] }, { id: "t2", name: "테스트 신용", type: "신용", perf: 400000, benefits: [{ area: "카페", rate: "5% 적립" }] }], spend: cspend });
    await go("personal-budget-cards"); await sleep(150);
    ok("cards page", $$("#view .cardx").length === 2 && $$("#view .cardx-perf.met").length === 1 && /이번 달 합계 350,000원/.test($("#view .stat-row").textContent) && $("#subnav a.active").getAttribute("data-page") === "personal-budget" && $$(".bud-tab").length === 3, $("#view .stat-row") && $("#view .stat-row").textContent);
    var cRow = $$("#view .cardx-table tr").filter(function (r) { return /^카페/.test(r.textContent) && r.children.length === 3 && /테스트 체크 10%/.test(r.textContent); })[0];
    ok("cards best per area", !!cRow && cRow.children[1].textContent === "테스트 체크");
    window.__MOCK_STORE["personal/ledger-" + cmk] = { items: [{ id: "L1", date: cmk + "-02", type: "지출", cat: "식비", amount: 120000, method: "테스트 신용", memo: "x" }, { id: "L2", date: cmk + "-03", type: "지출", cat: "식비", amount: 5000, method: "카드", memo: "y" }] };
    await go("home"); await go("personal-budget-cards"); await sleep(200);
    var t2card = $$("#view .cardx").filter(function (c) { return /테스트 신용/.test(c.querySelector("h2").textContent); })[0];
    ok("card spend from ledger", !!t2card && /실적까지 280,000원/.test(t2card.textContent) && !!t2card.querySelector(".cardx-src"), t2card && t2card.textContent.slice(0, 200));
    await go("personal-budget"); await sleep(200);
    ok("ledger method lists my cards", $$("#view select[aria-label='결제수단'] option").map(function (o) { return o.value; }).indexOf("테스트 신용") !== -1);
    delete window.__MOCK_STORE["personal/ledger-" + cmk]; delete window.__MOCK_STORE["personal/cards"];
    var recoFetch = window.fetch;
    window.fetch = function (url) {
      url = String(url);
      function j(o) { return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(o); } }); }
      if (url.indexOf("https://api.openalex.org/works") === 0) {
        return j({ results: [
          { id: "https://openalex.org/W1", display_name: "High impact open paper", abstract_inverted_index: { "Aggression": [0], "predicts": [1], "recidivism.": [2] }, publication_year: 2024, open_access: { is_oa: true, oa_url: "https://example.org/w1" }, best_oa_location: { pdf_url: "https://example.org/w1.pdf" }, primary_location: { source: { id: "https://openalex.org/S1", display_name: "Journal A" } } },
          { id: "https://openalex.org/W2", display_name: "Low impact paper", publication_year: 2024, open_access: { is_oa: true, oa_url: "https://example.org/w2" }, primary_location: { source: { id: "https://openalex.org/S2", display_name: "Journal B" } } },
          { id: "https://openalex.org/W3", display_name: "Closed high impact paper", publication_year: 2023, open_access: { is_oa: false }, doi: "https://doi.org/10.1/x", primary_location: { landing_page_url: "https://doi.org/10.1/x", source: { id: "https://openalex.org/S1", display_name: "Journal A" } } }
        ] });
      }
      if (url.indexOf("https://translate.googleapis.com/") === 0) { return Promise.resolve({ ok: false, status: 429, json: function () { return Promise.reject(new Error("429")); } }); }
      if (url.indexOf("https://api.mymemory.translated.net/get") === 0) { return j({ responseStatus: 200, responseData: { translatedText: "공격성은 재범을 예측한다." } }); }
      if (url.indexOf("https://api.openalex.org/sources") === 0) {
        return j({ results: [{ id: "https://openalex.org/S1", summary_stats: { "2yr_mean_citedness": 4.23 } }, { id: "https://openalex.org/S2", summary_stats: { "2yr_mean_citedness": 1.1 } }] });
      }
      return recoFetch.apply(window, arguments);
    };
    await go("thesis-recommend");
    ok("recommend in 논문 menu", $("#subnav .sub-row a.active") && $("#subnav .sub-row a.active").getAttribute("data-page") === "thesis-recommend");
    var rf = $("#view form.quick-add");
    setVal($("input", rf), "psychopathy"); submit(rf); await sleep(400);
    ok("interest add", $$("#view .interest-chip").length === 1, $$("#view .interest-chip").length);
    var recoTitles = $$("#view .reco-title").map(function (a) { return a.textContent; });
    ok("reco impact >= 3 only, open first", recoTitles.join("|") === "High impact open paper|Closed high impact paper" && /IF 4\.2/.test($("#view .reco-item").textContent), recoTitles.join("|"));
    await sleep(200);
    var koItem = $$("#view .reco-item").filter(function (x) { return /High impact open paper/.test(x.textContent); })[0];
    ok("reco abstract in Korean, title in English", !!koItem && $(".reco-abs", koItem).textContent === "공격성은 재범을 예측한다." && /Aggression predicts recidivism/.test($(".reco-orig", koItem).textContent) && $(".reco-title", koItem).textContent === "High impact open paper" && getComputedStyle($("#view .reco-list")).gridTemplateColumns.split(" ").length === 2 && /공격성은/.test(JSON.stringify(window.__MOCK_STORE["research/reco"].daily)), koItem && koItem.textContent);
    var yuLink = $$("#view .reco-links a").filter(function (a) { return a.textContent === "영남대 로그인으로 열기"; })[0];
    ok("reco YU proxy link", !!yuLink && yuLink.href === "https://libproxy.yu.ac.kr/_Lib_Proxy_Url/https://doi.org/10.1/x", yuLink && yuLink.href);
    var svBtn = $$("#view .reco-links button").filter(function (b) { return b.textContent === "내 문헌함에 저장"; })[0]; svBtn.click(); await sleep(200);
    var savedCard = cardBy("저장한 논문");
    ok("reco saved list", !!savedCard && $$(".item-card", savedCard).length === 1 && /High impact open paper/.test(savedCard.textContent) && /총 1편 · 읽음 0/.test(savedCard.textContent) && /저장됨/.test($("#view .reco-item").textContent), savedCard && savedCard.textContent.slice(0, 200));
    window.fetch = recoFetch;
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
    ok("desk cards", !$("#view .desk-prompt") && $$("#view > .desk-grid")[0].children.length === 2 && $$("#view > .desk-grid")[0].children[0].textContent.indexOf("오늘의 집필") !== -1 && $$("#view > .desk-grid")[0].children[1].textContent.indexOf("글감 빨리 적기") !== -1, $$("#view .card").map(function (c) { return ($("h2", c) || {}).textContent; }).join("|"));
    var dq = $("#view form.capture-form");
    setVal($("textarea.capture-text", dq), "책상에서 적은 글감"); submit(dq); await sleep(120);
    var ideasStore = window.__MOCK_STORE["writer/ideas"];
    ok("desk quick capture saves idea", !!ideasStore && ideasStore.items.some(function (x) { return x.text === "책상에서 적은 글감" && x.createdAt; }), JSON.stringify(ideasStore));
    ok("desk recent ideas shown", $$("#view .upcoming-item").some(function (r) { return /책상에서 적은 글감/.test(r.textContent); }));
    await go("writer-capture"); await sleep(120);
    ok("capture page lists all", $("#subnav a.active").getAttribute("data-page") === "writer-capture" && /책상에서 적은 글감/.test($("#view").textContent) && $$("#view .card").length === 1, $$("#view .card").length);

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

    /* 작가 › 집필 */
    App.h.safeSet("hds_compose_draft", "");
    await go("writer-compose"); await sleep(120);
    var cpaper = $("#view .cmp-paper"), cm = $$("#view .cmp-meta input");
    ok("compose layout", !!cpaper && cpaper.isContentEditable && cm.length === 4 && cm[1].value === App.h.todayStr() && $$("#view .cmp-bar .cmp-btn").length >= 15 && $$("#view .cmp-bar select").length === 3 && /아직 저장한 글이 없어요/.test($("#view .cmp-list").textContent) && $("#subnav a.active").getAttribute("data-page") === "writer-compose");
    cm[0].value = "시험 글"; cm[0].dispatchEvent(new Event("input"));
    cm[2].value = "에세이"; cm[2].dispatchEvent(new Event("input"));
    cm[3].checked = true; change(cm[3]);
    cpaper.innerHTML = "<p>첫 문단 입니다</p>"; cpaper.dispatchEvent(new Event("input"));
    ok("compose counts", /글자 수 8자 \(공백 제외 6자\) · 원고지 약 1매/.test($("#view .cmp-stat").textContent), $("#view .cmp-stat").textContent);
    $$("#view .cmp-acts .btn")[1].click(); await sleep(200);
    var cIdx = (window.__MOCK_STORE["writer/compose"] || {}).items || [];
    ok("compose saved", cIdx.length === 1 && cIdx[0].title === "시험 글" && cIdx[0].cat === "에세이" && cIdx[0].done === true && /첫 문단/.test(window.__MOCK_STORE["writer/compose_" + cIdx[0].id].html) && $$("#view .cmp-row").length === 1 && /완료/.test($("#view .cmp-row").textContent) && $("#view .cmp-row").classList.contains("cur"), JSON.stringify(cIdx));
    $$("#view .cmp-acts .btn")[0].click(); await sleep(60);
    ok("compose new clears", $$("#view .cmp-meta input")[0].value === "" && $("#view .cmp-paper").textContent === "" && !$("#view .cmp-row.cur"));
    cpaper = $("#view .cmp-paper"); cpaper.innerHTML = "임시 글"; cpaper.dispatchEvent(new Event("input")); await sleep(700);
    await go("writer-submit"); await go("writer-compose"); await sleep(100);
    ok("compose draft restored", $("#view .cmp-paper").textContent === "임시 글" && /임시 글을 불러왔어요/.test($("#view .cmp-stat").textContent));
    $("#view .cmp-open").click(); await sleep(150);
    ok("compose open saved", $$("#view .cmp-meta input")[0].value === "시험 글" && /첫 문단/.test($("#view .cmp-paper").textContent) && $$("#view .cmp-meta input")[3].checked && $("#view .cmp-row").classList.contains("cur"));
    cpaper = $("#view .cmp-paper"); cpaper.innerHTML = "<p>고친 문단</p>"; cpaper.dispatchEvent(new Event("input"));
    $$("#view .cmp-acts .btn")[1].click(); await sleep(200);
    cIdx = window.__MOCK_STORE["writer/compose"].items;
    ok("compose edit keeps one", cIdx.length === 1 && /고친 문단/.test(window.__MOCK_STORE["writer/compose_" + cIdx[0].id].html));
    var cid = cIdx[0].id;
    $("#view .cmp-row .icon-btn").click(); await sleep(200);
    ok("compose delete", window.__MOCK_STORE["writer/compose"].items.length === 0 && !window.__MOCK_STORE["writer/compose_" + cid] && $$("#view .cmp-row").length === 0 && $("#view .cmp-paper").textContent === "");
    await go("writer-submit"); await sleep(100);
    $$("#view .items-tools .tool-btn").filter(function (b) { return b.textContent.charAt(0) === "+"; })[0].click(); await sleep(40);
    var sform = $("#view .item-form"); fillForm(sform); $("input[type=date]", sform).value = App.h.dateKey(App.h.addDays(new Date(), 5)); submit(sform); await sleep(100);
    ok("submission shows dday", !!$("#view .item-card .dday"), $("#view .item-card") && $("#view .item-card").textContent);
    await App.doc("writer/works").set({ items: [{ id: "w1", title: "테스트 장편", form: "소설", status: "집필중", genre: "스릴러" }, { id: "w2", title: "테스트 산문", form: "에세이", status: "구상" }] });
    await go("writer-desk"); await sleep(120);
    ok("desk shows work, submission on contest board", $$("#view .desk-work").length >= 1 && !!$("#view .contest-dday"));
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
    ok("budget head: tabs, no desc", !$("#pageHead .page-desc") && $$("#pageHead .bud-tab").length === 3 && /on/.test($("#pageHead .bud-tab").className));
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
    /* 결제 캘린더 → 고정지출 */
    var GF = App.budget.gcalFixed, tk0 = App.h.todayStr(), nx = App.h.dateKey(App.h.addDays(new Date(), 10));
    var gd = { syncedAt: "x", calendars: [{ id: "pay", name: "결제" }, { id: "me", name: "내 캘린더" }], events: [
      { id: "a1", cal: "pay", rid: "R1", title: "넷플릭스 17,000원", date: nx, desc: "" },
      { id: "b1", cal: "pay", rid: "R2", title: "보험료", date: nx, desc: "월 52,300원 자동이체" },
      { id: "c1", cal: "pay", rid: "R3", title: "금액 없는 일정", date: nx, desc: "" },
      { id: "d1", cal: "pay", rid: "", title: "한 번뿐인 결제 9,900원", date: nx },
      { id: "e1", cal: "me", rid: "R9", title: "다른 캘린더 5,000원", date: nx }] };
    var g1 = GF([{ id: "keep", name: "월세", amount: 400000, day: 25 }], gd);
    ok("pay calendar adds repeating payments", !!g1 && g1.fixed.length === 3 && g1.skipped === 1 && g1.fixed.some(function (f) { return f.gcal === "R1" && f.name === "넷플릭스" && f.amount === 17000 && f.day === Number(nx.slice(8)); }) && g1.fixed.some(function (f) { return f.gcal === "R2" && f.amount === 52300; }), JSON.stringify(g1));
    ok("pay calendar: no change → null", GF(g1.fixed, gd) === null);
    var gd2 = JSON.parse(JSON.stringify(gd)); gd2.events = gd2.events.filter(function (e) { return e.rid !== "R1"; }); gd2.events[0].title = "보험료 60,000원";
    var g2 = GF(g1.fixed, gd2);
    ok("pay calendar removes / updates", !!g2 && !g2.fixed.some(function (f) { return f.gcal === "R1"; }) && g2.fixed.some(function (f) { return f.gcal === "R2" && f.amount === 60000; }) && g2.fixed.some(function (f) { return f.id === "keep"; }), JSON.stringify(g2 && g2.fixed));
    var g3 = GF([{ id: "mine", kind: "지출", name: "넷플릭스", amount: 13500, day: 1, cat: "구독", method: "간편결제", memo: "" }], gd);
    ok("pay calendar links my own entry (no duplicate)", !!g3 && g3.fixed.filter(function (f) { return /넷플릭스/.test(f.name); }).length === 1 && g3.fixed.some(function (f) { return f.id === "mine" && f.gcal === "R1" && f.amount === 17000 && f.method === "간편결제"; }), JSON.stringify(g3 && g3.fixed));
    ok("no pay calendar → untouched", GF([], { syncedAt: "x", calendars: [{ id: "me", name: "내 캘린더" }], events: [] }) === null);
    var PN = App.budget.parseNotice, sep = new Date(2026, 8, 28);
    var payN = PN("결제가 완료되었어요 해외결제 가맹점에서 2,400원을 결제했어요.", sep);
    ok("notice: pay-app sentence", payN.ok && payN.amount === 2400 && payN.type === "지출" && payN.merchant === "해외결제 가맹점" && !payN.cancel, JSON.stringify(payN));
    var payC = PN("스타벅스 강남점에서 4,500원 결제가 취소되었어요", sep);
    ok("notice: pay-app cancel", payC.ok && payC.amount === 4500 && payC.cancel && payC.merchant === "스타벅스 강남점", JSON.stringify(payC));
    var won1 = PN("₩18,000 결제 완료 동성로떡볶이", sep), won2 = PN("₩5,000 결제 완료 반월당백화점약국", sep), won3 = PN("₩3,110 결제 취소 우정사업본부(우체국)", sep);
    ok("notice: ₩ amount first", won1.ok && won1.amount === 18000 && won1.merchant === "동성로떡볶이" && !won1.cancel && won1.method === "간편결제" && App.budget.guessMerchantCat(won1.merchant, "지출", []) === "식비" && App.budget.guessMerchantCat(won2.merchant, "지출", []) === "의료 · 건강" && won3.cancel && won3.amount === 3110 && won3.merchant === "우정사업본부(우체국)", JSON.stringify([won1, won3]));
    ok("notice: service announcement not a payment", !PN("케이뱅크 [케이뱅크] 서비스 일시 중단 안내 고객님 안녕하세요 10월 18일 일요일 00시에서 10시까지", sep).ok);
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
    ok("AI category", BG.ruleCat("ChatGPT Plus") === "AI" && BG.ruleCat("클로드") === "AI" && BG.ruleCat("넷플릭스") === "구독" && App.budget.parseFixed("클로드 31,000원")[0].cat === "AI", BG.ruleCat("클로드") + "/" + App.budget.parseFixed("클로드 31,000원")[0].cat);
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
    ok("home reflects data", /이번 달 지출/.test($("#view .tiles").textContent) && $$("#view .tile-value").length === 4);

    document.title = "SELFTEST DONE";
    out.textContent = JSON.stringify({ passed: results.ok.length, failed: results.fail, errors: results.errors }, null, 1);
  }
  run().catch(function (e) {
    results.errors.push("run crashed: " + (e && e.stack || e));
    document.title = "SELFTEST DONE";
    out.textContent = JSON.stringify({ passed: results.ok.length, failed: results.fail, errors: results.errors }, null, 1);
  });
})();
