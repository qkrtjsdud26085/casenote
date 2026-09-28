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
  function isInc(f) { return f.kind === "수입"; }
  /* a fixed item with no set day (입금일 미정) is recorded today in the current month, else on the 1st */
  function entryDate(mk, f) {
    if (f.day) { return fixedDate(mk, f.day); }
    var t = H.todayStr(); return t.slice(0, 7) === mk ? t : mk + "-01";
  }
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
    return ((settings && settings.fixed) || []).filter(function (f) { return !paid[f.id] && !isInc(f); })
      .map(function (f) { return Object.assign({}, f, { date: entryDate(mk, f) }); })
      .sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  }
  /* bulk paste: one item per line — "월세 400,000원 25일", "클로드	약 31,000원", "| 유독 | 12,900원 |" */
  var CAT_HINTS = [
    [/기름|주유|차량|자동차|교통|버스|지하철|주차|하이패스/, "교통"],
    [/월세|관리비|전세|대출|이자|렌탈|정수기|가스|전기|수도/, "주거 · 관리비"],
    [/통신|휴대폰|핸드폰|인터넷|알뜰폰/, "통신"],
    [/보험/, "보험"],
    [/적금|저축|청약|투자|연금/, "저축 · 투자"],
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
  /* ---------- phone payment notifications (MacroDroid → Firestore budgetInbox) ----------
     The phone sends the raw SMS / push text; parsing lives here so formats can be fixed without touching the phone.
       신한카드(1234)승인 박*영 12,500원(일시불)09/27 13:52 스타벅스 누적1,234,567원
       iM뱅크 09/27 13:52 50813*03093 입금 1,000,000 잔액 1,189,248 토스박선영 */
  /* order matters: the first rule that matches wins (관리비 before 통신 so 케이티텔레캅 is not 통신) */
  var MERCHANT_HINTS = [
    [/텔레캅|캡스|세콤|에스원|관리비|관리사무소|도시가스|가스공사|한국전력|한전|수도요금|상하수도|정수기|렌탈|월세/i, "주거 · 관리비"],
    [/보험|삼성화재|현대해상|DB손해|KB손해|메리츠|한화생명|교보생명|흥국|라이나/i, "보험"],
    [/축의|부의|조의|화환|경조|근조|답례/, "경조사 · 선물"],
    [/넷플릭스|티빙|웨이브|왓챠|디즈니|쿠팡플레이|유튜브|멜론|지니뮤직|스포티파이|애플뮤직|클로드|Claude|Anthropic|OpenAI|ChatGPT|노션|Notion|Adobe|어도비|옵시디언|Obsidian|와우멤버십|쿠팡와우|네이버플러스|유독/i, "구독"],
    [/스타벅스|커피|카페|이디야|투썸|메가커피|빽다방|컴포즈|폴바셋|할리스|엔제리너스|파스쿠찌|공차|베이커리|제과|파리바게뜨|뚜레쥬르|배스킨|던킨|설빙|도넛|디저트|아이스크림/i, "카페 · 간식"],
    [/배달의민족|배민|요기요|쿠팡이츠|땡겨요|식당|김밥|분식|떡볶이|치킨|피자|버거|맥도날드|롯데리아|맘스터치|KFC|서브웨이|국밥|찌개|돈까스|돈가스|초밥|스시|라멘|우동|쌀국수|족발|보쌈|곱창|삼겹|고기|갈비|한식|중식|일식|양식|짜장|짬뽕|반점|냉면|칼국수|국수|샐러드|도시락|본죽|죽이야기|정육|반찬|마트|이마트|홈플러스|롯데마트|코스트코|트레이더스|하나로|농협|노브랜드|식자재|GS25|CU|세븐일레븐|이마트24|미니스톱|편의점|컬리|마켓/i, "식비"],
    [/주유|오일뱅크|에너지|칼텍스|S-OIL|에쓰오일|알뜰주유|택시|카카오T|카카오모빌리티|우티|티머니|캐시비|코레일|KTX|SRT|고속|버스|지하철|철도|주차|하이패스|톨게이트|쏘카|그린카/i, "교통"],
    [/약국|병원|의원|치과|한의원|내과|외과|안과|피부과|이비인후과|소아과|정형|산부인과|정신건강|검진|헬스|필라테스|요가|PT/i, "의료 · 건강"],
    [/CGV|메가박스|롯데시네마|영화|공연|티켓|인터파크|예스24티켓|노래방|코인노래|PC방|볼링|당구|게임|스팀|닌텐도|여행|호텔|숙박|야놀자|여기어때|에어비앤비/i, "문화 · 여가"],
    [/서점|교보문고|yes24|예스24|알라딘|영풍|리디|밀리의서재|학원|강의|인강|클래스101|학회|등록금/i, "교육 · 도서"],
    [/미용|헤어|네일|유니클로|무신사|자라|H&M|탑텐|스파오|에이블리|지그재그|옷|의류/i, "의류 · 미용"],
    [/다이소|쿠팡|올리브영|이케아|무인양품|오늘의집|생활용품|문구|알파/, "생활용품"],
    [/SKT|SK텔레콤|KT|케이티|LG ?U\+|엘지유플러스|알뜰폰|통신|헬로모바일/i, "통신"]
  ];
  function ruleCat(name) {
    for (var i = 0; i < MERCHANT_HINTS.length; i++) { if (MERCHANT_HINTS[i][0].test(name)) { return MERCHANT_HINTS[i][1]; } }
    return "";
  }
  function guessMerchantCat(name, type, history) {
    if (type === "수입") { return /급여|월급/.test(name) ? "급여" : (/환급|환불/.test(name) ? "환급" : "기타"); }
    var seen = (history || []).filter(function (it) { return it.type !== "수입" && it.memo && it.memo === name; })[0];
    if (seen && seen.cat) { return seen.cat; }
    return ruleCat(name) || "기타";
  }
  /* the key a merchant is remembered under: its original notice text without spaces / symbols, lower-cased */
  function merchantKey(raw) { return String(raw || "").toLowerCase().replace(/[^0-9a-z가-힣]/g, ""); }
  /* company names → the brand people know; payment gateways dropped */
  var BRANDS = [
    [/우아한\s*형제들/, "배달의민족"], [/코리아\s*세븐/, "세븐일레븐"], [/비지에프\s*리테일|BGF\s*리테일/i, "CU"],
    [/지에스\s*리테일|GS\s*리테일/i, "GS25"], [/비바\s*리퍼블리카/, "토스"], [/메가\s*(MGC|엠지씨)\s*(커피)?/i, "메가커피"],
    [/에스씨케이\s*컴퍼니|스타벅스\s*코리아/, "스타벅스"], [/쿠팡\s*이츠\s*서비스/, "쿠팡이츠"], [/딜리버리\s*히어로|위대한\s*상상/, "요기요"],
    [/카카오\s*모빌리티/, "카카오T"], [/한국\s*철도\s*공사/, "코레일"], [/씨제이\s*씨지브이|CJ\s*CGV/i, "CGV"],
    [/이마트\s*에브리데이/, "이마트에브리데이"], [/씨제이\s*올리브영/, "올리브영"], [/아성\s*다이소/, "다이소"]
  ];
  var GATEWAYS = /(KG\s*)?이니시스|나이스\s*페이(먼츠)?|토스\s*페이먼츠|(NHN\s*)?KCP|한국사이버결제|다날|KSNET|케이에스넷|페이레터|스마트로|KICC|한국정보통신/gi;
  function cleanMerchant(raw) {
    var s = String(raw || "").replace(/주식회사|유한회사|\(주\)|㈜|\(유\)/g, " ");
    var stripped = s.replace(GATEWAYS, " ").replace(/\s+/g, " ").trim();
    if (stripped) { s = stripped; }  /* keep the gateway name if it is all there is */
    BRANDS.forEach(function (b) { s = s.replace(b[0], b[1]); });
    return s.replace(/\s+/g, " ").trim() || String(raw || "").trim();
  }
  function parseNotice(raw, now) {
    now = now || new Date();
    var s = String(raw || "").replace(/\[?Web발신\]?/g, " ").replace(/\s+/g, " ").trim();
    var r = { ok: false, raw: s };
    var dm = s.match(/(\d{1,2})\/(\d{1,2})\s*(\d{1,2}):(\d{2})/) || s.match(/(\d{1,2})\/(\d{1,2})/);
    if (dm) {
      var mo = Number(dm[1]), da = Number(dm[2]), y = now.getFullYear();
      if (mo > now.getMonth() + 2) { y -= 1; }  /* a December notice read in January */
      r.date = y + "-" + H.pad2(mo) + "-" + H.pad2(da);
      if (dm[3]) { r.time = H.pad2(Number(dm[3])) + ":" + dm[4]; }
    } else { r.date = H.dateKey(now); }
    /* card companies and banks put the merchant in different places, so strip every known part and keep the rest */
    function leftover(x) {
      if (dm) { x = x.replace(dm[0], " "); }
      return x.replace(/\(주\)|㈜/g, " ")
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/[가-힣A-Za-z]*(카드|뱅크|은행)(\s*[A-Z](?![A-Za-z가-힣]))?\s*\(?\d{0,4}\)?/g, " ")
        .replace(/누적\s*[\d,]+\s*원?|잔액\s*[\d,]+\s*원?|잔여\s*한도\s*[\d,]+\s*원?|사용\s*한도\s*[\d,]+\s*원?/g, " ")
        .replace(/[가-힣A-Za-z]*(입금|출금|지급|이체)\s*[\d,]+\s*원?/g, " ")
        .replace(/[\d,]+\s*원/g, " ")
        .replace(/\d+\*+\d+/g, " ")
        .replace(/[가-힣]{1,2}\*+[가-힣]{0,2}/g, " ")
        .replace(/승인|취소|일시불|할부\s*\d*\s*(개월)?|체크|신용|해외|국내/g, " ")
        .replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
    }
    var bank = s.match(/(입금|출금|지급|이체)\s*([\d,]+)\s*원?/);
    if (/카드/.test(s) && /승인|취소/.test(s) && !bank) {
      var am = s.match(/([\d,]+)\s*원/);
      if (!am) { return r; }
      r.amount = num(am[1]); r.type = "지출"; r.method = "카드"; r.cancel = /취소/.test(s);
      var cm = s.match(/([가-힣A-Za-z]*카드)\s*\(?(\d{3,4})?\)?/);
      r.source = cm ? cm[1] + (cm[2] ? "(" + cm[2] + ")" : "") : "카드";
    } else if (bank) {
      r.amount = num(bank[2]); r.type = bank[1] === "입금" ? "수입" : "지출"; r.method = "계좌이체";
      var bm = s.match(/\[KB\]|KB국민|국민은행/) ? ["", "KB국민은행"] : (s.match(/iM뱅크|대구은행|DGB/i) ? ["", "iM뱅크"] : s.match(/([가-힣A-Za-z]+(?:뱅크|은행))/));
      r.source = bm ? bm[1] : "은행";
    } else { return r; }
    r.merchant = leftover(s);
    if (!r.amount) { return r; }
    r.merchant = (r.merchant || r.source || "").slice(0, 60);
    r.sig = r.date + " " + (r.time || "") + " " + r.type + " " + r.amount + (r.cancel ? " 취소" : "");
    r.ok = true;
    return r;
  }
  App.budget = { won: won, shortWon: shortWon, monthKey: monthKey, ledgerRef: ledgerRef, settingsRef: settingsRef, totals: totals, byDate: byDate, unpaidFixed: unpaidFixed, fixedDate: fixedDate, parseFixed: parseFixed, parseNotice: parseNotice, guessMerchantCat: guessMerchantCat, cleanMerchant: cleanMerchant, merchantKey: merchantKey, ruleCat: ruleCat };

  /* my cards (personal/cards) are extra payment methods, so each expense can name the card used */
  var MY_CARDS = [];
  function cardNames() { return MY_CARDS.map(function (c) { return c.name; }); }
  /* with my cards registered, the generic "카드" gives way to the card names */
  function methodList() { return MY_CARDS.length ? METHODS.filter(function (m) { return m !== "카드"; }).concat(cardNames()) : METHODS; }
  function defaultMethod() { return MY_CARDS.length ? MY_CARDS[0].name : "카드"; }
  /* old entries may still say "카드": keep that value selectable when editing them */
  function setValue(sel, v) {
    if (v && !Array.prototype.some.call(sel.options, function (o) { return o.value === v; })) { var op = el("option", "", v); op.value = v; sel.appendChild(op); }
    sel.value = v;
  }
  function setOptions(sel, options) {
    var v = sel.value; H.clear(sel);
    options.concat(v && options.indexOf(v) === -1 ? [v] : []).forEach(function (o) { var op = el("option", "", o); op.value = o; sel.appendChild(op); });
    sel.value = v;
  }
  /* 카드 결제 알림의 카드사(예: 현대카드(1234)) → 내 카드 이름 */
  function cardForSource(src) {
    var word = String(src || "").replace(/\(.*$/, "").replace(/카드$/, "").replace(/체크$/, "");
    if (!word) { return ""; }
    var hit = MY_CARDS.filter(function (c) { return (c.issuer + " " + c.name).indexOf(word) !== -1; });
    return hit.length === 1 ? hit[0].name : "";
  }
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
  /* 가계부 · 월별 리포트 switcher, placed beside the page title */
  function headTabs(active) {
    var head = document.getElementById("pageHead"), h1 = head && head.querySelector(".page-title");
    if (!h1) { return; }
    head.classList.add("has-tabs");
    var nav = el("nav", "bud-tabs"); nav.setAttribute("aria-label", "가계부 보기");
    [["personal-budget", "가계부"], ["personal-budget-report", "월별 리포트"], ["personal-budget-cards", "카드 분석"]].forEach(function (t) {
      var a = el("a", "bud-tab" + (t[0] === active ? " on" : ""), t[1]); a.href = "#/" + t[0];
      if (t[0] === active) { a.setAttribute("aria-current", "page"); }
      nav.appendChild(a);
    });
    h1.insertAdjacentElement("afterend", nav);
  }

  App.page({
    id: "personal-budget", title: "가계부",
    render: function (view) {
      headTabs("personal-budget");
      var today = H.todayStr();
      /* the report can open a specific month */
      var goto = H.safeGet("hds_bud_goto"); H.safeSet("hds_bud_goto", "");
      var state = { mk: /^\d{4}-\d{2}$/.test(goto || "") ? goto : monthKey(new Date()), sel: today, settings: { fixed: [], budget: 0 }, items: [], editId: null, type: "지출", fType: "전체", fCat: "전체", q: "", fixedEdit: null };
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

      /* notifications captured on the phone, waiting to be confirmed */
      var inbox = el("section", "bud-inbox"); inbox.hidden = true; view.appendChild(inbox);
      state.inbox = [];

      /* two independent columns: the ledger on the left, calendar → fixed → stats on the right */
      var cols = el("div", "bud-cols"), colL = el("div", "bud-col"), colR = el("div", "bud-col");
      cols.appendChild(colL); cols.appendChild(colR); view.appendChild(cols);
      var listCard = ui.card(colL, { tab: "Ledger", tone: "t-3", title: "수입 · 지출 내역" });
      var dayCard = ui.card(colR, { tab: "Daily", tone: "t-2", title: "날짜별 지출" });
      var fixedCard = ui.card(colR, { tab: "Fixed", tone: "t-1", title: "고정 수입 · 지출" });
      var catCard = ui.card(colR, { tab: "Category", tone: "t-2", title: "분류별 지출" });
      var setCard = ui.card(colR, { tab: "Budget", tone: "t-1", title: "월 예산 · 결제수단" });
      [listCard, dayCard, fixedCard, catCard, setCard].forEach(function (c, i) { c.el.style.setProperty("--m-order", String(i)); });
      state.ledSel = {}; state.fxSel = {}; state.fxPicking = false;

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
        var fixedAll = (state.settings.fixed || []).reduce(function (s, f) { return s + (isInc(f) ? 0 : Number(f.amount) || 0); }, 0);
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
      var fxAddInc = el("button", "tool-btn", "+ 고정수입 추가"); fxAddInc.type = "button";
      var fxAll = el("button", "tool-btn", "미반영 모두 이번 달에 반영"); fxAll.type = "button";
      var fxBulkBtn = el("button", "tool-btn", "여러 개 붙여넣기"); fxBulkBtn.type = "button";
      var fxClear = el("button", "tool-btn", "고정지출 전체 삭제"); fxClear.type = "button";
      fxTools.appendChild(fxAdd); fxTools.appendChild(fxAddInc); fxTools.appendChild(fxBulkBtn); fxTools.appendChild(fxAll); fxTools.appendChild(fxClear);
      /* 선택 mode: the row checkbox picks items for deletion instead of reflecting them this month */
      var fxPick = el("button", "tool-btn", "선택"); fxPick.type = "button";
      var fxPickAll = el("button", "tool-btn", "전체 선택"); fxPickAll.type = "button";
      var fxPickDel = el("button", "tool-btn danger", "선택 삭제"); fxPickDel.type = "button";
      [fxPickAll, fxPickDel, fxPick].forEach(function (b) { fxTools.appendChild(b); });
      function fxViewItems() { var inc = state.fxView === "수입"; return (state.settings.fixed || []).filter(function (f) { return isInc(f) === inc; }); }
      fxPick.addEventListener("click", function () {
        state.fxPicking = !state.fxPicking; state.fxSel = {};
        fxForm.hidden = true; fxBulk.hidden = true; state.fixedEdit = null;
        drawFixed();
      });
      fxPickAll.addEventListener("click", function () {
        var items = fxViewItems(), allOn = items.length && items.every(function (f) { return state.fxSel[f.id]; });
        state.fxSel = {};
        if (!allOn) { items.forEach(function (f) { state.fxSel[f.id] = true; }); }
        drawFixed();
      });
      fxPickDel.addEventListener("click", function () {
        var ids = Object.keys(state.fxSel).filter(function (id) { return state.fxSel[id]; });
        if (!ids.length) { return; }
        if (!window.confirm("고정" + state.fxView + " " + ids.length + "개를 목록에서 삭제할까요?\n(이미 기록된 내역은 그대로 남아요)")) { return; }
        state.fxSel = {}; state.fxPicking = false;
        saveSettings({ fixed: (state.settings.fixed || []).filter(function (f) { return ids.indexOf(f.id) === -1; }) });
      });
      /* removes every fixed expense (fixed income stays) and its entries recorded in the month on screen */
      fxClear.addEventListener("click", function () {
        var gone = {};
        (state.settings.fixed || []).forEach(function (f) { if (!isInc(f)) { gone[f.id] = true; } });
        var n = Object.keys(gone).length;
        var recorded = state.items.filter(function (it) { return gone[it.fixedId]; });
        if (!n) { return; }
        if (!window.confirm("고정지출 " + n + "개를 모두 삭제할까요?" + (recorded.length ? "\n" + Number(state.mk.slice(5)) + "월 내역에 반영된 고정지출 " + recorded.length + "건(" + won(recorded.reduce(function (s, it) { return s + (Number(it.amount) || 0); }, 0)) + ")도 함께 지워져요." : "") + "\n고정수입은 그대로 남아요.")) { return; }
        saveSettings({ fixed: (state.settings.fixed || []).filter(function (f) { return !gone[f.id]; }) });
        if (recorded.length) { saveItems(state.items.filter(function (it) { return !gone[it.fixedId]; })); }
      });
      var fxBulk = el("form", "obs-import"); fxBulk.hidden = true;
      var fxBulkHint = el("p", "hint"); fxBulk.appendChild(fxBulkHint);
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
        var inc = state.fxView === "수입";
        var list = (state.settings.fixed || []).slice(), added = 0, updated = 0;
        rows.forEach(function (r) {
          var hit = list.filter(function (f) { return f.name === r.name && isInc(f) === inc; })[0];
          if (hit) {
            var i = list.indexOf(hit);
            list[i] = Object.assign({}, hit, { amount: r.amount }, r.dayGiven ? { day: r.day } : {});
            updated++;
          } else if (inc) {
            list.push({ id: H.uid(), kind: "수입", name: r.name, amount: r.amount, day: r.dayGiven ? r.day : null, cat: /급여|월급|봉급|연봉/.test(r.name) ? "급여" : "부수입", method: "계좌이체", memo: "" });
            added++;
          } else {
            list.push({ id: H.uid(), name: r.name, amount: r.amount, day: r.day, cat: r.cat, method: r.cat === "주거 · 관리비" ? "계좌이체" : "카드", memo: "" });
            added++;
          }
        });
        saveSettings({ fixed: list });
        fxBulkTa.value = ""; fxBulk.hidden = true;
        window.alert("고정" + state.fxView + " " + added + "개 추가" + (updated ? ", " + updated + "개 금액 수정" : "") + "했어요.");
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
      var fxDayField = field("매월 결제일", fxDay), fxMethodField = field("결제수단", fxMethod);
      [field("항목명", fxName), field("금액", fxAmt), fxDayField, field("분류", fxCat), fxMethodField, field("메모", fxMemo, true), fxActs].forEach(function (n) { fxForm.appendChild(n); });
      var fxList = el("div", "plain-list bud-fixed-list");
      var fxHint = el("p", "hint");
      [fxSum, fxTools, fxBulk, fxForm, fxList, fxHint].forEach(function (n) { fixedCard.body.appendChild(n); });

      /* ‹ › in the card title flips between 고정지출 and 고정수입; the last view is remembered */
      state.fxView = H.safeGet("hds_bud_fx") === "수입" ? "수입" : "지출";
      var fxTab = fixedCard.el.querySelector(".tab-label"), fxH2 = fixedCard.head.querySelector("h2");
      var fxSw = el("div", "bud-sw");
      var fxPrev = el("button", "bud-arr", "‹"), fxNext = el("button", "bud-arr", "›");
      var fxDots = el("span", "bud-dots");
      fixedCard.head.replaceChild(fxSw, fxH2);
      [fxPrev, fxH2, fxNext, fxDots].forEach(function (n) { fxSw.appendChild(n); });
      function setFxView(v) {
        state.fxView = v; H.safeSet("hds_bud_fx", v); state.fxPicking = false; state.fxSel = {};
        fxForm.hidden = true; fxBulk.hidden = true; state.fixedEdit = null;
        drawFixed();
      }
      [fxPrev, fxNext].forEach(function (b) {
        b.type = "button";
        b.addEventListener("click", function () { setFxView(state.fxView === "수입" ? "지출" : "수입"); });
      });
      ["지출", "수입"].forEach(function (v) {
        var d = el("button", "bud-dot"); d.type = "button"; d.setAttribute("aria-label", "고정" + v + " 보기");
        d.addEventListener("click", function () { setFxView(v); });
        fxDots.appendChild(d);
      });

      function openFixedForm(f, kind) {
        state.fixedEdit = f ? f.id : null;
        state.fixedKind = f ? (f.kind || "지출") : (kind || "지출");
        var inc = state.fixedKind === "수입";
        H.clear(fxCat);
        (inc ? INC_CATS : EXP_CATS).forEach(function (o) { var op = el("option", "", o); op.value = o; fxCat.appendChild(op); });
        fxDayField.querySelector(".f-label").textContent = inc ? "매월 입금일 (비우면 미정)" : "매월 결제일";
        fxDay.required = !inc; fxMethodField.hidden = inc;
        fxName.placeholder = inc ? "예: 월급, 연구지원금, 학원 강사료" : "예: 월세, 통신비, 넷플릭스";
        fxName.value = f ? f.name : ""; fxAmt.value = f ? Number(f.amount).toLocaleString("ko-KR") : ""; fxDay.value = f && f.day ? f.day : "";
        fxCat.value = f ? f.cat : (inc ? "부수입" : "주거 · 관리비"); setValue(fxMethod, f ? (f.method || "계좌이체") : "계좌이체"); fxMemo.value = f ? (f.memo || "") : "";
        fxSave.textContent = f ? "수정 저장" : (inc ? "고정수입 저장" : "저장");
        fxForm.hidden = false; fxName.focus();
      }
      fxAdd.addEventListener("click", function () { if (!fxForm.hidden && !state.fixedEdit && state.fixedKind !== "수입") { fxForm.hidden = true; return; } openFixedForm(null, "지출"); });
      fxAddInc.addEventListener("click", function () { if (!fxForm.hidden && !state.fixedEdit && state.fixedKind === "수입") { fxForm.hidden = true; return; } openFixedForm(null, "수입"); });
      fxCancel.addEventListener("click", function () { fxForm.hidden = true; state.fixedEdit = null; });
      fxForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var inc = state.fixedKind === "수입";
        var name = fxName.value.trim(), amount = num(fxAmt.value), day = fxDay.value.trim() ? Math.round(Number(fxDay.value)) : null;
        if (!name || !amount) { window.alert("항목명과 금액을 입력해 주세요."); return; }
        if (!(day >= 1 && day <= 31) && !(inc && day === null)) { window.alert((inc ? "입금일" : "결제일") + "은 1~31 사이 숫자로 입력해 주세요."); return; }
        var rec = { id: state.fixedEdit || H.uid(), kind: inc ? "수입" : "지출", name: name, amount: amount, day: day, cat: fxCat.value, method: inc ? "계좌이체" : fxMethod.value, memo: fxMemo.value.trim() };
        var list = (state.settings.fixed || []).slice();
        var i = list.map(function (f) { return f.id; }).indexOf(rec.id);
        if (i === -1) { list.push(rec); } else { list[i] = rec; }
        saveSettings({ fixed: list });
        fxForm.hidden = true; state.fixedEdit = null;
      });
      function fixedEntry(f) {
        return { id: H.uid(), date: entryDate(state.mk, f), type: isInc(f) ? "수입" : "지출", cat: f.cat || "기타", amount: Number(f.amount) || 0, method: f.method || "계좌이체", memo: f.name, fixedId: f.id, createdAt: new Date().toISOString() };
      }
      function paidMap() {
        var paid = {};
        state.items.forEach(function (it) { if (it.fixedId) { paid[it.fixedId] = it; } });
        return paid;
      }
      fxAll.addEventListener("click", function () {
        var inc = state.fxView === "수입", paid = paidMap();
        var todo = (state.settings.fixed || []).filter(function (f) { return isInc(f) === inc && !paid[f.id]; });
        if (!todo.length) { window.alert("이 달에 반영할 고정" + state.fxView + "이 없습니다."); return; }
        saveItems(state.items.concat(todo.map(fixedEntry)));
      });
      function sumOf(list) { return list.reduce(function (s, f) { return s + (Number(f.amount) || 0); }, 0); }
      function drawFixed() {
        var incView = state.fxView === "수입";
        fxH2.textContent = incView ? "고정수입" : "고정지출";
        fxTab.textContent = incView ? "Income" : "Fixed";
        fxTab.className = "tab-label " + (incView ? "t-2" : "t-1");
        fixedCard.el.classList.toggle("bud-inc-view", incView);
        fxPrev.setAttribute("aria-label", incView ? "고정지출 보기" : "고정수입 보기");
        fxNext.setAttribute("aria-label", incView ? "고정지출 보기" : "고정수입 보기");
        Array.prototype.forEach.call(fxDots.children, function (d, i) { d.classList.toggle("on", (i === 1) === incView); });
        fxAdd.hidden = incView; fxAddInc.hidden = !incView;
        fxBulkTa.placeholder = incView ? "월급 3,000,000원 10일\n학원 강사료 400,000원 13일\n연구지원금 1,580,000원" : "월세 400,000원 25일\n통신비 30,000원 15일\n넷플릭스 17,000원";
        fxBulkHint.textContent = incView
          ? "한 줄에 하나씩 '항목명 금액 (입금일)'을 적거나 표를 그대로 붙여넣으세요. 입금일을 안 적으면 '미정'으로 들어가요. 같은 이름이 이미 있으면 금액만 바뀌어요."
          : "한 줄에 하나씩 '항목명 금액 (결제일)'을 적거나 표를 그대로 붙여넣으세요. 결제일을 안 적으면 1일로 들어가니 나중에 ✎로 고쳐 주세요. 같은 이름이 이미 있으면 금액만 바뀌어요.";
        fxHint.textContent = incView
          ? "체크하면 이 달의 입금일에 수입으로 기록돼요. 입금일이 미정이면 이번 달엔 오늘 날짜로 들어가요."
          : "체크하면 이 달의 결제일에 지출로 기록되어 날짜별 지출 · 합계에 반영돼요. 결제일이 그 달에 없으면(예: 31일) 말일로 들어갑니다.";
        var all = state.settings.fixed || [], paid = paidMap();
        var expFixed = all.filter(function (f) { return !isInc(f); }), incFixed = all.filter(isInc);
        /* by day, 미정 last */
        var fixed = (incView ? incFixed : expFixed).slice().sort(function (a, b) { return (Number(a.day) || 99) - (Number(b.day) || 99); });
        var done = fixed.filter(function (f) { return paid[f.id]; }).length;
        fixedCard.count.textContent = fixed.length ? done + " / " + fixed.length + " 반영" : "";
        H.clear(fxSum);
        if (fixed.length) {
          fxSum.appendChild(document.createTextNode("매월 합계 "));
          fxSum.appendChild(el("strong", "", won(sumOf(fixed))));
          fxSum.appendChild(document.createTextNode(" · " + Number(state.mk.slice(5)) + "월 반영 " + done + "/" + fixed.length));
          if (incView) {
            var left = sumOf(incFixed) - sumOf(expFixed);
            fxSum.appendChild(document.createTextNode(" · 고정지출 빼고 남는 돈 "));
            fxSum.appendChild(el("strong", "", (left < 0 ? "−" : "") + won(Math.abs(left))));
          }
        }
        fxAll.hidden = !fixed.length || done === fixed.length;
        fxClear.hidden = incView || !expFixed.length;
        /* selection mode swaps the toolbar */
        var picking = state.fxPicking && fixed.length > 0;
        if (!picking) { state.fxPicking = false; }
        Object.keys(state.fxSel).forEach(function (id) { if (!fixed.some(function (f) { return f.id === id; })) { delete state.fxSel[id]; } });
        var nSel = fixed.filter(function (f) { return state.fxSel[f.id]; }).length;
        fxPick.hidden = !fixed.length; fxPick.textContent = picking ? "선택 완료" : "선택";
        fxPick.classList.toggle("on", picking);
        fxPickAll.hidden = fxPickDel.hidden = !picking;
        fxPickAll.textContent = nSel && nSel === fixed.length ? "전체 해제" : "전체 선택";
        fxPickDel.textContent = "선택 삭제 (" + nSel + ")"; fxPickDel.disabled = !nSel;
        if (picking) { [fxAdd, fxAddInc, fxBulkBtn, fxAll, fxClear].forEach(function (b) { b.hidden = true; }); }
        fixedCard.el.classList.toggle("bud-picking", picking);
        if (picking) { fxHint.textContent = "지울 항목을 체크하고 '선택 삭제'를 누르세요. 다 했으면 '선택 완료'를 누르면 원래 화면(이번 달 반영 체크)으로 돌아가요."; }
        H.clear(fxList);
        if (!fixed.length) {
          fxList.appendChild(ui.empty(incView ? "월급 · 강사료 · 연구지원금처럼 매달 들어오는 돈을 등록해 두세요." : "월세 · 관리비 · 통신비 · 보험 · 구독료처럼 매달 나가는 돈을 등록해 두세요."));
          return;
        }
        var curMonth = state.mk === monthKey(new Date());
        fixed.forEach(function (f) {
          var inc = isInc(f);
          var row = el("div", "bud-fixed" + (inc ? " inc" : "") + (paid[f.id] ? " paid" : "") + (picking && state.fxSel[f.id] ? " picked" : ""));
          var cb = el("input"); cb.type = "checkbox";
          if (picking) {
            cb.className = "bud-pick"; cb.checked = !!state.fxSel[f.id]; cb.setAttribute("aria-label", f.name + " 선택");
            cb.addEventListener("change", function () { state.fxSel[f.id] = cb.checked; drawFixed(); });
          } else {
            cb.checked = !!paid[f.id]; cb.setAttribute("aria-label", f.name + " 이번 달 반영");
            cb.addEventListener("change", function () {
              if (cb.checked) { saveItems(state.items.concat([fixedEntry(f)])); }
              else { saveItems(state.items.filter(function (it) { return it.fixedId !== f.id; })); }
            });
          }
          row.appendChild(cb);
          row.appendChild(el("span", "bud-day", f.day ? "매월 " + f.day + "일" : (inc ? "입금일 미정" : "날짜 미정")));
          var main = el("span", "bud-fixed-main");
          main.appendChild(el("span", "bud-fixed-name", f.name));
          main.appendChild(el("span", "mini-sub", [f.cat, inc ? "" : f.method, f.memo].filter(Boolean).join(" · ")));
          row.appendChild(main);
          if (!paid[f.id] && curMonth && f.day) { row.appendChild(H.ddayEl(fixedDate(state.mk, f.day))); }
          row.appendChild(el("span", "bud-amt" + (inc ? " inc" : ""), (inc ? "+" : "") + won(f.amount)));
          var ed = el("button", "icon-btn", "✎"); ed.type = "button"; ed.title = "수정"; ed.setAttribute("aria-label", f.name + " 수정");
          ed.addEventListener("click", function () { openFixedForm(f); });
          var del = el("button", "icon-btn", "×"); del.type = "button"; del.title = "삭제"; del.setAttribute("aria-label", f.name + " 삭제");
          del.addEventListener("click", function () {
            if (!window.confirm("'" + f.name + "' " + (inc ? "고정수입" : "고정지출") + "을 목록에서 삭제할까요? (이미 기록된 내역은 그대로 남아요)")) { return; }
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
      App.watchDoc(App.doc("personal/cards"), function (d) {
        MY_CARDS = (d && d.cards) || [];
        if (methodEl.value === "카드" && !state.editId) { methodEl.value = ""; }
        setOptions(methodEl, methodList()); setOptions(fxMethod, methodList());
        if (!methodEl.value) { methodEl.value = defaultMethod(); }
      });
      [typeWrap, field("날짜", dateEl), field("분류", catEl), field("금액 (원)", amtEl), methodField, field("내용 · 메모", memoEl, true), acts].forEach(function (n) { form.appendChild(n); });

      var filt = el("div", "items-tools");
      var fTypes = el("div", "archive-filters bud-ftypes");
      var fCatEl = el("select"); fCatEl.setAttribute("aria-label", "분류 필터");
      var fQ = el("input"); fQ.type = "search"; fQ.placeholder = "내용 · 분류 검색"; fQ.setAttribute("aria-label", "내역 검색");
      filt.appendChild(fTypes); filt.appendChild(fCatEl); filt.appendChild(fQ);
      var listSum = el("div", "items-summary");
      var selBar = el("div", "items-tools bud-selbar");
      var selAll = el("label", "bud-selall");
      var selAllCb = el("input"); selAllCb.type = "checkbox"; selAllCb.setAttribute("aria-label", "보이는 내역 전체 선택");
      var selAllTxt = el("span", "", "전체 선택");
      selAll.appendChild(selAllCb); selAll.appendChild(selAllTxt);
      var selDel = el("button", "tool-btn danger", "선택 삭제"); selDel.type = "button";
      selBar.appendChild(selAll); selBar.appendChild(selDel);
      var list = el("div", "bud-list");
      [form, filt, listSum, selBar, list].forEach(function (n) { listCard.body.appendChild(n); });
      /* 전체 선택 acts on what the current filter shows */
      selAllCb.addEventListener("change", function () {
        var on = selAllCb.checked;
        filtered().forEach(function (it) { if (on) { state.ledSel[it.id] = true; } else { delete state.ledSel[it.id]; } });
        drawList();
      });
      selDel.addEventListener("click", function () {
        var picked = state.items.filter(function (it) { return state.ledSel[it.id]; });
        if (!picked.length) { return; }
        var t = totals(picked);
        if (!window.confirm("선택한 " + picked.length + "건을 삭제할까요?\n" + (t.exp ? "지출 " + won(t.exp) : "") + (t.exp && t.inc ? " · " : "") + (t.inc ? "수입 " + won(t.inc) : ""))) { return; }
        state.ledSel = {};
        saveItems(state.items.filter(function (it) { return picked.indexOf(it) === -1; }));
      });

      function setType(t, keepCat) {
        state.type = t;
        tExp.classList.toggle("active", t === "지출"); tInc.classList.toggle("active", t === "수입");
        var cur = catEl.value; H.clear(catEl);
        (t === "수입" ? INC_CATS : EXP_CATS).forEach(function (c) { var o = el("option", "", c); o.value = c; catEl.appendChild(o); });
        if (keepCat && (t === "수입" ? INC_CATS : EXP_CATS).indexOf(cur) !== -1) { catEl.value = cur; }
        methodEl.value = t === "수입" ? "계좌이체" : defaultMethod();
      }
      tExp.addEventListener("click", function () { setType("지출"); });
      tInc.addEventListener("click", function () { setType("수입"); });
      function resetForm() {
        state.editId = null; saveBtn.textContent = "추가"; cancelBtn.hidden = true; form.classList.remove("editing");
        amtEl.value = ""; memoEl.value = "";
      }
      function startEdit(it) {
        state.editId = it.id; setType(it.type || "지출");
        dateEl.value = it.date; catEl.value = it.cat; amtEl.value = Number(it.amount).toLocaleString("ko-KR"); setValue(methodEl, it.method || defaultMethod()); memoEl.value = it.memo || "";
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
        /* fixing an entry that came from a phone notice teaches the merchant memory too */
        if (old && old.rawm && item.memo) { rememberMerchant(old.rawm, item.memo, item.cat, item.type); }
        putItem(item);
        resetForm(); amtEl.focus();
      });

      function entryRow(it, selectable) {
        var inc = it.type === "수입";
        var row = el("div", "bud-entry" + (inc ? " inc" : "") + (selectable && state.ledSel[it.id] ? " picked" : ""));
        if (selectable) {
          var pick = el("input", "bud-pick"); pick.type = "checkbox"; pick.checked = !!state.ledSel[it.id];
          pick.setAttribute("aria-label", (it.memo || it.cat) + " 선택");
          pick.addEventListener("change", function () { if (pick.checked) { state.ledSel[it.id] = true; } else { delete state.ledSel[it.id]; } drawList(); });
          row.appendChild(pick);
        }
        var chip = el("span", "cat-chip bud-cat", it.cat || "기타");
        row.appendChild(chip);
        var main = el("span", "bud-entry-main");
        main.appendChild(el("span", "bud-entry-memo", it.memo || it.cat || ""));
        var meta = [it.method];
        if (it.fixedId) { meta.push(it.type === "수입" ? "고정수입" : "고정지출"); }
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
          if (state.fType === "지출" && (type !== "지출" || it.fixedId)) { return false; }
          if (state.fType === "수입" && type !== "수입") { return false; }
          if (state.fType === "고정지출" && (!it.fixedId || it.type === "수입")) { return false; }
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
        /* drop selections for entries that no longer exist */
        Object.keys(state.ledSel).forEach(function (id) { if (!state.items.some(function (it) { return it.id === id; })) { delete state.ledSel[id]; } });
        var nSel = Object.keys(state.ledSel).length, nShownSel = items.filter(function (it) { return state.ledSel[it.id]; }).length;
        selBar.hidden = !items.length;
        selAllCb.checked = items.length > 0 && nShownSel === items.length;
        selAllCb.indeterminate = nShownSel > 0 && nShownSel < items.length;
        selAllTxt.textContent = nSel ? "전체 선택 (" + nSel + "건 선택됨)" : "전체 선택";
        selDel.textContent = "선택 삭제 (" + nSel + ")"; selDel.disabled = !nSel;
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
          groups[k].forEach(function (it) { box.appendChild(entryRow(it, true)); });
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
      var notiHelp = el("details", "reco-settings bud-noti-help");
      notiHelp.appendChild(el("summary", "", "휴대폰 결제 알림 자동 연동 (안드로이드)"));
      var notiUl = el("ul", "guide-list");
      ["갤럭시에 MacroDroid 앱을 깔고, 신한카드 승인 문자 · iM뱅크 입출금 알림이 오면 그 내용을 이 사이트로 보내도록 매크로를 만들어요.",
        "들어온 알림은 이 페이지 맨 위 '휴대폰 결제 알림'에 쌓여요. 금액 · 가맹점 · 분류를 확인하고 [추가]를 누르면 내역에 들어가요.",
        "같은 결제가 문자와 앱 알림으로 두 번 와도 한 건으로 묶여요. 승인 취소 알림은 원래 결제를 찾아 지울 수 있어요.",
        "설정 방법(보안 규칙 · 매크로 만드는 법)은 Claude가 알려준 안내를 따라 주세요. 비밀 키는 이 사이트 코드에 넣지 않아요."
      ].forEach(function (t) { notiUl.appendChild(el("li", "", t)); });
      notiHelp.appendChild(notiUl);
      [bForm, bHint, mTitleEl, mBars, notiHelp].forEach(function (n) { setCard.body.appendChild(n); });
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

      /* ---------- 휴대폰 결제 알림 (budgetInbox) ---------- */
      var inboxRef = App.col("budgetInbox");
      state.inboxCat = {}; state.inboxName = {}; state.rawOpen = {}; state.autoDone = {};
      /* name + category for a notice: remembered merchant → cleaned brand name + word rules */
      function decide(p) {
        var mem = (state.settings.merchants || {})[merchantKey(p.merchant)];
        if (mem && (mem.type || "지출") === p.type) { return { name: mem.name || p.merchant, cat: mem.cat, remembered: true, sure: true }; }
        var name = cleanMerchant(p.merchant), rule = p.type === "수입" ? "" : ruleCat(name);
        return { name: name, cat: rule || guessMerchantCat(name, p.type, state.items), remembered: false, sure: !!rule };
      }
      function rememberMerchant(raw, name, cat, type) {
        var key = merchantKey(raw);
        if (!key || !name) { return; }
        var map = Object.assign({}, state.settings.merchants || {});
        var prev = map[key];
        if (prev && prev.name === name && prev.cat === cat && (prev.type || "지출") === type) { return; }
        map[key] = { name: name, cat: cat, type: type };
        state.settings = Object.assign({}, state.settings, { merchants: map });
        settingsRef().set({ merchants: map, updatedAt: new Date().toISOString() }, { merge: true }).catch(function () {});
      }
      function inboxGroups() {
        var out = [], bySig = {};
        state.inbox.forEach(function (d) {
          var p = parseNotice(d.text);
          if (!p.ok) { out.push({ ids: [d.id], p: p }); return; }
          if (bySig[p.sig]) { bySig[p.sig].ids.push(d.id); return; }  /* same payment via SMS and app push */
          var g = { ids: [d.id], p: p };
          if (p.cancel) {
            g.match = state.items.filter(function (it) { return it.type !== "수입" && Number(it.amount) === p.amount && (it.rawm === p.merchant || it.memo === p.merchant || it.src); })[0] || null;
          } else {
            var dec = decide(p);
            g.dup = state.items.some(function (it) { return it.src === "noti:" + p.sig; });
            g.name = state.inboxName[p.sig] !== undefined ? state.inboxName[p.sig] : dec.name;
            g.cat = state.inboxCat[p.sig] || dec.cat;
            g.remembered = dec.remembered; g.sure = dec.sure && p.type === "지출";
          }
          bySig[p.sig] = g; out.push(g);
        });
        return out.sort(function (a, b) { var x = (a.p.date || "") + (a.p.time || ""), y = (b.p.date || "") + (b.p.time || ""); return x < y ? 1 : (x > y ? -1 : 0); });
      }
      function dropInbox(ids) {
        state.inbox = state.inbox.filter(function (d) { return ids.indexOf(d.id) === -1; }); drawInbox();
        return Promise.all(ids.map(function (id) { return inboxRef.doc(id).delete(); })).catch(function (err) { window.alert("알림 삭제 실패: " + err.message); });
      }
      function inboxItem(g) {
        var name = String(g.name || "").trim() || g.p.merchant;
        rememberMerchant(g.p.merchant, name, g.cat, g.p.type);
        return { id: H.uid(), date: g.p.date, type: g.p.type, cat: g.cat, amount: g.p.amount, method: (g.p.method === "카드" && cardForSource(g.p.source)) || g.p.method, memo: name, rawm: g.p.merchant, src: "noti:" + g.p.sig, createdAt: new Date().toISOString() };
      }
      /* 확실한 알림은 자동 추가: remembered merchants or a word-rule match, expenses only.
         Runs only once the settings and this month's ledger have both loaded, so nothing is overwritten. */
      function autoAdd(groups) {
        if (!state.settings.autoAdd || !state.settingsLoaded || !state.itemsLoaded || state.autoBusy) { return; }
        var todo = groups.filter(function (g) { return g.p.ok && !g.p.cancel && !g.dup && g.sure && !state.autoDone[g.p.sig]; });
        if (!todo.length) { return; }
        todo.forEach(function (g) { state.autoDone[g.p.sig] = true; });
        state.autoBusy = true;
        addFromInbox(todo).then(function () { state.autoBusy = false; }, function () { state.autoBusy = false; });
      }
      /* entries may belong to other months: merge each month's document, skipping ones already added */
      function addFromInbox(groups) {
        var byMonth = {};
        groups.forEach(function (g) { var mk = g.p.date.slice(0, 7); (byMonth[mk] = byMonth[mk] || []).push(inboxItem(g)); });
        var jobs = Object.keys(byMonth).map(function (mk) {
          function merge(cur) {
            var have = {}; cur.forEach(function (it) { if (it.src) { have[it.src] = true; } });
            return cur.concat(byMonth[mk].filter(function (it) { return !have[it.src]; }));
          }
          if (mk === state.mk) { return saveItems(merge(state.items)); }
          return ledgerRef(mk).get().then(function (snap) { return saveMonth(mk, merge((snap.exists && snap.data().items) || [])); });
        });
        var ids = [].concat.apply([], groups.map(function (g) { return g.ids; }));
        return Promise.all(jobs).then(function () { return dropInbox(ids); }).catch(function (err) { window.alert("추가 실패: " + err.message); });
      }
      function drawInbox() {
        var groups = inboxGroups();
        H.clear(inbox); inbox.hidden = !groups.length;
        if (!groups.length) { return; }
        var addable = groups.filter(function (g) { return g.p.ok && !g.p.cancel && !g.dup; });
        var head = el("div", "bud-inbox-head");
        head.appendChild(el("h2", "", "휴대폰 결제 알림 " + groups.length + "건"));
        head.appendChild(el("span", "hint", "확인하고 추가하면 내역에 들어가요. 내 계좌끼리 옮긴 돈처럼 가계부에 넣지 않을 건 버리세요."));
        var acts = el("div", "items-tools");
        var allAdd = el("button", "btn", "모두 추가 (" + addable.length + ")"); allAdd.type = "button"; allAdd.disabled = !addable.length;
        allAdd.addEventListener("click", function () { addFromInbox(addable); });
        var allDrop = el("button", "tool-btn", "모두 버리기"); allDrop.type = "button";
        allDrop.addEventListener("click", function () {
          if (window.confirm("알림 " + groups.length + "건을 모두 버릴까요? (가계부 내역은 그대로예요)")) { dropInbox([].concat.apply([], groups.map(function (g) { return g.ids; }))); }
        });
        var copyAll = el("button", "tool-btn", "원문 모두 복사"); copyAll.type = "button";
        copyAll.addEventListener("click", function () { H.copyText(groups.map(function (g) { return g.p.raw; }).join("\n"), copyAll); });
        var auto = el("label", "bud-auto");
        var autoCb = el("input"); autoCb.type = "checkbox"; autoCb.checked = !!state.settings.autoAdd;
        autoCb.addEventListener("change", function () { saveSettings({ autoAdd: autoCb.checked }); });
        auto.appendChild(autoCb); auto.appendChild(el("span", "", "확실한 알림은 자동 추가"));
        [allAdd, allDrop, copyAll, auto].forEach(function (n) { acts.appendChild(n); });
        head.appendChild(acts);
        inbox.appendChild(head);
        var list = el("div", "bud-inbox-list");
        groups.forEach(function (g) {
          var p = g.p, row = el("div", "bud-noti" + (p.ok && p.type === "수입" ? " inc" : "") + (!p.ok ? " bad" : ""));
          if (!p.ok) {
            row.appendChild(el("span", "bud-noti-when", "읽지 못함"));
            var rawEl = el("span", "bud-noti-main"); rawEl.appendChild(el("span", "bud-noti-raw", p.raw)); rawEl.appendChild(el("span", "mini-sub", "금액을 찾지 못한 알림이에요. 필요하면 아래 내역 입력에서 직접 추가해 주세요."));
            row.appendChild(rawEl);
          } else {
            var d = H.parseKey(p.date);
            row.appendChild(el("span", "bud-noti-when", (d.getMonth() + 1) + "/" + d.getDate() + (p.time ? " " + p.time : "")));
            var main = el("span", "bud-noti-main");
            if (!p.cancel && !g.dup) {
              /* the shop name can be fixed right here; it is remembered when the notice is added */
              var nameIn = el("input", "bud-noti-name-in"); nameIn.value = g.name; nameIn.maxLength = 60; nameIn.setAttribute("aria-label", "가게 이름");
              nameIn.addEventListener("input", function () { state.inboxName[p.sig] = nameIn.value; g.name = nameIn.value; });
              main.appendChild(nameIn);
            } else {
              main.appendChild(el("span", "bud-noti-name", p.merchant || "(내용 없음)"));
            }
            main.appendChild(el("span", "mini-sub", [p.source, p.type, p.cancel ? "승인 취소" : "", g.dup ? "이미 추가됨" : "", g.remembered ? "기억한 가게" : ""].filter(Boolean).join(" · ")));
            row.appendChild(main);
            if (!p.cancel && !g.dup) {
              var cat = select(p.type === "수입" ? INC_CATS : EXP_CATS, g.cat, "분류");
              cat.addEventListener("change", function () { state.inboxCat[p.sig] = cat.value; });
              row.appendChild(cat);
            }
            row.appendChild(el("span", "bud-amt" + (p.type === "수입" ? " inc" : ""), (p.type === "수입" ? "+" : (p.cancel ? "취소 " : "−")) + won(p.amount)));
            if (p.cancel) {
              if (g.match) {
                var undo = el("button", "tool-btn", "원 결제 지우기"); undo.type = "button"; undo.title = g.match.date + " " + (g.match.memo || "") + " " + won(g.match.amount);
                undo.addEventListener("click", function () { saveItems(state.items.filter(function (it) { return it.id !== g.match.id; })).then(function () { dropInbox(g.ids); }); });
                row.appendChild(undo);
              }
            } else if (!g.dup) {
              var add = el("button", "tool-btn on", "추가"); add.type = "button";
              add.addEventListener("click", function () { g.cat = cat.value; g.name = nameIn.value; addFromInbox([g]); });
              row.appendChild(add);
            }
          }
          if (p.ok) {
            var rk = p.sig, rawBtn = el("button", "tool-btn raw-btn" + (state.rawOpen[rk] ? " on" : ""), "원문"); rawBtn.type = "button";
            rawBtn.setAttribute("aria-expanded", state.rawOpen[rk] ? "true" : "false");
            rawBtn.addEventListener("click", function () { state.rawOpen[rk] = !state.rawOpen[rk]; drawInbox(); });
            row.appendChild(rawBtn);
          }
          var drop = el("button", "icon-btn", "×"); drop.type = "button"; drop.title = "버리기"; drop.setAttribute("aria-label", "알림 버리기");
          drop.addEventListener("click", function () { dropInbox(g.ids); });
          row.appendChild(drop);
          if (p.ok && state.rawOpen[p.sig]) { row.appendChild(el("div", "bud-noti-rawline", p.raw)); }
          list.appendChild(row);
        });
        inbox.appendChild(list);
        autoAdd(groups);
      }

      /* ---------- month navigation ---------- */
      function drawAll() { drawSummary(); drawFixed(); drawDaily(); drawList(); drawCats(); drawBudget(); drawInbox(); }
      function setMonth(mk) {
        state.mk = mk;
        if (state.sel.slice(0, 7) !== mk) { state.sel = mk === today.slice(0, 7) ? today : mk + "-01"; }
        if (!state.editId) { dateEl.value = state.sel; }
        state.items = []; state.itemsLoaded = false;
        if (unsubMonth) { unsubMonth(); }
        unsubMonth = App.watchDoc(ledgerRef(mk), function (d) { state.items = (d && d.items) || []; state.itemsLoaded = true; drawAll(); });
        drawAll();
      }
      prev.addEventListener("click", function () { setMonth(shiftMonth(state.mk, -1)); });
      next.addEventListener("click", function () { setMonth(shiftMonth(state.mk, 1)); });
      thisM.addEventListener("click", function () { state.sel = today; setMonth(today.slice(0, 7)); });

      setType("지출"); drawFilters();
      App.watchDoc(settingsRef(), function (d) { state.settings = Object.assign({ fixed: [], budget: 0 }, d || {}); state.settingsLoaded = true; drawAll(); });
      App.watchQuery(inboxRef, function (docs) { state.inbox = docs; drawInbox(); });
      setMonth(state.mk);
    }
  });

  /* =========================================================
     개인 — 월별 리포트 (꺾은선: 월별 지출 · 수입)
     ========================================================= */
  var SVGNS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) { n.textContent = text; }
    return n;
  }
  function niceMax(v) {
    if (v <= 0) { return 100000; }
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    var steps = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];  /* each ÷4 gives round gridlines */
    for (var i = 0; i < steps.length; i++) { if (f <= steps[i]) { return steps[i] * p; } }
    return 10 * p;
  }
  function monthLabel(mk, withYear) { var p = mk.split("-"); return (withYear ? p[0].slice(2) + "." : "") + Number(p[1]) + "월"; }

  App.page({
    id: "personal-budget-report", title: "월별 리포트",
    /* reached from the tabs beside the 가계부 title, not from the menu bar */
    navHidden: true, navParent: "personal-budget",
    render: function (view) {
      headTabs("personal-budget-report");
      var cur = monthKey(new Date());
      var SERIES = [
        { key: "exp", label: "지출", cls: "exp" },
        { key: "inc", label: "수입", cls: "inc" }
      ];
      var state = { range: H.safeGet("hds_bud_range") || "12", data: {}, show: { exp: true, inc: true }, hover: null };

      var filters = el("div", "archive-filters bud-rep-filters");
      var tiles = el("div", "tiles bud-tiles");
      var card = ui.card(view, { tab: "Monthly", tone: "t-1", title: "월별 지출 추이" });
      var legend = el("div", "bud-legend");
      var chartWrap = el("div", "bud-chart");
      var tip = el("div", "bud-tip"); tip.hidden = true;
      chartWrap.appendChild(tip);
      card.body.appendChild(legend); card.body.appendChild(chartWrap);
      var tCard = ui.card(view, { tab: "Table", tone: "t-3", title: "월별 합계" });
      var tWrap = el("div", "table-wrap"); tCard.body.appendChild(tWrap);
      tCard.body.appendChild(el("p", "hint", "월을 누르면 그 달의 가계부로 이동해요."));
      view.insertBefore(tiles, card.el); view.insertBefore(filters, tiles);

      function months() {
        var n = state.range === "year" ? Number(cur.slice(5)) : Number(state.range), out = [];
        for (var i = n - 1; i >= 0; i--) { out.push(shiftMonth(cur, -i)); }
        return out;
      }
      function rows() {
        return months().map(function (mk) {
          var items = state.data[mk] || [], t = totals(items);
          return { mk: mk, exp: t.exp, inc: t.inc, fixed: t.fixed, loaded: state.data[mk] !== undefined };
        });
      }
      function drawFilters() {
        H.clear(filters);
        [["6", "최근 6개월"], ["12", "최근 12개월"], ["year", "올해"]].forEach(function (r) {
          var b = el("button", "chip" + (state.range === r[0] ? " active" : ""), r[1]); b.type = "button";
          b.addEventListener("click", function () { state.range = r[0]; H.safeSet("hds_bud_range", r[0]); watchAll(); drawAll(); });
          filters.appendChild(b);
        });
      }
      function tile(label, value, sub) {
        var t = el("div", "tile"); t.appendChild(el("div", "tile-label", label)); t.appendChild(el("div", "tile-value", value)); t.appendChild(el("div", "tile-sub", sub || ""));
        return t;
      }
      function drawTiles(rs) {
        H.clear(tiles);
        var withData = rs.filter(function (r) { return r.exp || r.inc; });
        var totalExp = rs.reduce(function (s, r) { return s + r.exp; }, 0);
        var totalInc = rs.reduce(function (s, r) { return s + r.inc; }, 0);
        var maxR = rs.reduce(function (m, r) { return !m || r.exp > m.exp ? r : m; }, null);
        var last = rs[rs.length - 1], prevR = rs[rs.length - 2];
        tiles.appendChild(tile("기간 총 지출", won(totalExp), rs.length + "개월 · 수입 " + won(totalInc)));
        tiles.appendChild(tile("월평균 지출", withData.length ? won(totalExp / withData.length) : "—", withData.length ? "기록 있는 " + withData.length + "개월 기준" : "아직 기록이 없어요"));
        tiles.appendChild(tile("가장 많이 쓴 달", maxR && maxR.exp ? monthLabel(maxR.mk, true) : "—", maxR && maxR.exp ? won(maxR.exp) : ""));
        var diff = last && prevR ? last.exp - prevR.exp : 0;
        tiles.appendChild(tile("이번 달 vs 지난달", prevR && prevR.exp ? (diff > 0 ? "+" : diff < 0 ? "−" : "") + won(Math.abs(diff)) : "—", prevR && prevR.exp ? (diff > 0 ? Math.round(diff / prevR.exp * 100) + "% 더 썼어요" : diff < 0 ? Math.round(-diff / prevR.exp * 100) + "% 덜 썼어요" : "지난달과 같아요") : "지난달 기록이 없어요"));
        var net = totalInc - totalExp;
        tiles.appendChild(tile("기간 잔액", (net < 0 ? "−" : "") + won(Math.abs(net)), "수입 − 지출"));
        tiles.appendChild(tile("평균 고정지출", withData.length ? won(rs.reduce(function (s, r) { return s + r.fixed; }, 0) / withData.length) : "—", "체크해 반영한 고정지출 기준"));
      }
      function drawLegend() {
        H.clear(legend);
        SERIES.forEach(function (s) {
          var b = el("button", "bud-legend-item " + s.cls + (state.show[s.key] ? " on" : "")); b.type = "button";
          b.setAttribute("aria-pressed", state.show[s.key] ? "true" : "false");
          b.appendChild(el("span", "bud-legend-swatch")); b.appendChild(document.createTextNode(s.label));
          b.addEventListener("click", function () {
            var others = SERIES.filter(function (x) { return x.key !== s.key && state.show[x.key]; });
            if (state.show[s.key] && !others.length) { return; }  /* keep at least one line */
            state.show[s.key] = !state.show[s.key]; drawAll();
          });
          legend.appendChild(b);
        });
      }
      function drawChart(rs) {
        Array.prototype.slice.call(chartWrap.querySelectorAll("svg")).forEach(function (n) { n.remove(); });
        /* drawn at the real width so dots and labels are never stretched */
        var W = Math.max(300, Math.round(chartWrap.clientWidth || 900)), narrow = W < 560;
        var Hh = narrow ? 240 : 320, L = narrow ? 48 : 64, R = narrow ? 16 : 56, T = 16, B = 34;
        var shown = SERIES.filter(function (s) { return state.show[s.key]; });
        var max = niceMax(Math.max.apply(null, [0].concat([].concat.apply([], shown.map(function (s) { return rs.map(function (r) { return r[s.key]; }); })))));
        var n = rs.length, pw = W - L - R, ph = Hh - T - B;
        function x(i) { return L + (n === 1 ? pw / 2 : i * pw / (n - 1)); }
        function y(v) { return T + ph - v / max * ph; }
        var root = svg("svg", { viewBox: "0 0 " + W + " " + Hh, width: W, height: Hh, role: "img", "aria-label": "월별 지출 · 수입 꺾은선 그래프" });
        var g = svg("g", { class: "bud-grid" });
        for (var k = 0; k <= 4; k++) {
          var v = max * k / 4, yy = y(v);
          g.appendChild(svg("line", { x1: L, x2: W - R, y1: yy, y2: yy, class: k === 0 ? "base" : "" }));
          g.appendChild(svg("text", { x: L - 8, y: yy + 4, "text-anchor": "end", class: "bud-axis" }, v >= 10000 ? (v / 10000).toLocaleString("ko-KR") + "만" : Math.round(v).toLocaleString("ko-KR")));
        }
        root.appendChild(g);
        var step = narrow && n > 7 ? 2 : 1;
        rs.forEach(function (r, i) {
          var yearTurn = i === 0 || r.mk.slice(5) === "01";
          if ((n - 1 - i) % step) { return; }  /* thin labels on phones, always keeping the latest month */
          root.appendChild(svg("text", { x: x(i), y: Hh - 10, "text-anchor": "middle", class: "bud-axis" + (r.mk === cur ? " cur" : "") }, monthLabel(r.mk, yearTurn)));
        });
        var cross = svg("line", { y1: T, y2: T + ph, class: "bud-cross", visibility: "hidden" });
        root.appendChild(cross);
        shown.forEach(function (s) {
          var d = rs.map(function (r, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(r[s.key]).toFixed(1); }).join(" ");
          root.appendChild(svg("path", { d: d, class: "bud-line " + s.cls }));
          rs.forEach(function (r, i) {
            root.appendChild(svg("circle", { cx: x(i), cy: y(r[s.key]), r: state.hover === i ? 5.5 : 4, class: "bud-dot-pt " + s.cls }));
          });
          /* direct label at the last point */
          var lr = rs[n - 1];
          if (!narrow) { root.appendChild(svg("text", { x: x(n - 1) + 10, y: y(lr[s.key]) + 4, class: "bud-direct" }, s.label)); }
        });
        /* hover layer: one wide column per month */
        rs.forEach(function (r, i) {
          var half = n === 1 ? pw / 2 : pw / (n - 1) / 2;
          var hit = svg("rect", { x: x(i) - half, y: T, width: half * 2, height: ph, class: "bud-hit" });
          function on() {
            state.hover = i;
            cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
            Array.prototype.forEach.call(root.querySelectorAll(".bud-dot-pt"), function (c) { c.setAttribute("r", Number(c.getAttribute("cx")) === x(i) ? 5.5 : 4); });
            H.clear(tip);
            tip.appendChild(el("div", "bud-tip-title", monthLabel(r.mk, true)));
            shown.forEach(function (s) {
              var line = el("div", "bud-tip-row"); line.appendChild(el("span", "bud-legend-swatch " + s.cls));
              line.appendChild(el("span", "", s.label)); line.appendChild(el("strong", "", won(r[s.key]))); tip.appendChild(line);
            });
            var net = r.inc - r.exp, nl = el("div", "bud-tip-row"); nl.appendChild(el("span", "", "잔액")); nl.appendChild(el("strong", "", (net < 0 ? "−" : "") + won(Math.abs(net)))); tip.appendChild(nl);
            tip.hidden = false;
            var pct = x(i) / W * 100;
            tip.style.left = pct + "%"; tip.classList.toggle("flip", pct > 62);
          }
          hit.addEventListener("mouseenter", on); hit.addEventListener("click", on);
          root.appendChild(hit);
        });
        root.addEventListener("mouseleave", function () { state.hover = null; tip.hidden = true; cross.setAttribute("visibility", "hidden"); });
        chartWrap.insertBefore(root, tip);
      }
      function drawTable(rs) {
        H.clear(tWrap);
        var tb = el("table", "items-table bud-rep-table"), thead = el("thead"), hr = el("tr");
        ["월", "수입", "지출", "고정지출", "변동지출", "잔액", "전월 대비 지출"].forEach(function (h) { hr.appendChild(el("th", "", h)); });
        thead.appendChild(hr); tb.appendChild(thead);
        var body = el("tbody");
        rs.slice().reverse().forEach(function (r) {
          var i = rs.indexOf(r), p = rs[i - 1], tr = el("tr");
          var a = el("a", "", monthLabel(r.mk, true) + (r.mk === cur ? " (이번 달)" : "")); a.href = "#/personal-budget";
          a.addEventListener("click", function () { H.safeSet("hds_bud_goto", r.mk); });
          var td0 = el("td", "narrow"); td0.appendChild(a); tr.appendChild(td0);
          var net = r.inc - r.exp, d = p ? r.exp - p.exp : null;
          [won(r.inc), won(r.exp), won(r.fixed), won(r.exp - r.fixed), (net < 0 ? "−" : "") + won(Math.abs(net)),
            d === null || !p.exp ? "—" : (d > 0 ? "▲ " : d < 0 ? "▼ " : "") + won(Math.abs(d))].forEach(function (v, j) {
            tr.appendChild(el("td", "narrow num" + (j === 5 && d > 0 ? " up" : j === 5 && d < 0 ? " down" : ""), v));
          });
          body.appendChild(tr);
        });
        tb.appendChild(body); tWrap.appendChild(tb);
      }
      function drawAll() { var rs = rows(); drawFilters(); drawTiles(rs); drawLegend(); drawChart(rs); drawTable(rs); }

      /* one live listener per month in range */
      var unsubs = [];
      function watchAll() {
        unsubs.forEach(function (u) { u(); }); unsubs = [];
        months().forEach(function (mk) {
          unsubs.push(App.watchDoc(ledgerRef(mk), function (d) { state.data[mk] = (d && d.items) || []; drawAll(); }));
        });
      }
      watchAll(); drawAll();
      var lastW = 0, rt = null;
      function onResize() {
        clearTimeout(rt);
        rt = setTimeout(function () { var w = chartWrap.clientWidth; if (w && Math.abs(w - lastW) > 8) { lastW = w; drawChart(rows()); } }, 120);
      }
      window.addEventListener("resize", onResize);
      App.unsubs.push(function () { window.removeEventListener("resize", onResize); });
    }
  });

  /* =========================================================
     개인 — 카드 분석 (내 카드 혜택 · 전월실적, personal/cards)
     카드 목록과 혜택은 공개 저장소 코드가 아니라 Firestore에만 둡니다(JSON 불러오기).
     ========================================================= */
  function rateOf(b) { var m = /(\d+(?:\.\d+)?)\s*%/.exec(b.rate || ""); return m ? Number(m[1]) : 0; }
  App.cardsImport = function (data) {
    if (!data || !Array.isArray(data.cards)) { return Promise.reject(new Error("cards 목록이 없어요.")); }
    var cards = data.cards.filter(function (c) { return c && c.name; }).map(function (c) {
      return {
        id: String(c.id || H.uid()), name: String(c.name).slice(0, 60), issuer: String(c.issuer || "").slice(0, 40), type: c.type === "신용" ? "신용" : "체크",
        fee: String(c.fee || "").slice(0, 60), perf: num(c.perf), perfNote: String(c.perfNote || "").slice(0, 300),
        tiers: (Array.isArray(c.tiers) ? c.tiers : []).map(function (t) { return { min: num(t.min), limit: String(t.limit || "").slice(0, 60) }; }),
        benefits: (Array.isArray(c.benefits) ? c.benefits : []).map(function (b) {
          return { area: String(b.area || "").slice(0, 40), what: String(b.what || "").slice(0, 120), rate: String(b.rate || "").slice(0, 40), limit: String(b.limit || "").slice(0, 60) };
        }),
        excludes: String(c.excludes || "").slice(0, 300), note: String(c.note || "").slice(0, 300),
        source: H.safeUrl(c.source || ""), checked: String(c.checked || "").slice(0, 10)
      };
    });
    var doc = { cards: cards };
    if (data.spend && typeof data.spend === "object") { doc.spend = data.spend; }
    return App.setDoc(App.doc("personal/cards"), doc);
  };
  App.page({
    id: "personal-budget-cards", title: "카드 분석",
    navHidden: true, navParent: "personal-budget",
    render: function (view) {
      headTabs("personal-budget-cards");
      var ref = App.doc("personal/cards"), DATA = null;
      var mk = monthKey(new Date()), prev = shiftMonth(mk, -1);
      var sum = ui.card(view, { tab: "Cards", tone: "t-2", title: "이번 달 카드 사용", wide: true });
      var grid = ui.grid(view, true);
      var best = ui.card(view, { tab: "Where", tone: "t-1", title: "어디에 어떤 카드", wide: true });
      var io = ui.card(view, { tab: "Data", tone: "t-3", title: "카드 자료 불러오기 · 백업", wide: true });
      var fileIn = el("input"); fileIn.type = "file"; fileIn.accept = ".json,application/json";
      var expBtn = el("button", "tool-btn", "JSON 내보내기"); expBtn.type = "button";
      var ioRow = el("div", "ias-import"); ioRow.appendChild(fileIn); ioRow.appendChild(expBtn); io.body.appendChild(ioRow);
      fileIn.addEventListener("change", function () {
        var f = fileIn.files[0]; if (!f) { return; }
        f.text().then(function (t) { return App.cardsImport(JSON.parse(t)); }).catch(function (e) { window.alert("불러오지 못했어요: " + e.message); });
        fileIn.value = "";
      });
      expBtn.addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(DATA || { cards: [] }, null, 2)], { type: "application/json" }));
        a.download = "카드분석_자료.json"; a.click();
      });

      var LEDGER = {};
      [prev, mk].forEach(function (m) { App.watchDoc(ledgerRef(m), function (d) { LEDGER[m] = (d && d.items) || []; draw(); }); });
      function ledgerSum(month, c) {
        return (LEDGER[month] || []).reduce(function (a, it) { return a + (it.type !== "수입" && it.method === c.name ? Number(it.amount) || 0 : 0); }, 0);
      }
      /* a typed amount wins; otherwise the ledger entries paid with this card */
      function manualOf(month, id) { var m = ((DATA && DATA.spend) || {})[month]; return m && m[id] != null && m[id] !== "" ? num(m[id]) : null; }
      function spentOf(month, id) {
        var man = manualOf(month, id); if (man !== null && man > 0) { return man; }
        var c = ((DATA && DATA.cards) || []).filter(function (x) { return x.id === id; })[0];
        return c ? ledgerSum(month, c) : 0;
      }
      function saveSpend(month, id, v) { var p = {}; p[month] = {}; p[month][id] = v; App.setDoc(ref, { spend: p }); }
      function perfRow(parent, c, month, label) {
        var v = spentOf(month, c.id), pct = c.perf ? Math.min(100, Math.round(v / c.perf * 100)) : 100;
        var row = el("div", "cardx-perf" + (c.perf && v >= c.perf ? " met" : ""));
        var head = el("div", "cardx-perf-head");
        head.appendChild(el("span", "cardx-perf-label", label));
        var man = manualOf(month, c.id), fromLedger = !(man !== null && man > 0);
        var inp = el("input", "w-sm"); inp.inputMode = "numeric"; inp.value = fromLedger ? "" : man.toLocaleString("ko-KR"); inp.placeholder = fromLedger ? (v ? v.toLocaleString("ko-KR") : "사용액") : "사용액";
        if (fromLedger && v) { head.appendChild(el("span", "cardx-src", "가계부")); }
        inp.setAttribute("aria-label", c.name + " " + label + " 사용액");
        inp.addEventListener("change", function () { saveSpend(month, c.id, num(inp.value)); });
        head.appendChild(inp); head.appendChild(el("span", "", "원"));
        row.appendChild(head);
        row.appendChild(ui.progress(pct, c.perf ? (v >= c.perf ? "실적 달성" : "실적까지 " + won(c.perf - v)) : "실적 조건 없음"));
        parent.appendChild(row);
      }
      function draw() {
        if (!sum) { return; }
        var cards = (DATA && DATA.cards) || [];
        H.clear(sum.body); H.clear(grid); H.clear(best.body);
        if (!cards.length) { sum.body.appendChild(ui.empty("카드 자료가 없어요. 아래에서 JSON 파일을 불러오세요.")); return; }
        var total = 0; cards.forEach(function (c) { total += spentOf(mk, c.id); });
        var st = el("div", "stat-row");
        [["이번 달 합계 ", won(total)], ["카드 ", cards.length + "장"], ["실적 달성 ", cards.filter(function (c) { return !c.perf || spentOf(mk, c.id) >= c.perf; }).length + "장"]].forEach(function (x) {
          var sp = el("span"); sp.appendChild(document.createTextNode(x[0])); sp.appendChild(el("strong", "", x[1])); st.appendChild(sp);
        });
        sum.body.appendChild(st);
        cards.forEach(function (c) {
          var k = ui.card(grid, { tab: c.type, tone: c.type === "신용" ? "t-1" : "t-2", title: c.name });
          k.el.classList.add("cardx");
          k.count.textContent = [c.issuer, c.fee ? "연회비 " + c.fee : ""].filter(Boolean).join(" · ");
          var perf = el("div", "cardx-cond");
          perf.appendChild(el("strong", "", c.perf ? "전월실적 " + won(c.perf) + " 이상" : "전월실적 없음"));
          if (c.perfNote) { perf.appendChild(el("span", "", " · " + c.perfNote)); }
          k.body.appendChild(perf);
          if (c.tiers.length) {
            var tr = el("div", "cardx-tiers");
            c.tiers.forEach(function (t) { tr.appendChild(el("span", "cardx-tier", shortWon(t.min) + "↑ " + t.limit)); });
            k.body.appendChild(tr);
          }
          perfRow(k.body, c, prev, Number(prev.slice(5)) + "월 사용 → 이번 달 혜택");
          perfRow(k.body, c, mk, Number(mk.slice(5)) + "월 사용 → 다음 달 혜택");
          var wrap = el("div", "table-wrap"), t = el("table", "items-table cardx-table"); wrap.appendChild(t);
          var hr = el("tr"); ["영역", "혜택", "한도"].forEach(function (h) { hr.appendChild(el("th", "", h)); }); t.appendChild(hr);
          c.benefits.forEach(function (b) {
            var r = el("tr");
            r.appendChild(el("td", "narrow", b.area));
            r.appendChild(el("td", "", [b.rate, b.what].filter(Boolean).join(" · ")));
            r.appendChild(el("td", "narrow", b.limit || "–"));
            t.appendChild(r);
          });
          k.body.appendChild(wrap);
          if (c.excludes) { k.body.appendChild(el("p", "cardx-small", "실적 제외: " + c.excludes)); }
          if (c.note) { k.body.appendChild(el("p", "cardx-small", c.note)); }
          if (c.source) {
            var src = el("p", "cardx-small"), a = el("a", "", "혜택 출처"); a.href = c.source; a.target = "_blank"; a.rel = "noopener noreferrer";
            src.appendChild(a); if (c.checked) { src.appendChild(document.createTextNode(" · " + c.checked + " 확인")); }
            k.body.appendChild(src);
          }
        });
        /* best card per area: highest % first */
        var areas = {};
        cards.forEach(function (c) { c.benefits.forEach(function (b) { if (b.area) { (areas[b.area] = areas[b.area] || []).push({ c: c, b: b }); } }); });
        var wrap2 = el("div", "table-wrap"), t2 = el("table", "items-table cardx-table"); wrap2.appendChild(t2);
        var h2 = el("tr"); ["영역", "추천 카드", "혜택 비교"].forEach(function (h) { h2.appendChild(el("th", "", h)); }); t2.appendChild(h2);
        Object.keys(areas).sort(function (a, b) { return a.localeCompare(b, "ko"); }).forEach(function (area) {
          var list = areas[area].sort(function (x, y) { return rateOf(y.b) - rateOf(x.b); });
          var r = el("tr");
          r.appendChild(el("td", "narrow", area));
          r.appendChild(el("td", "narrow", list[0].c.name));
          r.appendChild(el("td", "", list.map(function (x) { return x.c.name + " " + x.b.rate; }).join(" / ")));
          t2.appendChild(r);
        });
        best.body.appendChild(wrap2);
      }
      App.watchDoc(ref, function (d) { DATA = d; draw(); });
    }
  });
})(window.App);
