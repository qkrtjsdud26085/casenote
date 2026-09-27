/* Hello dear Sunny — 개인 · 가계부 (고정지출 · 날짜별 지출 · 수입/지출 내역 · 분류별 통계 · 예산) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  var EXP_CATS = ["식비", "카페 · 간식", "교통", "주거 · 관리비", "통신", "생활용품", "의료 · 건강", "교육 · 도서", "문화 · 여가", "의류 · 미용", "경조사 · 선물", "보험", "구독", "저축 · 투자", "기타"];
  var INC_CATS = ["급여", "부수입", "용돈", "이자 · 배당", "환급", "기타"];
  var METHODS = ["카드", "현금", "계좌이체", "간편결제"];

  /* ---------- shared helpers (also used by the home dashboard) ---------- */
  function num(v) { var n = Number(String(v == null ? "" : v).replace(/[^\d]/g, "")); return isFinite(n) ? n : 0; }
  function won(n) { return Math.round(Number(n) || 0).toLocaleString("ko-KR") + "원"; }
  function shortWon(n) {
    n = Math.round(Number(n) || 0);
    if (n >= 10000) { return (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "만"; }
    return n.toLocaleString("ko-KR");
  }
  function monthKey(d) { return d.getFullYear() + "-" + H.pad2(d.getMonth() + 1); }
  function shiftMonth(mk, n) { var p = mk.split("-"); return monthKey(new Date(Number(p[0]), Number(p[1]) - 1 + n, 1)); }
  function daysIn(mk) { var p = mk.split("-"); return new Date(Number(p[0]), Number(p[1]), 0).getDate(); }
  function fixedDate(mk, day) { return mk + "-" + H.pad2(Math.min(Math.max(1, Number(day) || 1), daysIn(mk))); }
  function ledgerRef(mk) { return App.doc("personal/ledger-" + mk); }
  function settingsRef() { return App.doc("personal/budget"); }
  function totals(items) {
    var r = { inc: 0, exp: 0, fixed: 0 };
    items.forEach(function (it) {
      var a = Number(it.amount) || 0;
      if (it.type === "수입") { r.inc += a; } else { r.exp += a; if (it.fixedId) { r.fixed += a; } }
    });
    return r;
  }
  function byDate(items, type) {
    var m = {};
    items.forEach(function (it) { if ((it.type || "지출") === type) { m[it.date] = (m[it.date] || 0) + (Number(it.amount) || 0); } });
    return m;
  }
  function unpaidFixed(settings, items, mk) {
    var paid = {};
    items.forEach(function (it) { if (it.fixedId) { paid[it.fixedId] = true; } });
    return ((settings && settings.fixed) || []).filter(function (f) { return !paid[f.id]; })
      .map(function (f) { return Object.assign({}, f, { date: fixedDate(mk, f.day) }); })
      .sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  }
  /* bulk paste: one item per line — "월세 400,000원 25일", "클로드	약 31,000원", "| 유독 | 12,900원 |" */
  var CAT_HINTS = [
    [/월세|관리비|전세|대출|이자|렌탈|정수기|가스|전기|수도/, "주거 · 관리비"],
    [/통신|휴대폰|핸드폰|인터넷|알뜰폰/, "통신"],
    [/보험/, "보험"],
    [/적금|저축|청약|투자|연금/, "저축 · 투자"],
    [/교통|버스|지하철|주유|주차/, "교통"],
    [/학원|강의|도서|교재/, "교육 · 도서"],
    [/헬스|병원|약국|필라테스|요가/, "의료 · 건강"]
  ];
  function guessCat(name) {
    for (var i = 0; i < CAT_HINTS.length; i++) { if (CAT_HINTS[i][0].test(name)) { return CAT_HINTS[i][1]; } }
    return "구독";
  }
  function parseFixed(raw) {
    var out = [];
    String(raw || "").split(/\r?\n/).forEach(function (line) {
      var s = line.replace(/[|\t]/g, " ").replace(/\s+/g, " ").trim();
      if (!s || /^(항목|합계|총계|계)(?=\s|$)|^[\s:-]+$/.test(s)) { return; }
      var day = null, amount = 0;
      s = s.replace(/(?:매월|매달)?\s*(\d{1,2})\s*일(?![가-힣])/, function (m, d) { day = Number(d); return " "; });
      var am = s.match(/(\d[\d,]*)\s*원/) || s.match(/(\d[\d,]{2,})\s*$/);
      if (am) { amount = num(am[1]); s = s.replace(am[0], " "); }
      var name = s.replace(/(^|\s)약(?=\s|$)/g, " ").replace(/\s+/g, " ").trim();
      if (!name || !amount) { return; }
      out.push({ name: name.slice(0, 40), amount: amount, day: day && day >= 1 && day <= 31 ? day : 1, dayGiven: !!day, cat: guessCat(name) });
    });
    return out;
  }
  App.budget = { won: won, shortWon: shortWon, monthKey: monthKey, ledgerRef: ledgerRef, settingsRef: settingsRef, totals: totals, byDate: byDate, unpaidFixed: unpaidFixed, fixedDate: fixedDate, parseFixed: parseFixed };

  function select(options, value, label) {
    var s = el("select"); if (label) { s.setAttribute("aria-label", label); }
    options.forEach(function (o) { var op = el("option", "", o); op.value = o; s.appendChild(op); });
    if (value) { s.value = value; }
    return s;
  }
  function moneyInput(placeholder, label) {
    var i = el("input", "bud-money"); i.type = "text"; i.inputMode = "numeric"; i.placeholder = placeholder || "금액"; i.maxLength = 15;
    if (label) { i.setAttribute("aria-label", label); }
    i.addEventListener("input", function () { var n = num(i.value); i.value = n ? n.toLocaleString("ko-KR") : ""; });
    return i;
  }
  function field(label, input, wide) {
    var f = el("label", "f" + (wide ? " wide" : ""));
    f.appendChild(el("span", "f-label", label)); f.appendChild(input);
    return f;
  }

  /* =========================================================
     개인 — 가계부
     ========================================================= */
  App.page({
    id: "personal-budget", title: "가계부",
    desc: "매달 나가는 고정지출을 등록해 두고, 날짜별로 얼마를 썼는지 달력으로 확인합니다. 수입 · 지출 내역, 분류별 통계, 월 예산까지 한곳에서 관리해요.",
    render: function (view) {
      var today = H.todayStr();
      var state = { mk: monthKey(new Date()), sel: today, settings: { fixed: [], budget: 0 }, items: [], editId: null, type: "지출", fType: "전체", fCat: "전체", q: "", fixedEdit: null };
      var unsubMonth = null;

      /* ---------- month bar + summary ---------- */
      var bar = el("div", "bud-monthbar");
      var prev = el("button", "tool-btn", "‹"); prev.type = "button"; prev.setAttribute("aria-label", "이전 달");
      var mTitle = el("h2", "bud-month");
      var next = el("button", "tool-btn", "›"); next.type = "button"; next.setAttribute("aria-label", "다음 달");
      var thisM = el("button", "tool-btn", "이번 달"); thisM.type = "button";
      var csv = el("button", "tool-btn", "CSV 내보내기"); csv.type = "button"; csv.title = "이 달의 내역을 엑셀에서 열 수 있는 CSV로 저장";
      [prev, mTitle, next, thisM, el("span", "grow"), csv].forEach(function (n) { bar.appendChild(n); });
      view.appendChild(bar);
      var tiles = el("div", "tiles bud-tiles"); view.appendChild(tiles);
      var budRow = el("div", "bud-budget-row"); view.appendChild(budRow);

      var g = ui.grid(view, true);
      var fixedCard = ui.card(g, { tab: "Fixed", tone: "t-1", title: "고정지출" });
      var dayCard = ui.card(g, { tab: "Daily", tone: "t-2", title: "날짜별 지출" });
      var listCard = ui.card(g, { tab: "Ledger", tone: "t-3", title: "수입 · 지출 내역", wide: true });
      var catCard = ui.card(g, { tab: "Category", tone: "t-2", title: "분류별 지출" });
      var setCard = ui.card(g, { tab: "Budget", tone: "t-1", title: "월 예산 · 결제수단" });

      /* ---------- saving ---------- */
      function saveMonth(mk, items) {
        return ledgerRef(mk).set({ items: items, updatedAt: new Date().toISOString() }, { merge: true })
          .catch(function (err) { window.alert("저장 실패: " + err.message); });
      }
      function saveItems(items) { state.items = items; drawAll(); return saveMonth(state.mk, items); }
      function saveSettings(patch) {
        state.settings = Object.assign({}, state.settings, patch); drawAll();
        return settingsRef().set(Object.assign({}, patch, { updatedAt: new Date().toISOString() }), { merge: true })
          .catch(function (err) { window.alert("저장 실패: " + err.message); });
      }
      /* an entry dated in another month goes to that month's document, then the view follows it */
      function putItem(item) {
        var mk = item.date.slice(0, 7);
        var rest = state.items.filter(function (x) { return x.id !== item.id; });
        if (mk === state.mk) { return saveItems(rest.concat([item])); }
        var moving = rest.length !== state.items.length;
        return ledgerRef(mk).get().then(function (snap) {
          var other = (snap.exists && snap.data().items) || [];
          return saveMonth(mk, other.filter(function (x) { return x.id !== item.id; }).concat([item]));
        }).then(function () {
          if (moving) { return saveMonth(state.mk, rest); }
        }).then(function () { state.sel = item.date; setMonth(mk); })
          .catch(function (err) { window.alert("저장 실패: " + err.message); });
      }
      function removeItem(id) { saveItems(state.items.filter(function (x) { return x.id !== id; })); }

      /* ---------- summary tiles ---------- */
      function tile(label, value, sub, cls) {
        var t = el("div", "tile" + (cls ? " " + cls : ""));
        t.appendChild(el("div", "tile-label", label)); t.appendChild(el("div", "tile-value", value)); t.appendChild(el("div", "tile-sub", sub));
        return t;
      }
      function drawSummary() {
        var p = state.mk.split("-");
        mTitle.textContent = p[0] + "년 " + Number(p[1]) + "월";
        var t = totals(state.items), budget = Number(state.settings.budget) || 0;
        var fixedAll = (state.settings.fixed || []).reduce(function (s, f) { return s + (Number(f.amount) || 0); }, 0);
        var unpaid = unpaidFixed(state.settings, state.items, state.mk).reduce(function (s, f) { return s + (Number(f.amount) || 0); }, 0);
        var cnt = state.items.filter(function (i) { return i.type !== "수입"; }).length;
        H.clear(tiles);
        tiles.appendChild(tile("수입", won(t.inc), state.items.filter(function (i) { return i.type === "수입"; }).length + "건", "inc"));
        tiles.appendChild(tile("지출", won(t.exp), cnt + "건", "exp"));
        tiles.appendChild(tile("잔액 (수입 − 지출)", (t.inc - t.exp < 0 ? "−" : "") + won(Math.abs(t.inc - t.exp)), t.inc ? "저축률 " + Math.round((t.inc - t.exp) / t.inc * 100) + "%" : "수입을 입력하면 저축률이 보여요"));
        tiles.appendChild(tile("고정지출", won(t.fixed), "매월 " + won(fixedAll) + (unpaid ? " · 미반영 " + won(unpaid) : " · 모두 반영"), "fix"));
        tiles.appendChild(tile("변동지출", won(t.exp - t.fixed), "고정지출 제외"));
        var left = budget - t.exp;
        tiles.appendChild(tile("예산 잔여", budget ? (left < 0 ? "−" : "") + won(Math.abs(left)) : "—", budget ? (unpaid ? "미반영 고정 포함 시 " + (left - unpaid < 0 ? "−" : "") + won(Math.abs(left - unpaid)) : "예산 " + won(budget)) : "아래에서 월 예산을 정해 보세요", left < 0 && budget ? "over" : ""));
        H.clear(budRow);
        if (budget) {
          var pct = Math.round(t.exp / budget * 100);
          var pr = ui.progress(Math.min(100, pct), "예산 " + won(budget) + " 중 " + pct + "% 사용");
          if (pct > 100) { pr.classList.add("over"); }
          budRow.appendChild(pr);
        }
      }

      /* ---------- 고정지출 ---------- */
      var fxSum = el("div", "items-summary");
      var fxTools = el("div", "items-tools");
      var fxAdd = el("button", "tool-btn", "+ 고정지출 추가"); fxAdd.type = "button";
      var fxAll = el("button", "tool-btn", "미반영 모두 이번 달에 반영"); fxAll.type = "button";
      var fxBulkBtn = el("button", "tool-btn", "여러 개 붙여넣기"); fxBulkBtn.type = "button";
      fxTools.appendChild(fxAdd); fxTools.appendChild(fxBulkBtn); fxTools.appendChild(fxAll);
      var fxBulk = el("form", "obs-import"); fxBulk.hidden = true;
      fxBulk.appendChild(el("p", "hint", "한 줄에 하나씩 '항목명 금액 (결제일)'을 적거나, 표를 그대로 복사해 붙여넣으세요. 결제일을 안 적으면 1일로 들어가니 나중에 ✎로 고쳐 주세요. 같은 이름이 이미 있으면 금액만 바뀌어요."));
      var fxBulkTa = el("textarea"); fxBulkTa.rows = 7; fxBulkTa.placeholder = "월세 400,000원 25일\n통신비 30,000원 15일\n넷플릭스 17,000원";
      var fxBulkActs = el("div", "items-tools");
      var fxBulkGo = el("button", "btn", "추가"); fxBulkGo.type = "submit";
      var fxBulkX = el("button", "btn ghost", "닫기"); fxBulkX.type = "button";
      fxBulkActs.appendChild(fxBulkGo); fxBulkActs.appendChild(fxBulkX);
      fxBulk.appendChild(fxBulkTa); fxBulk.appendChild(fxBulkActs);
      fxBulkBtn.addEventListener("click", function () { fxBulk.hidden = !fxBulk.hidden; if (!fxBulk.hidden) { fxBulkTa.focus(); } });
      fxBulkX.addEventListener("click", function () { fxBulk.hidden = true; });
      fxBulk.addEventListener("submit", function (e) {
        e.preventDefault();
        var rows = parseFixed(fxBulkTa.value);
        if (!rows.length) { window.alert("'항목명 금액' 형식의 줄을 찾지 못했어요. 예: 월세 400,000원 25일"); return; }
        var list = (state.settings.fixed || []).slice(), added = 0, updated = 0;
        rows.forEach(function (r) {
          var hit = list.filter(function (f) { return f.name === r.name; })[0];
          if (hit) {
            var i = list.indexOf(hit);
            list[i] = Object.assign({}, hit, { amount: r.amount }, r.dayGiven ? { day: r.day } : {});
            updated++;
          } else {
            list.push({ id: H.uid(), name: r.name, amount: r.amount, day: r.day, cat: r.cat, method: r.cat === "주거 · 관리비" ? "계좌이체" : "카드", memo: "" });
            added++;
          }
        });
        saveSettings({ fixed: list });
        fxBulkTa.value = ""; fxBulk.hidden = true;
        window.alert("고정지출 " + added + "개 추가" + (updated ? ", " + updated + "개 금액 수정" : "") + "했어요.");
      });
      var fxForm = el("form", "item-form"); fxForm.hidden = true;
      var fxName = el("input"); fxName.placeholder = "예: 월세, 통신비, 넷플릭스"; fxName.maxLength = 40; fxName.required = true;
      var fxAmt = moneyInput("금액", "고정지출 금액"); fxAmt.required = true;
      var fxDay = el("input"); fxDay.type = "number"; fxDay.min = 1; fxDay.max = 31; fxDay.step = 1; fxDay.placeholder = "1~31"; fxDay.required = true;
      var fxCat = select(EXP_CATS, "주거 · 관리비");
      var fxMethod = select(METHODS, "계좌이체");
      var fxMemo = el("input"); fxMemo.placeholder = "메모 (선택) · 예: 자동이체 신한"; fxMemo.maxLength = 80;
      var fxActs = el("div", "actions");
      var fxSave = el("button", "btn", "저장"); fxSave.type = "submit";
      var fxCancel = el("button", "btn ghost", "취소"); fxCancel.type = "button";
      fxActs.appendChild(fxSave); fxActs.appendChild(fxCancel);
      [field("항목명", fxName), field("금액", fxAmt), field("매월 결제일", fxDay), field("분류", fxCat), field("결제수단", fxMethod), field("메모", fxMemo, true), fxActs].forEach(function (n) { fxForm.appendChild(n); });
      var fxList = el("div", "plain-list bud-fixed-list");
      [fxSum, fxTools, fxBulk, fxForm, fxList, el("p", "hint", "체크하면 이 달의 결제일에 지출로 기록되어 날짜별 지출 · 합계에 반영돼요. 결제일이 그 달에 없으면(예: 31일) 말일로 들어갑니다.")].forEach(function (n) { fixedCard.body.appendChild(n); });

      function openFixedForm(f) {
        state.fixedEdit = f ? f.id : null;
        fxName.value = f ? f.name : ""; fxAmt.value = f ? Number(f.amount).toLocaleString("ko-KR") : ""; fxDay.value = f ? f.day : "";
        fxCat.value = f ? f.cat : "주거 · 관리비"; fxMethod.value = f ? f.method : "계좌이체"; fxMemo.value = f ? (f.memo || "") : "";
        fxSave.textContent = f ? "수정 저장" : "저장";
        fxForm.hidden = false; fxName.focus();
      }
      fxAdd.addEventListener("click", function () { if (!fxForm.hidden && !state.fixedEdit) { fxForm.hidden = true; return; } openFixedForm(null); });
      fxCancel.addEventListener("click", function () { fxForm.hidden = true; state.fixedEdit = null; });
      fxForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = fxName.value.trim(), amount = num(fxAmt.value), day = Math.round(Number(fxDay.value));
        if (!name || !amount) { window.alert("항목명과 금액을 입력해 주세요."); return; }
        if (!(day >= 1 && day <= 31)) { window.alert("결제일은 1~31 사이 숫자로 입력해 주세요."); return; }
        var rec = { id: state.fixedEdit || H.uid(), name: name, amount: amount, day: day, cat: fxCat.value, method: fxMethod.value, memo: fxMemo.value.trim() };
        var list = (state.settings.fixed || []).slice();
        var i = list.map(function (f) { return f.id; }).indexOf(rec.id);
        if (i === -1) { list.push(rec); } else { list[i] = rec; }
        saveSettings({ fixed: list });
        fxForm.hidden = true; state.fixedEdit = null;
      });
      function fixedEntry(f) {
        return { id: H.uid(), date: fixedDate(state.mk, f.day), type: "지출", cat: f.cat || "기타", amount: Number(f.amount) || 0, method: f.method || "계좌이체", memo: f.name, fixedId: f.id, createdAt: new Date().toISOString() };
      }
      fxAll.addEventListener("click", function () {
        var todo = unpaidFixed(state.settings, state.items, state.mk);
        if (!todo.length) { window.alert("이 달에 반영할 고정지출이 없습니다."); return; }
        saveItems(state.items.concat(todo.map(fixedEntry)));
      });
      function drawFixed() {
        var fixed = (state.settings.fixed || []).slice().sort(function (a, b) { return (Number(a.day) || 0) - (Number(b.day) || 0); });
        var paid = {};
        state.items.forEach(function (it) { if (it.fixedId) { paid[it.fixedId] = it; } });
        var total = fixed.reduce(function (s, f) { return s + (Number(f.amount) || 0); }, 0);
        var done = fixed.filter(function (f) { return paid[f.id]; }).length;
        fixedCard.count.textContent = fixed.length ? done + " / " + fixed.length + " 반영" : "";
        H.clear(fxSum);
        if (fixed.length) {
          fxSum.appendChild(document.createTextNode("매월 합계 "));
          fxSum.appendChild(el("strong", "", won(total)));
          fxSum.appendChild(document.createTextNode(" · " + Number(state.mk.slice(5)) + "월 반영 " + done + "/" + fixed.length));
        }
        fxAll.hidden = !fixed.length || done === fixed.length;
        H.clear(fxList);
        if (!fixed.length) { fxList.appendChild(ui.empty("월세 · 관리비 · 통신비 · 보험 · 구독료처럼 매달 나가는 돈을 등록해 두세요.")); return; }
        var curMonth = state.mk === monthKey(new Date());
        fixed.forEach(function (f) {
          var row = el("div", "bud-fixed" + (paid[f.id] ? " paid" : ""));
          var cb = el("input"); cb.type = "checkbox"; cb.checked = !!paid[f.id]; cb.setAttribute("aria-label", f.name + " 이번 달 반영");
          cb.addEventListener("change", function () {
            if (cb.checked) { saveItems(state.items.concat([fixedEntry(f)])); }
            else { saveItems(state.items.filter(function (it) { return it.fixedId !== f.id; })); }
          });
          row.appendChild(cb);
          row.appendChild(el("span", "bud-day", "매월 " + f.day + "일"));
          var main = el("span", "bud-fixed-main");
          main.appendChild(el("span", "bud-fixed-name", f.name));
          main.appendChild(el("span", "mini-sub", [f.cat, f.method, f.memo].filter(Boolean).join(" · ")));
          row.appendChild(main);
          if (!paid[f.id] && curMonth) { row.appendChild(H.ddayEl(fixedDate(state.mk, f.day))); }
          row.appendChild(el("span", "bud-amt", won(f.amount)));
          var ed = el("button", "icon-btn", "✎"); ed.type = "button"; ed.title = "수정"; ed.setAttribute("aria-label", f.name + " 수정");
          ed.addEventListener("click", function () { openFixedForm(f); });
          var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제"; del.setAttribute("aria-label", f.name + " 삭제");
          del.addEventListener("click", function () {
            if (!window.confirm("'" + f.name + "' 고정지출을 목록에서 삭제할까요? (이미 기록된 지출 내역은 그대로 남아요)")) { return; }
            saveSettings({ fixed: (state.settings.fixed || []).filter(function (x) { return x.id !== f.id; }) });
          });
          row.appendChild(ed); row.appendChild(del);
          fxList.appendChild(row);
        });
      }

      /* ---------- 날짜별 지출 (달력) ---------- */
      var calGrid = el("div", "cal-grid bud-cal");
      var dayStats = el("div", "stat-row bud-stats");
      var dayHead = el("div", "mini-title");
      var dayList = el("div", "plain-list");
      [calGrid, dayStats, dayHead, dayList].forEach(function (n) { dayCard.body.appendChild(n); });
      function drawDaily() {
        var exp = byDate(state.items, "지출"), inc = byDate(state.items, "수입");
        var p = state.mk.split("-"), y = Number(p[0]), m = Number(p[1]) - 1, days = daysIn(state.mk);
        var max = 0; Object.keys(exp).forEach(function (k) { if (exp[k] > max) { max = exp[k]; } });
        H.clear(calGrid);
        H.DOW.forEach(function (d) { calGrid.appendChild(el("div", "cal-dow", d)); });
        for (var i = 0, sd = new Date(y, m, 1).getDay(); i < sd; i++) { calGrid.appendChild(el("div", "cal-cell blank")); }
        for (var d = 1; d <= days; d++) {
          (function (day) {
            var key = state.mk + "-" + H.pad2(day), dow = new Date(y, m, day).getDay();
            var cell = el("button", "cal-cell bud-cell" + (key === today ? " today" : "") + (key === state.sel ? " sel" : "") + ((dow === 0 || dow === 6) ? " wknd" : "") + (key > today ? " future" : ""));
            cell.type = "button";
            cell.appendChild(el("span", "bud-cell-day", String(day)));
            if (exp[key]) {
              cell.style.setProperty("--heat", String(Math.round(10 + exp[key] / max * 55)));
              cell.classList.add("has");
              cell.appendChild(el("span", "bud-cell-amt", shortWon(exp[key])));
            }
            if (inc[key]) { cell.appendChild(el("span", "bud-cell-inc", "+" + shortWon(inc[key]))); }
            cell.setAttribute("aria-label", key + " 지출 " + won(exp[key] || 0) + (inc[key] ? ", 수입 " + won(inc[key]) : ""));
            cell.addEventListener("click", function () { state.sel = key; dateEl.value = key; drawDaily(); drawList(); });
            calGrid.appendChild(cell);
          })(d);
        }
        /* stats: count elapsed days only for the current month */
        var elapsed = state.mk < today.slice(0, 7) ? days : (state.mk > today.slice(0, 7) ? 0 : Number(today.slice(8)));
        var t = totals(state.items), maxKey = null;
        Object.keys(exp).forEach(function (k) { if (!maxKey || exp[k] > exp[maxKey]) { maxKey = k; } });
        var noSpend = 0;
        for (var j = 1; j <= elapsed; j++) { if (!exp[state.mk + "-" + H.pad2(j)]) { noSpend++; } }
        H.clear(dayStats);
        function stat(label, value) { var s = el("span", "", label + " "); s.appendChild(el("strong", "", value)); dayStats.appendChild(s); }
        stat("하루 평균", elapsed ? won(t.exp / elapsed) : "—");
        stat("최대", maxKey ? Number(maxKey.slice(8)) + "일 " + won(exp[maxKey]) : "—");
        stat("무지출", elapsed ? noSpend + "일" : "—");
        /* selected day */
        var sel = state.sel.slice(0, 7) === state.mk ? state.sel : null;
        H.clear(dayList);
        if (!sel) { dayHead.textContent = "날짜를 누르면 그날 쓴 내역이 보여요"; return; }
        var dd = H.parseKey(sel);
        dayHead.textContent = (dd.getMonth() + 1) + "월 " + dd.getDate() + "일 (" + H.DOW[dd.getDay()] + ") · 지출 " + won(exp[sel] || 0) + (inc[sel] ? " · 수입 " + won(inc[sel]) : "");
        var its = state.items.filter(function (it) { return it.date === sel; });
        if (!its.length) { dayList.appendChild(ui.empty("이 날 기록된 내역이 없어요. 아래 내역 입력에서 추가해 보세요.")); return; }
        its.forEach(function (it) { dayList.appendChild(entryRow(it)); });
      }

      /* ---------- 입력 폼 + 내역 ---------- */
      var form = el("form", "item-form bud-form");
      var typeWrap = el("div", "bud-type f wide");
      var tExp = el("button", "chip", "지출"); tExp.type = "button";
      var tInc = el("button", "chip", "수입"); tInc.type = "button";
      typeWrap.appendChild(tExp); typeWrap.appendChild(tInc);
      var dateEl = el("input"); dateEl.type = "date"; dateEl.required = true; dateEl.value = today;
      var catEl = el("select"); catEl.setAttribute("aria-label", "분류");
      var amtEl = moneyInput("0", "금액"); amtEl.required = true;
      var methodEl = select(METHODS, "카드", "결제수단");
      var memoEl = el("input"); memoEl.placeholder = "내용 · 사용처 (예: 점심 김밥, 다이소)"; memoEl.maxLength = 100;
      var acts = el("div", "actions");
      var saveBtn = el("button", "btn", "추가"); saveBtn.type = "submit";
      var cancelBtn = el("button", "btn ghost", "수정 취소"); cancelBtn.type = "button"; cancelBtn.hidden = true;
      acts.appendChild(saveBtn); acts.appendChild(cancelBtn);
      var methodField = field("결제수단", methodEl);
      [typeWrap, field("날짜", dateEl), field("분류", catEl), field("금액 (원)", amtEl), methodField, field("내용 · 메모", memoEl, true), acts].forEach(function (n) { form.appendChild(n); });

      var filt = el("div", "items-tools");
      var fTypes = el("div", "archive-filters bud-ftypes");
      var fCatEl = el("select"); fCatEl.setAttribute("aria-label", "분류 필터");
      var fQ = el("input"); fQ.type = "search"; fQ.placeholder = "내용 · 분류 검색"; fQ.setAttribute("aria-label", "내역 검색");
      filt.appendChild(fTypes); filt.appendChild(fCatEl); filt.appendChild(fQ);
      var listSum = el("div", "items-summary");
      var list = el("div", "bud-list");
      [form, filt, listSum, list].forEach(function (n) { listCard.body.appendChild(n); });

      function setType(t, keepCat) {
        state.type = t;
        tExp.classList.toggle("active", t === "지출"); tInc.classList.toggle("active", t === "수입");
        var cur = catEl.value; H.clear(catEl);
        (t === "수입" ? INC_CATS : EXP_CATS).forEach(function (c) { var o = el("option", "", c); o.value = c; catEl.appendChild(o); });
        if (keepCat && (t === "수입" ? INC_CATS : EXP_CATS).indexOf(cur) !== -1) { catEl.value = cur; }
        methodEl.value = t === "수입" ? "계좌이체" : "카드";
      }
      tExp.addEventListener("click", function () { setType("지출"); });
      tInc.addEventListener("click", function () { setType("수입"); });
      function resetForm() {
        state.editId = null; saveBtn.textContent = "추가"; cancelBtn.hidden = true; form.classList.remove("editing");
        amtEl.value = ""; memoEl.value = "";
      }
      function startEdit(it) {
        state.editId = it.id; setType(it.type || "지출");
        dateEl.value = it.date; catEl.value = it.cat; amtEl.value = Number(it.amount).toLocaleString("ko-KR"); methodEl.value = it.method || METHODS[0]; memoEl.value = it.memo || "";
        saveBtn.textContent = "수정 저장"; cancelBtn.hidden = false; form.classList.add("editing");
        form.scrollIntoView({ behavior: "smooth", block: "center" }); amtEl.focus();
      }
      cancelBtn.addEventListener("click", resetForm);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var amount = num(amtEl.value);
        if (!dateEl.value || !amount) { window.alert("날짜와 금액을 입력해 주세요."); return; }
        var old = state.editId ? state.items.filter(function (x) { return x.id === state.editId; })[0] : null;
        var item = Object.assign({}, old || { createdAt: new Date().toISOString() }, {
          id: old ? old.id : H.uid(), date: dateEl.value, type: state.type, cat: catEl.value, amount: amount, method: methodEl.value, memo: memoEl.value.trim()
        });
        state.sel = item.date;
        putItem(item);
        resetForm(); amtEl.focus();
      });

      function entryRow(it) {
        var inc = it.type === "수입";
        var row = el("div", "bud-entry" + (inc ? " inc" : ""));
        var chip = el("span", "cat-chip bud-cat", it.cat || "기타");
        row.appendChild(chip);
        var main = el("span", "bud-entry-main");
        main.appendChild(el("span", "bud-entry-memo", it.memo || it.cat || ""));
        var meta = [it.method];
        if (it.fixedId) { meta.push("고정지출"); }
        main.appendChild(el("span", "mini-sub", meta.filter(Boolean).join(" · ")));
        row.appendChild(main);
        row.appendChild(el("span", "bud-amt" + (inc ? " inc" : ""), (inc ? "+" : "−") + won(it.amount)));
        var ed = el("button", "icon-btn", "✎"); ed.type = "button"; ed.title = "수정"; ed.setAttribute("aria-label", "수정");
        ed.addEventListener("click", function () { startEdit(it); });
        var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제"; del.setAttribute("aria-label", "삭제");
        del.addEventListener("click", function () { if (window.confirm("이 내역을 삭제할까요?\n" + (it.memo || it.cat) + " · " + won(it.amount))) { removeItem(it.id); } });
        row.appendChild(ed); row.appendChild(del);
        return row;
      }
      function drawFilters() {
        H.clear(fTypes);
        ["전체", "지출", "수입", "고정지출"].forEach(function (t) {
          var b = el("button", "chip" + (state.fType === t ? " active" : ""), t); b.type = "button";
          b.addEventListener("click", function () { state.fType = t; drawFilters(); drawList(); });
          fTypes.appendChild(b);
        });
        var cats = ["전체"].concat(state.fType === "수입" ? INC_CATS : (state.fType === "전체" ? EXP_CATS.concat(INC_CATS.filter(function (c) { return EXP_CATS.indexOf(c) === -1; })) : EXP_CATS));
        H.clear(fCatEl);
        cats.forEach(function (c) { var o = el("option", "", c === "전체" ? "분류 전체" : c); o.value = c; fCatEl.appendChild(o); });
        if (cats.indexOf(state.fCat) === -1) { state.fCat = "전체"; }
        fCatEl.value = state.fCat;
      }
      fCatEl.addEventListener("change", function () { state.fCat = fCatEl.value; drawList(); });
      fQ.addEventListener("input", function () { state.q = fQ.value.trim().toLowerCase(); drawList(); });
      function filtered() {
        return state.items.filter(function (it) {
          var type = it.type || "지출";
          if (state.fType === "지출" && type !== "지출") { return false; }
          if (state.fType === "수입" && type !== "수입") { return false; }
          if (state.fType === "고정지출" && !it.fixedId) { return false; }
          if (state.fCat !== "전체" && it.cat !== state.fCat) { return false; }
          if (state.q && ((it.memo || "") + " " + (it.cat || "") + " " + (it.method || "")).toLowerCase().indexOf(state.q) === -1) { return false; }
          return true;
        });
      }
      function drawList() {
        var items = filtered().sort(function (a, b) { return a.date === b.date ? String(b.createdAt || "").localeCompare(String(a.createdAt || "")) : (a.date < b.date ? 1 : -1); });
        listCard.count.textContent = state.items.length ? state.items.length + "건" : "";
        var t = totals(items);
        H.clear(listSum);
        if (items.length) {
          listSum.appendChild(document.createTextNode(items.length + "건 · 지출 "));
          listSum.appendChild(el("strong", "", won(t.exp)));
          listSum.appendChild(document.createTextNode(" · 수입 "));
          listSum.appendChild(el("strong", "", won(t.inc)));
        }
        H.clear(list);
        if (!items.length) { list.appendChild(ui.empty(state.items.length ? "조건에 맞는 내역이 없습니다." : "이 달의 내역이 아직 없어요. 위에서 첫 지출을 기록해 보세요.")); return; }
        var groups = {};
        items.forEach(function (it) { (groups[it.date] = groups[it.date] || []).push(it); });
        Object.keys(groups).sort().reverse().forEach(function (k) {
          var box = el("div", "bud-group" + (k === state.sel ? " sel" : ""));
          var gt = totals(groups[k]), d = H.parseKey(k);
          var head = el("div", "bud-group-head");
          head.appendChild(el("span", "", (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + H.DOW[d.getDay()] + ")"));
          head.appendChild(el("span", "bud-group-sum", (gt.inc ? "+" + won(gt.inc) + "  " : "") + (gt.exp ? "−" + won(gt.exp) : "")));
          box.appendChild(head);
          groups[k].forEach(function (it) { box.appendChild(entryRow(it)); });
          list.appendChild(box);
        });
      }

      /* ---------- 분류별 지출 ---------- */
      var catBars = el("div", "bud-bars");
      catCard.body.appendChild(catBars);
      function bars(parent, map, total, onClick) {
        H.clear(parent);
        var keys = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
        if (!keys.length) { parent.appendChild(ui.empty("지출 내역이 쌓이면 분류별 비율이 보여요.")); return; }
        keys.forEach(function (k) {
          var row = el(onClick ? "button" : "div", "bud-bar-row"); if (onClick) { row.type = "button"; row.title = k + " 내역만 보기"; row.addEventListener("click", function () { onClick(k); }); }
          row.appendChild(el("span", "bud-bar-label", k));
          var b = el("span", "bud-bar"); var fill = el("span"); fill.style.width = Math.max(2, Math.round(map[k] / total * 100)) + "%"; b.appendChild(fill);
          row.appendChild(b);
          row.appendChild(el("span", "bud-bar-val", won(map[k]) + " · " + Math.round(map[k] / total * 100) + "%"));
          parent.appendChild(row);
        });
      }
      function drawCats() {
        var m = {}, total = 0;
        state.items.forEach(function (it) { if (it.type !== "수입") { var a = Number(it.amount) || 0; m[it.cat || "기타"] = (m[it.cat || "기타"] || 0) + a; total += a; } });
        catCard.count.textContent = total ? won(total) : "";
        bars(catBars, m, total, function (k) {
          state.fType = "지출"; state.fCat = k; drawFilters(); drawList();
          listCard.el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      /* ---------- 예산 · 결제수단 ---------- */
      var bForm = el("form", "quick-add");
      var bAmt = moneyInput("월 예산 (예: 1,500,000)", "월 예산");
      var bSave = el("button", "btn", "예산 저장"); bSave.type = "submit";
      bForm.appendChild(bAmt); bForm.appendChild(bSave);
      var bHint = el("p", "hint", "매달 쓸 수 있는 총 지출 한도예요. 고정지출을 포함한 금액으로 정하면 위 '예산 잔여'가 정확해져요.");
      var mTitleEl = el("div", "mini-title", "결제수단별 지출");
      var mBars = el("div", "bud-bars");
      [bForm, bHint, mTitleEl, mBars].forEach(function (n) { setCard.body.appendChild(n); });
      bForm.addEventListener("submit", function (e) { e.preventDefault(); saveSettings({ budget: num(bAmt.value) }); });
      function drawBudget() {
        var b = Number(state.settings.budget) || 0;
        if (document.activeElement !== bAmt) { bAmt.value = b ? b.toLocaleString("ko-KR") : ""; }
        var m = {}, total = 0;
        state.items.forEach(function (it) { if (it.type !== "수입") { var a = Number(it.amount) || 0; m[it.method || "기타"] = (m[it.method || "기타"] || 0) + a; total += a; } });
        bars(mBars, m, total, null);
      }

      /* ---------- CSV ---------- */
      csv.addEventListener("click", function () {
        if (!state.items.length) { window.alert("이 달에 내보낼 내역이 없습니다."); return; }
        function q(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
        var rows = [["날짜", "구분", "분류", "내용", "결제수단", "금액", "고정지출"]];
        state.items.slice().sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); }).forEach(function (it) {
          rows.push([it.date, it.type || "지출", it.cat, it.memo, it.method, Number(it.amount) || 0, it.fixedId ? "Y" : ""]);
        });
        var blob = new Blob(["﻿" + rows.map(function (r) { return r.map(q).join(","); }).join("\r\n")], { type: "text/csv;charset=utf-8" });
        var a = el("a"); a.href = URL.createObjectURL(blob); a.download = "가계부-" + state.mk + ".csv";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      });

      /* ---------- month navigation ---------- */
      function drawAll() { drawSummary(); drawFixed(); drawDaily(); drawList(); drawCats(); drawBudget(); }
      function setMonth(mk) {
        state.mk = mk;
        if (state.sel.slice(0, 7) !== mk) { state.sel = mk === today.slice(0, 7) ? today : mk + "-01"; }
        if (!state.editId) { dateEl.value = state.sel; }
        state.items = [];
        if (unsubMonth) { unsubMonth(); }
        unsubMonth = App.watchDoc(ledgerRef(mk), function (d) { state.items = (d && d.items) || []; drawAll(); });
        drawAll();
      }
      prev.addEventListener("click", function () { setMonth(shiftMonth(state.mk, -1)); });
      next.addEventListener("click", function () { setMonth(shiftMonth(state.mk, 1)); });
      thisM.addEventListener("click", function () { state.sel = today; setMonth(today.slice(0, 7)); });

      setType("지출"); drawFilters();
      App.watchDoc(settingsRef(), function (d) { state.settings = Object.assign({ fixed: [], budget: 0 }, d || {}); drawAll(); });
      setMonth(state.mk);
    }
  });
})(window.App);
