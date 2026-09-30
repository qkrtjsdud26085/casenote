/* Hello dear Sunny — 박사 › 논문 추천 (OpenAlex) */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;
  var R = function (name) { return App.doc("research/" + name); };

  var CHECK_FIELDS = [
    { key: "text", label: "항목", type: "text", title: true, required: true, maxLength: 120 },
    { key: "due", label: "목표일", type: "date" },
    { key: "note", label: "메모", type: "text", maxLength: 160 }
  ];
  var PSTAT = ["읽을 예정", "읽는 중", "읽음"];

  /* =========================================================
     오늘의 논문 추천 (OpenAlex)
     ========================================================= */
  App.page({
    id: "thesis-recommend", title: "오늘의 논문 추천",
    desc: "관심 키워드로 최근 5개년 논문 5편을 매일 골라 드려요. 무료로 열리는 원문(PDF 우선)만 기본으로 추천합니다.",
    render: function (view) { renderRecommend(view); }
  });

  function renderRecommend(view) {
    var recoRef = R("reco"), papersRef = R("papers");
    var RECO = { interests: [], includePaywalled: true, proxy: "", seen: [], dismissed: [], daily: null };
    var PAPERS = [];
    var busy = false, msg = "", triedKey = "";
    var SUGGESTIONS = ["범죄심리학", "forensic psychology", "psychopathy", "recidivism risk assessment", "criminal profiling", "aggression", "empathy", "offender rehabilitation"];
    var yearFrom = new Date().getFullYear() - 4;
    var YU_PROXY = "https://libproxy.yu.ac.kr/_Lib_Proxy_Url/", MIN_IMPACT = 3, RECO_V = 2;

    var c = ui.card(view, { tab: "Daily", tone: "t-2", title: "오늘의 논문 추천" });
    c.count.textContent = H.todayStr().slice(5).replace("-", "/");
    var statusEl = el("p", "hint");
    var chipsEl = el("div", "reco-interests");
    var form = el("form", "quick-add");
    var input = el("input"); input.placeholder = "관심 키워드 (한국어·영어 모두 가능, 예: psychopathy)"; input.maxLength = 60; input.required = true;
    var addBtn = el("button", "btn", "추가"); addBtn.type = "submit";
    form.appendChild(input); form.appendChild(addBtn);
    var sugEl = el("div", "reco-suggest");
    var det = el("details", "reco-settings");
    det.appendChild(el("summary", "", "열람 설정 (무료 논문 · 영남대 로그인)"));
    var pwLabel = el("label"); var pw = el("input"); pw.type = "checkbox"; pwLabel.appendChild(pw);
    pwLabel.appendChild(document.createTextNode(" 영남대 로그인으로 볼 수 있는 논문도 포함"));
    var proxyEl = el("input"); proxyEl.type = "url"; proxyEl.placeholder = YU_PROXY; proxyEl.maxLength = 300;
    var keyEl = el("input"); keyEl.type = "password"; keyEl.placeholder = "OpenAlex API 키"; keyEl.maxLength = 80; keyEl.autocomplete = "off";
    det.appendChild(pwLabel); det.appendChild(proxyEl); det.appendChild(keyEl);
    var refresh = el("button", "tool-btn", "새로 추천받기"); refresh.type = "button";
    var listEl = el("div", "reco-list");
    [statusEl, chipsEl, form, sugEl, det, refresh, listEl].forEach(function (n) { c.body.appendChild(n); });
    refresh.style.marginBottom = "12px";

    function scholarUrl(q) { return "https://scholar.google.com/scholar?q=" + encodeURIComponent(q) + "&as_ylo=" + yearFrom; }
    function rissUrl(q) { return "https://www.riss.kr/search/Search.do?queryText=&query=" + encodeURIComponent(q); }
    function save(patch) {
      RECO = Object.assign({}, RECO, patch);
      render();
      return recoRef.set({
        interests: RECO.interests, includePaywalled: !!RECO.includePaywalled, proxy: RECO.proxy || "", apiKey: RECO.apiKey || "",
        seen: RECO.seen || [], dismissed: RECO.dismissed || [], daily: RECO.daily || null, updatedAt: new Date().toISOString()
      }, { merge: true }).catch(function (err) { window.alert("저장 실패: " + err.message); });
    }
    function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function rng(seed) {
      return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function shuffled(list, rand) {
      var a = list.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    function abstractFrom(inv) {
      if (!inv) { return ""; }
      var words = [];
      Object.keys(inv).forEach(function (w) { inv[w].forEach(function (pos) { words[pos] = w; }); });
      var text = words.filter(Boolean).join(" ");
      return text.length > 300 ? text.slice(0, 300) + "…" : text;
    }
    function toItem(w, kw) {
      var loc = w.primary_location || {};
      var oa = !!(w.open_access && w.open_access.is_oa);
      var best = w.best_oa_location || {};
      var pdf = oa ? H.safeUrl(best.pdf_url || "") : "";
      var url = H.safeUrl(pdf || (oa && w.open_access.oa_url) || best.landing_page_url || loc.landing_page_url || w.doi || "");
      var auth = w.authorships || [];
      var names = auth.slice(0, 3).map(function (a) { return a.author && a.author.display_name; }).filter(Boolean);
      return {
        id: (w.id || "").replace("https://openalex.org/", ""), title: w.display_name || "", year: w.publication_year || "",
        authors: names.join(", ") + (auth.length > 3 ? " 외" : ""), journal: (loc.source && loc.source.display_name) || "",
        oa: oa, pdf: pdf, url: url, abs: abstractFrom(w.abstract_inverted_index), kw: kw,
        src: ((loc.source && loc.source.id) || "").replace("https://openalex.org/", ""), impact: null
      };
    }
    function interleave(list, rand) {
      var groups = {};
      shuffled(list, rand).forEach(function (it) { (groups[it.kw] = groups[it.kw] || []).push(it); });
      var keys = Object.keys(groups), out = [], more = true;
      while (more) { more = false; keys.forEach(function (k) { var x = groups[k].shift(); if (x) { out.push(x); more = true; } }); }
      return out;
    }
    /* OpenAlex allows only a few requests at once: go one by one, and wait then retry on 429 */
    function sleepMs(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    async function getJson(url) {
      var key = (RECO.apiKey || "").trim();
      if (key) { url += "&api_key=" + encodeURIComponent(key); }
      for (var t = 0; t < 3; t++) {
        var r = await fetch(url);
        if (r.ok) { return r.json(); }
        var wait = 0;
        if (r.status === 429) { try { wait = Number((await r.json()).retryAfter) || 0; } catch (e) { wait = 0; } }
        if (r.status !== 429 || t === 2 || wait > 20) { throw new Error("HTTP " + r.status + (wait ? " · " + wait + "초 뒤" : "")); }
        await sleepMs(Math.max(wait * 1000, 1500 * Math.pow(2, t)));
      }
    }
    /* 학술지 영향력: OpenAlex 2년 평균 피인용(= 임팩트 팩터 계산 방식과 같은 기준의 공개 지표) */
    async function attachImpact(list) {
      var ids = []; list.forEach(function (it) { if (it.src && ids.indexOf(it.src) === -1) { ids.push(it.src); } });
      var map = {};
      for (var i = 0; i < ids.length; i += 50) {
        var sj = await getJson("https://api.openalex.org/sources?filter=openalex:" + ids.slice(i, i + 50).join("|") + "&per-page=50&select=id,summary_stats");
        (sj.results || []).forEach(function (x) {
          map[(x.id || "").replace("https://openalex.org/", "")] = x.summary_stats && x.summary_stats["2yr_mean_citedness"];
        });
      }
      list.forEach(function (it) { var v = map[it.src]; it.impact = typeof v === "number" ? Math.round(v * 10) / 10 : null; });
      return list.filter(function (it) { return it.impact !== null && it.impact >= MIN_IMPACT; });
    }
    async function buildDaily(n) {
      var kws = RECO.interests.slice(0, 8);
      var select = "id,doi,display_name,publication_year,authorships,primary_location,best_oa_location,open_access,abstract_inverted_index";
      var oaFilter = RECO.includePaywalled ? "" : ",open_access.is_oa:true";
      var responses = [];
      for (var q = 0; q < kws.length; q++) {
        if (q) { await sleepMs(250); }
        responses.push(await getJson("https://api.openalex.org/works?search=" + encodeURIComponent(kws[q]) + "&filter=from_publication_date:" + yearFrom + "-01-01,type:article" + oaFilter + "&per-page=50&select=" + select));
      }
      var dismissed = {}; (RECO.dismissed || []).forEach(function (id) { dismissed[id] = true; });
      var seen = {}; (RECO.seen || []).forEach(function (id) { seen[id] = true; });
      var byId = {}, all = [];
      responses.forEach(function (j, i) {
        (j.results || []).forEach(function (w) {
          var it = toItem(w, kws[i]);
          if (!it.id || !it.title || !it.url || byId[it.id] || dismissed[it.id]) { return; }
          if (PAPERS.some(function (p) { return p.link === it.url || p.title === it.title; })) { return; }
          byId[it.id] = true; all.push(it);
        });
      });
      all = await attachImpact(all);
      var fresh = all.filter(function (it) { return !seen[it.id]; });
      var pool = fresh.length >= 5 ? fresh : all;
      var rand = rng(hashStr(H.todayStr() + "|" + n));
      var oaPool = pool.filter(function (it) { return it.oa; });
      var oaList = interleave(oaPool.filter(function (it) { return it.pdf; }), rand).concat(interleave(oaPool.filter(function (it) { return !it.pdf; }), rand));
      var instList = interleave(pool.filter(function (it) { return !it.oa; }), rand);
      var picked = oaList.slice(0, RECO.includePaywalled ? 3 : 5).concat(RECO.includePaywalled ? instList.slice(0, 2) : []);
      if (picked.length < 5) {
        var rest = oaList.slice(picked.filter(function (x) { return x.oa; }).length).concat(instList.slice(picked.filter(function (x) { return !x.oa; }).length));
        picked = picked.concat(rest.slice(0, 5 - picked.length));
      }
      return picked;
    }
    async function ensureDaily(force) {
      if (busy || !RECO.interests.length) { return; }
      var today = H.todayStr(), d = RECO.daily;
      if (!force && d && d.date === today && d.v === RECO_V) { return; }
      var key = today + "|" + RECO.interests.join(",") + "|" + RECO.includePaywalled;
      if (!force && triedKey === key) { return; }
      triedKey = key; busy = true; msg = "추천 논문을 찾는 중…"; render();
      var n = force && d && d.date === today ? (d.n || 0) + 1 : 0;
      try {
        var items = await buildDaily(n);
        busy = false;
        msg = items.length ? "" : "영향력 " + MIN_IMPACT + " 이상 학술지에서 새 논문을 찾지 못했어요. 키워드를 바꾸거나 넓혀 보세요.";
        var seenIds = (RECO.seen || []).concat(items.map(function (x) { return x.id; })).slice(-300);
        await save({ daily: { date: today, n: n, v: RECO_V, items: items }, seen: seenIds });
      } catch (err) {
        busy = false; msg = /429/.test(err.message) ? "논문 검색 서버(OpenAlex)가 키 없는 검색을 잠시 막고 있어요" + (/초 뒤/.test(err.message) ? " (" + err.message.split("· ")[1] + " 다시 시도)" : "") + ". 열람 설정에 무료 API 키를 넣으면 막히지 않아요." : "추천을 불러오지 못했어요 (" + err.message + "). 잠시 후 '새로 추천받기'를 눌러 주세요."; render();
      }
    }
    function addInterest(raw) {
      var kw = (raw || "").trim();
      if (!kw) { return; }
      if (RECO.interests.length >= 8) { window.alert("관심 키워드는 최대 8개까지 등록할 수 있어요."); return; }
      if (RECO.interests.some(function (x) { return x.toLowerCase() === kw.toLowerCase(); })) { return; }
      save({ interests: RECO.interests.concat([kw]), daily: null });
    }
    function link(a, href, text, title) { var n = el("a", "", text); n.href = href; n.target = "_blank"; n.rel = "noopener noreferrer"; if (title) { n.title = title; } a.appendChild(n); return n; }
    function render() {
      H.clear(chipsEl);
      RECO.interests.forEach(function (kw) {
        var chip = el("span", "interest-chip"); chip.appendChild(el("span", "", kw));
        link(chip, scholarUrl(kw), "GS", "Google Scholar에서 최근 5개년 검색");
        link(chip, rissUrl(kw), "RISS", "RISS 국내 학술논문 검색 (기관 내 무료 필터 가능)");
        var x = el("button", "", "×"); x.type = "button"; x.title = "키워드 삭제";
        x.addEventListener("click", function () { save({ interests: RECO.interests.filter(function (k) { return k !== kw; }), daily: null }); });
        chip.appendChild(x); chipsEl.appendChild(chip);
      });
      if (!RECO.interests.length) { chipsEl.appendChild(el("span", "prog-label", "관심 키워드를 추가하면 매일 5편을 추천해 드려요.")); }
      H.clear(sugEl);
      var rest = SUGGESTIONS.filter(function (s) { return RECO.interests.indexOf(s) === -1; });
      if (rest.length && RECO.interests.length < 8) {
        sugEl.appendChild(el("span", "prog-label", "추천 키워드:"));
        rest.forEach(function (s) { var b = el("button", "chip", "+ " + s); b.type = "button"; b.addEventListener("click", function () { addInterest(s); }); sugEl.appendChild(b); });
      }
      pw.checked = !!RECO.includePaywalled;
      if (document.activeElement !== proxyEl) { proxyEl.value = RECO.proxy || ""; }
      if (document.activeElement !== keyEl) { keyEl.value = RECO.apiKey || ""; }
      statusEl.textContent = "OpenAlex 기준 · 최근 5개년(" + yearFrom + "~" + new Date().getFullYear() + ") · " + (RECO.includePaywalled ? "무료 원문(PDF 우선) + 영남대 로그인 논문" : "무료 공개 원문만 (PDF 우선)") + " · 학술지 영향력 " + MIN_IMPACT + " 이상 · 하루 5편";
      H.clear(listEl);
      var d = RECO.daily, today = H.todayStr(), dismissed = RECO.dismissed || [];
      var items = d && d.date === today ? (d.items || []).filter(function (it) { return dismissed.indexOf(it.id) === -1; }) : [];
      if (!items.length) {
        if (RECO.interests.length) { listEl.appendChild(ui.empty(msg || (busy ? "추천 논문을 찾는 중…" : "오늘 추천할 논문이 없어요."))); }
        return;
      }
      items.forEach(function (it) {
        var li = el("div", "reco-item"), top = el("div", "reco-top");
        top.appendChild(el("span", "reco-badge " + (it.oa ? "free" : "inst"), it.pdf ? "PDF 바로 열림" : (it.oa ? "무료 원문" : "영남대 로그인으로 열람")));
        if (it.impact !== null && it.impact !== undefined) { var ib = el("span", "reco-badge impact", "IF " + it.impact.toFixed(1)); ib.title = "학술지 2년 평균 피인용 (OpenAlex)"; top.appendChild(ib); }
        top.appendChild(el("span", "", [it.year, it.journal].filter(Boolean).join(" · ")));
        top.appendChild(el("span", "", "#" + it.kw));
        li.appendChild(top);
        var title = el("a", "reco-title", it.title); title.href = it.url; title.target = "_blank"; title.rel = "noopener noreferrer"; li.appendChild(title);
        if (it.authors) { li.appendChild(el("div", "reco-authors", it.authors)); }
        if (it.abs) { li.appendChild(el("div", "reco-abs", it.abs)); }
        var links = el("div", "reco-links");
        link(links, scholarUrl(it.title), "Google Scholar");
        var proxy = (RECO.proxy || "").trim() || YU_PROXY;
        if (!it.oa && /^https:\/\//i.test(proxy)) { link(links, proxy + it.url, "영남대 로그인으로 열기"); }
        var saved = PAPERS.some(function (p) { return p.link === it.url || p.title === it.title; });
        var sv = el("button", "", saved ? "저장됨" : "내 문헌함에 저장"); sv.type = "button"; sv.disabled = saved;
        sv.addEventListener("click", function () {
          sv.disabled = true;
          papersRef.get().then(function (snap) {
            var cur = snap.exists ? (snap.data().items || []) : [];
            return papersRef.set({ items: cur.concat([{
              id: H.uid(), category: it.kw.slice(0, 40), title: it.title, meta: [it.authors, it.year].filter(Boolean).join(" · "),
              note: [it.journal, it.abs].filter(Boolean).join(" — ").slice(0, 400), link: it.url, status: PSTAT[0], tags: [it.kw]
            }]), updatedAt: new Date().toISOString() }, { merge: true });
          }).catch(function (err) { window.alert("저장 실패: " + err.message); sv.disabled = false; });
        });
        links.appendChild(sv);
        var skip = el("button", "", "관심 없음"); skip.type = "button";
        skip.addEventListener("click", function () {
          save({ dismissed: (RECO.dismissed || []).concat([it.id]).slice(-500),
            daily: Object.assign({}, RECO.daily, { items: (RECO.daily.items || []).filter(function (x) { return x.id !== it.id; }) }) });
        });
        links.appendChild(skip);
        li.appendChild(links); listEl.appendChild(li);
      });
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); addInterest(input.value); input.value = ""; });
    pw.addEventListener("change", function () { save({ includePaywalled: pw.checked, daily: null }); });
    proxyEl.addEventListener("change", function () {
      var v = proxyEl.value.trim();
      if (v && !/^https:\/\//i.test(v)) { window.alert("프록시 주소는 https:// 로 시작해야 해요."); proxyEl.value = RECO.proxy || ""; return; }
      save({ proxy: v });
    });
    keyEl.addEventListener("change", function () { save({ apiKey: keyEl.value.trim().slice(0, 80) }); });
    refresh.addEventListener("click", function () {
      if (!RECO.interests.length) { window.alert("먼저 관심 키워드를 추가해 주세요."); return; }
      ensureDaily(true);
    });
    render();
    /* 저장한 논문: what [내 문헌함에 저장] collects (research/papers), with 읽기 상태 and notes */
    var sc = ui.card(view, { tab: "Saved", tone: "t-3", title: "저장한 논문", wide: true });
    sc.el.classList.add("reco-saved");
    ui.itemsPanel(sc.body, {
      ref: papersRef, search: true, views: ["cards", "table"], grid: true, filters: ["category", "status"],
      statusKey: "status", titleLink: "link", addLabel: "+ 논문 직접 추가", empty: "위 추천에서 [내 문헌함에 저장]을 누르면 여기에 모여요.",
      fields: [
        { key: "title", label: "제목", type: "text", title: true, required: true, maxLength: 200 },
        { key: "category", label: "분류", type: "text", meta: true, col: true, maxLength: 40, placeholder: "예: psychopathy" },
        { key: "meta", label: "저자 · 연도", type: "text", meta: true, col: true, maxLength: 100 },
        { key: "link", label: "링크 · DOI (선택)", type: "url", col: true, maxLength: 300 },
        { key: "note", label: "요약 · 메모", type: "textarea", col: true, maxLength: 1000 },
        { key: "tags", label: "태그 (쉼표로 구분)", type: "tags", meta: true },
        { key: "status", label: "읽기 상태", type: "select", options: PSTAT, col: true }
      ],
      summary: function (items) {
        var m = {};
        items.forEach(function (it) { var v = it.status || PSTAT[0]; m[v] = (m[v] || 0) + 1; });
        return items.length ? "총 " + items.length + "편 · 읽음 " + (m["읽음"] || 0) + " · 읽는 중 " + (m["읽는 중"] || 0) + " · 읽을 예정 " + (m["읽을 예정"] || 0) : "";
      }
    });

    App.watchDoc(papersRef, function (d) { PAPERS = d && d.items ? d.items : []; render(); });
    App.watchDoc(recoRef, function (d) {
      d = d || {};
      RECO = { interests: d.interests || [], includePaywalled: d.includePaywalled !== false, proxy: d.proxy || "", apiKey: d.apiKey || "", seen: d.seen || [], dismissed: d.dismissed || [], daily: d.daily || null };
      render(); ensureDaily(false);
    });
  }

  App.tpl = { CHECK_FIELDS: CHECK_FIELDS };
})(window.App);
