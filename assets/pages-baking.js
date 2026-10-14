/* Hello dear Sunny — 개인 › 베이킹: 레시피 카드(준비물을 맨 위에 크게, 만드는 법 · 팁은 펼쳐 보기)
   레시피는 개인정보가 아니라서 코드에 그대로 둬요. 준비물 체크는 저장하지 않아요(새로고침하면 처음부터). */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  var RECIPES = [
    {
      key: "financier", tab: "Financier", tone: "t-1", emoji: "🧈", title: "브라운버터 피낭시에",
      meta: ["미니 10~12개", "190~200℃", "10~13분", "휴지 30분+"],
      intro: "버터 100g 기준이에요. 브라운버터는 굽는 과정에서 수분이 날아가 양이 줄어드니, 처음 버터를 100g으로 잡으면 완성 후 약 80g이 남아요.",
      items: [
        { name: "버터", amt: "100g", note: "밥숟가락 약 7큰술" },
        { name: "달걀흰자", amt: "4개", note: "약 120g" },
        { name: "설탕", amt: "90g", note: "약 9큰술" },
        { name: "박력분", amt: "50g", note: "약 5큰술" },
        { name: "아몬드가루", amt: "50g", note: "약 5큰술 · 없으면 박력분 50g" },
        { name: "꿀", amt: "1큰술" },
        { name: "소금", amt: "한 꼬집" }
      ],
      steps: [
        ["브라운버터", "냄비에 버터를 넣고 중불에서 저어가며 가열합니다. 거품이 올라왔다 가라앉고 갈색이 되면서 고소한 향이 나면 불을 끄고 체에 걸러 식힙니다."],
        ["가루 섞기", "볼에 박력분, 아몬드가루, 설탕, 소금을 섞습니다."],
        ["흰자 · 꿀", "흰자를 넣고 거품이 나지 않게 섞은 뒤 꿀을 넣습니다."],
        ["버터 넣기", "따뜻한 정도(40~50℃)로 식은 브라운버터를 조금씩 넣으며 섞습니다."],
        ["휴지", "냉장고에서 30분 이상 휴지시킵니다. (하룻밤 두면 더 촉촉해요)"],
        ["틀 채우기", "틀에 버터를 얇게 바르고 반죽을 80%만 채웁니다."],
        ["굽기", "190~200℃로 예열한 오븐에서 10~13분, 가장자리가 갈색이 되면 꺼내 바로 식힘망에 올립니다."]
      ],
      tips: [
        "흰자 4개는 약 120g이에요. 달걀 크기에 따라 다르니 부족하면 물 1큰술로 맞추세요.",
        "한 번에 다 못 구우면 남은 반죽은 냉장고에 두었다가 2~3일 안에 구워도 돼요.",
        "에어프라이어는 170℃에서 10~12분 구워요."
      ]
    },
    {
      key: "pound", tab: "Pound", tone: "t-2", emoji: "🍰", title: "기본 파운드케이크",
      meta: ["파운드틀 1개", "170℃", "40~45분", "실온 재료"],
      intro: "버터 · 설탕 · 달걀 · 밀가루를 거의 같은 양으로 넣는 기본 파운드예요. 틀은 약 21×8cm 크기 1개 분량이에요.",
      items: [
        { name: "버터", amt: "100g", note: "약 7큰술 · 실온에 말랑하게" },
        { name: "설탕", amt: "90g", note: "약 9큰술" },
        { name: "달걀", amt: "2개", note: "약 100g · 실온" },
        { name: "박력분", amt: "100g", note: "약 10큰술" },
        { name: "베이킹파우더", amt: "2g", note: "약 ½작은술" },
        { name: "우유", amt: "1큰술", note: "선택 · 더 촉촉해요" },
        { name: "소금", amt: "한 꼬집" }
      ],
      steps: [
        ["준비", "버터와 달걀은 1시간 전에 꺼내 실온에 둡니다. 틀에 유산지를 깔고, 오븐을 170℃로 예열합니다."],
        ["버터 풀기", "볼에 버터를 넣고 거품기로 부드럽게 풀어 줍니다."],
        ["설탕 넣기", "설탕과 소금을 2~3번 나눠 넣으며, 색이 하얗게 되고 부피가 커질 때까지 휘핑합니다."],
        ["달걀 넣기", "풀어 둔 달걀을 4~5번에 나눠 조금씩 넣으며 그때마다 충분히 섞습니다. (한꺼번에 넣으면 분리돼요)"],
        ["가루 섞기", "박력분과 베이킹파우더를 체 쳐 넣고, 주걱으로 가르듯이 날가루가 안 보일 때까지만 섞은 뒤 우유를 넣습니다."],
        ["틀에 담기", "반죽을 틀에 담고 가운데를 살짝 오목하게 정리합니다. 바닥에 탁탁 쳐서 큰 기포를 뺍니다."],
        ["굽기", "170℃에서 40~45분 굽습니다. 10분쯤 지나 윗면이 살짝 굳으면 칼로 가운데를 길게 그어 주면 예쁘게 갈라져요."],
        ["확인 · 식히기", "꼬치로 찔러 반죽이 묻어 나오지 않으면 다 된 거예요. 틀째 5분 두었다가 꺼내 식힘망에서 식힙니다."]
      ],
      tips: [
        "달걀이 차가우면 버터가 굳으면서 반죽이 분리돼요. 분리되면 박력분을 1큰술 먼저 넣어 섞으면 돌아와요.",
        "다 식으면 랩으로 감싸 하루 두면 더 촉촉하고 맛이 깊어져요.",
        "윗면이 너무 빨리 타면 중간에 쿠킹호일을 덮어 주세요.",
        "에어프라이어는 150℃에서 30~35분, 윗면이 진해지면 호일을 덮어요."
      ]
    },
    {
      key: "cookie", tab: "Cookie", tone: "t-3", emoji: "🍪", title: "초코칩 쿠키",
      meta: ["약 10개", "180℃", "10~12분", "휴지 30분"],
      intro: "겉은 바삭, 속은 쫀득한 초코칩 쿠키예요. 한 개에 약 45g씩, 지름 7~8cm 크기로 구워져요.",
      items: [
        { name: "버터", amt: "100g", note: "약 7큰술 · 실온에 말랑하게" },
        { name: "흑설탕", amt: "60g", note: "약 6큰술 · 없으면 설탕" },
        { name: "설탕", amt: "40g", note: "약 4큰술" },
        { name: "달걀", amt: "1개", note: "약 50g · 실온" },
        { name: "박력분", amt: "150g", note: "약 15큰술" },
        { name: "베이킹소다", amt: "2g", note: "약 ½작은술" },
        { name: "초코칩", amt: "80g", note: "다진 초콜릿도 좋아요" },
        { name: "소금", amt: "한 꼬집" }
      ],
      steps: [
        ["버터 · 설탕", "실온 버터를 부드럽게 풀고, 흑설탕 · 설탕 · 소금을 넣어 섞습니다. 쿠키는 너무 오래 휘핑하지 않아요."],
        ["달걀 넣기", "달걀을 2번에 나눠 넣으며 매끈해질 때까지 섞습니다."],
        ["가루 섞기", "박력분과 베이킹소다를 체 쳐 넣고 주걱으로 가르듯 섞습니다."],
        ["초코칩", "날가루가 조금 남았을 때 초코칩을 넣고 마저 섞습니다. (토핑용으로 조금 남겨 두세요)"],
        ["휴지", "랩을 씌워 냉장고에서 30분 이상 휴지시킵니다. 반죽이 덜 퍼지고 더 쫀득해져요."],
        ["모양 잡기", "약 45g씩 떼어 동글게 빚고, 팬에 간격을 넉넉히(5cm 이상) 두고 올린 뒤 손바닥으로 살짝 누릅니다. 남긴 초코칩을 위에 올려요."],
        ["굽기", "180℃로 예열한 오븐에서 10~12분, 가장자리만 노릇하고 가운데는 덜 익은 듯할 때 꺼냅니다."],
        ["식히기", "팬 위에서 5분 두면 남은 열로 속까지 익어요. 그 다음 식힘망으로 옮깁니다."]
      ],
      tips: [
        "흑설탕을 많이 넣을수록 쫀득하고, 설탕을 많이 넣을수록 바삭해요.",
        "빚어 둔 반죽은 냉동실에서 2주까지 두고, 꺼내서 바로 1~2분 더 구우면 돼요.",
        "에어프라이어는 160℃에서 8~10분, 종이호일을 깔고 3~4개씩 구워요."
      ]
    }
  ];

  function recipeCard(parent, r) {
    var c = ui.card(parent, { tab: r.tab, tone: r.tone, title: r.emoji + " " + r.title });
    c.el.classList.add("bake-card");
    c.el.setAttribute("data-recipe", r.key);

    var meta = el("div", "bake-meta");
    r.meta.forEach(function (m) { meta.appendChild(el("span", "bake-pill", m)); });
    c.body.appendChild(meta);

    /* 준비물: 카드 맨 위 상자에 크게. 누르면 "챙겼어요" 표시 */
    var box = el("section", "bake-ing");
    var bh = el("div", "bake-ing-head");
    bh.appendChild(el("h3", "", "준비물"));
    var cnt = el("span", "bake-ing-count");
    bh.appendChild(cnt);
    box.appendChild(bh);
    var list = el("ul", "bake-ing-list");
    function paintCount() {
      var got = list.querySelectorAll(".bake-ing-item.got").length;
      cnt.textContent = got ? "챙김 " + got + " / " + r.items.length : r.items.length + "가지";
    }
    r.items.forEach(function (it) {
      var li = el("li");
      var b = el("button", "bake-ing-item"); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.appendChild(el("span", "bake-ing-check", "✓"));
      var nm = el("span", "bake-ing-name", it.name);
      if (it.note) { nm.appendChild(el("small", "", it.note)); }
      b.appendChild(nm);
      b.appendChild(el("span", "bake-ing-amt", it.amt));
      b.addEventListener("click", function () {
        var on = !b.classList.contains("got");
        b.classList.toggle("got", on); b.setAttribute("aria-pressed", on ? "true" : "false");
        paintCount();
      });
      li.appendChild(b); list.appendChild(li);
    });
    box.appendChild(list);
    box.appendChild(el("p", "hint bake-ing-hint", "챙긴 재료를 누르면 체크돼요."));
    paintCount();
    c.body.appendChild(box);

    if (r.intro) { c.body.appendChild(el("p", "bake-intro", r.intro)); }

    var how = el("details", "bake-how");
    how.appendChild(el("summary", "", "만드는 법 " + r.steps.length + "단계 · 팁 보기"));
    var ol = el("ol", "bake-steps");
    r.steps.forEach(function (s) {
      var li = el("li");
      li.appendChild(el("strong", "", s[0]));
      li.appendChild(el("span", "", s[1]));
      ol.appendChild(li);
    });
    how.appendChild(ol);
    if (r.tips && r.tips.length) {
      var tips = el("div", "bake-tips");
      tips.appendChild(el("h3", "", "팁"));
      var ul = el("ul");
      r.tips.forEach(function (t) { ul.appendChild(el("li", "", t)); });
      tips.appendChild(ul);
      how.appendChild(tips);
    }
    c.body.appendChild(how);
  }

  App.page({
    id: "personal-baking", title: "베이킹",
    desc: "자주 굽는 레시피 모음. 준비물을 먼저 챙기고, 만드는 법은 펼쳐서 보세요.",
    render: function (view) {
      var g = ui.grid(view);
      g.classList.add("bake-grid");
      RECIPES.forEach(function (r) { recipeCard(g, r); });
    }
  });

})(window.App);
