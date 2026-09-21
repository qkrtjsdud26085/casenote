/* Hello dear Sunny — 박사 학위논문 pages */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el, TSTAT = App.TSTAT;
  var R = function (name) { return App.doc("research/" + name); };

  function ddayInto(node, dateStr) {
    if (!dateStr) { node.textContent = ""; node.className = "dday"; return; }
    var i = H.ddayInfo(dateStr);
    node.textContent = "제출 " + i.text; node.className = "dday " + i.cls;
  }
  function chaptersPct(items) {
    if (!items.length) { return 0; }
    var score = items.reduce(function (s, c) { return s + Math.max(0, TSTAT.indexOf(c.status)); }, 0);
    return Math.round(score / (items.length * (TSTAT.length - 1)) * 100);
  }
  App.chaptersPct = chaptersPct;
  function countBy(items, key, first) {
    var m = {};
    items.forEach(function (it) { var v = it[key] || first; m[v] = (m[v] || 0) + 1; });
    return m;
  }

  /* =========================================================
     1. 개요 · 로드맵
     ========================================================= */
  var ROADMAP = [
    "종합시험(논문제출자격시험) 통과", "외국어(영어) 시험·자격 요건 충족", "연구윤리·생명윤리 교육 이수", "지도교수 확정 · 논문 지도 등록",
    "연구계획서 작성", "연구계획서 발표(심사)", "IRB(연구윤리심의위원회) 신청 · 승인", "자료 수집 완료", "자료 분석 완료",
    "논문 초안 완성 → 지도교수 검토", "심사위원 위촉 · 심사 신청", "예비심사(중간발표)", "본심사 신청서 제출", "본심사 및 공개발표",
    "심사 의견 반영 · 수정 완료", "논문 유사도(표절) 검사", "최종본 제출(인쇄본 · 전자파일)", "학위 수여"
  ].map(function (t) { return { text: t }; });
  var REQUIREMENTS = [
    { text: "수료 학점 이수", note: "학과 규정 확인" }, { text: "등재(후보)지 논문 게재 요건 충족", note: "편수·저자 요건은 학과마다 달라요" },
    { text: "학술대회 발표 요건(해당 시)" }, { text: "연구윤리교육 이수증" }, { text: "논문 지도 학기 등록 · 등록금 납부" },
    { text: "학위청구논문 제출 서류 준비", note: "제출 양식 · 심사료 · 논문 제출 신청서" }
  ];
  var FINAL_CHECK = [
    "표지 · 제출 양식이 학교 지침과 일치", "목차 · 표/그림 번호가 본문과 일치", "본문 인용과 참고문헌 목록 대조(누락 · 중복 없음)",
    "APA 형식 일관성(국문 · 영문)", "국문초록 · 영문초록 내용 일치, 주제어 확인", "표 · 그림 캡션과 출처 표기", "페이지 번호 · 여백 · 글꼴 규정",
    "부록 첨부(설문지 · 동의서 · IRB 승인서)", "유사도 검사 결과 확인", "감사의 글 · 이력서(요구 시)", "최종 PDF 글꼴 깨짐 · 링크 확인", "심사위원 서명본 수령"
  ].map(function (t) { return { text: t }; });
  var CHECK_FIELDS = [
    { key: "text", label: "항목", type: "text", title: true, required: true, maxLength: 120 },
    { key: "due", label: "목표일", type: "date" },
    { key: "note", label: "메모", type: "text", maxLength: 160 }
  ];
  function checklist(parent, name, defaults, hint) {
    return ui.itemsPanel(parent, {
      ref: R(name), fields: CHECK_FIELDS, defaults: defaults, checkKey: "done", dueKey: "due",
      quickFields: ["text", "due"], hint: hint, empty: "항목을 추가해 보세요."
    });
  }

  App.page({
    id: "thesis-overview", title: "학위 로드맵",
    desc: "학회지 논문 요건을 채운 뒤 이어질 학위논문의 큰 그림과 학위 취득 절차를 봅니다. 기본 항목은 일반적인 절차 예시이니 학교 규정에 맞게 고쳐 쓰세요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Thesis", tone: "t-1", title: "논문 기본 정보" });
      var dd = c1.count; dd.className = "dday";
      ui.fieldsPanel(c1.body, {
        ref: R("thesis"),
        fields: [
          { key: "title", label: "국문 제목 (가제)", type: "text", wide: true, maxLength: 200 },
          { key: "deadline", label: "제출 목표일", type: "date" }
        ],
        onData: function (src) { ddayInto(dd, src.deadline); }
      });
      c1.body.appendChild(el("div", "mini-title", "연구 개요"));
      ui.fieldsPanel(c1.body, {
        ref: R("meta"), docKey: "fields",
        fields: [
          { key: "engTitle", label: "영문 제목", type: "text", wide: true, maxLength: 200 },
          { key: "advisor", label: "지도교수", type: "text", maxLength: 60 },
          { key: "method", label: "연구 유형", type: "select", options: ["양적 연구", "질적 연구", "혼합 연구", "기타"] },
          { key: "keywords", label: "핵심 주제어 (쉼표로 구분)", type: "text", wide: true, maxLength: 160 },
          { key: "purpose", label: "한 문장 연구 목적", type: "textarea", rows: 2, placeholder: "본 연구는 ~이 ~에 미치는 영향을 검증하는 데 목적이 있다." },
          { key: "contribution", label: "이 연구의 기여 (무엇이 새로운가)", type: "textarea", rows: 2 }
        ]
      });

      var c2 = ui.card(g, { tab: "Checklist", tone: "t-2", title: "졸업 요건 체크" });
      checklist(c2.body, "requirements", REQUIREMENTS, "학과·대학원 학사 안내에 맞춰 항목을 고치세요. 기본 항목은 예시입니다.");

      var c3 = ui.card(g, { tab: "Roadmap", tone: "t-1", title: "학위 취득 로드맵", wide: true });
      checklist(c3.body, "roadmap", ROADMAP, "일반적인 박사 학위 절차 예시입니다. 학교 규정에 맞게 항목 · 목표일을 수정하세요.");

      var c4 = ui.card(g, { tab: "Final", tone: "t-3", title: "제출 전 최종 점검", wide: true });
      checklist(c4.body, "final", FINAL_CHECK, "인쇄 · 제출 직전에 하나씩 확인하세요.");
    }
  });

  /* =========================================================
     2. 문헌 라이브러리
     ========================================================= */
  var PSTAT = ["읽을 예정", "읽는 중", "읽음"];
  App.PSTAT = PSTAT;
  App.page({
    id: "thesis-library", title: "문헌 라이브러리",
    desc: "읽은 논문과 읽을 논문을 모아 두는 개인 문헌함입니다. 분류 · 읽기 상태로 거르고, '오늘의 논문 추천'에서 저장한 논문도 여기 쌓여요.",
    render: function (view) {
      var c = ui.card(view, { tab: "Library", tone: "t-2", title: "내 문헌함" });
      ui.itemsPanel(c.body, {
        ref: R("papers"), search: true, views: ["cards", "table"], grid: true, filters: ["category", "status"],
        statusKey: "status", titleLink: "link", addLabel: "+ 자료 추가", empty: "등록된 자료가 없습니다. '+ 자료 추가'로 채워 보세요.",
        fields: [
          { key: "title", label: "제목", type: "text", title: true, required: true, maxLength: 200 },
          { key: "category", label: "분류", type: "text", meta: true, col: true, maxLength: 40, placeholder: "예: 프로파일링" },
          { key: "meta", label: "저자 · 연도", type: "text", meta: true, col: true, maxLength: 100 },
          { key: "link", label: "링크 · DOI (선택)", type: "url", col: true, maxLength: 300 },
          { key: "note", label: "요약 · 메모", type: "textarea", col: true, maxLength: 1000 },
          { key: "tags", label: "태그 (쉼표로 구분)", type: "tags", meta: true },
          { key: "status", label: "읽기 상태", type: "select", options: PSTAT, col: true }
        ],
        summary: function (items) {
          var m = countBy(items, "status", PSTAT[0]);
          return items.length ? "총 " + items.length + "편 · 읽음 " + (m["읽음"] || 0) + " · 읽는 중 " + (m["읽는 중"] || 0) + " · 읽을 예정 " + (m["읽을 예정"] || 0) : "";
        }
      });
    }
  });

  /* =========================================================
     3. 오늘의 논문 추천 (OpenAlex)
     ========================================================= */
  App.page({
    id: "thesis-recommend", title: "오늘의 논문 추천",
    desc: "관심 키워드로 최근 5개년 논문 5편을 매일 골라 드려요. 무료로 열리는 원문(PDF 우선)만 기본으로 추천합니다.",
    render: function (view) { renderRecommend(view); }
  });

  function renderRecommend(view) {
    var recoRef = R("reco"), papersRef = R("papers");
    var RECO = { interests: [], includePaywalled: false, proxy: "", seen: [], dismissed: [], daily: null };
    var PAPERS = [];
    var busy = false, msg = "", triedKey = "";
    var SUGGESTIONS = ["범죄심리학", "forensic psychology", "psychopathy", "recidivism risk assessment", "criminal profiling", "aggression", "empathy", "offender rehabilitation"];
    var yearFrom = new Date().getFullYear() - 4;

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
    pwLabel.appendChild(document.createTextNode(" 학교 로그인이 필요한 논문도 일부 포함"));
    var proxyEl = el("input"); proxyEl.type = "url"; proxyEl.placeholder = "학교 도서관 프록시 주소 (선택) 예: https://…/login?url="; proxyEl.maxLength = 300;
    det.appendChild(pwLabel); det.appendChild(proxyEl);
    det.appendChild(el("p", "hint", "프록시 주소를 넣으면 유료 논문에 '학교 로그인으로 열기' 링크가 생겨요. 영남대 도서관 프록시 주소는 도서관 안내 페이지에서 확인하세요. 비워두면 논문 페이지가 그대로 열려요."));
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
        interests: RECO.interests, includePaywalled: !!RECO.includePaywalled, proxy: RECO.proxy || "",
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
        oa: oa, pdf: pdf, url: url, abs: abstractFrom(w.abstract_inverted_index), kw: kw
      };
    }
    function interleave(list, rand) {
      var groups = {};
      shuffled(list, rand).forEach(function (it) { (groups[it.kw] = groups[it.kw] || []).push(it); });
      var keys = Object.keys(groups), out = [], more = true;
      while (more) { more = false; keys.forEach(function (k) { var x = groups[k].shift(); if (x) { out.push(x); more = true; } }); }
      return out;
    }
    async function buildDaily(n) {
      var kws = RECO.interests.slice(0, 8);
      var select = "id,doi,display_name,publication_year,authorships,primary_location,best_oa_location,open_access,abstract_inverted_index";
      var oaFilter = RECO.includePaywalled ? "" : ",open_access.is_oa:true";
      var responses = await Promise.all(kws.map(function (kw) {
        var url = "https://api.openalex.org/works?search=" + encodeURIComponent(kw) + "&filter=from_publication_date:" + yearFrom + "-01-01,type:article" + oaFilter + "&per-page=30&select=" + select;
        return fetch(url).then(function (r) { if (!r.ok) { throw new Error("HTTP " + r.status); } return r.json(); });
      }));
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
      if (!force && d && d.date === today) { return; }
      var key = today + "|" + RECO.interests.join(",") + "|" + RECO.includePaywalled;
      if (!force && triedKey === key) { return; }
      triedKey = key; busy = true; msg = "추천 논문을 찾는 중…"; render();
      var n = force && d && d.date === today ? (d.n || 0) + 1 : 0;
      try {
        var items = await buildDaily(n);
        busy = false;
        msg = items.length ? "" : "조건에 맞는 새 논문이 없어요. 키워드를 바꾸거나 '학교 로그인 논문 포함'을 켜 보세요.";
        var seenIds = (RECO.seen || []).concat(items.map(function (x) { return x.id; })).slice(-300);
        await save({ daily: { date: today, n: n, items: items }, seen: seenIds });
      } catch (err) {
        busy = false; msg = "추천을 불러오지 못했어요 (" + err.message + "). 잠시 후 '새로 추천받기'를 눌러 주세요."; render();
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
      statusEl.textContent = "OpenAlex 기준 · 최근 5개년(" + yearFrom + "~" + new Date().getFullYear() + ") · " + (RECO.includePaywalled ? "무료 원문(PDF 우선) + 학교 로그인 논문" : "무료 공개 원문만 (PDF 우선)") + " · 하루 5편";
      H.clear(listEl);
      var d = RECO.daily, today = H.todayStr(), dismissed = RECO.dismissed || [];
      var items = d && d.date === today ? (d.items || []).filter(function (it) { return dismissed.indexOf(it.id) === -1; }) : [];
      if (!items.length) {
        if (RECO.interests.length) { listEl.appendChild(ui.empty(msg || (busy ? "추천 논문을 찾는 중…" : "오늘 추천할 논문이 없어요."))); }
        return;
      }
      items.forEach(function (it) {
        var li = el("div", "reco-item"), top = el("div", "reco-top");
        top.appendChild(el("span", "reco-badge " + (it.oa ? "free" : "inst"), it.pdf ? "PDF 바로 열림" : (it.oa ? "무료 원문" : "학교 로그인 필요할 수 있음")));
        top.appendChild(el("span", "", [it.year, it.journal].filter(Boolean).join(" · ")));
        top.appendChild(el("span", "", "#" + it.kw));
        li.appendChild(top);
        var title = el("a", "reco-title", it.title); title.href = it.url; title.target = "_blank"; title.rel = "noopener noreferrer"; li.appendChild(title);
        if (it.authors) { li.appendChild(el("div", "reco-authors", it.authors)); }
        if (it.abs) { li.appendChild(el("div", "reco-abs", it.abs)); }
        var links = el("div", "reco-links");
        link(links, scholarUrl(it.title), "Google Scholar");
        var proxy = (RECO.proxy || "").trim();
        if (!it.oa && /^https:\/\//i.test(proxy)) { link(links, proxy + it.url, "학교 로그인으로 열기"); }
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
    refresh.addEventListener("click", function () {
      if (!RECO.interests.length) { window.alert("먼저 관심 키워드를 추가해 주세요."); return; }
      ensureDaily(true);
    });
    render();
    App.watchDoc(papersRef, function (d) { PAPERS = d && d.items ? d.items : []; render(); });
    App.watchDoc(recoRef, function (d) {
      d = d || {};
      RECO = { interests: d.interests || [], includePaywalled: !!d.includePaywalled, proxy: d.proxy || "", seen: d.seen || [], dismissed: d.dismissed || [], daily: d.daily || null };
      render(); ensureDaily(false);
    });
  }

  /* =========================================================
     4. 문헌 노트
     ========================================================= */
  App.page({
    id: "thesis-notes", title: "문헌 노트",
    desc: "논문을 읽고 핵심을 구조화해 기록합니다. '표'로 전환하면 문헌 비교 매트릭스가 되어 문헌고찰을 쓸 때 바로 쓸 수 있어요.",
    render: function (view) {
      var c = ui.card(view, { tab: "Notes", tone: "t-1", title: "문헌 리뷰 매트릭스" });
      ui.itemsPanel(c.body, {
        ref: R("notes"), search: true, views: ["cards", "table"], statusKey: "state", timestamp: true, filters: ["state"],
        addLabel: "+ 문헌 노트 추가", empty: "아직 노트가 없습니다. 논문 한 편을 읽고 핵심을 정리해 보세요.",
        hint: "한 편당 '목적 → 방법 → 결과 → 한계 → 내 연구와의 연결'만 채워도 문헌고찰의 뼈대가 됩니다.",
        fields: [
          { key: "cite", label: "서지 (저자, 연도, 제목)", type: "text", title: true, required: true, wide: true, col: true, maxLength: 300 },
          { key: "purpose", label: "연구 목적 · 문제", type: "textarea", col: true },
          { key: "theory", label: "이론 · 핵심 개념", type: "textarea" },
          { key: "method", label: "방법 (표본 · 측정 · 분석)", type: "textarea", col: true },
          { key: "findings", label: "주요 결과", type: "textarea", col: true },
          { key: "limits", label: "한계 · 비판", type: "textarea", col: true },
          { key: "relevance", label: "내 연구와의 연결", type: "textarea", col: true },
          { key: "quotes", label: "인용할 문장 (쪽수)", type: "textarea" },
          { key: "tags", label: "태그 (쉼표로 구분)", type: "tags", meta: true },
          { key: "state", label: "정리 상태", type: "select", options: ["읽는 중", "정리 완료", "재검토 필요"] }
        ],
        summary: function (items) { return items.length ? "노트 " + items.length + "편 · 정리 완료 " + items.filter(function (x) { return x.state === "정리 완료"; }).length : ""; }
      });
    }
  });

  /* =========================================================
     5. 개념 · 척도 사전
     ========================================================= */
  var CONCEPT_EXAMPLES = [
    { term: "사이코패시 (Psychopathy)", category: "개념", definition: "정서적·대인관계적 특성(냉담함, 피상적 매력, 공감 결여)과 충동적·반사회적 생활양식이 결합된 성격 구성개념.", measures: "PCL-R (Hare, 2003), PPI-R (Lilienfeld & Widows, 2005)", refs: "Hare (2003) 매뉴얼 등 — 원문 확인 후 보완", memo: "예시 항목 — 원문을 확인해 수정하세요" },
    { term: "반응적 · 주도적 공격성", category: "개념", definition: "위협·좌절에 대한 충동적 방어 반응(반응적)과 목적을 위한 계획적 공격(주도적)의 구분.", measures: "RPQ (Raine et al., 2006)", refs: "Raine et al. (2006)", memo: "예시 항목 — 원문을 확인해 수정하세요" },
    { term: "공감 (Empathy)", category: "개념", definition: "타인의 정서를 이해하는 인지적 공감과 함께 느끼는 정서적 공감으로 구분되는 다차원 개념.", measures: "IRI (Davis, 1980), BES (Jolliffe & Farrington, 2006)", refs: "Davis (1980)", memo: "예시 항목 — 원문을 확인해 수정하세요" },
    { term: "재범 위험성 평가", category: "척도", definition: "정적·동적 위험요인을 구조화해 재범 가능성을 평가하는 접근(구조화된 전문가 판단, 통계적 평가 등).", measures: "HCR-20 V3, Static-99R, LSI-R 등", refs: "각 도구 매뉴얼", memo: "예시 항목 — 원문을 확인해 수정하세요" },
    { term: "충동성 (Impulsivity)", category: "개념", definition: "결과를 충분히 고려하지 않고 행동하는 경향. 인지적·운동적·무계획성 요인으로 구분되기도 함.", measures: "BIS-11 (Patton, Stanford, & Barratt, 1995)", refs: "Patton et al. (1995)", memo: "예시 항목 — 원문을 확인해 수정하세요" },
    { term: "다크 트라이어드 (Dark Triad)", category: "이론", definition: "마키아벨리즘 · 자기애 · 사이코패시로 구성된 어두운 성격 특성의 묶음.", measures: "SD3 (Jones & Paulhus, 2014)", refs: "Paulhus & Williams (2002)", memo: "예시 항목 — 원문을 확인해 수정하세요" }
  ];
  App.page({
    id: "thesis-concepts", title: "개념 · 척도 사전",
    desc: "논문에 쓰는 핵심 개념의 정의와 측정도구, 근거 문헌을 한곳에 모아 두는 나만의 용어집입니다.",
    render: function (view) {
      var c = ui.card(view, { tab: "Glossary", tone: "t-3", title: "개념 · 척도" });
      ui.itemsPanel(c.body, {
        ref: R("concepts"), search: true, views: ["cards", "table"], filters: ["category"], grid: true,
        addLabel: "+ 개념 추가", empty: "아직 항목이 없습니다. 아래 '기본 개념 예시 불러오기'로 시작할 수도 있어요.",
        templates: [{ label: "기본 개념 예시 불러오기", items: CONCEPT_EXAMPLES, mode: "append" }],
        hint: "예시 항목은 일반적으로 알려진 개념·도구를 간단히 적은 것이라, 인용 전에 반드시 원문을 확인하고 고쳐 쓰세요.",
        fields: [
          { key: "term", label: "용어", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "category", label: "분류", type: "select", options: ["개념", "척도", "이론", "통계 용어"], meta: true, col: true },
          { key: "definition", label: "정의", type: "textarea", col: true },
          { key: "measures", label: "측정도구 · 척도", type: "textarea", col: true },
          { key: "refs", label: "핵심 문헌", type: "textarea", col: true },
          { key: "memo", label: "메모", type: "textarea" }
        ]
      });
    }
  });

  /* =========================================================
     6. 연구문제 · 가설
     ========================================================= */
  App.page({
    id: "thesis-questions", title: "연구문제 · 가설",
    desc: "연구의 뼈대(배경 → 공백 → 목적)를 먼저 잡고, 연구문제와 가설을 표로 관리하며 검증 결과를 기록합니다.",
    render: function (view) {
      var g = ui.grid(view);
      var c1 = ui.card(g, { tab: "Core", tone: "t-1", title: "연구의 뼈대", wide: true });
      ui.fieldsPanel(c1.body, {
        ref: R("design"), docKey: "core",
        fields: [
          { key: "background", label: "연구 배경 · 필요성 (3~5문장)", type: "textarea", rows: 4 },
          { key: "gap", label: "선행연구의 공백 (무엇이 부족한가)", type: "textarea", rows: 4 },
          { key: "purpose", label: "연구 목적", type: "textarea", rows: 3 },
          { key: "framework", label: "이론적 틀 · 연구모형 설명", type: "textarea", rows: 3 }
        ]
      });
      var c2 = ui.card(g, { tab: "Hypotheses", tone: "t-2", title: "연구문제 · 가설", wide: true });
      ui.itemsPanel(c2.body, {
        ref: R("questions"), views: ["cards", "table"], statusKey: "result", search: true,
        statusTones: { "미검증": 0, "지지": 3, "부분 지지": 2, "기각": 1 },
        addLabel: "+ 연구문제·가설 추가", empty: "아직 등록된 연구문제·가설이 없습니다.",
        itemTitle: function (it) { return (it.no ? it.no + ". " : "") + (it.content || ""); },
        sort: function (a, b) { return String(a.no || "").localeCompare(String(b.no || ""), "ko", { numeric: true }); },
        fields: [
          { key: "no", label: "번호", type: "text", col: true, hideInCard: true, maxLength: 12, placeholder: "RQ1 / H1" },
          { key: "type", label: "유형", type: "select", options: ["연구문제", "가설"], meta: true, col: true },
          { key: "content", label: "내용", type: "textarea", title: true, required: true, col: true, placeholder: "예) 사이코패시 성향이 높을수록 주도적 공격성이 높을 것이다." },
          { key: "variables", label: "관련 변인 (독립 → 종속)", type: "text", col: true, maxLength: 160 },
          { key: "analysis", label: "분석 방법", type: "text", col: true, maxLength: 120 },
          { key: "result", label: "검증 결과", type: "select", options: ["미검증", "지지", "부분 지지", "기각"], col: true },
          { key: "memo", label: "메모", type: "textarea" }
        ],
        summary: function (items) {
          var m = countBy(items, "result", "미검증");
          return items.length ? "총 " + items.length + "개 · 지지 " + (m["지지"] || 0) + " · 부분 지지 " + (m["부분 지지"] || 0) + " · 기각 " + (m["기각"] || 0) + " · 미검증 " + (m["미검증"] || 0) : "";
        }
      });
    }
  });

  /* =========================================================
     7. 연구 방법
     ========================================================= */
  App.page({
    id: "thesis-methods", title: "연구 방법",
    desc: "연구 대상 · 절차, 변인 정의, 측정도구를 정리합니다. 본문 '연구 방법' 장의 초안 재료가 돼요.",
    render: function (view) {
      var g = ui.grid(view);
      var c1 = ui.card(g, { tab: "Design", tone: "t-1", title: "연구 대상 · 절차", wide: true });
      ui.fieldsPanel(c1.body, {
        ref: R("design"), docKey: "method",
        fields: [
          { key: "population", label: "모집단 · 연구 대상", type: "text", maxLength: 160 },
          { key: "sampling", label: "표집 방법", type: "text", maxLength: 160, placeholder: "예: 편의표집, 눈덩이표집, 층화표집" },
          { key: "targetN", label: "목표 표본 수 · 산출 근거", type: "text", maxLength: 200, placeholder: "예: N = 200 (G*Power, 효과크기 .15, 검정력 .80)" },
          { key: "setting", label: "자료 수집 장소 · 협조 기관", type: "text", maxLength: 200 },
          { key: "criteria", label: "포함 · 제외 기준", type: "textarea", rows: 3 },
          { key: "procedure", label: "자료 수집 절차", type: "textarea", rows: 3 }
        ]
      });
      var c2 = ui.card(g, { tab: "Variables", tone: "t-2", title: "변인 정의", wide: true });
      ui.itemsPanel(c2.body, {
        ref: R("variables"), views: ["table", "cards"], search: true, addLabel: "+ 변인 추가", empty: "아직 변인이 없습니다.",
        fields: [
          { key: "name", label: "변인명", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "role", label: "역할", type: "select", options: ["독립변인", "종속변인", "매개변인", "조절변인", "통제변인", "기타"], col: true },
          { key: "definition", label: "조작적 정의", type: "textarea", col: true },
          { key: "instrument", label: "측정도구", type: "text", col: true, maxLength: 120 },
          { key: "scale", label: "척도 수준", type: "select", options: ["명목", "서열", "등간", "비율"], col: true }
        ]
      });
      var c3 = ui.card(g, { tab: "Instruments", tone: "t-3", title: "측정도구", wide: true });
      ui.itemsPanel(c3.body, {
        ref: R("instruments"), views: ["table", "cards"], search: true, statusKey: "permission", addLabel: "+ 측정도구 추가", empty: "아직 등록된 도구가 없습니다.",
        statusTones: { "확인 필요": 0, "신청함": 1, "허가 받음": 3, "사용 허가 불필요": 3 },
        hint: "상용 검사(예: 임상 평가도구)는 사용 허가 · 구입 여부를 반드시 먼저 확인하세요.",
        fields: [
          { key: "name", label: "도구명", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "items", label: "문항 수", type: "number", col: true },
          { key: "factors", label: "하위요인", type: "text", col: true, maxLength: 160 },
          { key: "alpha", label: "신뢰도 (선행 / 본 연구 α)", type: "text", col: true, maxLength: 80 },
          { key: "source", label: "출처 · 번안", type: "text", maxLength: 200 },
          { key: "permission", label: "사용 허가", type: "select", options: ["확인 필요", "신청함", "허가 받음", "사용 허가 불필요"] },
          { key: "memo", label: "메모", type: "textarea" }
        ]
      });
    }
  });

  /* =========================================================
     8. 연구윤리 · IRB
     ========================================================= */
  var IRB = [
    "IRB 심의 신청서 작성", "연구 설명문 (참여자용)", "연구참여 동의서 (서면 · 온라인)", "개인정보 수집 · 이용 동의",
    "연구 도구(설문지 · 면담 질문지) 최종본 첨부", "자료 익명화 · 보관 · 폐기 계획", "취약군(수용자 · 청소년 등) 추가 보호 방안 검토",
    "협조 기관 공문 · 승인(교정시설, 학교, 기관 등)", "측정도구 사용 허가 확인", "참여자 위험 발생 시 대응 · 상담 기관 안내 준비", "IRB 승인번호 · 승인일 기록"
  ].map(function (t) { return { text: t }; });
  var CONSENT_PHRASES = [
    { label: "연구 목적 안내", text: "이 연구는 ○○에 대한 이해를 높이기 위한 학위논문 연구입니다." },
    { label: "자발적 참여 · 철회", text: "연구 참여는 전적으로 자발적이며, 언제든지 어떠한 불이익 없이 참여를 중단할 수 있습니다." },
    { label: "비밀 보장", text: "수집된 자료는 익명 처리되어 연구 목적으로만 사용되며, 개인을 식별할 수 있는 정보는 공개되지 않습니다." },
    { label: "자료 보관 · 폐기", text: "연구 자료는 ○년간 잠금 장치가 있는 곳(또는 암호화된 저장소)에 보관된 후 폐기됩니다." },
    { label: "민감 정보 안내", text: "범죄 경험 등 민감한 내용이 포함될 수 있으며, 응답하고 싶지 않은 문항은 건너뛰어도 됩니다." },
    { label: "위험 · 이익 · 도움 안내", text: "설문 중 불편함을 느끼시면 즉시 중단하실 수 있으며, 필요한 경우 상담기관(기관명 · 연락처)을 안내해 드립니다." },
    { label: "연락처", text: "연구자: 성명 (이메일 · 전화) / 지도교수: 성명 / 기관 IRB 사무국: 연락처" },
    { label: "IRB 승인 표기", text: "본 연구는 ○○대학교 생명윤리위원회(IRB)의 승인(승인번호: ______, 승인일: ____)을 받아 수행되었습니다." }
  ];
  App.page({
    id: "thesis-ethics", title: "연구윤리 · IRB",
    desc: "IRB 신청 준비물, 동의서 문구, 자료 관리 계획을 정리합니다. 수용자 · 청소년 · 피해자 등 취약군을 다루는 연구라면 특히 꼼꼼히 확인하세요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "IRB", tone: "t-1", title: "IRB 준비 체크리스트" });
      checklist(c1.body, "irb", IRB, "학교 IRB 사무국의 최신 양식 · 제출 서류를 우선하세요.");
      var c2 = ui.card(g, { tab: "Data", tone: "t-2", title: "자료 관리 계획" });
      ui.fieldsPanel(c2.body, {
        ref: R("design"), docKey: "data",
        fields: [
          { key: "storage", label: "저장 위치 · 암호화", type: "text", maxLength: 200, wide: true },
          { key: "anonymize", label: "익명화 방법", type: "textarea", rows: 2 },
          { key: "retention", label: "보관 기간 · 폐기 계획", type: "text", maxLength: 200, wide: true },
          { key: "backup", label: "백업 방식", type: "text", maxLength: 200, wide: true },
          { key: "consent", label: "동의서 보관 방법", type: "text", maxLength: 200, wide: true }
        ]
      });
      var c3 = ui.card(g, { tab: "Template", tone: "t-3", title: "동의서 · 설명문 기본 문구 (복사해서 수정)", wide: true });
      ui.refList(c3.body, CONSENT_PHRASES);
    }
  });

  /* =========================================================
     9. 자료 분석
     ========================================================= */
  var ANALYSIS_CHECK = [
    "결측치 처리 방식 결정 · 기록", "이상치 확인 (원자료와 대조)", "정규성 · 등분산성 가정 검토", "다중공선성(VIF) 확인", "신뢰도(α · ω) 산출",
    "타당도 검토 (EFA · CFA)", "효과크기 · 신뢰구간 함께 보고", "다중비교 보정 여부 결정", "표본 크기 사전 산정 근거 기록", "코드북 · 분석 스크립트 백업 (버전 표기)"
  ].map(function (t) { return { text: t }; });
  var EFFECT = [
    { label: "Cohen's d", text: "작음 .20 · 중간 .50 · 큼 .80" },
    { label: "상관계수 r", text: "작음 .10 · 중간 .30 · 큼 .50" },
    { label: "η² / partial η²", text: "작음 .01 · 중간 .06 · 큼 .14" },
    { label: "f² (회귀)", text: "작음 .02 · 중간 .15 · 큼 .35" },
    { label: "모형 적합도 (관행적 기준)", text: "CFI · TLI ≥ .90 수용 · RMSEA ≤ .08 수용 · SRMR ≤ .08" },
    { label: "모형 적합도 (엄격 기준, Hu & Bentler, 1999)", text: "CFI · TLI ≥ .95 · RMSEA ≤ .06 · SRMR ≤ .08" },
    { label: "신뢰도 참고", text: "Cronbach's α ≥ .70 수용 가능 (연구 목적에 따라 기준 상이)" }
  ];
  App.page({
    id: "thesis-analysis", title: "자료 분석",
    desc: "분석 진행 기록과 점검 목록을 남겨 두면, 나중에 결과 장을 쓸 때 '어떤 파일에서 무엇을 했는지' 바로 찾을 수 있어요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Log", tone: "t-2", title: "분석 로그", wide: true });
      ui.itemsPanel(c1.body, {
        ref: R("analysis"), views: ["table", "cards"], search: true, statusKey: "state", filters: ["kind"],
        addLabel: "+ 분석 기록 추가", empty: "아직 기록이 없습니다. 분석을 돌릴 때마다 한 줄씩 남겨 두세요.",
        statusTones: { "계획": 0, "진행": 1, "완료": 3, "재분석 필요": 2 },
        itemTitle: function (it) { return (it.date ? it.date + " · " : "") + (it.kind || ""); },
        sort: function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); },
        fields: [
          { key: "date", label: "날짜", type: "date", today: true, col: true },
          { key: "kind", label: "분석 유형", type: "select", title: true, col: true,
            options: ["기술통계", "신뢰도 · 타당도", "상관분석", "t검정 · ANOVA", "회귀분석", "매개 · 조절", "SEM · CFA", "질적 코딩", "기타"] },
          { key: "tool", label: "도구", type: "select", col: true, options: ["SPSS", "R", "Mplus", "AMOS", "jamovi", "Python", "NVivo", "기타"] },
          { key: "file", label: "파일 · 스크립트 위치", type: "text", maxLength: 200 },
          { key: "result", label: "결과 요약", type: "textarea", col: true },
          { key: "next", label: "후속 작업", type: "textarea" },
          { key: "state", label: "상태", type: "select", options: ["계획", "진행", "완료", "재분석 필요"], col: true }
        ]
      });
      var c2 = ui.card(g, { tab: "Check", tone: "t-1", title: "분석 점검 체크리스트" });
      checklist(c2.body, "analysischeck", ANALYSIS_CHECK, "분석을 시작하기 전과 결과를 정리하기 전에 한 번씩 확인하세요.");
      var c3 = ui.card(g, { tab: "Ref", tone: "t-3", title: "효과크기 · 기준값 (복사 가능)" });
      ui.refList(c3.body, EFFECT);
    }
  });

  /* =========================================================
     10. 논문 집필
     ========================================================= */
  var QUANT = [
    { name: "국문초록", note: "연구 목적 · 방법 · 주요 결과 · 시사점 요약. 마지막에 주제어 3~5개 (분량은 학교 규정 확인)" },
    { name: "Ⅰ. 서론", note: "연구의 필요성 / 연구 목적 / 연구문제 및 가설 / 용어의 정의" },
    { name: "Ⅱ. 이론적 배경", note: "핵심 개념과 이론 / 선행연구 종합 · 비판 / 변인 간 관계 / 연구모형과 가설 도출" },
    { name: "Ⅲ. 연구 방법", note: "연구 대상 / 측정 도구 / 연구 절차 및 윤리 / 자료 분석 방법" },
    { name: "Ⅳ. 연구 결과", note: "기술통계 · 상관 / 측정 모형(신뢰도 · 타당도) / 가설 검증 / 추가 분석" },
    { name: "Ⅴ. 논의 및 결론", note: "결과 논의 / 이론적 · 실무적 시사점 / 연구의 제한점과 후속 연구 제언" },
    { name: "참고문헌", note: "APA 7판 형식 일관성 · 본문 인용과 대조" },
    { name: "Abstract", note: "영문 초록 — 국문초록과 내용 일치, keywords" },
    { name: "부록", note: "설문지 · 동의서 · IRB 승인서 등" }
  ];
  var QUAL = [
    { name: "국문초록", note: "연구 목적 · 참여자 · 방법 · 핵심 주제 · 시사점" },
    { name: "Ⅰ. 서론", note: "연구 필요성 / 연구 목적 / 연구 질문 / 용어 정의" },
    { name: "Ⅱ. 이론적 배경 및 선행연구", note: "개념적 틀 / 선행연구 검토 / 연구의 위치" },
    { name: "Ⅲ. 연구 방법", note: "연구 참여자 / 자료 수집 / 분석 방법 / 연구자의 위치성 · 연구 윤리 · 엄격성 확보" },
    { name: "Ⅳ. 연구 결과", note: "범주 · 주제별 결과와 참여자 진술 제시" },
    { name: "Ⅴ. 논의 및 결론", note: "결과 논의 / 시사점 / 제한점 · 제언" },
    { name: "참고문헌", note: "APA 7판 형식 일관성" },
    { name: "Abstract", note: "영문 초록" },
    { name: "부록", note: "면담 질문지 · 동의서 · IRB 승인서" }
  ];
  App.page({
    id: "thesis-writing", title: "논문 집필",
    desc: "장별 진행 상태와 분량을 관리하고, 매일 쓴 분량을 기록합니다. 표준 목차 템플릿으로 뼈대를 한 번에 채울 수도 있어요.",
    render: function (view) {
      var g = ui.grid(view, true);
      var c1 = ui.card(g, { tab: "Chapters", tone: "t-1", title: "장 · 절 진행", wide: true });
      ui.itemsPanel(c1.body, {
        ref: R("thesis"), itemsKey: "chapters", views: ["cards", "table"], statusKey: "status", addLabel: "+ 장·절 추가",
        defaults: [{ name: "서론" }, { name: "이론적 배경" }, { name: "연구 방법" }, { name: "연구 결과" }, { name: "논의 및 결론" }, { name: "참고문헌" }],
        templates: [{ label: "양적 연구 표준 목차", items: QUANT }, { label: "질적 연구 표준 목차", items: QUAL }],
        statusTones: { "미착수": 0, "집필중": 1, "초안 완료": 2, "수정중": 1, "완료": 3 },
        hint: "상태 칩을 누르면 미착수 → 집필중 → 초안 완료 → 수정중 → 완료 순으로 바뀝니다.",
        fields: [
          { key: "name", label: "장 · 절", type: "text", title: true, required: true, col: true, maxLength: 80 },
          { key: "status", label: "상태", type: "select", options: TSTAT, col: true },
          { key: "target", label: "목표 분량 (쪽)", type: "number", col: true, hideInCard: true },
          { key: "current", label: "현재 분량 (쪽)", type: "number", col: true, hideInCard: true },
          { key: "note", label: "포함할 내용 · 메모", type: "textarea" }
        ],
        itemExtra: function (it) {
          var t = Number(it.target) || 0;
          if (!t) { return null; }
          var cur = Number(it.current) || 0;
          return ui.progress(Math.min(100, Math.round(cur / t * 100)), cur + " / " + t + "쪽");
        },
        summary: function (items) {
          if (!items.length) { return null; }
          var pct = chaptersPct(items);
          return ui.progress(pct, "전체 진행률 " + pct + "% · 완료 " + items.filter(function (c) { return c.status === "완료"; }).length + "/" + items.length);
        }
      });
      var c2 = ui.card(g, { tab: "Daily", tone: "t-2", title: "논문 집필 기록" });
      c2.body.appendChild(el("p", "hint", "학위논문을 쓴 분량만 기록해요. (창작 글쓰기는 '작가 › 집필 기록')"));
      ui.writingLog(c2.body, { ref: R("log"), goal: 1500, unit: "자" });
      var c3 = ui.card(g, { tab: "Upcoming", tone: "t-3", title: "논문 일정" });
      ui.upcoming(c3.body, "논문", 6);
    }
  });

  /* =========================================================
     11. 지도 · 심사
     ========================================================= */
  App.page({
    id: "thesis-advisor", title: "지도 · 심사",
    desc: "지도교수 면담 기록, 심사위원 정보, 심사 의견 반영 현황을 관리합니다.",
    render: function (view) {
      var g = ui.grid(view);
      var c1 = ui.card(g, { tab: "Meetings", tone: "t-1", title: "지도교수 면담 기록", wide: true });
      ui.itemsPanel(c1.body, {
        ref: R("meetings"), search: true, views: ["cards", "table"], dueKey: "next", addLabel: "+ 면담 기록 추가", empty: "아직 면담 기록이 없습니다.",
        itemTitle: function (it) { return (it.date ? it.date + " · " : "") + (it.topic || "면담"); },
        sort: function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); },
        hint: "면담 직후 5분만 투자해 '피드백'과 '다음까지 할 일'을 적어 두면 큰 도움이 돼요.",
        fields: [
          { key: "date", label: "면담일", type: "date", today: true, col: true },
          { key: "topic", label: "안건", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "discussed", label: "논의 내용", type: "textarea", col: true },
          { key: "feedback", label: "교수 피드백", type: "textarea", col: true },
          { key: "tasks", label: "다음까지 할 일", type: "textarea", col: true },
          { key: "next", label: "다음 면담일", type: "date", col: true }
        ]
      });
      var c2 = ui.card(g, { tab: "Committee", tone: "t-2", title: "심사위원" });
      ui.itemsPanel(c2.body, {
        ref: R("committee"), views: ["cards", "table"], statusKey: "state", addLabel: "+ 심사위원 추가", empty: "아직 등록된 심사위원이 없습니다.",
        statusTones: { "후보": 0, "섭외 중": 1, "확정": 2, "서명 완료": 3 },
        fields: [
          { key: "name", label: "성함", type: "text", title: true, required: true, col: true, maxLength: 60 },
          { key: "role", label: "역할", type: "select", options: ["지도교수", "위원장", "심사위원", "외부위원"], col: true, meta: true },
          { key: "affiliation", label: "소속", type: "text", col: true, maxLength: 100 },
          { key: "field", label: "전공 · 관심 분야", type: "text", maxLength: 120 },
          { key: "email", label: "이메일", type: "text", maxLength: 100 },
          { key: "state", label: "진행 상태", type: "select", options: ["후보", "섭외 중", "확정", "서명 완료"], col: true },
          { key: "memo", label: "메모", type: "textarea" }
        ]
      });
      var c3 = ui.card(g, { tab: "Feedback", tone: "t-3", title: "심사 · 지도 의견 반영 트래커" });
      ui.itemsPanel(c3.body, {
        ref: R("feedback"), views: ["cards", "table"], statusKey: "state", search: true, filters: ["source"], addLabel: "+ 의견 추가", empty: "받은 의견을 적어 두고 반영 여부를 체크하세요.",
        statusTones: { "미반영": 0, "진행 중": 1, "반영 완료": 3 },
        itemTitle: function (it) { return String(it.comment || "").slice(0, 60); },
        summary: function (items) {
          if (!items.length) { return null; }
          var done = items.filter(function (x) { return x.state === "반영 완료"; }).length;
          return "반영 완료 " + done + "/" + items.length;
        },
        fields: [
          { key: "source", label: "출처", type: "select", options: ["지도교수", "연구계획서 심사", "예비심사", "본심사", "투고 심사", "기타"], meta: true, col: true },
          { key: "comment", label: "의견", type: "textarea", title: true, required: true, col: true },
          { key: "plan", label: "대응 · 수정 계획", type: "textarea", col: true },
          { key: "where", label: "반영 위치 (장 · 쪽)", type: "text", maxLength: 80 },
          { key: "state", label: "상태", type: "select", options: ["미반영", "진행 중", "반영 완료"], col: true }
        ]
      });
    }
  });

  /* =========================================================
     12. 투고 · 학회
     ========================================================= */
  App.page({
    id: "thesis-publications", title: "투고 · 학회",
    desc: "학술지 투고 진행 상황, 학회 · 공모 마감, 발표 · 게재 이력을 관리합니다. 졸업 요건의 게재 편수를 확인하는 데에도 쓰세요.",
    render: function (view) {
      var g = ui.grid(view);
      var c1 = ui.card(g, { tab: "Submissions", tone: "t-1", title: "논문 투고 트래커", wide: true });
      ui.itemsPanel(c1.body, {
        ref: R("submissions"), views: ["cards", "table"], statusKey: "state", search: true, filters: ["tier"], addLabel: "+ 투고 추가", empty: "아직 투고 기록이 없습니다.",
        statusTones: { "준비 중": 0, "투고": 1, "심사 중": 1, "수정 요청": 2, "게재 확정": 2, "게재됨": 3, "반려": 0 },
        summary: function (items) {
          if (!items.length) { return null; }
          var pub = items.filter(function (x) { return x.state === "게재 확정" || x.state === "게재됨"; }).length;
          var rev = items.filter(function (x) { return x.state === "투고" || x.state === "심사 중" || x.state === "수정 요청"; }).length;
          return "게재 확정 · 게재 " + pub + "편 · 심사 진행 중 " + rev + "편";
        },
        fields: [
          { key: "title", label: "논문 제목", type: "text", title: true, required: true, col: true, maxLength: 200 },
          { key: "journal", label: "학술지", type: "text", col: true, maxLength: 120 },
          { key: "tier", label: "등재 구분", type: "select", options: ["KCI 등재", "KCI 등재후보", "SSCI", "SCOPUS", "기타"], meta: true, col: true },
          { key: "state", label: "상태", type: "select", options: ["준비 중", "투고", "심사 중", "수정 요청", "게재 확정", "게재됨", "반려"], col: true },
          { key: "submitted", label: "투고일", type: "date", col: true },
          { key: "decision", label: "결과일", type: "date" },
          { key: "memo", label: "메모", type: "textarea" }
        ]
      });
      var c2 = ui.card(g, { tab: "Conferences", tone: "t-2", title: "학회 · 공모 일정" });
      ui.itemsPanel(c2.body, {
        ref: R("conferences"), views: ["cards", "table"], statusKey: "state", dueKey: "eventDate", addLabel: "+ 학회 추가", empty: "관심 있는 학회 일정을 추가해 보세요.",
        sort: function (a, b) { return String(a.eventDate || "9999").localeCompare(String(b.eventDate || "9999")); },
        statusTones: { "관심": 0, "준비 중": 1, "제출": 2, "발표 완료": 3 },
        fields: [
          { key: "name", label: "학회 · 행사명", type: "text", title: true, required: true, col: true, maxLength: 120 },
          { key: "abstractDue", label: "초록 마감", type: "date", col: true },
          { key: "paperDue", label: "원고 마감", type: "date" },
          { key: "eventDate", label: "행사일", type: "date", col: true },
          { key: "role", label: "역할", type: "select", options: ["발표", "포스터", "토론", "참관"], meta: true },
          { key: "state", label: "상태", type: "select", options: ["관심", "준비 중", "제출", "발표 완료"], col: true },
          { key: "memo", label: "메모", type: "textarea" }
        ]
      });
      var c3 = ui.card(g, { tab: "CV", tone: "t-3", title: "발표 · 게재 이력 (CV)" });
      ui.itemsPanel(c3.body, {
        ref: R("cv"), views: ["cards", "table"], search: true, filters: ["kind"], addLabel: "+ 이력 추가", empty: "CV에 넣을 이력을 차곡차곡 쌓아 두세요.",
        sort: function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); },
        actions: [{ label: "복사", run: function (it, btn) { H.copyText([it.coauthors, it.title, it.venue, it.date].filter(Boolean).join(" · "), btn); } }],
        fields: [
          { key: "title", label: "제목", type: "text", title: true, required: true, col: true, maxLength: 200 },
          { key: "kind", label: "구분", type: "select", options: ["학술지 논문", "학회 발표", "포스터", "보고서", "기타"], meta: true, col: true },
          { key: "venue", label: "학술지 · 학회", type: "text", col: true, maxLength: 120 },
          { key: "date", label: "날짜", type: "date", col: true },
          { key: "coauthors", label: "공저자", type: "text", maxLength: 120 }
        ]
      });
    }
  });

  /* =========================================================
     13. 참고 템플릿
     ========================================================= */
  var APA = [
    { label: "국내 학술지 논문", text: "저자1, 저자2 (연도). 논문 제목. 학술지명, 권(호), 시작쪽-끝쪽.\n예) 홍길동, 김철수 (2023). 범죄 피해 경험과 재범 위험성 인식의 관계. 한국○○학회지, 35(2), 101-125." },
    { label: "영문 학술지 논문", text: "Author, A. A., Author, B. B., & Author, C. C. (Year). Title of the article in sentence case. Journal Name in Title Case, volume(issue), pages. https://doi.org/xxxxx" },
    { label: "단행본", text: "Author, A. A. (Year). Title of the book in sentence case (2nd ed.). Publisher." },
    { label: "편저서의 장", text: "Author, A. A. (Year). Title of chapter. In E. E. Editor (Ed.), Title of book (pp. xx–xx). Publisher." },
    { label: "학위논문", text: "홍길동 (2022). 논문 제목 [박사학위논문, ○○대학교 대학원]. 데이터베이스 또는 URL\nAuthor, A. A. (Year). Title of dissertation [Doctoral dissertation, University Name]. Database or URL" },
    { label: "웹페이지 · 보고서", text: "기관명 (연도, 월 일). 자료 제목. 사이트명. URL" },
    { label: "번역서", text: "Author, A. A. (Year). Title (역자 역). Publisher. (Original work published Year)" },
    { label: "본문 인용 — 1인 · 2인", text: "(홍길동, 2023) · 홍길동(2023)은 … · (Hare, 2003)\n(김철수·이영희, 2022) · (Kim & Lee, 2022)" },
    { label: "본문 인용 — 3인 이상", text: "(홍길동 외, 2021) · (Raine et al., 2006)" },
    { label: "직접 인용 · 2차 인용", text: "“인용문” (Author, Year, p. 12) — 40단어 이상은 별도 블록으로 인용\n(Author A, Year, as cited in Author B, Year) — 가능하면 원전을 확인" }
  ];
  var STATS = [
    { label: "t검정", text: "t(48) = 2.31, p = .025, d = 0.65\n집단 A(M = 3.45, SD = 0.82)가 집단 B(M = 3.02, SD = 0.79)보다 유의하게 높았다, t(98) = 2.65, p = .009, d = 0.53." },
    { label: "분산분석(ANOVA)", text: "F(2, 97) = 4.12, p = .019, ηp² = .08" },
    { label: "상관", text: "r(98) = .32, p = .001" },
    { label: "카이제곱", text: "χ²(2, N = 120) = 6.45, p = .040, Cramér's V = .23" },
    { label: "회귀", text: "β = .28, SE = .09, t(97) = 3.11, p = .002, ΔR² = .07" },
    { label: "매개효과 (부트스트랩)", text: "간접효과 = 0.12, SE = 0.05, 95% CI [0.04, 0.23]" },
    { label: "구조방정식 · 확인적 요인분석 적합도", text: "χ²(48) = 82.4, p = .001; CFI = .95, TLI = .94, RMSEA = .06 [90% CI .04, .08], SRMR = .04" },
    { label: "신뢰도", text: "Cronbach's α = .87 / McDonald's ω = .88" },
    { label: "표기 규칙", text: "p < .001 (0 앞자리 생략) · r, β, p는 소수점 앞 0 생략 · 통계 기호는 이탤릭 · 소수 둘째~셋째 자리까지 일관되게" }
  ];
  var SENTENCES = [
    { label: "연구 목적", text: "본 연구는 ~이 ~에 미치는 영향을 검증하고, ~의 매개효과를 확인하는 데 목적이 있다." },
    { label: "필요성", text: "그럼에도 불구하고 국내에서는 ~에 관한 실증 연구가 충분히 이루어지지 않았다." },
    { label: "선행연구 종합", text: "선행연구를 종합하면, ~은 ~와 관련이 있는 것으로 보고되었다(홍길동, 2020; Kim, 2019)." },
    { label: "상반된 결과", text: "반면, Lee(2018)는 ~와의 관련성을 발견하지 못하여 결과가 일관되지 않다." },
    { label: "가설 도출", text: "이상의 논의를 바탕으로 다음과 같은 연구가설을 설정하였다." },
    { label: "결과 서술", text: "분석 결과, ~은 ~에 유의한 정적 영향을 미치는 것으로 나타났다(β = .28, p = .002)." },
    { label: "논의 — 일치", text: "이러한 결과는 ~라는 선행연구(Author, Year)와 일치하며, ~로 해석할 수 있다." },
    { label: "논의 — 불일치", text: "이는 ~를 보고한 선행연구(Author, Year)와 다른 결과로, 표본의 특성(~) 때문일 가능성이 있다." },
    { label: "시사점", text: "본 연구의 이론적 시사점은 다음과 같다. 첫째, … 둘째, …" },
    { label: "제한점", text: "본 연구의 제한점과 후속 연구를 위한 제언은 다음과 같다. 첫째, 횡단 설계로 인과 추론에 한계가 있다." }
  ];
  var ENGLISH = [
    { label: "Purpose", text: "The purpose of this study was to examine whether X predicts Y among Z." },
    { label: "Participants", text: "Participants were N = 120 adults (M age = 34.2, SD = 8.1) recruited from …" },
    { label: "Measures", text: "X was measured using the [Scale Name] (Author, Year), which consists of k items rated on a 5-point Likert scale (α = .87)." },
    { label: "Results", text: "Results indicated that X significantly predicted Y (β = .28, p = .002)." },
    { label: "Consistency", text: "These findings are consistent with previous research (Author, Year), suggesting that …" },
    { label: "Limitations", text: "Several limitations should be noted. First, the cross-sectional design precludes causal inference." },
    { label: "Future research", text: "Future research should employ longitudinal designs to examine …" },
    { label: "Contribution", text: "Taken together, the present findings extend the literature by …" },
    { label: "Abstract skeleton", text: "Background: … Objective: … Method: … Results: … Conclusions: … Keywords: …" }
  ];
  var SCALE_TEXT = [
    { label: "번안 절차", text: "원저자의 사용 허가를 받은 후, 심리학 전공자 2인이 독립적으로 번역하고 불일치 문항은 협의하여 조정하였다. 이후 이중언어 전문가가 원문을 보지 않은 상태에서 역번역하였으며, 원문과 대조하여 의미 차이가 있는 문항을 수정하였다. 전문가 ○인의 내용타당도 평가(CVI)와 예비조사(N = ○)를 거쳐 최종 문항을 확정하였다." },
    { label: "요인분석 적합성", text: "탐색적 요인분석에 앞서 KMO = .xx, Bartlett의 구형성 검정 χ²(df) = xxx.x, p < .001로 요인분석에 적합함을 확인하였다." },
    { label: "요인 수 결정", text: "평행분석과 스크리 검사, 해석 가능성을 종합하여 k요인 구조가 적절하다고 판단하였다. 요인부하량이 .40 미만이거나 교차부하량이 큰 문항 ○개를 제거하였다." },
    { label: "확인적 요인분석", text: "확인적 요인분석 결과, k요인 모형은 χ²(df) = xxx.x, CFI = .xx, TLI = .xx, RMSEA = .xx [90% CI .xx, .xx], SRMR = .xx로 수용 가능한 적합도를 보였다. 경쟁 모형(단일요인 · 2차요인 · bifactor)과 비교한 결과 …" },
    { label: "서열형 자료 · 추정법", text: "문항이 5점 이하 리커트 척도인 점을 고려하여 polychoric 상관행렬을 사용하고 WLSMV 방법으로 모수를 추정하였다." },
    { label: "bifactor 지표", text: "bifactor 모형의 일반요인 설명 공통분산(ECV) = .xx, 위계적 오메가(ωH) = .xx였으며, 이는 총점과 하위요인 점수의 해석 가능성을 …" },
    { label: "신뢰도", text: "내적 합치도(Cronbach's α)는 전체 .xx, 하위요인 .xx~.xx였고, McDonald's ω는 .xx~.xx였다. 2~4주 간격의 재검사 신뢰도는 r = .xx(N = ○)였다." },
    { label: "수렴 · 변별 타당도", text: "수렴타당도를 확인하기 위해 관련 척도 A와의 상관을 분석한 결과 r = .xx (p < .001)로 예상한 방향의 유의한 관계를 보였다. 반면 변별 척도 B와의 상관은 r = .xx로 낮았다." },
    { label: "측정동일성", text: "성별에 따른 측정동일성을 검증한 결과, 형태 · 요인부하량 · 절편 동일성이 지지되었다(ΔCFI ≤ .010; Cheung & Rensvold, 2002)." },
    { label: "제한점 문장", text: "본 연구의 제한점은 다음과 같다. 첫째, 표본이 ○○에 한정되어 일반화에 제한이 있다. 둘째, 자기보고식 측정에 의존하여 사회적 바람직성의 영향을 배제하기 어렵다. 셋째, 준거타당도 검증에 …" }
  ];
  App.page({
    id: "thesis-refs", title: "참고 템플릿",
    desc: "APA 7판 참고문헌 · 통계 표기 · 학술 문장 패턴을 모아 둔 복사용 템플릿입니다. (학교 · 학회 지침이 우선이에요)",
    render: function (view) {
      var g = ui.grid(view, true);
      [["APA 7판 참고문헌 · 인용", "Cite", "t-1", APA], ["통계 결과 표기", "Stats", "t-2", STATS], ["학술 문장 패턴 (국문)", "Style", "t-3", SENTENCES], ["영문 초록 · 논문 표현", "English", "t-1", ENGLISH], ["척도 타당화 결과 서술 문장", "Scale", "t-2", SCALE_TEXT]]
        .forEach(function (r) { var c = ui.card(g, { tab: r[1], tone: r[2], title: r[0] }); ui.refList(c.body, r[3]); });
    }
  });
  App.tpl = { CHECK_FIELDS: CHECK_FIELDS, IRB: IRB, EFFECT: EFFECT };
})(window.App);
