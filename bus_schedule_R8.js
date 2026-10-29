// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: magic;
// bus_schedule_for_CIT


// -------------------- 有効期限 --------------------
const EXPIRATION_DATE = new Date(2026, 11, 23, 23, 59, 59, 999); // 月は0ベース：11=12月。当日いっぱい有効


// -------------------- ウィジェットサイズ検出 --------------------
// 実機（ウィジェットとして配置時）は config.widgetFamily が
// "small" / "medium" / "large" / "extraLarge"（extraLargeはiPadのみ）を返す。
// Scriptableアプリ内でスクリプトを直接実行してプレビューする場合は
// config.widgetFamily が取得できないため、TEST_FAMILY で確認したいサイズを指定できる。
const TEST_FAMILY = null; // 例: "small" / "medium" / "large" / "extraLarge"
const FAMILY = config.widgetFamily || TEST_FAMILY || "medium";

// ウィジェットの色設定
const WIDGET_BG_COLOR = "#0C1220";   // 背景色
const ROUTE_COLOR = { tsudanuma: "#1E3A8A", shinNarashino: "#EA580C" };
const COUNTDOWN_COLOR = "#FDE68A";   // 「あと◯分」の色

// サイズ（ファミリー）ごとのレイアウト設定
// compact: true の場合は縦積みの簡易リスト表示（iPhoneの小サイズ向け）
// compact: false の場合は2枚のカードを同じ幅で横並び表示（サイズに応じて拡大）
const LAYOUT = {
  small: {
    compact: true,
    padding: { top: 10, left: 12, bottom: 10, right: 12 },
    rowSpacing: 8,
    fontSize: { dot: 10, label: 11, time: 18, countdown: 10, footer: 8 },
    nextCount: 1
  },
  medium: {
    compact: false,
    padding: { top: 8, left: 10, bottom: 8, right: 10 },
    cardPadding: { top: 6, left: 12, bottom: 6, right: 12 },
    stackSpacing: 10,
    cardRadius: 18,
    fontSize: { title: 13, nextLabel: 11, nextTime: 28, afterLabel: 11, afterTime: 13, footer: 11 },
    footerSpacer: 6,
    nextCount: 3
  },
  large: {
    compact: false,
    padding: { top: 14, left: 16, bottom: 14, right: 16 },
    cardPadding: { top: 12, left: 16, bottom: 12, right: 16 },
    stackSpacing: 14,
    cardRadius: 22,
    fontSize: { title: 16, nextLabel: 13, nextTime: 30, afterLabel: 13, afterTime: 15, footer: 14 },
    footerSpacer: 10,
    nextCount: 4
  },
  extraLarge: {
    compact: false,
    padding: { top: 18, left: 22, bottom: 18, right: 22 },
    cardPadding: { top: 16, left: 22, bottom: 16, right: 22 },
    stackSpacing: 20,
    cardRadius: 26,
    fontSize: { title: 20, nextLabel: 16, nextTime: 38, afterLabel: 16, afterTime: 18, footer: 17 },
    footerSpacer: 12,
    nextCount: 5
  }
};
const L = LAYOUT[FAMILY] || LAYOUT.medium;


// -------------------- 時刻データ --------------------
const routes = {
  tsudanuma: {
    title: "津田沼行き",
    color: ROUTE_COLOR.tsudanuma,
    weekday: ["08:35","09:10","09:20","10:10","10:20","11:10","11:30","12:20","12:30","13:15","13:50","14:15","14:45","15:20","15:50","16:15","16:40","17:20","17:40","18:15","18:40","19:10","19:40","20:10"],
    saturday: ["08:35","10:40","11:40","12:20","12:50","13:20","15:20","16:10","17:20","18:10","19:40"],
    holiday: ["09:00","10:00","12:00","15:00"],
    special: {"2026-12-23": ["09:00","10:00","12:00"]}
  },
  shinNarashino: {
    title: "新習志野行き",
    color: ROUTE_COLOR.shinNarashino,
    weekday: ["09:30","09:50","10:40","11:30","11:55","12:55","13:20","13:50","14:20","14:50","15:20","15:50","16:10","16:35","17:10","17:50","18:10","19:10","19:50","20:10"],
    saturday: ["08:20","10:20","11:20","12:00","12:30","13:00","13:30","15:20","15:50","16:40","18:40","20:10"],
    holiday: ["09:30","11:30","14:30","16:30","18:00"],
    special: {"2026-12-23": ["09:30","11:30"]}
  }
};


