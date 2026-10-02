# 프로젝트 지침: "Hello dear Sunny" 개인 워크스페이스 홈페이지

너는 내 개인 홈페이지 "Hello dear Sunny"를 함께 만들고 고쳐 나가는 개발 파트너야. 아래는 지금까지 만든 사이트의 구조, 규칙, 작업 방식이야. 새 요청을 받으면 이 내용을 기준으로 판단하고, 기존 구조와 코드 스타일을 그대로 따라 줘.

---

## 1. 나에 대해

- 영남대학교 대학원 범죄심리학과 석·박사 통합과정 수료, 박사학위논문 준비 중이야.
- 사이트 하나에서 박사 연구, 글쓰기(작가), 개인 일정·할 일·가계부를 관리해.
- 개발자가 아니야. 설명은 **한국어로, 쉬운 말로** 해 주고, 영어 개발 용어는 꼭 필요할 때만 풀어서 써 줘.
- 답변은 결과 위주로 짧게 해 줘. 내가 할 일(버튼 누르기, 설정 바꾸기)은 번호 순서대로 알려 줘.
- 디자인을 크게 바꾸는 요청이면 **먼저 예시 이미지(목업)를 보여 주고** 확인받은 뒤에 고쳐 줘.

## 2. 사이트 기본 정보

- **주소**: https://qkrtjsdud26085.github.io/casenote/ (GitHub Pages)
- **저장소**: https://github.com/qkrtjsdud26085/casenote (브랜치 `master`, 푸시하면 1~2분 뒤 사이트에 반영돼)
- **로컬 폴더**: `G:\내 드라이브\0. AI\개인 홈페이지`
- **구성**: 빌드 도구 없는 순수 HTML/CSS/JavaScript야. 프레임워크를 쓰지 않아.
- **데이터**: Firebase(프로젝트 `hello-dear-sunny`)를 써. 로그인은 Google 로그인이고, **소유자 계정 1개만** 내용을 볼 수 있어. 데이터는 Firestore에 저장해.
- **외부 연동**: Google Calendar(읽기), Google Tasks(읽기·쓰기), Google Calendar 일정 만들기. Firebase Google 로그인 팝업으로 1시간짜리 접근 토큰을 받아 써.
- 저장소가 **공개**라서, 개인정보·연구 원자료·비밀 키는 **절대 코드에 넣지 마.** 모두 로그인해야 보이는 Firestore에만 저장해.

## 3. 파일 구조 (`assets/`)

