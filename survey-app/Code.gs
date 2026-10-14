/**
 * 척도 응답 수집 앱 (Google Apps Script)
 *
 * 이 스크립트는 "앱_문항설정" 스프레드시트에 붙여 쓴다(확장 프로그램 > Apps Script).
 * 따로 만든 프로젝트라면 아래 SHEET_ID에 스프레드시트 ID를 넣는다.
 * 문항 내용과 응답은 모두 그 스프레드시트에만 저장되고, 이 코드에는 들어 있지 않다.
 *
 * 시트 구성
 *  - 설정: 항목 | 값  (관리자 비밀번호, 연구 제목, 연구 설명, 동의 문구, 연구자 연락처, 마무리 안내)
 *  - 척도: 순서 | 척도코드 | 척도이름 | 최소 | 최대 | 응답보기 | 안내문 | 조건 | 사용
 *  - 문항: 척도코드 | 문항번호 | 하위요인코드 | 하위요인 | 상위요인 | 역채점 | 문항내용
 *  - 점수: 변수명 | 척도코드 | 점수이름 | 포함문항
 *  - 응답, 참여자: 첫 응답이 들어올 때 자동으로 만들어진다.
 */

var BASIC_FIELDS = [
  // key, 시트 머리글, 원데이터 문항번호
  ["age", "age", "SQ2"], ["sex", "sex", "SQ1"], ["edu", "edu", "SQ4"], ["marriage", "marriage", "SQ3"],
  ["relation", "relation_now", "SQ6"], ["breakup", "breakup", "SQ9"], ["work", "work", "SQ11"]
];
var SESSION_HOURS = 6;

// 스프레드시트에서 [확장 프로그램 › Apps Script]로 열었다면 비워 둬도 돼요.
// script.google.com에서 따로 만든 프로젝트라면, 스프레드시트 주소의
// https://docs.google.com/spreadsheets/d/【이 부분】/edit 을 따옴표 안에 붙여 넣어 주세요.
var SHEET_ID = "";

function ss_() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive();
  if (!ss) throw new Error("연결된 스프레드시트가 없어요. Code.gs 맨 위 SHEET_ID에 스프레드시트 주소의 ID를 넣어 주세요.");
  return ss;
}

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) === "admin" ? "admin" : "index";
  return HtmlService.createTemplateFromFile(page).evaluate()
    .setTitle(page === "admin" ? "응답 관리" : readSettings_()["연구 제목"] || "설문")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* ---------- 시트 읽기 ---------- */

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error("'" + name + "' 시트가 없어요.");
  return sh;
}

