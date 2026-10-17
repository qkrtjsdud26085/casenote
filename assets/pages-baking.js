/* Hello dear Sunny — 개인 › 베이킹: 레시피 카드(준비물을 맨 위에 크게, 내 오븐[쿠쿠 26L] 시간, 만드는 법 · 팁은 펼쳐 보기)
   맨 위 검색(레시피 이름 · 재료) + 바로가기 칩. 누른 레시피는 맨 앞으로(Firestore personal/baking.order로 모든 기기에서 같은 순서, hds_bake_order는 브라우저 임시 기억)
   레시피는 개인정보가 아니라서 코드에 그대로 둬요. 준비물 체크는 저장하지 않아요(새로고침하면 처음부터). */
(function (App) {
  "use strict";
  var ui = App.ui, H = App.h, el = H.el;

  var RECIPES = [
    {
      key: "financier", tab: "Financier", tone: "t-1", emoji: "🧈", title: "브라운버터 피낭시에",
      meta: ["미니 10~12개", "190~200℃", "10~13분", "휴지 30분+"],
      myOven: { time: "200℃ · 13~16분", note: "가장자리가 진한 갈색이 될 때까지. 10분째부터 확인해요." },
      intro: "버터 100g 기준이에요. 브라운버터는 굽는 과정에서 수분이 날아가 양이 줄어드니, 처음 버터를 100g으로 잡으면 완성 후 약 80g이 남아요.",
      items: [
        { name: "버터", amt: "100g", note: "밥숟가락 약 7큰술" },
        { name: "달걀흰자", amt: "4개", note: "약 120g" },
        { name: "설탕", amt: "90g", note: "약 9큰술" },
        { name: "박력분", amt: "50g", note: "약 5큰술" },
        { name: "아몬드가루", amt: "50g", note: "약 5큰술 · 없으면 박력분 50g" },
        { name: "꿀", amt: "1큰술", note: "약 20g" },
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
      myOven: { time: "170℃ · 50~55분", note: "아래 칸에서 굽고, 25분쯤 윗면이 진해지면 호일을 덮어요. 꼬치로 꼭 확인해요." },
      intro: "버터 · 설탕 · 달걀 · 밀가루를 거의 같은 양으로 넣는 기본 파운드예요. 틀은 약 21×8cm 크기 1개 분량이에요.",
      items: [
        { name: "버터", amt: "100g", note: "약 7큰술 · 실온에 말랑하게" },
        { name: "설탕", amt: "90g", note: "약 9큰술" },
        { name: "달걀", amt: "2개", note: "약 100g · 실온" },
        { name: "박력분", amt: "100g", note: "약 10큰술" },
        { name: "베이킹파우더", amt: "2g", note: "약 ½작은술" },
        { name: "우유", amt: "1큰술", note: "약 15g · 선택 · 더 촉촉해요" },
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
      myOven: { time: "180℃ · 13~15분", note: "한 판에 5~6개씩. 가장자리만 노릇하면 꺼내요." },
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
    },
    {
      key: "scone", tab: "Scone", tone: "t-1", emoji: "🥐", title: "플레인 스콘",
      meta: ["6개", "200℃", "15~18분", "휴지 30분"],
      myOven: { time: "200℃ · 20~23분", note: "옆면까지 노릇해지고 윗면이 갈색이면 다 된 거예요." },
      intro: "겉은 바삭, 속은 포슬포슬한 기본 스콘이에요. 버터가 녹지 않게 모든 재료를 차갑게 쓰는 게 제일 중요해요.",
      items: [
        { name: "박력분", amt: "200g", note: "약 20큰술" },
        { name: "버터", amt: "60g", note: "약 4큰술 · 냉장고에서 바로 꺼낸 차가운 것" },
        { name: "설탕", amt: "30g", note: "약 3큰술" },
        { name: "베이킹파우더", amt: "8g", note: "약 2작은술" },
        { name: "달걀", amt: "1개", note: "약 50g · 차갑게" },
        { name: "우유", amt: "62g", note: "60ml · 약 4큰술 · 차갑게 (+윗면용 조금)" },
        { name: "소금", amt: "한 꼬집" }
      ],
      steps: [
        ["가루 섞기", "볼에 박력분, 베이킹파우더, 설탕, 소금을 넣고 섞습니다."],
        ["버터 자르기", "차가운 버터를 깍둑 썰어 넣고, 스크래퍼(없으면 포크)로 자르듯 섞어 빵가루처럼 보슬보슬하게 만듭니다. 손으로 오래 만지면 버터가 녹아요."],
        ["달걀 · 우유", "달걀과 우유를 섞어 붓고, 주걱으로 가르듯 섞어 한 덩어리로 뭉칩니다. 치대지 않아요."],
        ["휴지", "랩으로 싸서 냉장고에서 30분 이상 휴지시킵니다. 이때 오븐을 200℃로 예열해요."],
        ["모양 잡기", "반죽을 약 3cm 두께로 펴서 6조각(동그랗게 찍거나 삼각형으로 자르기)으로 나눕니다."],
        ["윗면 바르기", "팬에 간격을 두고 올린 뒤, 윗면에만 우유(또는 달걀물)를 얇게 바릅니다. 옆면에 흐르면 덜 부풀어요."],
        ["굽기", "200℃에서 15~18분, 윗면이 노릇하고 옆면이 갈라지면서 부풀면 꺼내 식힘망에 올립니다."]
      ],
      tips: [
        "결을 살리고 싶으면 반죽을 반으로 접어 누르기를 2번만 해요.",
        "초코칩 · 크랜베리 50g을 3단계에서 같이 넣으면 응용 스콘이 돼요.",
        "구운 스콘은 식혀서 냉동해 두었다가 전자레인지 20초 + 오븐 3분이면 갓 구운 맛이 나요.",
        "에어프라이어는 170℃에서 13~15분 구워요."
      ]
    },
    {
      key: "muffin", tab: "Muffin", tone: "t-2", emoji: "🧁", title: "블루베리 머핀",
      meta: ["머핀틀 6구", "180℃", "20~25분", "녹인 버터"],
      myOven: { time: "180℃ · 25~30분", note: "15분쯤 윗면이 진해지면 호일을 덮어요. 가운데를 꼬치로 찔러 확인해요." },
      intro: "가루와 액체를 따로 섞었다가 가볍게 합치는 쉬운 머핀이에요. 블루베리를 빼면 플레인 머핀이 돼요.",
      items: [
        { name: "박력분", amt: "150g", note: "약 15큰술" },
        { name: "설탕", amt: "70g", note: "약 7큰술" },
        { name: "버터", amt: "80g", note: "약 6큰술 · 녹여서 살짝 식히기" },
        { name: "달걀", amt: "1개", note: "약 50g · 실온" },
        { name: "우유", amt: "82g", note: "80ml · 약 5큰술 · 실온" },
        { name: "베이킹파우더", amt: "5g", note: "약 1작은술" },
        { name: "블루베리", amt: "80g", note: "냉동도 OK · 빼면 플레인 머핀" },
        { name: "소금", amt: "한 꼬집" }
      ],
      steps: [
        ["준비", "버터는 녹여서 미지근하게 식히고, 머핀틀에 유산지 컵을 깔아요. 오븐을 180℃로 예열합니다."],
        ["액체 섞기", "볼에 달걀을 풀고 설탕 · 소금을 넣어 섞은 뒤, 우유와 녹인 버터를 넣어 섞습니다."],
        ["가루 넣기", "박력분과 베이킹파우더를 체 쳐 넣고, 주걱으로 크게 10~15번만 섞습니다. 날가루가 살짝 보이고 덩어리가 있어도 괜찮아요."],
        ["블루베리", "블루베리에 박력분 1작은술을 묻혀 넣고 두세 번만 더 섞습니다. (가루를 묻히면 바닥에 덜 가라앉아요)"],
        ["컵 채우기", "반죽을 컵의 80~90%까지 채우고, 남은 블루베리 몇 알을 위에 올립니다."],
        ["굽기", "180℃에서 20~25분, 윗면이 봉긋하고 노릇해지면 가운데를 꼬치로 찔러 반죽이 묻어 나오지 않는지 확인해요."],
        ["식히기", "틀째 5분 두었다가 꺼내 식힘망에서 식힙니다."]
      ],
      tips: [
        "많이 섞을수록 질기고 속에 구멍이 생겨요. 덜 섞은 듯할 때 멈추는 게 비결이에요.",
        "냉동 블루베리는 녹이지 말고 언 채로 넣어야 반죽이 보라색으로 물들지 않아요.",
        "윗면에 설탕을 조금 뿌려 구우면 바삭한 껍질이 생겨요.",
        "에어프라이어는 실리콘 머핀컵에 담아 160℃에서 15~18분 구워요."
      ]
    },
    {
      key: "levain", tab: "Levain", tone: "t-3", emoji: "🧀", title: "황치즈 르뱅쿠키",
      meta: ["큰 쿠키 4개", "180℃", "13~15분", "냉동 30분"],
      myOven: { time: "180℃ · 16~19분", note: "두꺼워서 오래 걸려요. 10분쯤 윗면이 진해지면 호일을 덮고, 한 판에 2개씩 구워요." },
      intro: "겉은 바삭, 속은 촉촉하게 덜 익은 듯한 두툼한 르뱅쿠키예요. 가운데에 크림치즈 필링이 들어가요. 하나에 약 120g으로 크게 빚어요.",
      items: [
        { name: "버터", amt: "100g", note: "약 7큰술 · 차가운 것 깍둑썰기" },
        { name: "황설탕", amt: "70g", note: "약 7큰술 · 없으면 설탕" },
        { name: "설탕", amt: "30g", note: "약 3큰술" },
        { name: "달걀", amt: "1개", note: "약 50g · 차갑게" },
        { name: "박력분", amt: "160g", note: "약 16큰술" },
        { name: "황치즈가루", amt: "30g", note: "약 4큰술 · 체다치즈 파우더" },
        { name: "베이킹파우더", amt: "2g", note: "약 ½작은술" },
        { name: "화이트초코칩", amt: "50g", note: "선택" },
        { name: "크림치즈", amt: "80g", note: "필링용" },
        { name: "필링용 설탕", amt: "10g", note: "약 1큰술" },
        { name: "소금", amt: "아주 조금", note: "치즈가루가 짜서 생략해도 돼요" }
      ],
      steps: [
        ["필링 만들기", "크림치즈와 필링용 설탕을 섞어 4등분하고, 랩에 싸서 동그랗게 만든 뒤 냉동실에 30분 넣어 단단하게 굳힙니다."],
        ["버터 · 설탕", "차가운 버터를 깍둑 썰어 황설탕 · 설탕과 함께 주걱(또는 거품기)으로 섞습니다. 하얗게 휘핑하지 말고, 버터 덩어리가 조금 남아도 괜찮아요."],
        ["달걀 넣기", "달걀을 넣고 한 덩어리가 될 때까지만 섞습니다."],
        ["가루 섞기", "박력분 · 황치즈가루 · 베이킹파우더 · 소금을 체 쳐 넣고 주걱으로 가르듯 섞은 뒤, 화이트초코칩을 넣습니다."],
        ["필링 감싸기", "반죽을 4등분(약 120g씩)해 손바닥에 넓게 펴고, 언 필링을 가운데 올려 빈틈없이 감쌉니다. 누르지 말고 높고 둥글게 빚어요."],
        ["굳히기", "빚은 반죽을 냉동실에 30분 넣습니다. 이때 오븐을 190℃로 충분히 예열해요."],
        ["굽기", "팬에 넉넉히 띄워 올리고 180℃로 낮춰 13~15분, 겉이 노릇하고 가운데는 덜 익은 듯 말랑할 때 꺼냅니다."],
        ["식히기", "구운 직후엔 아주 부드러워 부서져요. 팬 위에서 15분 이상 식힌 뒤 옮깁니다."]
      ],
      tips: [
        "누르지 않고 높게 빚는 게 르뱅 모양의 비결이에요. 차가운 반죽 그대로 구워야 덜 퍼져요.",
        "황치즈가루는 짠맛이 있어서 소금은 아주 조금만 넣거나 빼도 돼요.",
        "박력분 중 60g을 강력분으로 바꾸면 더 쫀득해요.",
        "밀폐해서 실온 2~3일, 먹기 전에 전자레인지 10초 데우면 갓 구운 느낌이 나요.",
        "에어프라이어는 160℃에서 12~14분, 한 번에 2개씩 구워요."
      ]
    },
    {
      key: "redvelvet", tab: "Red Velvet", tone: "t-1", emoji: "❤️", title: "레드벨벳 쿠키",
      meta: ["약 10개", "180℃", "10~12분", "휴지 30분"],
      myOven: { time: "180℃ · 13~15분", note: "오래 구우면 붉은색이 갈색으로 변해요. 가장자리만 굳으면 꺼내요." },
      intro: "붉은 반죽에 화이트초코칩이 콕콕 박힌 쫀득한 쿠키예요. 코코아가루가 조금 들어가 은은한 초코 맛이 나요.",
      items: [
        { name: "버터", amt: "100g", note: "약 7큰술 · 실온에 말랑하게" },
        { name: "황설탕", amt: "60g", note: "약 6큰술 · 없으면 설탕" },
        { name: "설탕", amt: "40g", note: "약 4큰술" },
        { name: "달걀", amt: "1개", note: "약 50g · 실온" },
        { name: "박력분", amt: "150g", note: "약 15큰술" },
        { name: "코코아가루", amt: "10g", note: "약 1½큰술 · 무가당" },
        { name: "베이킹소다", amt: "2g", note: "약 ½작은술" },
        { name: "레드 식용색소", amt: "콩알만큼", note: "젤 타입 · 없으면 비트가루 15g" },
        { name: "화이트초코칩", amt: "70g", note: "토핑용으로 조금 남기기" },
        { name: "소금", amt: "한 꼬집" }
      ],
      steps: [
        ["버터 · 설탕", "실온 버터를 부드럽게 풀고 황설탕 · 설탕 · 소금을 넣어 섞습니다. 오래 휘핑하지 않아요."],
        ["달걀 · 색소", "달걀을 2번에 나눠 넣어 섞고, 식용색소를 넣어 원하는 빨간색이 될 때까지 섞습니다. 구우면 조금 어두워지니 생각보다 진하게 해요."],
        ["가루 섞기", "박력분 · 코코아가루 · 베이킹소다를 체 쳐 넣고 주걱으로 가르듯 섞습니다."],
        ["초코칩", "화이트초코칩을 넣고 마저 섞은 뒤, 랩을 씌워 냉장고에서 30분 이상 휴지시킵니다."],
        ["모양 잡기", "약 45g씩 떼어 동글게 빚고, 팬에 간격을 넉넉히 두고 올려 살짝 누릅니다. 남긴 화이트초코칩을 위에 꽂아요."],
        ["굽기", "180℃로 예열한 오븐에서 10~12분, 가장자리만 굳고 가운데는 말랑할 때 꺼냅니다."],
        ["식히기", "팬 위에서 5분 두었다가 식힘망으로 옮깁니다."]
      ],
      tips: [
        "액상 색소는 많이 넣어야 해서 반죽이 질어져요. 젤 타입을 이쑤시개로 조금씩 넣어요.",
        "비트가루를 쓰면 색이 자연스럽고, 박력분을 15g 줄여 주세요.",
        "구운 뒤 따뜻할 때 화이트초코칩을 몇 개 더 꽂으면 보기 좋아요.",
        "에어프라이어는 160℃에서 8~10분, 종이호일을 깔고 3~4개씩 구워요."
      ]
    },
    {
      key: "eggtart", tab: "Egg Tart", tone: "t-2", emoji: "🥧", title: "에그타르트",
      meta: ["6개", "200~220℃", "18~22분", "냉동 파이시트"],
      myOven: { time: "210℃ · 22~26분", note: "높은 온도가 중요해요. 충분히 예열하고, 윗면에 갈색 점이 생기고 바닥 페이스트리가 노릇하면 꺼내요." },
      intro: "시판 냉동 파이시트로 쉽게 만드는 포르투갈식 에그타르트예요. 머핀틀(6구)이나 에그타르트 틀에 구워요.",
      items: [
        { name: "냉동 파이시트", amt: "2장", note: "또는 시판 타르트지 6개" },
        { name: "우유", amt: "100g", note: "약 100ml" },
        { name: "생크림", amt: "100g", note: "약 100ml" },
        { name: "설탕", amt: "40g", note: "약 4큰술" },
        { name: "달걀노른자", amt: "3개", note: "약 54g" },
        { name: "박력분", amt: "5g", note: "약 ½큰술" },
        { name: "바닐라 익스트랙", amt: "2~3방울", note: "선택" }
      ],
      steps: [
        ["시트 준비", "파이시트를 실온에 5분 두어 살짝 녹인 뒤 겹쳐서 돌돌 말고, 6등분으로 자릅니다."],
        ["틀에 펴기", "자른 단면이 위로 오게 틀에 넣고, 엄지에 물을 살짝 묻혀 바닥부터 벽까지 얇게 눌러 폅니다. 가장자리는 틀보다 살짝 올라오게 해요. 다 펴면 냉장고에 넣어 둡니다."],
        ["우유 데우기", "냄비에 우유 · 생크림 · 설탕을 넣고 약불에서 설탕이 녹을 때까지만 데웁니다. 끓이지 않아요."],
        ["필링 섞기", "볼에 노른자와 박력분을 섞고, 따뜻한 우유를 조금씩 부으며 저어 줍니다. (한꺼번에 부으면 노른자가 익어요) 바닐라를 넣고 체에 걸러 거품을 걷어 냅니다."],
        ["채우기", "오븐을 220℃로 예열하고, 차가운 시트에 필링을 80%만 채웁니다."],
        ["굽기", "200~220℃에서 18~22분, 필링이 봉긋 부풀고 윗면에 갈색 점이 생기면 꺼냅니다."],
        ["식히기", "틀째 10분 식힌 뒤 꺼내요. 따뜻할 때 먹어도, 식혀 먹어도 맛있어요."]
      ],
      tips: [
        "필링을 너무 많이 채우면 부풀면서 넘쳐요. 80%가 딱 좋아요.",
        "갈색 점이 잘 안 생기면 마지막 2~3분만 온도를 올리거나 그릴(위 히터)로 구워요.",
        "남은 달걀흰자 3개는 브라운버터 피낭시에에 쓰면 딱 맞아요.",
        "냉장 2일 보관, 에어프라이어 170℃에서 3분 데우면 바삭해져요.",
        "에어프라이어로 구울 때는 180℃에서 15~18분이에요."
      ]
    }
  ];

  /* 쿠쿠 26L 복합레인지(오븐 기능): 작은 오븐이라 열이 약하고 위 히터가 가까워요 */
  var MY_OVEN = "쿠쿠 26L 복합레인지";
  var OVEN_TIPS = [
    "반드시 \"오븐(컨벡션)\" 모드로 굽기 — 전자레인지 · 콤비 모드는 쓰지 않아요.",
    "예열은 표시가 떠도 5분 더, 15분쯤 충분히 해요. 문을 자주 열면 온도가 크게 떨어져요.",
    "위 히터가 가까워 윗면이 먼저 타요. 낮은 받침에 올리고, 진해지면 호일을 덮어요.",
    "레시피 시간보다 20~30% 더 걸려요. 처음엔 아래 \"내 오븐\" 시간대로 굽고, 다음엔 결과를 보고 조절해요.",
    "한 판에 너무 많이 올리지 말고, 가운데와 가장자리가 다르게 익으면 중간에 팬을 180° 돌려요."
  ];

  function recipeCard(parent, r) {
    var c = ui.card(parent, { tab: r.tab, tone: r.tone, title: r.emoji + " " + r.title });
    c.el.classList.add("bake-card");
    c.el.setAttribute("data-recipe", r.key);

    var meta = el("div", "bake-meta");
    r.meta.forEach(function (m) { meta.appendChild(el("span", "bake-pill", m)); });
    c.body.appendChild(meta);
    if (r.myOven) {
      var mo = el("div", "bake-oven");
      mo.appendChild(el("span", "bake-oven-label", "내 오븐 · " + MY_OVEN));
      mo.appendChild(el("strong", "bake-oven-time", r.myOven.time));
      if (r.myOven.note) { mo.appendChild(el("span", "bake-oven-note", r.myOven.note)); }
      c.body.appendChild(mo);
    }

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
      b.setAttribute("data-name", it.name);
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
    return c.el;
  }

  /* 누른 레시피가 맨 앞으로: 순서는 이 브라우저에 기억해요 */
  function savedOrder(list) {
    var keys = list || String(H.safeGet("hds_bake_order") || "").split(",");
    var known = RECIPES.map(function (r) { return r.key; });
    var out = keys.filter(function (k) { return known.indexOf(k) !== -1; });
    known.forEach(function (k) { if (out.indexOf(k) === -1) { out.push(k); } });
    return out;
  }
  function norm(t) { return String(t || "").toLowerCase().replace(/\s+/g, ""); }

  App.page({
    id: "personal-baking", title: "베이킹",
    desc: "자주 굽는 레시피 모음. 준비물을 먼저 챙기고, 만드는 법은 펼쳐서 보세요.",
    render: function (view) {
      var oc = ui.card(view, { tab: "Oven", tone: "t-3", title: "🔥 " + MY_OVEN + "로 구울 때", wide: true });
      oc.el.classList.add("bake-oven-card");
      var ul = el("ul", "bake-oven-tips");
      OVEN_TIPS.forEach(function (t) { ul.appendChild(el("li", "", t)); });
      oc.body.appendChild(ul);
      /* 검색 + 레시피 바로가기 */
      var bar = el("div", "bake-bar");
      var q = el("input", "bake-search"); q.type = "search";
      q.placeholder = "레시피 · 재료 검색 (예: 버터, 블루베리)"; q.setAttribute("aria-label", "레시피 · 재료 검색");
      bar.appendChild(q);
      var chips = el("div", "bake-chips");
      bar.appendChild(chips);
      var found = el("p", "hint bake-found");
      bar.appendChild(found);
      view.insertBefore(bar, oc.el);

      var g = ui.grid(view, true);
      g.classList.add("bake-grid");
      var cards = {};
      savedOrder().forEach(function (k) {
        var r = RECIPES.filter(function (x) { return x.key === k; })[0];
        cards[k] = recipeCard(g, r);
        /* 카드 어디든 누르면 맨 앞으로(이미 맨 앞이면 그대로) */
        cards[k].addEventListener("click", function () { toFront(k, false); });
      });
      var empty = el("p", "empty-state bake-empty", "찾는 레시피가 없어요. 다른 재료 이름으로 검색해 보세요.");
      empty.hidden = true; view.appendChild(empty);

      function toFront(k, scroll) {
        var card = cards[k];
        if (g.firstChild !== card) { g.insertBefore(card, g.firstChild); scroll = true; }
        var order = Array.prototype.map.call(g.children, function (n) { return n.getAttribute("data-recipe"); });
        H.safeSet("hds_bake_order", order.join(","));
        if (order.join(",") !== remote) { remote = order.join(","); App.doc("personal/baking").set({ order: order }, { merge: true }); }
        if (scroll && card.scrollIntoView) { card.scrollIntoView({ behavior: "smooth", block: "start" }); }
      }
      RECIPES.forEach(function (r) {
        var b = el("button", "chip bake-chip", r.emoji + " " + r.title); b.type = "button";
        b.setAttribute("data-recipe", r.key);
        b.addEventListener("click", function () {
          if (q.value) { q.value = ""; filter(); }
          toFront(r.key, true);
        });
        chips.appendChild(b);
      });

      function filter() {
        var t = norm(q.value), n = 0;
        RECIPES.forEach(function (r) {
          var card = cards[r.key];
          var hitTitle = !t || norm(r.title + r.tab + r.key).indexOf(t) !== -1;
          var hitIng = false;
          Array.prototype.forEach.call(card.querySelectorAll(".bake-ing-item"), function (b) {
            var on = !!t && norm(b.getAttribute("data-name")).indexOf(t) !== -1;
            b.classList.toggle("hit", on);
            if (on) { hitIng = true; }
          });
          card.hidden = !(hitTitle || hitIng);
          if (!card.hidden) { n++; }
        });
        found.textContent = t ? "검색 결과 " + n + "개" : "";
        empty.hidden = n > 0;
      }
      q.addEventListener("input", filter);
      filter();

      /* 순서는 Firestore(personal/baking.order)에 저장해 모든 기기에서 같게. 브라우저 기억은 처음 빨리 그리기용 */
      var remote = null;
      App.watchDoc(App.doc("personal/baking"), function (d) {
        var list = d && Array.isArray(d.order) ? d.order : null;
        if (!list) { return; }
        remote = list.join(",");
        var order = savedOrder(list);
        H.safeSet("hds_bake_order", order.join(","));
        order.forEach(function (k) { g.appendChild(cards[k]); });
      });
    }
  });

})(window.App);