| 파일 | 역할 |
|---|---|
| `index.html` | 페이지 뼈대, 스크립트 로드 순서. 캐시 때문에 모든 asset에 `?v=날짜+알파벳` 버전이 붙어 있고, **수정할 때마다 버전을 올려야 해** |
| `core.js` | 공용 도우미(`App.h`), Firebase·로그인, **메뉴(`App.MENU`)**, 라우터(`#/페이지id`). 페이지 제목 아래 설명(desc)은 표시하지 않아 |
| `ui.js` | 공용 UI: `ui.card`, `ui.grid`, `ui.itemsPanel`(목록·표 편집기), `ui.fieldsPanel`, `ui.upcoming` 등 |
| `gcal.js` | Google Calendar 읽기 동기화 → `personal/gcal`. 연결 한 번으로 캘린더와 할 일 권한을 같이 받아 |
| `gtasks.js` | Google Tasks 목록·추가·완료·삭제 → `personal/gtasks`에 사본 저장. 홈 빠른 추가에 시간을 적으면 Google Calendar 일정으로 만들어 |
| `pages-home.js` | 메인 홈: 빠른 할 일 입력, 요약 4칸(진행 중 논문[빈 칸] · 오늘 집필[작가 집필 기록] · 오늘 지출 · 이번 달 지출), 왼쪽 Today 카드 + 오른쪽 오늘의 기분(이모티콘 · 한 줄 메모, 일기 · 주간 리뷰로 가는 링크). 그 아래 카드는 없어 |
| `pages-other.js` | 개인 › 일정 · 캘린더(왼쪽 "캘린더 · 할 일" 한 카드: 달력[칸마다 그날 기분 이모티콘] → 고른 날 일정 → Google 할 일 / 오른쪽 기분 카드: 고른 날 기분 · 한 줄 메모 · 이번 주 줄 · 일기 쓰기 링크), 주간 리뷰(이번 주 기분 · 기분 달력 포함) |
| `pages-diary.js` | 개인 › 일기(하루 한 편, 집필과 같은 편집기, 3분마다 자동 저장 + 다른 날 · 다른 메뉴로 갈 때 · 창을 숨길 때 저장, 저장 전 글은 브라우저에 임시 보관, 지난 일기 목록) + `App.MOODS` · `App.moodPicker`(기분 고르기 공용: 홈 · 일정 · 캘린더 · 일기) |
| `pages-budget.js` | 개인 › 가계부, 월별 리포트, 카드 분석(내 카드 혜택 · 전월실적, `personal/cards`), 휴대폰 결제 알림 해석 |
| `research-kit.js` | 연구 페이지 공용 도구(JSON 불러오기·내보내기, 단계 표시, 페이지 안 탭 `App.rkit.pageTabs`) |
| `pages-ias.js` | 박사 › IAS 척도 타당화 (탭 4개) |
| `pages-diss.js` | 박사 › 비선형 공격성 임계점 › 연구재단 선정 (탭 5개). 개요 · 로드맵 = 과제 정보(단계 표시 없음) → 연구 설계 · 흐름 한눈에(수치 + 흐름) → 목표 · 요약 · 기대효과 → 추진 일정(차트만, 일정의 "구분" 값이 위쪽 실선 구간으로) → 연구계획서 내용 전체(예전 별도 메뉴) → 자료 불러오기 |
| `pages-phd.js` | 박사 › 비선형 [현재 진행중], 자격증(탭 3개, 임상심리사는 "자격 정보 · D-day" 카드와 "기출문제 바로가기" 카드 두 개만), AI(탭 3개) |
| `pages-thesis.js` | 박사 › 논문 › 논문 추천(OpenAlex, 한 줄에 2편, 영어 요약은 translate.googleapis.com 공개 주소(막히면 MyMemory)로 한국어 번역해 오늘 추천(`research/reco` daily.items[].absKo)에 저장, 제목 · 저자는 원문 그대로) + 저장한 논문 목록(`research/papers`, 읽기 상태 · 메모 · 검색). `App.tpl.CHECK_FIELDS`도 여기서 정의해(pages-diss.js가 씀) |
| `pages-writer.js`, `canvas.js` | 작가 탭 |
| `pages-compose.js` | `App.richEditor`(한글 프로그램 같은 편집기 공용: 집필 · 일기) + 작가 › 집필: 한글 프로그램 같은 편집기(제목 · 작성 날짜 · 카테고리 · 완료, 서식 도구 막대, 글자 수 · 원고지 매수), 저장한 글 목록(누르면 불러와 수정, 삭제), 저장 전 임시 글은 브라우저에 자동 보관 |
| `quotes.js` | 오늘의 명언 |
| `style.css` | 전체 스타일. 색은 `:root` 변수로 정의하고, 다크 모드는 `prefers-color-scheme`와 `[data-theme]`을 둘 다 처리해 |
| `mock.js`, `selftest.js` | 로컬 테스트 전용(메모리 속 가짜 Firebase + 자동 테스트) |

### 메뉴 구성 (`core.js`의 `App.MENU`)

- **박사**: 논문(둘째 줄: ① IAS 척도 타당화 / ② 비선형 공격성 임계점 ▾[연구재단 선정, 현재 진행중(+1차년도 보고서 탭)] / 논문 추천) / 자격증 ▾([전체 현황], [범죄심리사], [피해상담사], [임상심리사]) / AI
- **작가**: 집필 책상 / 글쓰기 기록 / 집필 / Capture / 아이디어 캔버스 / 문장 · 독서 노트 (드롭다운 없이 한 줄)
  - 집필 책상: 맨 위 [오늘의 집필 | 글감 빨리 적기] → 마감 다가오는 공모 → 지금 쓰고 있는 작품(작품 관리 페이지는 지워서 기존 `writer/works` 데이터만 보여 줘)
  - Capture(`writer-capture`): 글감 빨리 적기에 쓴 모든 글감(`writer/ideas`)을 최신순으로 보고 검색 · 수정 · 삭제
  - 예전 구상 / 소설 · 에세이 / 집필 · 퇴고 메뉴(글감 수집함, 줄거리, 인물 · 세계관, 에세이 서랍, 작품 관리, 집필 기록, 퇴고)와 오늘의 글쓰기 질문은 코드에서 지웠어. 데이터는 Firestore에 남아 있어.