function rows_(name) {
  var v = sheet_(name).getDataRange().getValues();
  var head = v.shift().map(function (h) { return String(h).trim(); });
  return v.filter(function (r) { return String(r[0]).trim() !== ""; }).map(function (r) {
    var o = {};
    head.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
}

function readSettings_() {
  var o = {};
  try { rows_("설정").forEach(function (r) { o[String(r["항목"]).trim()] = r["값"]; }); } catch (e) {}
  return o;
}

function isYes_(v) { return /^(y|yes|o|예|사용|true|1)$/i.test(String(v).trim()); }

/** 척도 · 문항 · 점수 정의를 한 번에 읽는다. */
function readSurvey_() {
  var scales = rows_("척도")
    .filter(function (s) { return String(s["사용"]).trim() === "" || isYes_(s["사용"]); })
    .sort(function (a, b) { return Number(a["순서"]) - Number(b["순서"]); })
    .map(function (s) {
      return {
        code: String(s["척도코드"]).trim(), name: String(s["척도이름"]), min: Number(s["최소"]), max: Number(s["최대"]),
        labels: String(s["응답보기"] || "").split("|").map(function (x) { return x.trim(); }),
        guide: String(s["안내문"] || ""), cond: String(s["조건"] || "").trim(), items: [], scores: []
      };
    });
  var byCode = {};
  scales.forEach(function (s) { byCode[s.code] = s; });
  rows_("문항").forEach(function (r) {
    var s = byCode[String(r["척도코드"]).trim()];
    if (s) s.items.push({ code: String(r["문항번호"]).trim(), sub: String(r["하위요인코드"] || ""), text: String(r["문항내용"]), reverse: isYes_(r["역채점"]) });
  });
  rows_("점수").forEach(function (r) {
    var s = byCode[String(r["척도코드"]).trim()];
    if (s) s.scores.push({ var: String(r["변수명"]).trim(), name: String(r["점수이름"]),
      items: String(r["포함문항"]).split(",").map(function (x) { return x.trim(); }).filter(String) });
  });
  return scales;
}

/* ---------- 참여자 화면 ---------- */

/** 참여자 화면이 처음 열릴 때 부른다. 역채점 여부는 보내지 않는다. */
function getSurvey() {
  var st = readSettings_();
  return {
    title: st["연구 제목"] || "설문 조사",
    intro: st["연구 설명"] || "",
    consent: st["동의 문구"] || "",
    contact: st["연구자 연락처"] || "",
    outro: st["마무리 안내"] || "",
    scales: readSurvey_().map(function (s) {
      return { code: s.code, name: s.name, min: s.min, max: s.max, labels: s.labels, guide: s.guide, cond: s.cond,
        items: s.items.map(function (i) { return { code: i.code, text: i.text }; }) };
    })
  };
}

/** 이 참여자에게 보여 줄 척도인지 (원데이터의 건너뛰기 규칙과 같다) */
function shown_(cond, b) {
  if (cond === "relation") return b.relation == 1 || b.relation == 2;   // 친밀한 관계 경험 있음
  if (cond === "breakup") return b.relation == 2 || b.breakup == 1;     // 이별 경험 있음
  if (cond === "work") return b.work == 1 || b.work == 2;               // 직장 경험 있음
  return true;
}

function computeScores_(scales, answers) {
  var out = {};
  scales.forEach(function (s) {
    var rev = {};
    s.items.forEach(function (i) { rev[i.code] = i.reverse; });
    s.scores.forEach(function (sc) {
      var sum = 0, ok = sc.items.length > 0;
      sc.items.forEach(function (c) {
        var v = answers[c];
        if (v === "" || v === null || v === undefined || isNaN(Number(v))) { ok = false; return; }
        v = Number(v);
        sum += rev[c] ? s.min + s.max - v : v;
      });
      out[sc.var] = ok ? sum : "";
    });
  });
  return out;
}

function ensureHeader_(sh, head) {
  if (sh.getLastRow() === 0) { sh.appendRow(head); sh.setFrozenRows(1); return head; }
  var cur = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var add = head.filter(function (h) { return cur.indexOf(h) < 0; });
  if (add.length) { sh.getRange(1, cur.length + 1, 1, add.length).setValues([add]); cur = cur.concat(add); }
  return cur;
}

function getOrCreate_(name) {
  var ss = ss_();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

/** 참여자가 [제출]을 누르면 부른다. */
function submitResponse(payload) {
  var scales = readSurvey_();
  var b = payload.basic || {}, a = payload.answers || {};
  if (!payload.consent) throw new Error("연구 참여 동의가 필요해요.");
  if (!String(b.name || "").trim()) throw new Error("이름을 적어 주세요.");
  var age = Number(b.age);
  if (!(age >= 14 && age <= 100)) throw new Error("나이를 확인해 주세요.");

  // 보여 준 척도의 문항은 모두 답해야 하고, 범위를 벗어난 값은 받지 않는다.
  var clean = {};
  scales.forEach(function (s) {
    if (!shown_(s.cond, b)) return;
    s.items.forEach(function (i) {
      var v = Number(a[i.code]);
      if (a[i.code] === undefined || a[i.code] === "" || isNaN(v) || v < s.min || v > s.max) throw new Error(s.name + " " + i.code + " 문항에 답해 주세요.");
      clean[i.code] = v;
    });
  });
  var scores = computeScores_(scales, clean);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var id = "R" + Utilities.formatDate(new Date(), "Asia/Seoul", "yyMMdd") + "-" + Utilities.getUuid().slice(0, 6);
    var now = new Date(), started = payload.startedAt ? new Date(payload.startedAt) : now;
    var minutes = Math.round((now - started) / 6000) / 10;

    var itemCodes = [], scoreVars = [];
    scales.forEach(function (s) {
      s.items.forEach(function (i) { itemCodes.push(i.code); });
      s.scores.forEach(function (sc) { scoreVars.push(sc.var); });
    });
    var resp = getOrCreate_("응답");
    var head = ensureHeader_(resp, ["응답ID", "제출시각", "소요분"].concat(BASIC_FIELDS.map(function (f) { return f[1]; }), itemCodes, scoreVars));
    var rec = { "응답ID": id, "제출시각": now, "소요분": minutes };
    BASIC_FIELDS.forEach(function (f) { rec[f[1]] = b[f[0]] === undefined ? "" : b[f[0]]; });
    Object.keys(clean).forEach(function (k) { rec[k] = clean[k]; });
    Object.keys(scores).forEach(function (k) { rec[k] = scores[k]; });
    resp.appendRow(head.map(function (h) { return rec[h] === undefined ? "" : rec[h]; }));

    // 이름은 응답과 다른 시트에 따로 둔다(분석 파일에 이름이 섞이지 않게).
    var ppl = getOrCreate_("참여자");
    ensureHeader_(ppl, ["응답ID", "이름", "제출시각"]);
    ppl.appendRow([id, String(b.name).trim(), now]);
    return { id: id };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 관리자 화면 ---------- */

function adminLogin(password) {
  var pw = String(readSettings_()["관리자 비밀번호"] || "");
  if (!pw) throw new Error("'설정' 시트에 관리자 비밀번호를 먼저 적어 주세요.");
  Utilities.sleep(400);
  if (String(password) !== pw) throw new Error("비밀번호가 맞지 않아요.");
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put("admin_" + token, "1", SESSION_HOURS * 3600);
  return token;
}

function checkToken_(token) {
  if (!token || !CacheService.getScriptCache().get("admin_" + token)) throw new Error("다시 로그인해 주세요.");
}

function table_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return { head: [], rows: [] };
  var v = sh.getDataRange().getValues();
  return { head: v.shift().map(String), rows: v };
}

/** 관리자 화면에 필요한 자료를 한 번에 돌려준다. 계산(평균 · 신뢰도)은 화면에서 한다. */
function getAdminData(token) {
  checkToken_(token);
  var scales = readSurvey_();
  var resp = table_("응답"), ppl = table_("참여자");
  var names = {};
  ppl.rows.forEach(function (r) { names[r[0]] = r[1]; });
  var rows = resp.rows.map(function (r) {
    var o = {};
    resp.head.forEach(function (h, i) { o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
    o["이름"] = names[o["응답ID"]] || "";
    return o;
  });
  return {
    title: readSettings_()["연구 제목"] || "설문 조사",
    scales: scales.map(function (s) {
      return { code: s.code, name: s.name, min: s.min, max: s.max, cond: s.cond,
        items: s.items.map(function (i) { return { code: i.code, sub: i.sub, text: i.text, reverse: i.reverse }; }), scores: s.scores };
    }),
    rows: rows
  };
}
