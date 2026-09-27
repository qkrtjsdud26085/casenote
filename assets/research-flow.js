/* Hello dear Sunny — 연구 프로세스 순서도 (어느 논문에나 쓰는 재사용 컴포넌트)
   ui.researchFlow(parent, { ref })  : Firestore 문서 하나(ref)에 논문별 내용을 저장 · 사이트에서 바로 수정
   ui.researchFlow(parent, { data }) : 저장 없이 데이터 객체만 그리기
   데이터 모양 (App.researchFlow.template() 참고):
     { steps: [{ key, title, hint, detail, status, sub?: [{ title, detail, status }] }], feedback: { title, detail } }
   sub 배열이 있는 단계(기본: 5. 분석)는 하위 단계를 몇 개든 넣고 뺄 수 있어요. */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;
  var STATUS = [["todo", "예정"], ["now", "진행 중"], ["done", "완료"]];

  var TEMPLATE = {
    steps: [
      { key: "question", title: "연구 질문 설정", hint: "문제의식 · 기존 연구의 한계", status: "todo",
        detail: "[이 논문의 문제의식, 기존 연구의 한계, 연구 질문을 적어요]" },
      { key: "review", title: "선행연구 검토", hint: "관련 이론 · 선행연구 리뷰", status: "todo",
        detail: "[핵심 이론과 주요 선행연구, 이 논문이 채우는 빈자리를 적어요]" },
      { key: "data", title: "데이터 수집 · 전처리", hint: "표본 · 척도/자료 구성 · 정제", status: "todo",
        detail: "[표본, 사용 척도와 자료 구성, 결측·이상치 정제 과정을 적어요]" },
      { key: "method", title: "방법론 설계", hint: "분석 기법 선정 · 학습", status: "todo",
        detail: "[선정한 분석 기법과 선정 이유, 익혀야 할 도구를 적어요]" },
      { key: "analysis", title: "분석", hint: "단계적 심화", status: "todo",
        detail: "[분석 전체 흐름을 한두 문장으로 적어요]",
        sub: [
          { title: "[분석 1]", detail: "[첫 번째 분석 내용]", status: "todo" },
          { title: "[분석 2]", detail: "[두 번째 분석 내용]", status: "todo" },
          { title: "[분석 3]", detail: "[세 번째 분석 내용]", status: "todo" }
        ] },
      { key: "result", title: "결과 및 시사점", hint: "해석 · 기여 · 한계", status: "todo",
        detail: "[주요 결과, 이론적·실무적 시사점, 한계와 후속 연구를 적어요]" }
    ],
    feedback: { title: "지속적 피드백 · 검증", detail: "[지도교수 피드백, 재분석, 신뢰도·타당도 점검 등 전 과정에서 반복하는 검증을 적어요]" }
  };
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  App.researchFlow = { template: function () { return clone(TEMPLATE); }, STATUS: STATUS };

  function statusLabel(s) { var f = STATUS.filter(function (x) { return x[0] === s; })[0]; return f ? f[1] : STATUS[0][1]; }

  ui.researchFlow = function (parent, cfg) {
    cfg = cfg || {};
    var data = clone(cfg.data || TEMPLATE);
    var sel = { step: -1, sub: -1, fb: false };
    var editing = false;

    var root = el("div", "rf");
    var tools = el("div", "items-tools rf-tools");
    var track = el("ol", "rf-track");
    var fb = el("button", "rf-feedback"); fb.type = "button";
    var panel = el("div", "rf-panel");
    [tools, track, fb, panel].forEach(function (n) { root.appendChild(n); });
    parent.appendChild(root);

    function save() {
      if (!cfg.ref) { return Promise.resolve(); }
      return cfg.ref.set({ steps: data.steps, feedback: data.feedback, updatedAt: new Date().toISOString() }, { merge: true })
        .catch(function (err) { window.alert("저장 실패: " + err.message); });
    }
    function pick(i, j, isFb) {
      var same = isFb ? sel.fb : (sel.step === i && sel.sub === j && !sel.fb);
      sel = same && !editing ? { step: -1, sub: -1, fb: false } : { step: isFb ? -1 : i, sub: isFb ? -1 : j, fb: !!isFb };
      render();
    }

    function node(step, i) {
      var li = el("li", "rf-step" + (step.sub ? " has-sub" : ""));
      li.setAttribute("data-status", step.status || "todo");
      var on = !sel.fb && sel.step === i && sel.sub === -1;
      var b = el("button", "rf-node" + (on ? " on" : "")); b.type = "button";
      b.setAttribute("aria-expanded", on ? "true" : "false");
      b.appendChild(el("span", "rf-no", String(i + 1)));
      var txt = el("span", "rf-txt");
      txt.appendChild(el("span", "rf-title", step.title || "(제목 없음)"));
      if (step.hint) { txt.appendChild(el("span", "rf-hint", step.hint)); }
      b.appendChild(txt);
      b.addEventListener("click", function () { pick(i, -1); });
      li.appendChild(b);
      if (step.sub) {
        var ul = el("ol", "rf-subs");
        step.sub.forEach(function (s, j) {
          var sub = el("li", "rf-sub-li");
          var sb = el("button", "rf-sub" + (!sel.fb && sel.step === i && sel.sub === j ? " on" : "")); sb.type = "button";
          sb.setAttribute("data-status", s.status || "todo");
          sb.appendChild(el("span", "rf-sub-no", (i + 1) + "-" + (j + 1)));
          sb.appendChild(el("span", "", s.title || "(하위 단계)"));
          sb.addEventListener("click", function () { pick(i, j); });
          sub.appendChild(sb); ul.appendChild(sub);
        });
        if (editing) {
          var add = el("button", "rf-sub rf-sub-add", "+ 하위 단계"); add.type = "button";
          add.addEventListener("click", function () {
            step.sub.push({ title: "[분석 " + (step.sub.length + 1) + "]", detail: "", status: "todo" });
            sel = { step: i, sub: step.sub.length - 1, fb: false }; save(); render();
          });
          var al = el("li", "rf-sub-li"); al.appendChild(add); ul.appendChild(al);
        }
        li.appendChild(ul);
      }
      /* phone layout: the open step's detail sits right under it */
      if (!sel.fb && sel.step === i) { var inl = el("div", "rf-inline"); inl.appendChild(detailBox()); li.appendChild(inl); }
      return li;
    }

    function field(label, value, onChange, rows) {
      var lab = el("label", "f wide");
      lab.appendChild(el("span", "f-label", label));
      var inp = rows ? el("textarea") : el("input");
      if (rows) { inp.rows = rows; } else { inp.type = "text"; }
      inp.value = value || "";
      inp.addEventListener("change", function () { onChange(inp.value.trim()); save(); render(); });
      lab.appendChild(inp);
      return lab;
    }
    function statusSelect(obj) {
      var lab = el("label", "f");
      lab.appendChild(el("span", "f-label", "상태"));
      var s = el("select");
      STATUS.forEach(function (x) { var o = el("option", "", x[1]); o.value = x[0]; s.appendChild(o); });
      s.value = obj.status || "todo";
      s.addEventListener("change", function () { obj.status = s.value; save(); render(); });
      lab.appendChild(s);
      return lab;
    }
    function detailBox() {
      var box = el("div", "rf-detail");
      var obj, label;
      if (sel.fb) { obj = data.feedback; label = "전 과정"; }
      else if (sel.step >= 0) {
        var st = data.steps[sel.step];
        if (!st) { return box; }
        if (sel.sub >= 0 && st.sub && st.sub[sel.sub]) { obj = st.sub[sel.sub]; label = (sel.step + 1) + "-" + (sel.sub + 1); }
        else { obj = st; label = String(sel.step + 1); }
      }
      if (!obj) { return box; }
      if (!editing) {
        var head = el("div", "rf-detail-head");
        head.appendChild(el("span", "rf-detail-no", label));
        head.appendChild(el("strong", "", obj.title || ""));
        if (!sel.fb) { var chip = el("span", "rf-status", statusLabel(obj.status)); chip.setAttribute("data-status", obj.status || "todo"); head.appendChild(chip); }
        box.appendChild(head);
        box.appendChild(el("p", "rf-detail-text", obj.detail || ""));
        return box;
      }
      var form = el("div", "fields-form");
      form.appendChild(field("제목", obj.title, function (v) { obj.title = v; }));
      if (!sel.fb && sel.sub < 0) { form.appendChild(field("짧은 설명", obj.hint, function (v) { obj.hint = v; })); }
      form.appendChild(field("펼쳤을 때 설명", obj.detail, function (v) { obj.detail = v; }, 4));
      if (!sel.fb) { form.appendChild(statusSelect(obj)); }
      box.appendChild(form);
      if (!sel.fb && sel.sub >= 0) {
        var subs = data.steps[sel.step].sub, j = sel.sub;
        var row = el("div", "items-tools");
        [["◀ 앞으로", -1], ["뒤로 ▶", 1]].forEach(function (m) {
          var b = el("button", "tool-btn", m[0]); b.type = "button";
          b.disabled = j + m[1] < 0 || j + m[1] >= subs.length;
          b.addEventListener("click", function () { var t = subs[j]; subs[j] = subs[j + m[1]]; subs[j + m[1]] = t; sel.sub = j + m[1]; save(); render(); });
          row.appendChild(b);
        });
        var del = el("button", "tool-btn danger", "이 하위 단계 삭제"); del.type = "button";
        del.addEventListener("click", function () {
          if (!window.confirm("'" + (subs[j].title || "하위 단계") + "'를 삭제할까요?")) { return; }
          subs.splice(j, 1); sel.sub = -1; save(); render();
        });
        row.appendChild(del);
        box.appendChild(row);
      }
      return box;
    }

    function render() {
      H.clear(tools); H.clear(track); H.clear(fb); H.clear(panel);
      if (cfg.ref) {
        var ed = el("button", "tool-btn" + (editing ? " on" : ""), editing ? "수정 끝내기" : "수정"); ed.type = "button";
        ed.addEventListener("click", function () { editing = !editing; if (editing && sel.step < 0 && !sel.fb) { sel.step = 0; } render(); });
        tools.appendChild(ed);
        if (editing) {
          var rs = el("button", "tool-btn danger", "빈 틀로 되돌리기"); rs.type = "button";
          rs.addEventListener("click", function () { if (window.confirm("이 순서도를 빈 틀(자리표시자)로 되돌릴까요?")) { data = clone(TEMPLATE); sel = { step: 0, sub: -1, fb: false }; save(); render(); } });
          tools.appendChild(rs);
        }
      }
      tools.hidden = !tools.firstChild;
      root.classList.toggle("editing", editing);
      data.steps.forEach(function (s, i) { track.appendChild(node(s, i)); });
      fb.className = "rf-feedback" + (sel.fb ? " on" : "");
      fb.setAttribute("aria-expanded", sel.fb ? "true" : "false");
      fb.appendChild(el("span", "rf-loop", "↻"));
      fb.appendChild(el("span", "", (data.feedback && data.feedback.title) || "지속적 피드백 · 검증"));
      fb.onclick = function () { pick(-1, -1, true); };
      Array.prototype.forEach.call(root.querySelectorAll(".rf-fb-inline"), function (n) { n.remove(); });
      if (sel.fb) { var inl = el("div", "rf-inline rf-fb-inline"); inl.appendChild(detailBox()); root.insertBefore(inl, panel); }
      if (sel.fb || sel.step >= 0) { panel.appendChild(detailBox()); }
      panel.hidden = !panel.firstChild;
    }
    render();
    if (cfg.ref) {
      App.watchDoc(cfg.ref, function (d) {
        if (d && Array.isArray(d.steps) && d.steps.length) { data = { steps: d.steps, feedback: d.feedback || clone(TEMPLATE.feedback) }; }
        else { data = clone(TEMPLATE); }
        if (!editing || !root.contains(document.activeElement)) { render(); }
      });
    }
    return { root: root, data: function () { return data; } };
  };
})(window.App);