// -------------------- 祝日 --------------------
// 祝日APIから取得して30日間キャッシュする。通信できないときはキャッシュ→下の一覧の順で使う。
const HOLIDAY_API = "https://holidays-jp.github.io/api/v1/date.json";
const FALLBACK_HOLIDAYS = [
  "2026-01-01","2026-01-12","2026-02-11","2026-02-23","2026-03-20","2026-04-29",
  "2026-05-03","2026-05-04","2026-05-05","2026-05-06","2026-07-20","2026-08-11",
  "2026-09-21","2026-09-22","2026-09-23","2026-10-12","2026-11-03","2026-11-23"
];

async function loadHolidays(){
  const fm = FileManager.local();
  const path = fm.joinPath(fm.documentsDirectory(), "bus_schedule_holidays.json");
  const cached = fm.fileExists(path) ? JSON.parse(fm.readString(path)) : null;
  if(cached && Date.now() - cached.fetchedAt < 1000*60*60*24*30){
    return new Set([...cached.dates, ...FALLBACK_HOLIDAYS]);
  }
  try {
    const req = new Request(HOLIDAY_API);
    req.timeoutInterval = 5;
    const dates = Object.keys(await req.loadJSON());
    fm.writeString(path, JSON.stringify({ fetchedAt: Date.now(), dates }));
    return new Set([...dates, ...FALLBACK_HOLIDAYS]);
  } catch(e) {
    return new Set([...(cached ? cached.dates : []), ...FALLBACK_HOLIDAYS]);
  }
}


// -------------------- 日付関数 --------------------
function formatDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatTime(d){
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// routeObj を渡すとその路線の特別ダイヤも考慮する
function dayType(date, holidays, routeObj){
  const s = formatDate(date);
  if(routeObj && routeObj.special[s]) return "special";
  if(holidays.has(s) || date.getDay()===0) return "holiday";
  if(date.getDay()===6) return "saturday";
  return "weekday";
}

function dayLabel(date, holidays){
  const s = formatDate(date);
  if(Object.values(routes).some(r => r.special[s])) return "特別日";
  return { holiday: "休日", saturday: "土曜", weekday: "平日" }[dayType(date, holidays)];
}

function departuresOn(routeObj, date, holidays){
  const type = dayType(date, holidays, routeObj);
  const list = type==="special" ? routeObj.special[formatDate(date)] : routeObj[type];
  return list.map(t => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  });
}

// 今日の残りの便。今日が終わっていれば明日の便を返す
function nextDepartures(routeObj, now, holidays, count){
  const today = departuresOn(routeObj, now, holidays).filter(d => d > now);
  if(today.length) return { times: today.slice(0, count), tomorrow: false };
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { times: departuresOn(routeObj, tomorrow, holidays).slice(0, count), tomorrow: true };
}


// -------------------- 表示 --------------------
async function show(widget){
  if(config.runsInWidget){
    Script.setWidget(widget);
  } else if(FAMILY === "small"){
    await widget.presentSmall();
  } else if(FAMILY === "large"){
    await widget.presentLarge();
  } else if(FAMILY === "extraLarge" && typeof widget.presentExtraLarge === "function"){
    await widget.presentExtraLarge();
  } else {
    await widget.presentMedium();
  }
  Script.complete();
}

const now = new Date();
let widget = new ListWidget();
widget.backgroundColor = new Color(WIDGET_BG_COLOR);
widget.setPadding(L.padding.top, L.padding.left, L.padding.bottom, L.padding.right);


// ---------- 期限切れ ----------
if(now > EXPIRATION_DATE){
  const d = EXPIRATION_DATE;
  let text = widget.addText(`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日までのダイヤです\n更新が必要です`);
  text.font = Font.boldSystemFont(16);
  text.textColor = Color.red();
  text.centerAlignText();

  let info = widget.addText("スクリプトを再取得してください。");
  info.textColor = Color.lightGray();
  info.font = Font.systemFont(10);
  info.centerAlignText();

  await show(widget);
  return;
}


// ---------- 通常表示 ----------
const holidays = await loadHolidays();
const departures = {};
for(const key in routes){
  departures[key] = nextDepartures(routes[key], now, holidays, L.nextCount);
}

// 次の便が出た直後か、日付が変わった直後に更新する
const midnight = new Date(now);
midnight.setHours(24, 0, 30, 0);
const nextChange = Math.min(
  midnight.getTime(),
  ...Object.values(departures).flatMap(d => d.times).map(d => d.getTime() + 30*1000)
);
widget.refreshAfterDate = new Date(nextChange);

