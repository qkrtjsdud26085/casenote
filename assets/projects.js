/* Hello dear Sunny — 논문 프로젝트 공통 기반 (프로젝트 목록 · 활성 프로젝트 · 단계 · 기본 작업 계획) */
(function (App) {
  "use strict";
  var H = App.h, el = H.el, ui = App.ui;
  var P = App.proj = {};

  P.TYPES = ["학회지 논문", "학위논문"];
  P.KINDS = ["척도 타당화", "척도 개발", "실증 연구", "문헌 · 리뷰", "기타"];
  P.MASTER = ["기획", "문헌 · 설계", "문항 · 예비조사", "자료 수집", "분석", "원고 작성", "지도교수 검토", "투고", "심사 · 수정", "게재 확정", "게재 완료"];
  P.isScale = function (kind) { return kind === "척도 타당화" || kind === "척도 개발"; };
  P.stagesFor = function (proj) { return P.isScale(proj && proj.kind) ? P.MASTER : P.MASTER.filter(function (s) { return s !== "문항 · 예비조사"; }); };
  P.stageIndex = function (proj) { var st = P.stagesFor(proj), i = st.indexOf(proj && proj.stage); return i < 0 ? 0 : i; };
  P.stagePct = function (proj) { var st = P.stagesFor(proj); return Math.round(P.stageIndex(proj) / (st.length - 1) * 100); };
  P.acceptedIndex = P.MASTER.indexOf("게재 확정");
  P.isAccepted = function (proj) {
    if (!proj || proj.type !== "학회지 논문") { return false; }
    return P.MASTER.indexOf(proj.stage) >= P.acceptedIndex;
  };

  P.DEFAULTS = [
    { id: "p1", title: "학회지 논문 ①", type: "학회지 논문", kind: "척도 타당화", stage: "원고 작성" },
    { id: "p2", title: "학회지 논문 ②", type: "학회지 논문", kind: "척도 개발", stage: "문헌 · 설계" }
  ];
  P.list = P.DEFAULTS.slice();
  P.projectsRef = function () { return App.doc("research/projects"); };
  P.ref = function (id, name) { return App.doc("research/pj_" + id + "_" + name); };
  P.setList = function (d) { P.list = (d && d.items && d.items.length) ? d.items : P.DEFAULTS.slice(); };
  P.get = function (id) { return P.list.filter(function (p) { return p.id === id; })[0]; };
  P.titleOf = function (id) { var p = P.get(id); return p ? p.title : ""; };
  P.activeId = function () {
    var s = H.safeGet("hds_proj");
    return P.list.some(function (p) { return p.id === s; }) ? s : P.list[0].id;
  };
  P.savePatch = function (id, patch) {
    P.list = P.list.map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; });
    return P.projectsRef().set({ items: P.list, updatedAt: new Date().toISOString() }, { merge: true })
      .catch(function (err) { window.alert("저장 실패: " + err.message); });
  };

  /* ---------- project-aware pages ---------- */
  function drawBar(bar, proj, subs) {
    H.clear(bar);
    var pick = el("label", "proj-pick");
    pick.appendChild(el("span", "f-label", "프로젝트"));
    var sel = el("select");
    P.list.forEach(function (p) { var o = el("option", "", p.title); o.value = p.id; sel.appendChild(o); });
    sel.value = proj.id;
    sel.setAttribute("aria-label", "프로젝트 선택");
    sel.addEventListener("change", function () { H.safeSet("hds_proj", sel.value); App.route(); });
    pick.appendChild(sel);
    bar.appendChild(pick);
    var t = el("span", "cat-chip", proj.type); t.setAttribute("data-cat", "논문"); bar.appendChild(t);
    bar.appendChild(el("span", "cat-chip", proj.kind || "기타"));
    var st = P.stagesFor(proj);
    bar.appendChild(el("span", "proj-stage", "현재 단계 · " + st[P.stageIndex(proj)] + " (" + P.stagePct(proj) + "%)"));
    var a = el("a", "more-link", "프로젝트 관리 →"); a.href = "#/thesis-home"; bar.appendChild(a);
  }
  P.page = function (def) {
    App.page({
      id: def.id, title: def.title, desc: def.desc,
      render: function (view) {
        var bar = el("div", "proj-bar"), body = el("div"), subs = [], builtFor = null;
        view.appendChild(bar); view.appendChild(body);
        App.watchDoc(P.projectsRef(), function (d) {
          P.setList(d);
          var proj = P.get(P.activeId());
          drawBar(bar, proj);
          if (builtFor !== proj.id) {
            builtFor = proj.id;
            H.clear(body);
            var ctx = {
              id: proj.id, proj: proj, isScale: P.isScale(proj.kind),
              scope: { key: "project", value: proj.id },
              ref: function (name) { return P.ref(proj.id, name); },
              subscribe: function (fn) { subs.push(fn); }
            };
            try { def.render(body, ctx); } catch (e) {
              console.error(e);
              body.appendChild(el("div", "error-card", "이 페이지를 그리는 중 문제가 생겼어요: " + e.message));
            }
          } else {
            subs.forEach(function (fn) { fn(proj); });
          }
        });
      }
    });
  };

  /* ---------- stage stepper ---------- */
  P.stepper = function (parent, ctx) {
    var prog = el("div"), row = el("div", "flow-row");
    parent.appendChild(prog); parent.appendChild(row);
    function draw(proj) {
      H.clear(prog); H.clear(row);
      var st = P.stagesFor(proj), cur = P.stageIndex(proj);
      prog.appendChild(ui.progress(P.stagePct(proj), "현재 단계 · " + st[cur] + " (" + (cur + 1) + "/" + st.length + ")"));
      st.forEach(function (s, i) {
        var chip = el("button", "flow-chip" + (i < cur ? " done" : "") + (i === cur ? " active" : ""), s);
        chip.type = "button"; chip.title = "누르면 이 단계로 바뀝니다";
        chip.addEventListener("click", function () { P.savePatch(proj.id, { stage: s }); });
        row.appendChild(chip);
        if (i < st.length - 1) { row.appendChild(el("span", "flow-arrow", "→")); }
      });
    }
    ctx.subscribe(draw);
    draw(ctx.proj);
  };

  /* ---------- default task plans (edit freely; they are templates) ---------- */
  function mk(phase, texts) { return texts.map(function (t) { return { phase: phase, text: t }; }); }
  P.tasksFor = function (kind) {
    var scale = P.isScale(kind), out = [];
    out = out.concat(mk("기획", ["연구 목적 · 기여를 한 문단으로 정리", "투고 후보 학술지 3곳 조사 (투고 규정 · 심사 기간 · 게재료)", "공저자 · 역할 분담 확정"]));
    out = out.concat(mk("문헌 · 설계", ["핵심 개념 정의와 이론적 틀 정리", scale ? "선행 척도 · 선행연구 비교표 작성" : "선행연구 종합표 작성", scale ? "타당도 검증 계획 수립 (수렴 · 변별 · 준거)" : "연구문제 · 가설 확정", "표본 크기 산정 근거 기록", "IRB 신청 · 승인"]));
    if (scale) {
      out = out.concat(kind === "척도 타당화"
        ? mk("문항 · 예비조사", ["원저자 사용 허가 확인 · 회신 보관", "정번역 → 통합 → 역번역 → 원문 대조", "전문가 내용타당도 평가 (CVI)", "예비조사(인지면담 · 소표본) 후 문항 수정", "최종 문항 확정"])
        : mk("문항 · 예비조사", ["문항 풀 생성 · 이론적 근거 매핑", "전문가 내용타당도 평가 (CVI)", "문항 표현 정련", "예비조사(인지면담 · 소표본) 후 문항 수정", "최종 문항 확정"]));
    }
    out = out.concat(mk("자료 수집", scale
      ? ["설문 구성 · 주의점검 문항 배치", "본조사 표본 확보 (탐색용 · 확인용 분리 여부 결정)", "재검사 표본 수집 (선택)", "응답 품질 점검 (불성실 응답 · 이상치 · 결측)"]
      : ["설문 · 실험 도구 최종 점검", "자료 수집 진행", "응답 품질 점검 (불성실 응답 · 이상치 · 결측)"]));
    out = out.concat(mk("분석", scale
      ? ["문항 분석 (기술통계 · 왜도 · 첨도 · 문항-총점 상관)", "자료 특성 확인 (서열형이면 polychoric 상관 · WLSMV 고려)", "탐색적 요인분석 (KMO · Bartlett · 평행분석)", "확인적 요인분석 · 경쟁 모형 비교 (단일 · 다요인 · 2차 · bifactor)", "필요 시 ESEM · bifactor 지표(ECV · ωH · PUC) · Rasch 검토", "신뢰도 (α · ω · 재검사)", "수렴 · 변별 · 준거 타당도", "측정동일성 (성별 등 집단 간)", "결과 표 · 그림 정리 · 분석 스크립트 백업"]
      : ["기술통계 · 가정 검토 (정규성 · 등분산 · 다중공선성)", "주요 가설 검증", "효과크기 · 신뢰구간 산출", "추가 · 사후 분석", "결과 표 · 그림 정리 · 분석 스크립트 백업"]));
    out = out.concat(mk("원고 작성", ["서론 · 이론적 배경", "방법", "결과", "논의 · 제한점 · 시사점", "참고문헌 · 국문 · 영문 초록"]));
    out = out.concat(mk("지도교수 검토", ["초고 공유 · 피드백 수령", "피드백 반영 · 재검토"]));
    out = out.concat(mk("투고", ["투고 규정 점검 (분량 · 양식 · 익명 처리)", "유사도 검사", "투고 · 접수 확인"]));
    out = out.concat(mk("심사 · 수정", ["심사 의견 대응표 작성", "수정본 · 답변서 제출"]));
    out = out.concat(mk("게재 확정", ["게재 확정서 확보 (졸업 요건 제출용)"]));
    out = out.concat(mk("게재 완료", ["게재료 납부 · 최종 교정", "CV · 졸업 요건 현황 업데이트"]));
    return out;
  };
})(window.App);
