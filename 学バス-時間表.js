// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: magic;
// 学バスウィジェット（完全固定値・一括管理・左右カード）

// -------------------- 設定 --------------------
const WIDGET_BG_COLOR = "#0C1220";   // ウィジェット背景色
const CARD_RADIUS = 18;               // カード角丸
const STACK_SPACING = 18;             // カード間スペース
const FOOTER_SPACER = 6;              // カード下とフッター余白
const CARD_PADDING = { top: 6, left: 18, bottom: 6, right: 48 };
const PADDING = { top: 8, left: 12, bottom: 8, right: 8 };
const FONT_SIZE = { title: 12, nextLabel: 10, nextTime: 22, afterLabel: 10, afterTime: 11, footer: 12 };
const ROUTE_COLOR = { tsudanuma: "#1E3A8A", shinNarashino: "#EA580C" };

// バス時刻データ
const routes = {
  tsudanuma: {
    title: "津田沼行き",
    color: ROUTE_COLOR.tsudanuma,
    weekday: ["08:35","09:10","09:20","10:10","10:20","11:10","11:30","12:20","12:30","13:15","13:50","14:15","14:45","15:20","15:50","16:15","16:40","17:20","17:40","18:15","18:40","19:10","19:40","20:10"],
    saturday: ["08:35","10:40","11:40","12:20","12:50","13:20","15:20","16:10","17:20","18:10","19:40"],
    holiday: ["09:00","10:00","12:00","15:00"],
    special: {} //"2025-12-24": ["09:30","11:30"]
  },
  shinNarashino: {
    title: "新習志野行き",
    color: ROUTE_COLOR.shinNarashino,
    weekday: ["08:30","08:50","10:40","11:30","11:55","12:55","13:20","13:50","14:20","14:50","15:20","15:50","16:10","16:35","17:10","17:50","18:10","19:10","19:50","20:10"],
    saturday: ["08:20","10:20","11:20","12:00","12:30","13:00","13:30","15:20","15:50","16:40","18:40","20:10"],
    holiday: ["09:30","11:30","14:30","16:30","18:00"],
    special: {} //"2025-12-24": ["09:30","11:30"]
  }
};

// 祝日
const holidays = ["2025-01-01","2025-02-11","2025-02-23","2025-03-20"];

// -------------------- ユーティリティ --------------------
function formatDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function getScheduleTypeForRoute(date, holidaysArr, routeSpecials){
  const s = formatDate(date);
  const dow = date.getDay();
  if(routeSpecials && routeSpecials[s]) return "special";
  if(holidaysArr.includes(s) || dow===0) return "holiday";
  if(dow===6) return "saturday";
  return "weekday";
}

function getNextTimesForRoute(routeObj, type, now, count=3){
  let list = type==="special" ? routeObj.special[formatDate(now)] :
             type==="holiday" ? routeObj.holiday :
             type==="saturday"? routeObj.saturday : routeObj.weekday;
  if(!list) return [];
  const nowMin = now.getHours()*60 + now.getMinutes();
  return list.map(t=>({raw:t, min:Number(t.split(":")[0])*60 + Number(t.split(":")[1])}))
             .filter(x=>x.min>nowMin)
             .slice(0,count)
             .map(x=>x.raw);
}

function isOverallSpecial(date){
  const s=formatDate(date);
  for(let k in routes){ if(routes[k].special && routes[k].special[s]) return true; }
  return false;
}

// -------------------- ウィジェット構築 --------------------
const now = new Date();
const todayStr = formatDate(now);

let widget = new ListWidget();
widget.backgroundColor = new Color(WIDGET_BG_COLOR);
widget.setPadding(PADDING.top, PADDING.left, PADDING.bottom, PADDING.right);
widget.refreshAfterDate = new Date(Date.now() + 1000*60*5);

let h = widget.addStack();
h.layoutHorizontally();
h.centerAlignContent();
h.spacing = STACK_SPACING;

// カード作成
function buildCard(routeObj){
  let card = h.addStack();
  card.layoutVertically();
  card.backgroundColor = new Color(routeObj.color);
  card.cornerRadius = CARD_RADIUS;
  card.setPadding(CARD_PADDING.top, CARD_PADDING.left, CARD_PADDING.bottom, CARD_PADDING.right);
  card.size = new Size(0,0); // 幅自動、文字潰れ防止

  let title = card.addText(routeObj.title);
  title.font = Font.boldSystemFont(FONT_SIZE.title);
  title.textColor = Color.white();

  card.addSpacer(5);

  const type = getScheduleTypeForRoute(now, holidays, routeObj.special);
  const next = getNextTimesForRoute(routeObj, type, now, 3);

  if(next.length === 0){
    let ended = card.addText("本日の運行は\n終了しました");
    ended.font = Font.mediumSystemFont(FONT_SIZE.afterTime);
    ended.textColor = Color.black();
    ended.lineLimit = 2;
  } else {
    let lbl = card.addText("次のバス");
    lbl.font = Font.systemFont(FONT_SIZE.nextLabel);
    lbl.textColor = Color.white();
    lbl.opacity = 0.8;

    let first = card.addText(next[0]);
    first.font = Font.boldSystemFont(FONT_SIZE.nextTime);
    first.textColor = Color.green();

    card.addSpacer(5);

    let afterLbl = card.addText("その後");
    afterLbl.font = Font.systemFont(FONT_SIZE.afterLabel);
    afterLbl.textColor = Color.white();
    afterLbl.opacity = 0.8;

    let afterTxt = card.addText(next.slice(1).join(", ") || "—");
    afterTxt.font = Font.systemFont(FONT_SIZE.afterTime);
    afterTxt.textColor = Color.white();
  }
  return card;
}

// 左右カード
buildCard(routes.tsudanuma);
buildCard(routes.shinNarashino);

widget.addSpacer(FOOTER_SPACER);

// フッター
let typeOverall = isOverallSpecial(now) ? "特別日"
  : (holidays.includes(todayStr) || now.getDay()===0) ? "休日"
  : (now.getDay()===6) ? "土曜"
  : "平日";

let footer = widget.addText(`${todayStr} · ${typeOverall}`);
footer.font = Font.systemFont(FONT_SIZE.footer);
footer.textColor = Color.lightGray();

// -------------------- 表示 --------------------
if(config.runsInWidget){
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