- 박사 홈(졸업 요건)과 기타 자료는 코드까지 지웠어(`pages-projects.js`, `projects.js` 삭제, `pages-thesis.js`에는 논문 추천만 남음).
- **개인**: 일정 · 캘린더 / 가계부 / 일기 / 주간 리뷰
  - 월별 리포트 · 카드 분석은 메뉴줄에 두지 않아. 가계부 제목 옆 [가계부 | 월별 리포트 | 카드 분석] 버튼으로 들어가.
- 하위 페이지를 메뉴에서 숨기고 페이지 안 탭으로만 보여 줄 때는 페이지 정의에 `navHidden: true, navParent: "부모id"`를 쓰고, 메뉴 이름을 바꿀 때는 `navLabel`, 탭 이름을 바꿀 때는 `tabLabel`을 써.

### 페이지 만드는 법

```js
App.page({ id: "my-page", title: "제목", render: function (view) {
  var c = ui.card(view, { tab: "Tab", tone: "t-1", title: "카드 제목", wide: true });
  ui.itemsPanel(c.body, { ref: App.doc("research/mydoc"), fields: [...], views: ["table"] });
}});
```

- 새 페이지는 `App.MENU`에도 등록하고, 새 파일이면 `index.html`에 `<script>`도 추가해.
- `ui.itemsPanel`의 주요 옵션:
  - `fields`: 각 칸의 `key`, `label`, `type`(text/textarea/select/date/number/url/check), `title`, `col`, `meta`
  - 보기와 입력: `views`(["table"], ["cards"]), `quickFields`(한 줄 빠른 입력. **제목 칸을 맨 앞에**), `search`, `filters`
  - 상태와 날짜: `checkKey`(완료 체크), `statusKey`(상태 칩), `dueKey` + `ddayInTable`(표에 D-day 표시)
  - 정렬: `sort`, `reorder: { resetLabel }`(▲▼로 순서 바꾸기. 바꾼 순서는 `manualOrder`로 저장돼)
  - 기타: `summary`, `actions`(예: [복사] 버튼), `defaults`, `hint`, `empty`

## 4. Firestore 데이터 위치

- **개인**
  - `personal/budget`: 예산, 고정 수입·지출
  - `personal/cards`: 내 카드(결제수단 · 혜택 · 전월실적)
  - `personal/ledger-YYYY-MM`: 월별 가계부 내역
  - `personal/gcal`: 캘린더 사본
  - `personal/gtasks`: 할 일 사본
  - `personal/quicknote`: 캘린더 옆 메모
  - `personal/mood`: 오늘의 기분(`days.YYYY-MM-DD` = { mood, note[한 줄 메모] }). 홈 · 일정 · 캘린더 · 일기에서 쓰고, 주간 리뷰와 일정 달력에서 이모티콘으로 봐
  - `personal/diary`: 일기 목록(`days.YYYY-MM-DD` = { chars, preview }), `personal/diary_YYYY-MM-DD`: 일기 본문(HTML, 줄간격)
  - `personal/weekly`: 주간 리뷰
  - 컬렉션: `schedule`(사이트 일정), `budgetInbox`(휴대폰 결제 알림), `todos`(예전 할 일. Google Tasks로 옮기는 버튼이 있어)
- **박사**
  - `research/gradreqs`: 졸업 요건 (화면에서는 지웠고 데이터만 남아 있어)
  - `research/projects`, `research/pj_*`: 예전 논문 프로젝트 (화면에서는 지웠고 데이터만 남아 있어)
  - IAS 연구 자료는 `ias_*`, 연구재단 선정 박사학위논문 자료는 `diss_*` 이름으로 저장돼(research-kit가 관리)
  - 자격증: `research/certs`, `research/certplan`, `research/certlog`, `research/certfiles`, 세부 자격증(`research/cert_crime_*`, `research/cert_victim_*`, `research/cert_clinical_*`)
  - AI: `research/aitools`, `research/aiprompts`, `research/ainotes`, `research/ailog`
- **작가**: `writer/*`
  - `writer/compose`: 집필 페이지의 글 목록(제목 · 날짜 · 카테고리 · 완료 · 글자 수), `writer/compose_<id>`: 글 본문(HTML, 줄간격)
- 예전 메뉴에서 지운 데이터(메모, 습관, 회사 등)도 Firestore에는 남아 있어. **데이터 삭제는 내가 요청할 때만** 해 줘.

## 5. 주요 기능 요약

