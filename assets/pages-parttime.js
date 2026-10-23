/* Hello dear Sunny — 개인 · 알바비 (근무지별 시급 · 월별 근무 시간 입력 · 알바비 합계 · 가계부 수입으로 넣기)
   근무지 이름 · 시급은 개인정보라 코드에 두지 않고 Firestore(personal/parttime)에만 저장해. */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  function num(v) { var n = Number(String(v == null ? "" : v).replace(/[^\d]/g, "")); return isFinite(n) ? n : 0; }
  function won(n) { return Math.round(Number(n) || 0).toLocaleString("ko-KR") + "원"; }
  function monthKey(d) { return d.getFullYear() + "-" + H.pad2(d.getMonth() + 1); }
  function shiftMonth(mk, n) { var p = mk.split("-"); return monthKey(new Date(Number(p[0]), Number(p[1]) - 1 + n, 1)); }
  function monthLabel(mk) { var p = mk.split("-"); return p[0] + "년 " + Number(p[1]) + "월"; }
  function settingsRef() { return App.doc("personal/parttime"); }
  function monthRef(mk) { return App.doc("personal/parttime-" + mk); }
  /* "13:30" → 810 (minutes) */
  function toMin(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
  /* hours between two clock times minus a break; past midnight counts as the next day */
  function spanHours(start, end, brk) {
    var a = toMin(start), b = toMin(end);
    if (a === null || b === null) { return 0; }
    var m = b - a; if (m <= 0) { m += 24 * 60; }
    m -= Math.max(0, Number(brk) || 0);
    return m > 0 ? Math.round(m / 60 * 100) / 100 : 0;
  }
  function fmtHours(h) {
    h = Math.round((Number(h) || 0) * 60);
    var hh = Math.floor(h / 60), mm = h % 60;
    return (hh ? hh + "시간" : "") + (mm ? (hh ? " " : "") + mm + "분" : "") || "0시간";
  }
  /* pay for one place in one month: hours × rate, minus 3.3% when the place withholds it */
  function placePay(items, place, rate) {
    var hours = 0, days = {};
    items.forEach(function (it) { if (it.place === place.id) { hours += Number(it.hours) || 0; days[it.date] = true; } });
    var gross = Math.round(hours * (Number(rate) || 0));
    var tax = place.tax ? Math.floor(gross * 0.033 / 10) * 10 : 0;  /* 원 단위 절사 (10원 미만) */
    return { hours: Math.round(hours * 100) / 100, days: Object.keys(days).length, gross: gross, tax: tax, net: gross - tax };
  }
  App.parttime = { spanHours: spanHours, fmtHours: fmtHours, placePay: placePay };

  App.page({
    id: "personal-parttime", title: "알바비",
    render: function (view) {
      var today = H.todayStr();
      var state = { mk: monthKey(new Date()), places: [], items: [], rates: {}, place: "", editId: null, loaded: false };
      var unsubMonth = null;

      /* ---------- month bar + summary ---------- */
      var bar = el("div", "bud-monthbar");
      var prev = el("button", "tool-btn", "‹"); prev.type = "button"; prev.setAttribute("aria-label", "이전 달");
      var mTitle = el("h2", "bud-month");
      var next = el("button", "tool-btn", "›"); next.type = "button"; next.setAttribute("aria-label", "다음 달");
      var thisM = el("button", "tool-btn", "이번 달"); thisM.type = "button";
      [prev, mTitle, next, thisM].forEach(function (n) { bar.appendChild(n); });
      view.appendChild(bar);
      var tiles = el("div", "tiles pt-tiles"); view.appendChild(tiles);

      var cols = el("div", "bud-cols"), colL = el("div", "bud-col"), colR = el("div", "bud-col");
      cols.appendChild(colL); cols.appendChild(colR); view.appendChild(cols);
      var logCard = ui.card(colL, { tab: "Hours", tone: "t-3", title: "근무 시간 입력" });
      var payCard = ui.card(colR, { tab: "Pay", tone: "t-2", title: "이 달 알바비" });
      var histCard = ui.card(colR, { tab: "Monthly", tone: "t-1", title: "월별 알바비" });
      var setCard = ui.card(colR, { tab: "Places", tone: "t-1", title: "근무지 · 시급" });

      function rateOf(id) {
        if (state.rates[id] != null) { return Number(state.rates[id]) || 0; }
        var p = state.places.filter(function (x) { return x.id === id; })[0];
        return p ? Number(p.rate) || 0 : 0;
      }
      /* each month keeps the rates it was paid at, so a raise later does not change past months */
      function currentRates() { var r = {}; state.places.forEach(function (p) { r[p.id] = rateOf(p.id); }); return r; }
      function saveItems(items) {
        state.items = items; drawAll();
        return monthRef(state.mk).set({ items: items, rates: currentRates(), updatedAt: new Date().toISOString() }, { merge: true })
          .catch(function (err) { window.alert("저장 실패: " + err.message); });
      }
      function savePlaces(places) {
        state.places = places; drawAll();
        return settingsRef().set({ places: places, updatedAt: new Date().toISOString() }, { merge: true })
          .catch(function (err) { window.alert("저장 실패: " + err.message); });
      }

      function tile(label, value, sub, cls) {
        var t = el("div", "tile" + (cls ? " " + cls : ""));
        t.appendChild(el("div", "tile-label", label)); t.appendChild(el("div", "tile-value", value)); t.appendChild(el("div", "tile-sub", sub || ""));
        return t;
      }
      function drawSummary() {
        mTitle.textContent = monthLabel(state.mk);
        H.clear(tiles);
        var tot = { hours: 0, gross: 0, net: 0 };
        var per = state.places.map(function (p) {
          var r = placePay(state.items, p, rateOf(p.id));
          tot.hours += r.hours; tot.gross += r.gross; tot.net += r.net;
          return { p: p, r: r };
        });
        tiles.appendChild(tile("이 달 알바비 (받을 돈)", won(tot.net), tot.gross !== tot.net ? "세전 " + won(tot.gross) : (state.places.length ? "" : "아래에서 근무지를 먼저 등록해 주세요"), "inc"));
        tiles.appendChild(tile("총 근무 시간", fmtHours(tot.hours), state.items.length + "번 근무"));
        per.forEach(function (x) {
          tiles.appendChild(tile(x.p.name, won(x.r.net), fmtHours(x.r.hours) + " · " + x.r.days + "일" + (rateOf(x.p.id) ? " · 시급 " + won(rateOf(x.p.id)) : " · 시급 미정")));
        });
      }

      /* ---------- 입력 폼 ---------- */
      function field(label, input, wide) {
        var f = el("label", "f" + (wide ? " wide" : ""));
        f.appendChild(el("span", "f-label", label)); f.appendChild(input);
        return f;
      }
      var form = el("form", "item-form bud-form pt-form");
      var placeWrap = el("div", "bud-type f wide pt-places"); placeWrap.setAttribute("role", "group"); placeWrap.setAttribute("aria-label", "근무지");
      var dateEl = el("input"); dateEl.type = "date"; dateEl.required = true; dateEl.value = today;
      var startEl = el("input"); startEl.type = "time"; startEl.setAttribute("aria-label", "시작 시간");
      var endEl = el("input"); endEl.type = "time"; endEl.setAttribute("aria-label", "끝난 시간");
      var brkEl = el("input"); brkEl.type = "number"; brkEl.min = "0"; brkEl.step = "5"; brkEl.placeholder = "0"; brkEl.setAttribute("aria-label", "쉬는 시간(분)");
      var hoursEl = el("input"); hoursEl.type = "number"; hoursEl.min = "0"; hoursEl.step = "0.25"; hoursEl.placeholder = "예: 3.5"; hoursEl.setAttribute("aria-label", "근무 시간");
      var memoEl = el("input"); memoEl.placeholder = "메모 (예: 중3 수업, 보강)"; memoEl.maxLength = 100;
      var calcHint = el("p", "hint pt-calc");
      var acts = el("div", "actions");
      var saveBtn = el("button", "btn", "추가"); saveBtn.type = "submit";
      var cancelBtn = el("button", "btn ghost", "수정 취소"); cancelBtn.type = "button"; cancelBtn.hidden = true;
      acts.appendChild(saveBtn); acts.appendChild(cancelBtn);
      [placeWrap, field("날짜", dateEl), field("시작", startEl), field("끝", endEl), field("쉬는 시간 (분)", brkEl), field("근무 시간 (시간)", hoursEl), field("메모", memoEl, true), calcHint, acts].forEach(function (n) { form.appendChild(n); });
      /* start / end fill in the hours; typing the hours directly also works */
      var hoursTyped = false;
      function autoHours() {
        var h = spanHours(startEl.value, endEl.value, brkEl.value);
        if (h && !hoursTyped) { hoursEl.value = String(h); }
        drawCalc();
      }
      [startEl, endEl, brkEl].forEach(function (i) { i.addEventListener("input", function () { hoursTyped = false; autoHours(); }); });
      hoursEl.addEventListener("input", function () { hoursTyped = true; drawCalc(); });
      function drawCalc() {
        var h = Number(hoursEl.value) || 0, r = rateOf(state.place);
        calcHint.textContent = h ? fmtHours(h) + (r ? " × 시급 " + won(r) + " = " + won(Math.round(h * r)) : " (시급을 정하면 금액이 계산돼요)") : "시작 · 끝 시간을 넣으면 근무 시간이 자동으로 계산돼요. 시간만 바로 적어도 돼요.";
      }
      function drawPlaceChips() {
        H.clear(placeWrap);
        if (!state.places.length) { placeWrap.appendChild(el("span", "hint", "오른쪽 '근무지 · 시급'에서 근무지를 먼저 등록해 주세요.")); return; }
        if (!state.places.some(function (p) { return p.id === state.place; })) { state.place = state.places[0].id; }
        state.places.forEach(function (p) {
          var b = el("button", "chip" + (p.id === state.place ? " active" : ""), p.name); b.type = "button";
          b.setAttribute("aria-pressed", p.id === state.place ? "true" : "false");
          b.addEventListener("click", function () { state.place = p.id; drawPlaceChips(); drawCalc(); });
          placeWrap.appendChild(b);
        });
      }
      function resetForm() {
        state.editId = null; saveBtn.textContent = "추가"; cancelBtn.hidden = true; form.classList.remove("editing");
        startEl.value = ""; endEl.value = ""; brkEl.value = ""; hoursEl.value = ""; memoEl.value = ""; hoursTyped = false; drawCalc();
      }
      function startEdit(it) {
        state.editId = it.id; state.place = it.place; drawPlaceChips();
        dateEl.value = it.date; startEl.value = it.start || ""; endEl.value = it.end || ""; brkEl.value = it.brk || "";
        hoursEl.value = String(it.hours || ""); memoEl.value = it.memo || "";
        hoursTyped = !!(it.hours && Number(it.hours) !== spanHours(it.start, it.end, it.brk));
        saveBtn.textContent = "수정 저장"; cancelBtn.hidden = false; form.classList.add("editing"); drawCalc();
        form.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      cancelBtn.addEventListener("click", resetForm);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!state.places.length) { window.alert("근무지를 먼저 등록해 주세요."); return; }
        var hours = Math.round((Number(hoursEl.value) || spanHours(startEl.value, endEl.value, brkEl.value)) * 100) / 100;
        if (!dateEl.value || !hours) { window.alert("날짜와 근무 시간(또는 시작 · 끝 시간)을 입력해 주세요."); return; }
        var mk = dateEl.value.slice(0, 7);
        var old = state.editId ? state.items.filter(function (x) { return x.id === state.editId; })[0] : null;
        var item = Object.assign({}, old || { createdAt: new Date().toISOString() }, {
          id: old ? old.id : H.uid(), date: dateEl.value, place: state.place, start: startEl.value, end: endEl.value,
          brk: Number(brkEl.value) || 0, hours: hours, memo: memoEl.value.trim()
        });
        var rest = state.items.filter(function (x) { return x.id !== item.id; });
        if (mk === state.mk) { saveItems(rest.concat([item])); resetForm(); return; }
        /* a day in another month goes to that month's document */
        var job = old ? saveItems(rest) : Promise.resolve();
        job.then(function () { return monthRef(mk).get(); }).then(function (snap) {
          var d = (snap.exists && snap.data()) || {};
          return monthRef(mk).set({ items: (d.items || []).concat([item]), rates: d.rates || currentRates(), updatedAt: new Date().toISOString() }, { merge: true });
        }).then(function () { resetForm(); setMonth(mk); }).catch(function (err) { window.alert("저장 실패: " + err.message); });
      });

      /* ---------- 근무 기록 ---------- */
      var listSum = el("div", "items-summary");
      var list = el("div", "bud-list pt-list");
      [form, listSum, list].forEach(function (n) { logCard.body.appendChild(n); });
      function placeName(id) { var p = state.places.filter(function (x) { return x.id === id; })[0]; return p ? p.name : "(지운 근무지)"; }
      function drawList() {
        H.clear(list);
        var its = state.items.slice().sort(function (a, b) { var x = a.date + (a.start || ""), y = b.date + (b.start || ""); return x < y ? 1 : (x > y ? -1 : 0); });
        var tot = 0; its.forEach(function (it) { tot += Number(it.hours) || 0; });
        listSum.textContent = its.length ? its.length + "번 근무 · " + fmtHours(tot) : "";
        logCard.count.textContent = its.length ? fmtHours(tot) : "";
        if (!its.length) { list.appendChild(ui.empty(monthLabel(state.mk) + "에 적은 근무 시간이 없어요.")); return; }
        var lastDate = "";
        its.forEach(function (it) {
          if (it.date !== lastDate) {
            lastDate = it.date;
            var d = H.parseKey(it.date);
            list.appendChild(el("div", "bud-day-head pt-day", (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + H.DOW[d.getDay()] + ")"));
          }
          var row = el("div", "bud-entry pt-entry");
          var idx = state.places.map(function (p) { return p.id; }).indexOf(it.place);
          var chip = el("span", "cat-chip bud-cat pt-chip" + (idx >= 0 ? " p" + (idx % 4) : ""), placeName(it.place));
          row.appendChild(chip);
          var main = el("span", "bud-entry-main");
          main.appendChild(el("span", "bud-entry-memo", (it.start && it.end ? it.start + " ~ " + it.end : "시간만 입력") + " · " + fmtHours(it.hours)));
          main.appendChild(el("span", "mini-sub", [it.brk ? "쉬는 시간 " + it.brk + "분" : "", it.memo].filter(Boolean).join(" · ")));
          row.appendChild(main);
          var r = rateOf(it.place);
          row.appendChild(el("span", "bud-amt inc", r ? won(Math.round((Number(it.hours) || 0) * r)) : "—"));
          var ed = el("button", "icon-btn", "✎"); ed.type = "button"; ed.title = "수정"; ed.setAttribute("aria-label", "수정");
          ed.addEventListener("click", function () { startEdit(it); });
          var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제"; del.setAttribute("aria-label", "삭제");
          del.addEventListener("click", function () {
            if (window.confirm("이 근무 기록을 지울까요?\n" + it.date + " " + placeName(it.place) + " · " + fmtHours(it.hours))) {
              saveItems(state.items.filter(function (x) { return x.id !== it.id; }));
            }
          });
          row.appendChild(ed); row.appendChild(del);
          list.appendChild(row);
        });
      }

      /* ---------- 이 달 알바비 (근무지별 정리 + 가계부로) ---------- */
      var payBody = el("div", "pt-pay"); payCard.body.appendChild(payBody);
      var ledger = null;
      function ledgerId(p) { return "pt-" + state.mk + "-" + p.id; }
      function drawPay() {
        H.clear(payBody);
        if (!state.places.length) { payBody.appendChild(ui.empty("근무지를 등록하면 근무지별 알바비가 여기 정리돼요.")); return; }
        state.places.forEach(function (p) {
          var r = placePay(state.items, p, rateOf(p.id));
          var box = el("div", "pt-pay-row");
          var head = el("div", "pt-pay-head");
          head.appendChild(el("strong", "", p.name));
          head.appendChild(el("span", "bud-amt inc", won(r.net)));
          box.appendChild(head);
          var lines = [fmtHours(r.hours) + " · " + r.days + "일 근무", rateOf(p.id) ? "시급 " + won(rateOf(p.id)) + " → 세전 " + won(r.gross) : "시급이 아직 없어요 (아래에서 정해 주세요)"];
          if (r.tax) { lines.push("3.3% 공제 −" + won(r.tax)); }
          box.appendChild(el("div", "mini-sub", lines.join(" · ")));
          /* 가계부의 그 달 수입으로 넣기 (다시 누르면 금액만 고쳐요) */
          var inLed = ledger && (ledger.items || []).filter(function (i) { return i.id === ledgerId(p); })[0];
          var btn = el("button", "tool-btn" + (inLed && Number(inLed.amount) === r.net ? " on" : ""), inLed ? (Number(inLed.amount) === r.net ? "가계부에 들어감 ✓" : "가계부 금액 고치기") : "가계부 수입으로 넣기");
          btn.type = "button"; btn.disabled = !r.net || !!(inLed && Number(inLed.amount) === r.net);
          btn.addEventListener("click", function () { toLedger(p, r.net); });
          box.appendChild(btn);
          payBody.appendChild(box);
        });
      }
      function toLedger(p, amount) {
        var ref = App.budget ? App.budget.ledgerRef(state.mk) : App.doc("personal/ledger-" + state.mk);
        var last = new Date(Number(state.mk.slice(0, 4)), Number(state.mk.slice(5, 7)), 0);
        var date = today.slice(0, 7) === state.mk ? today : H.dateKey(last);
        return ref.get().then(function (snap) {
          var items = ((snap.exists && snap.data().items) || []).slice();
          var id = ledgerId(p), cur = items.filter(function (i) { return i.id === id; })[0];
          var item = Object.assign({}, cur || { createdAt: new Date().toISOString(), date: date }, {
            id: id, type: "수입", cat: "부수입", amount: amount, method: "계좌이체", memo: p.name + " 알바비 (" + Number(state.mk.slice(5, 7)) + "월)"
          });
          items = cur ? items.map(function (i) { return i.id === id ? item : i; }) : items.concat([item]);
          return ref.set({ items: items, updatedAt: new Date().toISOString() }, { merge: true });
        }).catch(function (err) { window.alert("가계부에 넣지 못했어요: " + err.message); });
      }

      /* ---------- 월별 알바비 (최근 6개월) ---------- */
      var histBody = el("div"); histCard.body.appendChild(histBody);
      var histDocs = {};
      function drawHist() {
        H.clear(histBody);
        if (!state.places.length) { histBody.appendChild(ui.empty("근무지를 등록하면 월별 합계가 보여요.")); return; }
        var months = []; for (var i = 5; i >= 0; i--) { months.push(shiftMonth(monthKey(new Date()), -i)); }
        if (months.indexOf(state.mk) === -1) { months.push(state.mk); months.sort(); }
        var tbl = el("table", "items-table pt-hist"), thead = el("thead"), hr = el("tr");
        ["월"].concat(state.places.map(function (p) { return p.name; })).concat(["합계"]).forEach(function (t) { hr.appendChild(el("th", "", t)); });
        thead.appendChild(hr); tbl.appendChild(thead);
        var tb = el("tbody");
        months.slice().reverse().forEach(function (mk) {
          var d = mk === state.mk ? { items: state.items, rates: state.rates } : histDocs[mk];
          var tr = el("tr", mk === state.mk ? "on" : ""), sum = 0;
          var a = el("button", "link-btn", monthLabel(mk).replace(/^\d+년 /, mk.slice(0, 4) === String(new Date().getFullYear()) ? "" : mk.slice(2, 4) + "년 ")); a.type = "button";
          a.addEventListener("click", function () { setMonth(mk); view.scrollIntoView({ behavior: "smooth", block: "start" }); });
          var td0 = el("td"); td0.appendChild(a); tr.appendChild(td0);
          state.places.forEach(function (p) {
            var rate = d && d.rates && d.rates[p.id] != null ? d.rates[p.id] : p.rate;
            var r = placePay((d && d.items) || [], p, rate); sum += r.net;
            tr.appendChild(el("td", "num", d ? (r.hours ? won(r.net) : "—") : "…"));
          });
          tr.appendChild(el("td", "num strong", d ? (sum ? won(sum) : "—") : "…"));
          tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        var wrap = el("div", "table-wrap"); wrap.appendChild(tbl); histBody.appendChild(wrap);
        histBody.appendChild(el("p", "hint", "3.3%를 떼는 근무지는 뗀 뒤 금액이에요. 달 이름을 누르면 그 달로 가요."));
      }
      function loadHist() {
        var months = []; for (var i = 1; i <= 5; i++) { months.push(shiftMonth(monthKey(new Date()), -i)); }
        months.push(monthKey(new Date()));
        Promise.all(months.map(function (mk) {
          return monthRef(mk).get().then(function (s) { histDocs[mk] = (s.exists && s.data()) || { items: [] }; });
        })).then(drawHist, function () {});
      }

      /* ---------- 근무지 · 시급 ---------- */
      var setBody = el("div", "pt-set"); setCard.body.appendChild(setBody);
      var addForm = el("form", "quick-add pt-add");
      var newName = el("input"); newName.placeholder = "근무지 이름 (예: ○○ 영어학원)"; newName.maxLength = 30; newName.setAttribute("aria-label", "근무지 이름");
      var newRate = el("input", "bud-money w-sm"); newRate.inputMode = "numeric"; newRate.placeholder = "시급 (원)"; newRate.setAttribute("aria-label", "시급");
      newRate.addEventListener("input", function () { var n = num(newRate.value); newRate.value = n ? n.toLocaleString("ko-KR") : ""; });
      var addBtn = el("button", "btn", "근무지 추가"); addBtn.type = "submit";
      [newName, newRate, addBtn].forEach(function (n) { addForm.appendChild(n); });
      addForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = newName.value.trim();
        if (!name) { newName.focus(); return; }
        var p = { id: H.uid(), name: name, rate: num(newRate.value), tax: false };
        newName.value = ""; newRate.value = "";
        if (!state.place) { state.place = p.id; }
        savePlaces(state.places.concat([p]));
      });
      function drawSettings() {
        H.clear(setBody);
        state.places.forEach(function (p, i) {
          var row = el("div", "pt-place");
          var name = el("input", "pt-place-name"); name.value = p.name; name.maxLength = 30; name.setAttribute("aria-label", "근무지 이름");
          name.addEventListener("change", function () {
            var v = name.value.trim(); if (!v) { name.value = p.name; return; }
            savePlaces(state.places.map(function (x) { return x.id === p.id ? Object.assign({}, x, { name: v }) : x; }));
          });
          var rate = el("input", "bud-money pt-place-rate"); rate.inputMode = "numeric"; rate.placeholder = "시급"; rate.setAttribute("aria-label", p.name + " 시급");
          var cur = rateOf(p.id); rate.value = cur ? cur.toLocaleString("ko-KR") : "";
          rate.addEventListener("input", function () { var n = num(rate.value); rate.value = n ? n.toLocaleString("ko-KR") : ""; });
          /* a new rate applies to the month on screen and every month after it */
          rate.addEventListener("change", function () {
            var n = num(rate.value);
            state.rates = Object.assign({}, state.rates); state.rates[p.id] = n;
            savePlaces(state.places.map(function (x) { return x.id === p.id ? Object.assign({}, x, { rate: n }) : x; }));
            monthRef(state.mk).set({ rates: state.rates, updatedAt: new Date().toISOString() }, { merge: true }).catch(function () {});
          });
          var tax = el("label", "bud-selall pt-tax");
          var taxCb = el("input"); taxCb.type = "checkbox"; taxCb.checked = !!p.tax;
          taxCb.addEventListener("change", function () { savePlaces(state.places.map(function (x) { return x.id === p.id ? Object.assign({}, x, { tax: taxCb.checked }) : x; })); });
          tax.appendChild(taxCb); tax.appendChild(el("span", "", "3.3% 떼고 받음"));
          var up = el("button", "icon-btn", "▲"); up.type = "button"; up.title = "위로"; up.setAttribute("aria-label", "위로"); up.disabled = i === 0;
          up.addEventListener("click", function () { var a = state.places.slice(); a.splice(i - 1, 0, a.splice(i, 1)[0]); savePlaces(a); });
          var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "근무지 지우기"; del.setAttribute("aria-label", p.name + " 지우기");
          del.addEventListener("click", function () {
            if (window.confirm(p.name + " 근무지를 지울까요?\n(이미 적은 근무 기록은 남아 있지만 합계에서 빠져요)")) { savePlaces(state.places.filter(function (x) { return x.id !== p.id; })); }
          });
          [name, rate, el("span", "mini-sub", "원/시간"), tax, up, del].forEach(function (n) { row.appendChild(n); });
          setBody.appendChild(row);
        });
        setBody.appendChild(addForm);
        setBody.appendChild(el("p", "hint", "시급을 바꾸면 지금 보고 있는 달부터 새 시급으로 계산돼요. 지난달 금액은 그대로예요."));
      }

      /* ---------- month navigation ---------- */
      function drawAll() { drawSummary(); drawPlaceChips(); drawCalc(); drawList(); drawPay(); drawHist(); drawSettings(); }
      function setMonth(mk) {
        state.mk = mk;
        if (!state.editId && dateEl.value.slice(0, 7) !== mk) { dateEl.value = mk === today.slice(0, 7) ? today : mk + "-01"; }
        state.items = []; state.rates = {}; ledger = null;
        if (unsubMonth) { unsubMonth(); }
        unsubMonth = App.watchDoc(monthRef(mk), function (d) {
          state.items = (d && d.items) || []; state.rates = (d && d.rates) || {};
          histDocs[mk] = d || { items: [] }; drawAll();
        });
        if (unsubLedger) { unsubLedger(); }
        unsubLedger = App.watchDoc(App.doc("personal/ledger-" + mk), function (d) { ledger = d; drawPay(); });
        drawAll();
      }
      var unsubLedger = null;
      prev.addEventListener("click", function () { setMonth(shiftMonth(state.mk, -1)); });
      next.addEventListener("click", function () { setMonth(shiftMonth(state.mk, 1)); });
      thisM.addEventListener("click", function () { setMonth(monthKey(new Date())); });

      App.watchDoc(settingsRef(), function (d) {
        state.places = (d && d.places) || []; state.loaded = true; drawAll();
      });
      setMonth(state.mk);
      loadHist();
    }
  });
})(window.App);