// 「あと◯分」。iOS側で進むのでウィジェットの更新を待たない
function addCountdown(stack, date, size){
  let t = stack.addDate(date);
  t.applyRelativeStyle();
  t.font = Font.mediumSystemFont(size);
  t.textColor = new Color(COUNTDOWN_COLOR);
  t.lineLimit = 1;
}

// 横いっぱいに広がる1行。カードの幅をそろえるために使う
function addLine(stack){
  let line = stack.addStack();
  line.layoutHorizontally();
  line.centerAlignContent();
  return line;
}

if(L.compact){
  // ---- スマホの小サイズ向け：縦積みの簡易リスト表示 ----
  let list = widget.addStack();
  list.layoutVertically();
  list.spacing = L.rowSpacing;

  for(const key in routes){
    const routeObj = routes[key];
    const { times, tomorrow } = departures[key];
    let block = list.addStack();
    block.layoutVertically();

    let row = addLine(block);
    let dot = row.addText("●");
    dot.font = Font.boldSystemFont(L.fontSize.dot);
    dot.textColor = new Color(routeObj.color);
    row.addSpacer(4);

    let label = row.addText(routeObj.title.replace("行き",""));
    label.font = Font.systemFont(L.fontSize.label);
    label.textColor = Color.lightGray();
    label.lineLimit = 1;
    row.addSpacer();

    let timeText = row.addText(times[0] ? formatTime(times[0]) : "運行なし");
    timeText.font = Font.boldSystemFont(L.fontSize.time);
    timeText.textColor = Color.white();

    let sub = addLine(block);
    sub.addSpacer();
    if(tomorrow){
      let t = sub.addText("明日の始発");
      t.font = Font.systemFont(L.fontSize.countdown);
      t.textColor = Color.lightGray();
    } else {
      addCountdown(sub, times[0], L.fontSize.countdown);
    }
  }

  widget.addSpacer();
} else {
  // ---- 標準・拡大サイズ向け：2枚のカードを横並び表示 ----
  let h = widget.addStack();
  h.layoutHorizontally();
  h.spacing = L.stackSpacing;

  for(const key in routes){
    const routeObj = routes[key];
    const { times, tomorrow } = departures[key];
    let card = h.addStack();
    card.layoutVertically();
    card.backgroundColor = new Color(routeObj.color);
    card.cornerRadius = L.cardRadius;
    card.setPadding(L.cardPadding.top, L.cardPadding.left, L.cardPadding.bottom, L.cardPadding.right);

    let titleLine = addLine(card);
    let title = titleLine.addText(routeObj.title);
    title.font = Font.boldSystemFont(L.fontSize.title);
    title.textColor = Color.white();
    title.lineLimit = 1;
    titleLine.addSpacer();

    card.addSpacer(5);

    if(times.length === 0){
      let ended = card.addText("運行なし");
      ended.font = Font.mediumSystemFont(L.fontSize.afterTime);
      ended.textColor = Color.white();
      card.addSpacer();
    } else {
      let labelLine = addLine(card);
      let lbl = labelLine.addText(tomorrow ? "明日の始発" : "次のバス");
      lbl.font = Font.systemFont(L.fontSize.nextLabel);
      lbl.textColor = Color.white();
      lbl.textOpacity = 0.8;
      labelLine.addSpacer();
      if(!tomorrow) addCountdown(labelLine, times[0], L.fontSize.nextLabel);

      let first = card.addText(formatTime(times[0]));
      first.font = Font.boldSystemFont(L.fontSize.nextTime);
      first.textColor = Color.white();
      first.textOpacity = tomorrow ? 0.7 : 1;

      // 伸び縮みする余白。カードをウィジェットの高さいっぱいまで伸ばす
      card.addSpacer();

      let afterLbl = card.addText("その後");
      afterLbl.font = Font.systemFont(L.fontSize.afterLabel);
      afterLbl.textColor = Color.white();
      afterLbl.textOpacity = 0.8;

      let afterTxt = card.addText(times.slice(1).map(formatTime).join(", ") || "—");
      afterTxt.font = Font.systemFont(L.fontSize.afterTime);
      afterTxt.textColor = Color.white();
      afterTxt.lineLimit = 2;
    }
  }

  widget.addSpacer(L.footerSpacer);
}

// フッター
const exp = EXPIRATION_DATE;
let footer = widget.addText(`${formatDate(now)} · ${dayLabel(now, holidays)} · ダイヤ〜${exp.getMonth()+1}/${exp.getDate()}`);
footer.font = Font.systemFont(L.fontSize.footer);
footer.textColor = Color.lightGray();
footer.lineLimit = 1;

await show(widget);