- **일정 · 캘린더**
  - 왼쪽: 월간 캘린더. 선택한 날의 일정 목록과 일정 추가 입력칸이 달력 아래에 있어. 분류에서 "할 일 (Google)"을 고르면 그 날짜를 기한으로 Google Task가 만들어져.
  - 달력 점: 그날의 항목 개수만큼 찍혀. **노란 점은 일정, 파란 점은 Google 할 일**이고, 6개가 넘으면 +N으로 표시돼.
  - 오른쪽: 할 일(Google Tasks)과 자동 저장 메모. 오른쪽 높이는 캘린더 높이를 넘지 않아.
  - 아래: Google 연동, 다가오는 일정. 작게 접힌 카드로 한 줄에 나란히 있어.
- **가계부**
  - 요약 칸 6개(수입, 지출, 잔액, 고정지출, 변동지출, 예산 잔여)
  - 왼쪽: 수입·지출 내역. 입력, 필터('지출'은 고정지출 제외), 체크박스로 선택 삭제·전체 선택, CSV 내보내기
  - 오른쪽: 날짜별 지출 달력 → 고정지출/고정수입 카드(‹ ›로 전환, 여러 개 붙여넣기, 체크하면 그 달 내역에 반영, 선택 삭제) → 분류별 지출 → 월 예산·결제수단별 지출
  - **월별 리포트**: 최근 6·12개월/올해의 월별 지출·수입 꺾은선 그래프, 월별 합계 표
- **휴대폰 결제 알림 연동**(갤럭시 + MacroDroid)
  - 알림 원문을 Firestore REST로 `budgetInbox`에 보내고, 사이트가 해석해서 "휴대폰 결제 알림" 칸에 보여줘. 내가 확인하고 추가하는 방식이야.
  - 지원 형식: 신한카드, 현대카드(승인·취소), iM뱅크(대구은행), KB국민은행(입금·출금), 간편결제 문장("○○에서 N원을 결제했어요"), 금액이 앞에 오는 앱 알림("₩18,000 결제 완료 가게이름"). 가맹점 이름으로 분류를 추측해.
  - 비밀 키는 Firebase 보안 규칙과 MacroDroid에만 있어. **코드와 이 문서에는 절대 적지 마.**
- **박사 홈 · 졸업 요건 · 기타 자료(논문 프로젝트 등)**: 코드에서 모두 지웠어. 홈의 "진행 중 논문" 칸은 연결할 곳이 없어 빈 칸(—)으로 남겨 뒀어. 데이터(`research/gradreqs`, `research/projects` 등)는 Firestore에 남아 있어.
- **주간 리뷰**: 위쪽에 이번 주 기분(월~일, ‹ ›로 주 이동)과 기분 달력(날짜를 누르면 그날 기분 · 일기). 아래는 주간 리뷰 카드
- **박사 연구 자료**는 각 연구 페이지의 "자료 불러오기 · 백업" 카드에서 JSON 파일로 불러와(원본 파일은 연구 폴더에 있어).
  - 박사학위 관련 자료는 `G:\내 드라이브\3. 대학원\6. 석박통합 6학차\연구재단`에 있어(연구계획서, 참고문헌, `박사학위논문_홈페이지자료.json`).

## 6. 작업 방식 (꼭 지켜 줘)

1. **고치기 전에 해당 파일을 먼저 읽어.** 다른 AI 세션이 같은 폴더를 동시에 고칠 수 있어.
2. `git status`로 내가 모르는 변경이 섞여 있는지 확인하고, **내 요청과 관련된 파일만** 커밋해. 다른 세션의 미완성 작업이 섞여 있으면 먼저 나에게 물어봐.
3. 수정한 asset이 있으면 `index.html`의 `?v=` 버전을 올려.
4. **테스트**:
   - 헤드리스 Edge로 `index.html?mock&selftest`를 열고, 결과 JSON의 `failed`와 `errors`가 빈 배열인지 확인해.
   - 새 기능에는 `selftest.js`에 테스트를 추가하고, 페이지 수가 바뀌면 `page count` 기대값도 고쳐.
5. 화면이 바뀌면 샘플 데이터로 스크린샷을 찍어 **직접 보고 확인해.**
6. 커밋하고 `master`에 푸시한 뒤, 1분쯤 기다렸다가 실제 사이트의 파일에 변경이 반영됐는지 확인해.
   - 이 PC의 Git은 `C:\Program Files\Git`에 있고, 푸시할 때는 `git -c credential.helper=manager push`를 써.
7. 끝나면 나에게 **무엇이 바뀌었는지, 내가 할 일(Ctrl+F5 새로고침 등)** 을 짧게 알려 줘.
8. 차트를 만들 때는 색 대비와 색약 구분을 검사해서, 밝은 화면과 어두운 화면 모두에서 잘 보이는 색을 써.
