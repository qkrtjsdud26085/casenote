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
  function daysIn(mk) { var p = mk.split("-"); return new Date(Number(p[0]), Number(p[1]), 0).getDate(); }
  function shortWon(n) {
    n = Math.round(Number(n) || 0);
    if (n >= 10000) { return (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "만"; }
    return n.toLocaleString("ko-KR");
  }
  /* the days a repeat rule covers in one month: weekday matches, inside from ~ until, and not after `upto` */
  function ruleDates(rule, mk, upto) {
    var out = [], n = daysIn(mk), p = mk.split("-");
    for (var d = 1; d <= n; d++) {
      var key = mk + "-" + H.pad2(d), dow = new Date(Number(p[0]), Number(p[1]) - 1, d).getDay();
      if ((rule.days || []).indexOf(dow) === -1) { continue; }
      if (rule.from && key < rule.from) { continue; }
      if (rule.until && key > rule.until) { continue; }
      if (upto && key > upto) { continue; }
      out.push(key);
    }
    return out;
  }
  /* 반복 근무 → 근무 기록: days up to today that are not recorded yet and not taken out (skips).
     Each made entry keeps rk = "date|ruleId", so editing or deleting it never brings it back. */
  function repeatFill(items, skips, rules, places, mk, today) {
    var have = {}, skip = {}, ok = {}, add = [];
    (items || []).forEach(function (it) { if (it.rk) { have[it.rk] = true; } });
    (skips || []).forEach(function (k) { skip[k] = true; });
    (places || []).forEach(function (p) { ok[p.id] = true; });
    (rules || []).forEach(function (r) {
      if (!ok[r.place]) { return; }
      ruleDates(r, mk, today).forEach(function (date) {
        var rk = date + "|" + r.id;
        if (have[rk] || skip[rk]) { return; }
        add.push({ id: H.uid(), date: date, place: r.place, start: r.start || "", end: r.end || "", brk: Number(r.brk) || 0,
          hours: spanHours(r.start, r.end, r.brk), memo: "", rk: rk, auto: true, createdAt: new Date().toISOString() });
      });
    });
    return add;
  }
  App.parttime = { spanHours: spanHours, fmtHours: fmtHours, placePay: placePay, repeatFill: repeatFill, ruleDates: ruleDates };

  App.page({
    id: "personal-parttime", title: "알바비",
    render: function (view) {
      var today = H.todayStr();
      var state = { mk: monthKey(new Date()), places: [], repeats: [], items: [], skips: [], rates: {}, place: "", editId: null, loaded: false, monthLoaded: false, sel: today, rDays: [1, 3, 5] };
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
      /* like 가계부: the record on the left, the month calendar → pay → repeats → monthly → places on the right */
      var logCard = ui.card(colL, { tab: "Hours", tone: "t-3", title: "근무 시간 입력" });
      var calCard = ui.card(colR, { tab: "Daily", tone: "t-2", title: "날짜별 알바비" });
      var payCard = ui.card(colR, { tab: "Pay", tone: "t-2", title: "이 달 알바비" });
      var repCard = ui.card(colR, { tab: "Repeat", tone: "t-3", title: "반복 근무 (자동 입력)" });
      var histCard = ui.card(colR, { tab: "Monthly", tone: "t-1", title: "월별 알바비" });
      var setCard = ui.card(colR, { tab: "Places", tone: "t-1", title: "근무지 · 시급" });
      [logCard, calCard, payCard, repCard, histCard, setCard].forEach(function (c, i) { c.el.style.setProperty("--m-order", String(i === 0 ? 1 : (i === 1 ? 0 : i))); });

      function rateOf(id) {
        if (state.rates[id] != null) { return Number(state.rates[id]) || 0; }
        var p = state.places.filter(function (x) { return x.id === id; })[0];
        return p ? Number(p.rate) || 0 : 0;
      }
      /* each month keeps the rates it was paid at, so a raise later does not change past months */
      function currentRates() { var r = {}; state.places.forEach(function (p) { r[p.id] = rateOf(p.id); }); return r; }
      function saveItems(items, skips) {
        state.items = items; if (skips) { state.skips = skips; } drawAll();
        var data = { items: items, rates: currentRates(), updatedAt: new Date().toISOString() };
        if (skips) { data.skips = skips; }
        return monthRef(state.mk).set(data, { merge: true })
          .catch(function (err) { window.alert("저장 실패: " + err.message); });
      }
      /* deleting a day the repeat made only takes that day out; the repeat keeps going */
      function removeEntry(it) {
        var items = state.items.filter(function (x) { return x.id !== it.id; });
        return saveItems(items, it.rk ? state.skips.filter(function (k) { return k !== it.rk; }).concat([it.rk]) : null);
      }
      function saveRepeats(repeats) {
        state.repeats = repeats; drawAll();
        return settingsRef().set({ repeats: repeats, updatedAt: new Date().toISOString() }, { merge: true })
          .then(function () { fillMonth(); loadHist(); })
          .catch(function (err) { window.alert("저장 실패: " + err.message); });
      }
      /* add the repeat days of the month on screen once both the rules and the month have loaded */
      function fillMonth() {
        if (!state.loaded || !state.monthLoaded || state.filling) { return; }
        var add = repeatFill(state.items, state.skips, state.repeats, state.places, state.mk, today);
        if (!add.length) { return; }
        state.filling = true;
        saveItems(state.items.concat(add)).then(function () { state.filling = false; }, function () { state.filling = false; });
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
        var job = old ? saveItems(rest, old.rk ? state.skips.concat([old.rk]) : null) : Promise.resolve();
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
          main.appendChild(el("span", "mini-sub", [it.rk ? "반복" : "", it.brk ? "쉬는 시간 " + it.brk + "분" : "", it.memo].filter(Boolean).join(" · ")));
          row.appendChild(main);
          var r = rateOf(it.place);
          row.appendChild(el("span", "bud-amt inc", r ? won(Math.round((Number(it.hours) || 0) * r)) : "—"));
          var ed = el("button", "icon-btn", "✎"); ed.type = "button"; ed.title = "수정"; ed.setAttribute("aria-label", "수정");
          ed.addEventListener("click", function () { startEdit(it); });
          row.appendChild(ed); row.appendChild(delBtn(it));
          list.appendChild(row);
        });
      }
      function delBtn(it) {
        var del = el("button", "icon-btn", "×"); del.type = "button";
        del.title = it.rk ? "이 날만 빼기 (반복은 그대로)" : "삭제"; del.setAttribute("aria-label", del.title);
        del.addEventListener("click", function () {
          var what = it.date + " " + placeName(it.place) + " · " + fmtHours(it.hours);
          if (window.confirm(it.rk ? "이 날은 알바를 안 했나요? 이 날만 뺄게요.\n" + what + "\n(반복 근무는 그대로 이어져요)" : "이 근무 기록을 지울까요?\n" + what)) { removeEntry(it); }
        });
        return del;
      }

      /* ---------- 날짜별 알바비 (가계부처럼 한 달 달력) ---------- */
      var calGrid = el("div", "cal-grid bud-cal pt-cal");
      var calStats = el("div", "stat-row bud-stats");
      var dayHead = el("div", "mini-title");
      var dayList = el("div", "pt-daylist");
      [calGrid, calStats, dayHead, dayList].forEach(function (n) { calCard.body.appendChild(n); });
      function payOf(it) { return Math.round((Number(it.hours) || 0) * rateOf(it.place)); }
      function placeIdx(id) { return state.places.map(function (p) { return p.id; }).indexOf(id); }
      function drawCal() {
        var p = state.mk.split("-"), y = Number(p[0]), m = Number(p[1]) - 1, n = daysIn(state.mk);
        var byDay = {}, max = 0;
        state.items.forEach(function (it) { (byDay[it.date] = byDay[it.date] || []).push(it); });
        Object.keys(byDay).forEach(function (k) { var s = byDay[k].reduce(function (a, it) { return a + payOf(it); }, 0); byDay[k].pay = s; if (s > max) { max = s; } });
        /* repeat days still ahead in the month, shown faintly as 예정 */
        var planned = {};
        state.repeats.forEach(function (r) { if (placeIdx(r.place) === -1) { return; } ruleDates(r, state.mk).forEach(function (k) { if (k > today && state.skips.indexOf(k + "|" + r.id) === -1) { (planned[k] = planned[k] || []).push(r); } }); });
        H.clear(calGrid);
        H.DOW.forEach(function (d) { calGrid.appendChild(el("div", "cal-dow", d)); });
        for (var i = 0, sd = new Date(y, m, 1).getDay(); i < sd; i++) { calGrid.appendChild(el("div", "cal-cell blank")); }
        for (var d = 1; d <= n; d++) {
          (function (day) {
            var key = state.mk + "-" + H.pad2(day), dow = new Date(y, m, day).getDay(), its = byDay[key];
            var cell = el("button", "cal-cell bud-cell pt-cell" + (key === today ? " today" : "") + (key === state.sel ? " sel" : "") + ((dow === 0 || dow === 6) ? " wknd" : "") + (key > today ? " future" : ""));
            cell.type = "button";
            cell.appendChild(el("span", "bud-cell-day", String(day)));
            var dots = el("span", "pt-dots");
            (its || []).forEach(function (it) { var ix = placeIdx(it.place); dots.appendChild(el("span", "pt-dot p" + (ix < 0 ? 3 : ix % 4))); });
            (planned[key] || []).forEach(function (r) { dots.appendChild(el("span", "pt-dot plan p" + (placeIdx(r.place) % 4))); });
            if (dots.firstChild) { cell.appendChild(dots); }
            if (its && its.pay) {
              cell.style.setProperty("--heat", String(Math.round(10 + its.pay / max * 45)));
              cell.classList.add("has");
              cell.appendChild(el("span", "bud-cell-amt", shortWon(its.pay)));
            } else if (its) { cell.classList.add("has"); cell.appendChild(el("span", "bud-cell-amt", fmtHours(its.reduce(function (a, it) { return a + (Number(it.hours) || 0); }, 0)))); }
            else if (planned[key]) { cell.appendChild(el("span", "bud-cell-inc pt-plan", "예정")); }
            cell.setAttribute("aria-label", key + (its ? " 근무 " + its.length + "번, " + won(its.pay || 0) : (planned[key] ? " 근무 예정" : " 근무 없음")));
            cell.addEventListener("click", function () { state.sel = key; if (!state.editId) { dateEl.value = key; } drawCal(); });
            calGrid.appendChild(cell);
          })(d);
        }
        var workDays = Object.keys(byDay).length, tot = 0;
        Object.keys(byDay).forEach(function (k) { tot += byDay[k].pay; });
        var plannedPay = 0;
        Object.keys(planned).forEach(function (k) { planned[k].forEach(function (r) { plannedPay += Math.round(spanHours(r.start, r.end, r.brk) * rateOf(r.place)); }); });
        H.clear(calStats);
        function stat(label, value) { var s = el("span", "", label + " "); s.appendChild(el("strong", "", value)); calStats.appendChild(s); }
        stat("일한 날", workDays + "일");
        stat("하루 평균", workDays ? won(tot / workDays) : "—");
        stat("남은 예정", plannedPay ? "+" + won(plannedPay) : "—");
        /* selected day: its entries, with × to take a day out */
        var sel = state.sel.slice(0, 7) === state.mk ? state.sel : null;
        H.clear(dayList);
        if (!sel) { dayHead.textContent = "날짜를 누르면 그날 근무가 보여요"; return; }
        var sd2 = H.parseKey(sel);
        dayHead.textContent = (sd2.getMonth() + 1) + "월 " + sd2.getDate() + "일 (" + H.DOW[sd2.getDay()] + ")" + (byDay[sel] && byDay[sel].pay ? " · " + won(byDay[sel].pay) : "");
        if (!byDay[sel]) {
          dayList.appendChild(el("p", "hint", planned[sel] ? "반복 근무 예정일이에요. 그날이 되면 자동으로 들어가요." : "이 날은 근무 기록이 없어요. 위 입력 칸 날짜가 이 날로 바뀌었어요."));
          return;
        }
        byDay[sel].forEach(function (it) {
          var row = el("div", "bud-entry pt-entry");
          var ix = placeIdx(it.place);
          row.appendChild(el("span", "cat-chip bud-cat pt-chip" + (ix >= 0 ? " p" + (ix % 4) : ""), placeName(it.place)));
          row.appendChild(el("span", "bud-entry-main", (it.start && it.end ? it.start + " ~ " + it.end + " · " : "") + fmtHours(it.hours) + (it.rk ? " · 반복" : "")));
          row.appendChild(el("span", "bud-amt inc", rateOf(it.place) ? won(payOf(it)) : "—"));
          var ed = el("button", "icon-btn", "✎"); ed.type = "button"; ed.title = "수정"; ed.setAttribute("aria-label", "수정");
          ed.addEventListener("click", function () { startEdit(it); });
          row.appendChild(ed); row.appendChild(delBtn(it));
          dayList.appendChild(row);
        });
      }

      /* ---------- 반복 근무 ---------- */
      var repList = el("div", "pt-replist");
      var repForm = el("form", "item-form pt-repform");
      var rPlace = el("select"); rPlace.setAttribute("aria-label", "반복 근무지");
      var rDays = el("div", "f wide pt-days"); rDays.setAttribute("role", "group"); rDays.setAttribute("aria-label", "요일");
      var rStart = el("input"); rStart.type = "time"; rStart.required = true; rStart.setAttribute("aria-label", "반복 시작 시간");
      var rEnd = el("input"); rEnd.type = "time"; rEnd.required = true; rEnd.setAttribute("aria-label", "반복 끝 시간");
      var rBrk = el("input"); rBrk.type = "number"; rBrk.min = "0"; rBrk.step = "5"; rBrk.placeholder = "0"; rBrk.setAttribute("aria-label", "반복 쉬는 시간(분)");
      var rFrom = el("input"); rFrom.type = "date"; rFrom.required = true; rFrom.value = today.slice(0, 7) + "-01"; rFrom.setAttribute("aria-label", "반복 시작일");
      var rUntil = el("input"); rUntil.type = "date"; rUntil.setAttribute("aria-label", "반복 끝날");
      var rActs = el("div", "actions"), rAdd = el("button", "btn", "반복 추가"); rAdd.type = "submit"; rActs.appendChild(rAdd);
      [field("근무지", rPlace), rDays, field("시작", rStart), field("끝", rEnd), field("쉬는 시간 (분)", rBrk), field("이 날부터", rFrom), field("이 날까지 (비우면 계속)", rUntil), rActs].forEach(function (x) { repForm.appendChild(x); });
      var skipBox = el("div", "pt-skips");
      [repList, repForm, skipBox].forEach(function (x) { repCard.body.appendChild(x); });
      var DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
      function daysText(days) { return DOW_ORDER.filter(function (d) { return (days || []).indexOf(d) !== -1; }).map(function (d) { return H.DOW[d]; }).join(" · "); }
      repForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!state.places.length) { window.alert("근무지를 먼저 등록해 주세요."); return; }
        if (!state.rDays.length) { window.alert("요일을 하나 이상 골라 주세요."); return; }
        if (!spanHours(rStart.value, rEnd.value, rBrk.value)) { window.alert("시작 · 끝 시간을 확인해 주세요."); return; }
        var r = { id: H.uid(), place: rPlace.value, days: state.rDays.slice().sort(), start: rStart.value, end: rEnd.value, brk: Number(rBrk.value) || 0, from: rFrom.value, until: rUntil.value || "" };
        rStart.value = ""; rEnd.value = ""; rBrk.value = ""; rUntil.value = "";
        saveRepeats(state.repeats.concat([r]));
      });
      function drawRepeats() {
        H.clear(repList);
        state.repeats.forEach(function (r) {
          var row = el("div", "bud-entry pt-rep");
          var ix = placeIdx(r.place);
          row.appendChild(el("span", "cat-chip bud-cat pt-chip" + (ix >= 0 ? " p" + (ix % 4) : ""), placeName(r.place)));
          var main = el("span", "bud-entry-main");
          main.appendChild(el("span", "bud-entry-memo", "매주 " + daysText(r.days) + " · " + r.start + " ~ " + r.end));
          var f = H.parseKey(r.from), u = r.until ? H.parseKey(r.until) : null;
          main.appendChild(el("span", "mini-sub", [fmtHours(spanHours(r.start, r.end, r.brk)), r.brk ? "쉬는 시간 " + r.brk + "분" : "", (f.getMonth() + 1) + "/" + f.getDate() + "부터" + (u ? " " + (u.getMonth() + 1) + "/" + u.getDate() + "까지" : "")].filter(Boolean).join(" · ")));
          row.appendChild(main);
          var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "반복 그만하기"; del.setAttribute("aria-label", "반복 그만하기");
          del.addEventListener("click", function () {
            if (window.confirm("이 반복 근무를 그만할까요?\n이미 들어간 근무 기록은 그대로 남아요.")) { saveRepeats(state.repeats.filter(function (x) { return x.id !== r.id; })); }
          });
          row.appendChild(del);
          repList.appendChild(row);
        });
        if (!state.repeats.length) { repList.appendChild(el("p", "hint", "정해진 요일에 일하면 여기 한 번만 적어 두세요. 오늘까지의 날짜가 근무 기록에 자동으로 들어가요.")); }
        /* form options */
        var cur = rPlace.value; H.clear(rPlace);
        state.places.forEach(function (p) { var o = el("option", "", p.name); o.value = p.id; rPlace.appendChild(o); });
        if (cur && placeIdx(cur) !== -1) { rPlace.value = cur; }
        repForm.hidden = !state.places.length;
        H.clear(rDays);
        rDays.appendChild(el("span", "f-label", "요일"));
        var chips = el("div", "pt-places pt-daychips");
        DOW_ORDER.forEach(function (d) {
          var on = state.rDays.indexOf(d) !== -1;
          var b = el("button", "chip" + (on ? " active" : ""), H.DOW[d]); b.type = "button"; b.setAttribute("aria-pressed", on ? "true" : "false");
          b.addEventListener("click", function () { state.rDays = on ? state.rDays.filter(function (x) { return x !== d; }) : state.rDays.concat([d]); drawRepeats(); });
          chips.appendChild(b);
        });
        rDays.appendChild(chips);
        /* days taken out this month, with a way back */
        H.clear(skipBox);
        var sk = state.skips.slice().sort();
        if (!sk.length) { return; }
        skipBox.appendChild(el("div", "mini-title", "이 달에 뺀 날 " + sk.length + "일"));
        sk.forEach(function (k) {
          var date = k.split("|")[0], r = state.repeats.filter(function (x) { return x.id === k.split("|")[1]; })[0];
          var dd = H.parseKey(date), row = el("div", "pt-skip");
          row.appendChild(el("span", "", (dd.getMonth() + 1) + "/" + dd.getDate() + " (" + H.DOW[dd.getDay()] + ") " + (r ? placeName(r.place) : "")));
          var back = el("button", "tool-btn", "다시 넣기"); back.type = "button";
          back.addEventListener("click", function () {
            state.skips = state.skips.filter(function (x) { return x !== k; });
            monthRef(state.mk).set({ skips: state.skips, updatedAt: new Date().toISOString() }, { merge: true }).then(fillMonth).catch(function (err) { window.alert("저장 실패: " + err.message); });
            drawAll();
          });
          row.appendChild(back);
          skipBox.appendChild(row);
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
          return monthRef(mk).get().then(function (s) {
            var d = (s.exists && s.data()) || { items: [] };
            /* 반복 근무 days of earlier months are filled in too, the first time they are seen */
            var add = mk === state.mk ? [] : repeatFill(d.items, d.skips, state.repeats, state.places, mk, today);
            if (add.length) {
              d = Object.assign({}, d, { items: (d.items || []).concat(add), rates: d.rates || currentRates() });
              monthRef(mk).set({ items: d.items, rates: d.rates, updatedAt: new Date().toISOString() }, { merge: true }).catch(function () {});
            }
            histDocs[mk] = d;
          });
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
      function drawAll() { drawSummary(); drawPlaceChips(); drawCalc(); drawList(); drawCal(); drawPay(); drawRepeats(); drawHist(); drawSettings(); }
      function setMonth(mk) {
        state.mk = mk;
        if (!state.editId && dateEl.value.slice(0, 7) !== mk) { dateEl.value = mk === today.slice(0, 7) ? today : mk + "-01"; }
        if (state.sel.slice(0, 7) !== mk) { state.sel = mk === today.slice(0, 7) ? today : mk + "-01"; }
        state.items = []; state.skips = []; state.rates = {}; ledger = null; state.monthLoaded = false;
        if (unsubMonth) { unsubMonth(); }
        unsubMonth = App.watchDoc(monthRef(mk), function (d) {
          if (state.mk !== mk) { return; }
          state.items = (d && d.items) || []; state.skips = (d && d.skips) || []; state.rates = (d && d.rates) || {};
          state.monthLoaded = true;
          histDocs[mk] = d || { items: [] }; drawAll(); fillMonth();
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
        var first = !state.loaded;
        state.places = (d && d.places) || []; state.repeats = (d && d.repeats) || []; state.loaded = true; drawAll();
        fillMonth();
        if (first) { loadHist(); }
      });
      setMonth(state.mk);
    }
  });
})(window.App);
