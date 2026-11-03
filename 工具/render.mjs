import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const arg = process.argv[2] || "news.json";
const file = path.isAbsolute(arg) ? arg : path.join(ROOT, arg);
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const slug = path.basename(file, ".json");

// 页脚账号：优先环境变量 BRAND，其次 cards/brand.txt，最后回落到各 JSON 的 brand 字段
const BRAND_FILE = path.join(ROOT, "brand.txt");
const BRAND =
  process.env.BRAND ||
  (fs.existsSync(BRAND_FILE) ? fs.readFileSync(BRAND_FILE, "utf8").trim() : "") ||
  data.brand;

const THEMES = {
  // 默认：深紫 + 暖白 + 碳黑
  deepviolet: { accent: "#5B3FD1", acctx: "#4A2CBE", onAcc: "#FFFFFF", paper: "#F6F3EC", deep: "#0D0D0D", soft: "#E6E0F5" },
  violet: { accent: "#7A5CFF", acctx: "#6A45F0", onAcc: "#FFFFFF", paper: "#F7F5FF", deep: "#121118", soft: "#EDE8FF" },
  blackgold: { accent: "#FF9A3C", acctx: "#A9530F", onAcc: "#12100E", paper: "#F0EEE9", deep: "#0D0D0D", soft: "#F3E8DB" },
  pink: { accent: "#FF4D8D", acctx: "#E23A7A", onAcc: "#FFFFFF", paper: "#FFF6FA", deep: "#160E12", soft: "#FFE7EF" }
};
const themeName = process.env.THEME || "deepviolet";
const theme = THEMES[themeName] || THEMES.deepviolet;
const OUT = path.join(ROOT, "out", slug);
fs.mkdirSync(OUT, { recursive: true });

/* =========================================================
   设计系统 v6
   固定骨架：顶部色带 / 页眉左栏目右页码 / 页脚三分
   可变版式：9 种页型，按内容选，不是每篇都同一套
   节奏：.body 统一 gap 26 + space-between，每页只有一个可伸缩视觉块
   ========================================================= */
const CSS = `
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
html,body{width:1080px;height:1350px;overflow:hidden}
body{font-family:"PingFang SC","Hiragino Sans GB","Noto Sans SC",sans-serif;color:#121118}

.slide{width:1080px;height:1350px;display:flex;flex-direction:column;background:PAPER;overflow:hidden}
.slide.dark{background:DEEP;color:#fff}
.band{height:12px;background:ACCENT;flex:none}
.page{flex:1;display:flex;flex-direction:column;padding:40px 64px 0;min-height:0}

header{display:flex;justify-content:space-between;align-items:center;flex:none}
.kick{display:flex;align-items:center;gap:16px;font-size:21px;font-weight:600;letter-spacing:2px;color:#7C768C}
.kick::before{content:"";width:12px;height:12px;background:ACCENT;display:block;flex:none}
.pnum{font-size:62px;font-weight:700;color:ACCTX;letter-spacing:-3px;line-height:.9}
.slide.dark .kick{color:#8E88A0}

h1{font-size:92px;line-height:1.06;font-weight:700;letter-spacing:-3px;margin-top:34px;flex:none}
h1.sm{font-size:78px}
h1 .accent{color:ACCTX}
.stamp{display:inline-block;background:ACCENT;color:ONACC;padding:.07em .1em;line-height:1;margin-left:.06em}

.body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:26px;padding:30px 0 26px;min-height:0}
.sub{font-size:28px;line-height:1.55;color:#6E6A7B;font-weight:400}
.slide.dark .sub{color:#A29CB4}
.note{font-size:21px;line-height:1.55;color:#8E88A0}

footer{flex:none;padding:0 64px 44px}
footer .in{border-top:2px solid rgba(18,17,24,.15);padding-top:19px;display:flex;justify-content:space-between;align-items:baseline}
.slide.dark footer .in{border-top-color:rgba(255,255,255,.16)}
footer .src{font-size:21px;color:#8E88A0;letter-spacing:.3px}
footer .logo{font-size:26px;font-weight:700;color:ACCTX;letter-spacing:.5px}

.bleed{margin-left:-64px;margin-right:-64px}

/* v11 图片封面 A：上方满出血图，文字在下 */
.imtop{display:flex;flex-direction:column;flex:1;min-height:0;gap:30px;padding:22px 0 0}
.imtop .ph{flex:none;height:430px;overflow:hidden;background:#E7E2D8}
.imtop .ph img{width:100%;height:100%;object-fit:cover;display:block}
.imtop .tx{display:flex;flex-direction:column;gap:16px;min-height:0}
.imtop .tx h1{margin-top:0;font-size:82px;line-height:1.04}
.imtop .chips{display:flex;flex-wrap:wrap;gap:10px 18px;font-size:20px;color:#6E6A7B}
.imtop .chips>div::before{content:"●";color:ACCENT;font-size:12px;margin-right:8px;vertical-align:2px}

/* v11 图片封面 B：左文右图，图满高贴边 */
.imside{display:grid;grid-template-columns:1fr 470px;flex:1;min-height:0;padding:26px 0 0}
.imside .tx{display:flex;flex-direction:column;justify-content:center;gap:18px;padding-right:34px;min-width:0}
.imside .tx h1{margin-top:0;font-size:78px;line-height:1.04}
.imside .ph{margin-right:-64px;overflow:hidden;background:#E7E2D8}
.imside .ph img{width:100%;height:100%;object-fit:cover;display:block}
.ish{margin-top:6px}
.ish b{font-size:86px;font-weight:700;letter-spacing:-4px;color:ACCTX;line-height:1}
.ish i{display:block;font-style:normal;font-size:20px;color:#8E88A0;letter-spacing:.5px;margin-top:10px}
.hero{background:ACCENT;color:ONACC;display:flex;justify-content:space-between;align-items:center;padding:40px 64px;flex:none;min-height:330px}
.hero .num{font-size:142px;font-weight:700;line-height:.86;letter-spacing:-8px}
.hero .unit{font-size:21px;font-weight:600;letter-spacing:2px;opacity:.92;margin-top:16px}
.hero .side{text-align:right;font-size:26px;font-weight:600;line-height:1.6}
.verdict{margin-top:auto;background:ACCENT;color:ONACC;padding:36px 64px;font-size:30px;font-weight:700;line-height:1.5;letter-spacing:-.3px}

/* cover 要点 */
.chips{display:flex;flex-direction:column;flex:none}
.chips div{display:flex;align-items:center;gap:18px;padding:17px 0;border-top:2px solid rgba(18,17,24,.12);font-size:26px;font-weight:600;color:#3B3549}
.chips i{width:12px;height:12px;background:ACCENT;flex:none}

/* matrix 点阵 */
.groups{flex:1;display:flex;flex-direction:column;justify-content:space-between;min-height:0}
.ghead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px}
.glab{font-size:25px;font-weight:600;color:#3B3549}
.gval{font-size:64px;font-weight:700;letter-spacing:-3px;line-height:1}
.gval i{font-style:normal;font-size:32px;margin-left:2px}
.grid{display:grid;grid-template-columns:repeat(20,40px);gap:7px}
.cell{width:40px;height:40px;border-radius:3px;background:rgba(18,17,24,.085)}
.cell.on{background:ACCENT}
.cell.on.muted{background:#3B3549}

/* versus 比例条 */
.bars{flex:1;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0}
.brow .top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px}
.brow .blab{font-size:25px;color:#8E88A0}
.brow .bprice{font-size:46px;font-weight:700;letter-spacing:-1px}
.brow .track{height:92px;background:rgba(255,255,255,.09)}
.brow .fill{height:100%;background:ACCENT}
.brow .fill.muted{background:#3B3549}
.rows .row{display:flex;justify-content:space-between;align-items:center;padding:19px 2px;border-top:2px solid rgba(255,255,255,.13)}

/* 通用参数行（亮/暗自适应） */
.kv{display:flex;justify-content:space-between;align-items:baseline;padding:20px 2px;border-top:2px solid rgba(18,17,24,.13)}
.slide.dark .kv{border-top-color:rgba(255,255,255,.13)}
.kv .k{font-size:24px;color:#6E6A7B}
.slide.dark .kv .k{color:#8E88A0}
.kv .v{font-size:26px;font-weight:700}

/* triad */
.cols{display:flex;gap:20px;align-items:stretch}
.col{flex:1;background:SOFT;border-top:6px solid ACCENT;padding:26px 24px;display:flex;flex-direction:column}
.col .ctop{margin-bottom:auto}
.col .cn{font-size:50px;font-weight:700;color:ACCTX;letter-spacing:-2px;line-height:1}
.col .ct{font-size:34px;font-weight:700;margin-top:18px;line-height:1.3}
.col .cd{font-size:23px;line-height:1.7;color:#6E6A7B;margin-top:14px}
.col .cg{font-size:20px;font-weight:600;color:ACCTX;letter-spacing:.5px;padding-top:16px}

/* timeline */
.tl{position:relative;flex:1;display:flex;flex-direction:column;justify-content:space-between;min-height:0;padding:6px 0}
.tl::before{content:"";position:absolute;left:7px;top:10px;bottom:10px;width:2px;background:rgba(18,17,24,.14)}
.tg{font-size:19px;color:#9A94AD;letter-spacing:1px;padding-left:56px;position:relative}
.tn{position:relative;padding-left:56px}
.tn::before{content:"";position:absolute;left:0;top:4px;width:16px;height:16px;background:ACCENT}
.tn.dim::before{background:#B7AEDB}
.td{font-size:21px;color:ACCTX;font-weight:700;letter-spacing:1.5px}
.tn.dim .td{color:#8E88A0}
.tt{font-size:33px;font-weight:700;margin-top:7px;line-height:1.3}
.tx{font-size:23px;color:#6E6A7B;margin-top:7px;line-height:1.6}

/* list */
.items{flex:1;display:flex;flex-direction:column;justify-content:space-between;min-height:0}
.item{display:flex;gap:28px;padding:26px 0;border-top:2px solid rgba(18,17,24,.13);align-items:flex-start}
.item .ix{font-size:24px;font-weight:700;color:ACCTX;padding-top:8px;flex:none;width:42px;letter-spacing:1px}
.item .ik{font-size:33px;font-weight:700;line-height:1.35}
.item .iv{font-size:24px;line-height:1.65;color:#6E6A7B;margin-top:8px}

/* bigfact 超大数字 */
.bf{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}
.bfnum{font-size:250px;font-weight:700;line-height:.82;letter-spacing:-12px;color:ACCTX}
.bfnum span{font-size:130px;letter-spacing:-6px}
.bflab{font-size:27px;color:#6E6A7B;margin-top:26px;line-height:1.5}

/* ledger 账面 vs 实际 */
.led{flex:1;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0}
.ledrow{padding:30px 0;border-top:2px solid rgba(18,17,24,.14);display:flex;align-items:flex-end;justify-content:space-between;gap:30px}
.ledrow:last-child{border-bottom:2px solid rgba(18,17,24,.14)}
.ledrow.on{border-top:6px solid ACCENT}
.lk{font-size:25px;color:#6E6A7B;padding-bottom:12px}
.ledrow.on .lk{color:#121118;font-weight:600}
.lv{font-size:104px;font-weight:700;letter-spacing:-6px;line-height:.9;white-space:nowrap}
.ledrow.on .lv{color:ACCTX}
.ld{font-size:20px;color:#8E88A0;line-height:1.5;padding-bottom:12px;max-width:300px;text-align:right}

/* quote 大字引语 */
.qwrap{display:flex;flex-direction:column;min-height:0}
.qmark{font-size:132px;font-weight:700;color:ACCENT;line-height:.6;height:62px}
.qt{font-size:68px;font-weight:700;line-height:1.32;letter-spacing:-1.8px}
.qt em{font-style:normal;color:ACCTX}
.qby{font-size:23px;color:#8E88A0;margin-top:32px;letter-spacing:.5px}

/* ===== v7 新增版式：结构不同的五套，避免每篇同一节奏 ===== */

/* cover-split 左标题 + 右侧贴边色块（色块高度随内容，不拉满，避免内部留白） */
.split{flex:1;display:flex;flex-direction:column;justify-content:center;gap:42px;padding:10px 0 34px}
.split .top{display:flex;flex-direction:column;gap:26px}
.split .top h1{margin-top:0;font-size:84px;line-height:1.06}
.sband{background:ACCENT;color:ONACC;display:flex;align-items:center;gap:56px;padding:72px 64px 70px}
.sband .snum{flex:none}
.sband .snum b{display:block;font-size:152px;font-weight:700;line-height:.84;letter-spacing:-8px}
.sband .snum i{display:block;font-style:normal;font-size:19px;font-weight:600;letter-spacing:1.5px;opacity:.92;margin-top:16px;line-height:1.4}
.sband .slist{flex:1;font-size:22px;font-weight:600;line-height:1.4}
.sband .slist div{padding:21px 0;border-top:2px solid rgba(255,255,255,.3);font-size:23px}
.sband .slist div:first-child{border-top:none;padding-top:0}

/* cover-min 极简封面：整组居中，标题—细线—副标—要点—裸数字 一条流 */
.min{flex:1;display:flex;flex-direction:column;justify-content:flex-start;gap:42px;padding:18px 0 0}
.min .mtop{display:flex;flex-direction:column;gap:26px}
.min .rule{height:2px;background:rgba(18,17,24,.16);width:100%}
.min .mfoot{display:flex;align-items:flex-end;justify-content:space-between;gap:48px;border-top:2px solid rgba(18,17,24,.16);padding-top:34px}
.min .knum{font-size:138px;font-weight:700;letter-spacing:-7px;line-height:.86;color:ACCTX}
.min .klab{font-size:20px;color:#8E88A0;letter-spacing:.6px;line-height:1.5;max-width:340px;margin-top:10px}
.min .mnote{font-size:20px;color:#8E88A0;line-height:1.6;text-align:right;max-width:400px}
.min .mchips{display:flex;flex-direction:column;margin-top:6px}
.min .mchips div{padding:19px 0;border-top:2px solid rgba(18,17,24,.12);font-size:24px;font-weight:600;color:#3B3549}

/* kpi 三个数字横排 */
.kpir{flex:none;display:flex;align-items:stretch;height:432px;padding:0 0 6px}
.kpic{flex:1;padding:36px 26px 30px 0;border-top:5px solid ACCENT;display:flex;flex-direction:column;justify-content:space-between;min-height:0}
.kpic+.kpic{padding-left:28px;border-left:2px solid rgba(18,17,24,.12)}
.kpic .n{font-size:70px;font-weight:700;letter-spacing:-4px;line-height:.92;color:ACCTX}
.kpic .kbot{display:flex;flex-direction:column;gap:8px}
.kpic .l{font-size:22px;font-weight:600;color:#3B3549;line-height:1.45}
.kpic .d{font-size:20px;color:#8E88A0;margin-top:14px;line-height:1.65}

/* table 对照表 */
.tbl{flex:1;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0;padding:6px 0 10px}
.tbl .tr{display:flex;align-items:flex-start;border-top:2px solid rgba(18,17,24,.13);padding:32px 0;gap:24px}
.tbl .tr:last-of-type{border-bottom:2px solid rgba(18,17,24,.13)}
.tbl .tr.th{border-top:none;padding:0 0 14px}
.tbl .th .c1,.tbl .th .c2,.tbl .th .c3{font-size:19px;letter-spacing:1.5px;color:#9A94AD;font-weight:600}
.tbl .c1{width:280px;flex:none;font-size:23px;color:#6E6A7B;line-height:1.5}
.tbl .c2{flex:1;font-size:30px;font-weight:700;line-height:1.35}
.tbl .c2.hot{color:ACCTX}
.tbl .c3{width:300px;flex:none;font-size:20px;color:#8E88A0;line-height:1.55;text-align:right}

/* steps 横向编号步骤 */
.steps{display:flex;align-items:stretch;padding:20px 0 6px}
.step{flex:1;display:flex;flex-direction:column;padding:0 26px;border-left:2px solid rgba(18,17,24,.13)}
.step:first-child{border-left:5px solid ACCENT;padding-left:26px}
.step .sn{font-size:52px;font-weight:700;color:ACCTX;letter-spacing:-2px;line-height:1}
.step .st{font-size:29px;font-weight:700;margin-top:20px;line-height:1.32}
.step .sd{font-size:21px;color:#6E6A7B;margin-top:16px;line-height:1.72}
.step .sg{font-size:19px;font-weight:600;color:ACCTX;letter-spacing:.5px;margin-top:22px}

/* stack 亮底比例条（替代暗底 versus，一篇可多用） */
.stack{flex:1;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0}
.srow .sh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.srow .sl{font-size:23px;color:#6E6A7B}
.srow .sv{font-size:42px;font-weight:700;letter-spacing:-1px;color:ACCTX}
.srow .strk{height:54px;background:rgba(18,17,24,.075)}
.srow .sfill{height:100%;background:ACCENT}
.srow .sfill.muted{background:#B7AEDB}

/* statement 大字判断页（占满，无标题区） */
.stmt{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0;padding-bottom:10px}
.stmt .sline{font-size:74px;font-weight:700;line-height:1.3;letter-spacing:-2.5px}
.stmt .sline em{font-style:normal;color:ACCTX}
.stmt .sby{font-size:22px;color:#8E88A0;margin-top:36px;letter-spacing:.5px;line-height:1.6}

/* ===== v8 扩充到 20 种：再补 5 套结构 ===== */

/* mosaic 不等格拼贴：一主格 + 两个次格 */
.mosaic{flex:1;display:grid;grid-template-columns:1.38fr 1fr;grid-template-rows:1fr 1fr;gap:14px;min-height:0;padding:6px 0 12px}
.mcell{background:SOFT;padding:26px 26px 24px;display:flex;flex-direction:column;justify-content:center;border-top:5px solid ACCENT}
.mcell.main{grid-row:span 2;background:ACCENT;color:ONACC;border-top:none;justify-content:flex-end;padding-bottom:34px}
.mcell .mn{font-size:52px;font-weight:700;color:ACCTX;letter-spacing:-2px;line-height:1}
.mcell.main .mn{color:ONACC;font-size:78px;letter-spacing:-3px}
.mcell .mt{font-size:27px;font-weight:700;margin-top:12px;line-height:1.3}
.mcell.main .mt{font-size:36px}
.mcell .md{font-size:20px;color:#6E6A7B;margin-top:10px;line-height:1.6}
.mcell.main .md{color:rgba(255,255,255,.9);font-size:22px}

/* overlap 超大数字做背景层，标题压在上面 */
.ovl{position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0;padding-bottom:8px;overflow:hidden}
.ovl .ghost{position:absolute;left:-16px;top:2px;font-size:296px;font-weight:700;letter-spacing:-20px;line-height:.8;color:rgba(91,63,209,.115);white-space:nowrap;z-index:0}
.ovl .ovc{position:relative;z-index:1;display:flex;flex-direction:column;gap:24px}
.ovl .ovnum{font-size:88px;font-weight:700;letter-spacing:-5px;line-height:.9;color:ACCTX}
.ovl .ovlab{font-size:20px;color:#8E88A0;letter-spacing:1px;margin-top:10px}

/* columns 双栏正文 */
.cols2{flex:1;display:flex;gap:44px;min-height:0;padding:8px 0 14px}
.cols2 .c2{flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:0;padding:6px 0}
.cols2 .c2+.c2{border-left:2px solid rgba(18,17,24,.12);padding-left:44px}
.c2k{font-size:25px;font-weight:700;color:ACCTX;letter-spacing:-.4px;padding-bottom:6px}
.c2i{font-size:22px;color:#6E6A7B;line-height:1.75;padding-left:20px;position:relative;display:flex;align-items:center;min-height:64px}
.c2i+.c2i{border-top:1px solid rgba(18,17,24,.1)}
.c2i::before{content:"";position:absolute;left:0;top:50%;transform:translateY(-50%);width:7px;height:7px;background:ACCENT}

/* brick 错位阶梯 */
.bricks{flex:1;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0;padding:4px 0 10px}
.brick{display:flex;align-items:baseline;gap:24px;padding:20px 0;border-top:2px solid rgba(18,17,24,.12)}
.brick:nth-child(2){margin-left:56px}
.brick:nth-child(3){margin-left:112px}
.brick .bi{font-size:20px;font-weight:700;color:ACCTX;width:40px;flex:none;letter-spacing:1px}
.brick .bt{font-size:30px;font-weight:700;line-height:1.3;flex:none;max-width:290px}
.brick .bd{font-size:21px;color:#6E6A7B;line-height:1.6;flex:1;padding-bottom:2px}

/* ===== v9 图解与图片（参考 unwire.hk 的卡片语汇） ===== */

/* 照片封面：上图下文，图片满出血，标题压在图上或图下 */
.pcov{flex:1;display:flex;flex-direction:column;min-height:0}
.pcov .ph{position:relative;flex:none;height:596px;overflow:hidden;background:linear-gradient(135deg,#1a1626,#3b3549 55%,#5B3FD1)}
.pcov .ph img{width:100%;height:100%;object-fit:cover;display:block}
.pcov .ov{position:absolute;left:64px;right:64px;top:50%;transform:translateY(-50%);display:flex;justify-content:space-between;align-items:center;font-size:72px;font-weight:700;color:#fff;letter-spacing:-2px;line-height:1}
.pcov .tx{flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:32px 0 4px;min-height:0}
.pcov .tx h1{margin-top:0}
.facts{display:flex;gap:38px;flex-wrap:wrap;padding-top:6px}
.fact{display:flex;align-items:center;gap:14px;font-size:23px;font-weight:600;color:#3B3549}
.fact i{width:30px;height:30px;background:SOFT;flex:none;display:block}
.slide.dark .fact{color:#E8E4F0}
.slide.dark .fact i{background:#2A2438}

/* 截图框：真实截图套同一套画框（顶部色块 + 细边 + 说明行），不改图内容 */
.shot{flex:1;display:flex;flex-direction:column;gap:18px;padding:26px 0 20px;min-height:0}
.shot .cap{font-size:26px;line-height:1.5;color:#6E6A7B}
.shot .frame{flex:1;min-height:0;display:flex;flex-direction:column;background:#fff;border:2px solid rgba(18,17,24,.14);box-shadow:0 2px 0 rgba(18,17,24,.06)}
.shot .fbar{height:8px;background:ACCENT;flex:none}
.shot .fimg{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:14px}
.shot .fimg img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.shot .fimg.cover{padding:0}
.shot .fimg.cover img{width:100%;height:100%;object-fit:cover}
.shot .fimg.fill{padding:0}
.shot .fimg.fill img{width:100%;height:100%;object-fit:fill}
.shot .fimg.dark{background:#0D0D0D;padding:0}
.shot .fimg.paper{background:#EDE9E0}
.shot .fcap{display:flex;justify-content:space-between;align-items:baseline;gap:24px;font-size:20px;color:#8E88A0;flex:none}
.shot .fcap b{color:#3B3549;font-weight:600}

/* 照片标注：图片铺满，编号钉 + 黑底标签 */
.pann{position:relative;flex:1;min-height:0;overflow:hidden;background:#0D0D0D}
.pann img{width:100%;height:100%;object-fit:cover;display:block}
.pin{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center}
.pin b{width:36px;height:36px;border-radius:50%;background:ACCENT;color:ONACC;font-size:19px;display:flex;align-items:center;justify-content:center;flex:none}
.pin span{margin-left:16px;background:rgba(13,13,13,.92);color:#fff;font-size:21px;font-weight:700;padding:10px 16px;white-space:nowrap;line-height:1.3}
.pin span em{display:block;font-style:normal;font-weight:400;font-size:17px;color:#A29CB4;margin-top:3px}

/* 流程示意：节点 + 箭头，取代「文字步骤」 */
.dia{flex:1;display:flex;align-items:center;justify-content:space-between;min-height:0;padding:6px 0}
.dnode{display:flex;flex-direction:column;align-items:center;gap:14px;flex:none;width:196px}
.dbox{width:196px;height:152px;border:3px solid #121118;background:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;text-align:center;line-height:1.25;padding:8px}
.dbox.fill{background:ACCENT;border-color:ACCENT;color:ONACC}
.dbox.dim{background:#EFEBE2;border-color:#D7D1C4;color:#6E6A7B}
.dlab{font-size:24px;font-weight:700;text-align:center;line-height:1.3}
.darrow{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-width:96px}
.darrow .line{width:100%;height:3px;background:#121118;position:relative}
.darrow .line::after{content:"";position:absolute;right:-1px;top:-7px;border-left:16px solid #121118;border-top:9px solid transparent;border-bottom:9px solid transparent}
.darrow .line.dash{background:repeating-linear-gradient(90deg,#121118 0 12px,transparent 12px 24px)}
.darrow .dl{font-size:19px;color:#6E6A7B;text-align:center;line-height:1.45;max-width:240px}

/* 嵌套方块：面积即数量 */
.blk{flex:1;display:flex;align-items:center;gap:44px;min-height:0}
.blk .wrap{position:relative;flex:none;width:520px;height:520px;border:3px solid #121118;background:#F0EDE6}
.blk .v{position:absolute;left:-3px;bottom:-3px;border:3px solid #121118}
.blk .v .lab{position:absolute;left:16px;top:14px;color:#fff;font-size:25px;font-weight:700;line-height:1.2}
.blk .v .lab small{display:block;font-size:17px;font-weight:400;opacity:.9;margin-top:5px}
.blk .v .lab.dark{color:#121118}
.blk .side{flex:1;display:flex;flex-direction:column;gap:8px}
.blk .big{font-size:142px;font-weight:700;letter-spacing:-8px;color:ACCTX;line-height:.9}
.blk .cap{font-size:22px;color:#6E6A7B;line-height:1.55;margin-top:8px}

/* 规格三格：无数字，讲「有什么」 */
.specs{display:flex;padding-top:28px;border-top:3px solid #121118}
.spec{flex:1;display:flex;flex-direction:column;gap:10px;padding:0 28px;border-left:2px solid rgba(18,17,24,.12)}
.spec:first-child{border-left:none;padding-left:0}
.spec .sk{font-size:19px;font-weight:700;color:ACCTX;letter-spacing:1px}
.spec .st{font-size:26px;font-weight:700;line-height:1.3}
.spec .sd{font-size:19px;color:#8E88A0;line-height:1.55}

/* 强调小件 */
.mark{background:ACCENT;color:ONACC;padding:.02em .1em;box-decoration-break:clone}
.ulin{box-shadow:inset 0 -12px 0 ACCENT;padding-bottom:2px}
.tagline{border:2px solid rgba(18,17,24,.18);padding:14px 18px;font-size:21px;color:#6E6A7B;align-self:flex-start}

/* ===== v9 第二批：分栏图、前后对照、图标时间轴、区间条 ===== */

/* 左图右文：图片出血到左边缘 */
.psplit{flex:1;display:flex;gap:0;min-height:0}
.psplit .pimg{position:relative;flex:none;width:calc(46% + 64px);margin-left:-64px;overflow:hidden;background:linear-gradient(135deg,#1a1626,#3b3549 55%,#5B3FD1)}
.psplit .pimg img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block}
.psplit .ptx{flex:1;display:flex;flex-direction:column;justify-content:center;gap:20px;padding-left:44px;min-width:0}
.psplit .ptx h1{margin-top:0;font-size:66px;line-height:1.1}

/* 以前 / 现在：两段流程对照 */
.ba{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}
.ba .seg{display:flex;flex-direction:column;gap:20px;padding:30px 0}
.ba .seg+.seg{border-top:2px solid rgba(18,17,24,.14)}
.ba .sl{font-size:21px;font-weight:700;color:#8E88A0;letter-spacing:3px}
.ba .flow{display:flex;align-items:center;gap:0}
.bnode{width:168px;height:120px;border:3px solid #121118;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;text-align:center;line-height:1.25;padding:6px;flex:none;background:#fff}
.bnode.fill{background:ACCENT;border-color:ACCENT;color:ONACC}
.bnode.dim{background:#EFEBE2;border-color:#D7D1C4;color:#6E6A7B}
.ba .arr{flex:1;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:80px}
.ba .arr .line{width:100%;height:3px;background:#121118;position:relative}
.ba .arr .line::after{content:"";position:absolute;right:-1px;top:-7px;border-left:16px solid #121118;border-top:9px solid transparent;border-bottom:9px solid transparent}
.ba .arr .line.dash{background:repeating-linear-gradient(90deg,#121118 0 12px,transparent 12px 24px)}
.ba .arr .dl{font-size:19px;color:#6E6A7B;text-align:center;line-height:1.45;max-width:250px}

/* 横排图标时间轴 */
.tli{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0;padding-bottom:6px}
.tli .cols{display:flex;gap:30px}
.tli .c{flex:1;display:flex;flex-direction:column;gap:12px;padding-bottom:28px}
.tli .cd{font-size:25px;font-weight:700;letter-spacing:-.3px;color:ACCTX}
.tli .c.dim .cd{color:#8E88A0}
.tli .ct{font-size:29px;font-weight:700;line-height:1.32}
.tli .cx{font-size:20px;color:#6E6A7B;line-height:1.6}
.tli .ax{position:relative;height:3px;background:repeating-linear-gradient(90deg,#C9C3D6 0 12px,transparent 12px 24px);margin:0 10px}
.tli .ax b{position:absolute;left:0;top:0;height:3px;background:#121118}
.tli .ax i{position:absolute;top:-10px;width:22px;height:22px;border-radius:50%;background:ACCENT}
.tli .ax i.mute{background:#fff;border:3px dashed #B7AEDB}

/* 区间条：营业时间 / 时间窗 */
.hbars{flex:1;display:flex;flex-direction:column;justify-content:center;gap:118px;min-height:0}
.hbar{display:flex;flex-direction:column;gap:12px}
.hbar .top{display:flex;justify-content:space-between;align-items:baseline;font-size:22px;color:#3B3549;font-weight:600}
.hbar .top .v{font-size:26px;font-weight:700;color:ACCTX}
.hbar .trk{position:relative;height:26px;background:rgba(18,17,24,.075)}
.hbar .in{position:absolute;top:0;height:26px;background:ACCENT}
.hbar .in.muted{background:#8E88A0}
.hbar .sc{display:flex;justify-content:space-between;font-size:18px;color:#8E88A0}

`;

const esc = (s) => (s == null ? "" : String(s)).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* 图片：本地文件内联成 base64（免去路径与服务器根目录问题），远程 URL 原样引用 */
const imgSrc = (p) => {
  if (!p) return "";
  if (/^(https?:|data:)/i.test(p)) return p;
  const f = path.isAbsolute(p) ? p : path.join(ROOT, p);
  if (!fs.existsSync(f)) {
    console.warn(`  ! 找不到图片 ${p}（跳过，版式照排）`);
    return "";
  }
  let ext = path.extname(f).slice(1).toLowerCase().replace(/^jpg$/, "jpeg") || "png";
  if (ext === "svg") ext = "svg+xml";
  return `data:image/${ext};base64,${fs.readFileSync(f).toString("base64")}`;
};

const shell = (s, i, inner, dark = false) => `
<div class="slide${dark ? " dark" : ""}">
  <div class="band"></div>
  <div class="page">
    <header><div class="kick">${esc(s.kicker || "")}</div><div class="pnum">${String(i + 1).padStart(2, "0")}</div></header>
    ${inner}
  </div>
  <footer><div class="in"><span class="src">來源：${esc(data.source)} · ${esc(data.date)}</span><span class="logo">${esc(BRAND)}</span></div></footer>
</div>`;

function headline(s) {
  return `<h1${s.small ? ' class="sm"' : ""}>${s.headline
    .map((line, idx) => {
      let out = esc(line);
      (s.stamp || []).forEach((w) => {
        out = out.replace(esc(w), `<span class="stamp">${esc(w)}</span>`);
      });
      if (!s.stamp && s.accentLine === idx) out = `<span class="accent">${out}</span>`;
      return out;
    })
    .join("<br>")}</h1>`;
}

const grid = (g) => {
  const cells = Array.from({ length: 100 }, (_, k) => {
    const on = k < g.filled;
    return `<div class="cell${on ? " on" : ""}${on && g.tone === "muted" ? " muted" : ""}"></div>`;
  }).join("");
  return `<div class="grp">
    <div class="ghead"><div class="glab">${esc(g.label)}</div><div class="gval">${esc(g.value)}<i>%</i></div></div>
    <div class="grid">${cells}</div>
  </div>`;
};

const builders = {
  cover: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="sub">${esc(s.sub)}</div>
         <div class="hero bleed">
           <div><div class="num">${esc(s.hero.num)}</div><div class="unit">${esc(s.hero.unit)}</div></div>
           <div class="side">${s.hero.lines.map(esc).join("<br>")}</div>
         </div>
         ${s.chips ? `<div class="chips">${s.chips.map((c) => `<div><i></i>${esc(c)}</div>`).join("")}</div>` : ""}
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
       </div>`
    ),

  bigfact: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="sub">${esc(s.sub)}</div>
         <div class="bf">
           <div class="bfnum">${esc(s.num)}${s.unit ? `<span>${esc(s.unit)}</span>` : ""}</div>
           <div class="bflab">${esc(s.numLabel)}</div>
         </div>
         ${s.rows ? `<div class="rows">${s.rows.map((r) => `<div class="kv"><div class="k">${esc(r.k)}</div><div class="v">${esc(r.v)}</div></div>`).join("")}</div>` : ""}
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
       </div>`
    ),

  ledger: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="sub">${esc(s.sub)}</div>
         <div class="led">
           ${s.rows
             .map(
               (r) => `<div class="ledrow${r.on ? " on" : ""}"><div class="lk">${esc(r.k)}</div><div class="lv">${esc(r.v)}</div><div class="ld">${esc(r.d || "")}</div></div>`
             )
             .join("")}
         </div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
       </div>`
    ),

  matrix: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="sub">${esc(s.sub)}</div>
         <div class="groups">${s.groups.map(grid).join("")}</div>
         <div class="note">${esc(s.note)}</div>
       </div>`
    ),

  versus: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="bars">
           ${s.bars
             .map(
               (b) => `<div class="brow">
             <div class="top"><div class="blab">${esc(b.label)}</div><div class="bprice">${esc(b.price)}</div></div>
             <div class="track"><div class="fill ${b.tone}" style="width:${b.width}%"></div></div>
           </div>`
             )
             .join("")}
         </div>
         <div class="rows">
           ${s.rows.map((r) => `<div class="row kv"><div class="k">${esc(r.k)}</div><div class="v">${esc(r.v)}</div></div>`).join("")}
         </div>
         <div class="note">${esc(s.note)}</div>
       </div>`,
      true
    ),

  triad: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="sub">${esc(s.sub)}</div>
         <div class="cols">
           ${s.cols
             .map(
               (c) =>
                 `<div class="col"><div class="ctop"><div class="cn">${esc(c.num)}</div><div class="ct">${esc(c.t)}</div><div class="cd">${esc(c.d)}</div></div>${c.tag ? `<div class="cg">${esc(c.tag)}</div>` : ""}</div>`
             )
             .join("")}
         </div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  timeline: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="tl">
           ${s.events
             .map(
               (e, k) =>
                 `${e.gap ? `<div class="tg">${esc(e.gap)}</div>` : ""}<div class="tn${k < s.events.length - 1 ? " dim" : ""}"><div class="td">${esc(e.date)}</div><div class="tt">${esc(e.t)}</div><div class="tx">${esc(e.d)}</div></div>`
             )
             .join("")}
         </div>
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  quote: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="qwrap">
           <div class="qmark">“</div>
           <div class="qt">${s.quote.map(esc).join("<br>").replace(/\[\[(.+?)\]\]/g, "<em>$1</em>")}</div>
           <div class="qby">${esc(s.by)}</div>
         </div>
         ${s.rows ? `<div class="rows">${s.rows.map((r) => `<div class="kv"><div class="k">${esc(r.k)}</div><div class="v">${esc(r.v)}</div></div>`).join("")}</div>` : ""}
       </div>`
    ),

  list: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="items">
           ${s.items
             .map(
               (it, k) => `<div class="item"><div class="ix">0${k + 1}</div><div><div class="ik">${esc(it.k)}</div><div class="iv">${esc(it.v)}</div></div></div>`
             )
             .join("")}
         </div>
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  /* ---------- v7 新增五套：结构差异更大 ---------- */

  "cover-split": (s, i) =>
    shell(
      s,
      i,
      `<div class="split">
        <div class="top">
          ${headline({ ...s, small: false })}
          <div class="sub">${esc(s.sub)}</div>
        </div>
        <div class="sband bleed">
          <div class="snum"><b>${esc(s.hero.num)}</b><i>${esc(s.hero.unit)}</i></div>
          <div class="slist">${(s.chips || []).map((c) => `<div>${esc(c)}</div>`).join("")}</div>
        </div>
      </div>`
    ),

  "cover-img-top": (s, i) =>
    shell(
      s,
      i,
      `<div class="imtop">
        <div class="ph bleed"><img src="${imgSrc(s.image)}" alt=""></div>
        <div class="tx">
          ${headline({ ...s, small: false })}
          <div class="sub">${esc(s.sub)}</div>
          ${s.chips ? `<div class="chips">${s.chips.map((c) => `<div>${esc(c)}</div>`).join("")}</div>` : ""}
          ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
        </div>
      </div>`
    ),

  "cover-img-side": (s, i) =>
    shell(
      s,
      i,
      `<div class="imside">
        <div class="tx">
          ${headline({ ...s, small: false })}
          <div class="sub">${esc(s.sub)}</div>
          ${s.hero ? `<div class="ish"><b>${esc(s.hero.num)}</b><i>${esc(s.hero.unit)}</i></div>` : ""}
        </div>
        <div class="ph"><img src="${imgSrc(s.image)}" alt=""></div>
      </div>`
    ),

  "cover-min": (s, i) =>
    shell(
      s,
      i,
      `<div class="min">
        <div class="mtop">
          ${headline({ ...s, small: false })}
          <div class="rule"></div>
          <div class="sub">${esc(s.sub)}</div>
        </div>
        ${s.chips ? `<div class="mchips">${s.chips.map((c) => `<div>${esc(c)}</div>`).join("")}</div>` : ""}
        <div class="mfoot">
          <div>
            <div class="knum">${esc(s.num)}</div>
            <div class="klab">${esc(s.numLabel || "")}</div>
          </div>
          <div class="mnote">${esc(s.note || "")}</div>
        </div>
      </div>`
    ),

  kpi: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="sub">${esc(s.sub)}</div>
         <div class="kpir">
           ${s.cells
             .map(
               (c) => `<div class="kpic"><div class="n">${esc(c.n)}</div><div class="kbot"><div class="l">${esc(c.l)}</div><div class="d">${esc(c.d || "")}</div></div></div>`
             )
             .join("")}
         </div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  table: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="sub">${esc(s.sub)}</div>
         <div class="tbl">
           ${s.head ? `<div class="tr th"><div class="c1">${esc(s.head[0])}</div><div class="c2"></div><div class="c3">${esc(s.head[1])}</div></div>` : ""}
           ${s.rows
             .map(
               (r) => `<div class="tr"><div class="c1">${esc(r.a)}</div><div class="c2${r.hot ? " hot" : ""}">${esc(r.b)}</div><div class="c3">${esc(r.c || "")}</div></div>`
             )
             .join("")}
         </div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  steps: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="steps">
           ${s.steps
             .map(
               (st) => `<div class="step"><div class="sn">${esc(st.n)}</div><div class="st">${esc(st.t)}</div><div class="sd">${esc(st.d)}</div>${st.g ? `<div class="sg">${esc(st.g)}</div>` : ""}</div>`
             )
             .join("")}
         </div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  stack: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="stack">
           ${s.bars
             .map(
               (b) => `<div class="srow">
             <div class="sh"><div class="sl">${esc(b.label)}</div><div class="sv">${esc(b.price)}</div></div>
             <div class="strk"><div class="sfill${b.muted ? " muted" : ""}" style="width:${b.width}%"></div></div>
           </div>`
             )
             .join("")}
         </div>
         ${s.rows ? `<div class="rows">${s.rows.map((r) => `<div class="kv"><div class="k">${esc(r.k)}</div><div class="v">${esc(r.v)}</div></div>`).join("")}</div>` : ""}
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
       </div>`
    ),

  statement: (s, i) =>
    shell(
      s,
      i,
      `<div class="stmt">
        ${s.kickerTop ? `<div class="sub" style="margin-bottom:34px">${esc(s.kickerTop)}</div>` : ""}
        <div class="sline">${s.lines.map(esc).join("<br>").replace(/\[\[(.+?)\]\]/g, "<em>$1</em>")}</div>
        <div class="sby">${s.by ? esc(s.by) : ""}</div>
      </div>`
    ),

  /* ---------- v8 新增五套 ---------- */

  mosaic: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="mosaic">
           ${s.cells
             .map(
               (c) => `<div class="mcell${c.main ? " main" : ""}">
                 <div><div class="mn">${esc(c.n || "")}</div><div class="mt">${esc(c.t)}</div><div class="md">${esc(c.d || "")}</div></div>
               </div>`
             )
             .join("")}
         </div>
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  overlap: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         <div class="ovl">
           <div class="ghost">${esc(s.ghost)}</div>
           <div class="ovc">
             <div><div class="ovnum">${esc(s.num)}</div><div class="ovlab">${esc(s.numLabel || "")}</div></div>
             <div class="sub">${esc(s.sub)}</div>
             ${s.rows ? `<div class="rows">${s.rows.map((r) => `<div class="kv"><div class="k">${esc(r.k)}</div><div class="v">${esc(r.v)}</div></div>`).join("")}</div>` : ""}
           </div>
         </div>
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  columns: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="cols2">
           ${s.cols2
             .map(
               (c) => `<div class="c2"><div class="c2k">${esc(c.k)}</div>${c.items.map((it) => `<div class="c2i">${esc(it)}</div>`).join("")}</div>`
             )
             .join("")}
         </div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  /* ---------- v9 第二批 ---------- */

  "photo-split": (s, i) =>
    shell(
      s,
      i,
      `<div class="psplit">
        <div class="pimg">${s.image ? `<img src="${imgSrc(s.image)}" alt="">` : ""}</div>
        <div class="ptx">
          ${headline({ ...s, small: true })}
          <div class="sub">${esc(s.sub || "")}</div>
          ${s.facts ? `<div class="facts">${s.facts.map((f) => `<div class="fact"><i></i>${esc(f)}</div>`).join("")}</div>` : ""}
          ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
        </div>
      </div>`
    ),

  "before-after": (s, i) => {
    const node = (n) => `<div class="bnode${n && n.tone ? ` ${n.tone}` : ""}">${esc((n && n.box) || "")}</div>`;
    const segs = (s.segs || [])
      .map(
        (sg) =>
          `<div class="seg"><div class="sl">${esc(sg.label)}</div><div class="flow">${node(sg.from)}<div class="arr"><div class="line${sg.dash ? " dash" : ""}"></div>${sg.arrow ? `<div class="dl">${esc(sg.arrow)}</div>` : ""}</div>${node(sg.to)}</div></div>`
      )
      .join("");
    return shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="ba">${segs}</div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    );
  },

  "timeline-icons": (s, i) => {
    const evs = s.events || [];
    const cols = evs
      .map((e) => `<div class="c${e.state === "todo" ? " dim" : ""}"><div class="cd">${esc(e.date)}</div><div class="ct">${esc(e.t)}</div><div class="cx">${esc(e.d || "")}</div></div>`)
      .join("");
    const dots = evs
      .map((e, k) => {
        const pos = evs.length > 1 ? (k / (evs.length - 1)) * 100 : 0;
        return `<i class="${e.state === "todo" ? "mute" : ""}" style="left:calc(${pos}% - 11px)"></i>`;
      })
      .join("");
    const firstTodo = evs.findIndex((e) => e.state === "todo");
    const solid = evs.length > 1 ? ((firstTodo === -1 ? evs.length - 1 : firstTodo) / (evs.length - 1)) * 100 : 100;
    return shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="tli"><div class="cols">${cols}</div><div class="ax"><b style="width:${solid}%"></b>${dots}</div></div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    );
  },

  "range-bar": (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="hbars">
           ${(s.bars || [])
             .map((b) => {
               const from = Number(b.from) || 0;
               const to = Number(b.to);
               const w = Number.isFinite(to) ? Math.max(0, to - from) : 100;
               return `<div class="hbar"><div class="top"><span>${esc(b.label)}</span><span class="v">${esc(b.value || "")}</span></div><div class="trk"><div class="in${b.muted ? " muted" : ""}" style="left:${from}%;width:${w}%"></div></div>${b.ticks ? `<div class="sc">${b.ticks.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}</div>`;
             })
             .join("")}
         </div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  /* ---------- v9 新增：图解与图片 ---------- */

  "photo-cover": (s, i) =>
    shell(
      s,
      i,
      `<div class="pcov">
        <div class="ph">
          ${s.image ? `<img src="${imgSrc(s.image)}" alt="">` : ""}
          ${s.overlay ? `<div class="ov"><span>${esc(s.overlay.left || "")}</span><span>${esc(s.overlay.right || "")}</span></div>` : ""}
        </div>
        <div class="tx">
          ${headline({ ...s, small: true })}
          <div class="sub">${esc(s.sub || "")}</div>
          ${s.facts ? `<div class="facts">${s.facts.map((f) => `<div class="fact"><i></i>${esc(f)}</div>`).join("")}</div>` : ""}
          ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
        </div>
      </div>`,
      !!s.dark
    ),

  "photo-annot": (s, i) =>
    shell(
      s,
      i,
      `${headline({ ...s, small: true })}
       <div class="pann">
         ${s.image ? `<img src="${imgSrc(s.image)}" alt="">` : ""}
         ${(s.points || [])
           .map(
             (p) =>
               `<div class="pin" style="left:${p.x}%;top:${p.y}%"><b>${esc(p.n)}</b><span>${esc(p.label)}${p.sub ? `<em>${esc(p.sub)}</em>` : ""}</span></div>`
           )
           .join("")}
       </div>`,
      s.dark !== false
    ),

  shot: (s, i) =>
    shell(
      s,
      i,
      `<div class="shot">
        ${s.cap ? `<div class="cap">${esc(s.cap)}</div>` : ""}
        <div class="frame">
          <div class="fbar"></div>
          <div class="fimg${s.fit ? ` ${s.fit}` : ""}${s.bg ? ` ${s.bg}` : ""}">${s.image ? `<img src="${imgSrc(s.image)}" alt="">` : ""}</div>
        </div>
        ${s.caption || s.credit ? `<div class="fcap"><span>${esc(s.caption || "")}</span><span><b>${esc(s.creditLabel || "截图")}</b> ${esc(s.credit || "")}</span></div>` : ""}
      </div>`
    ),

  diagram: (s, i) => {
    const arrow = (a) =>
      `<div class="darrow"><div class="line${a && a.dash ? " dash" : ""}"></div>${a && a.label ? `<div class="dl">${esc(a.label)}</div>` : ""}</div>`;
    const node = (n) =>
      `<div class="dnode"><div class="dbox${n.tone ? ` ${n.tone}` : ""}">${esc(n.box || "")}</div><div class="dlab">${esc(n.lab || "")}</div></div>`;
    const seq = [];
    (s.nodes || []).forEach((n, k) => {
      if (k) seq.push(arrow((s.arrows || [])[k - 1]));
      seq.push(node(n));
    });
    return shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="dia">${seq.join("")}</div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    );
  },

  blocks: (s, i) => {
    const tones = ["", "background:#6E6A7B;border-color:#6E6A7B", "background:#5B3FD1;border-color:#5B3FD1"];
    const boxes = (s.items || [])
      .map((it, k) => {
        const size = it.size || (k === 0 ? 100 : 40);
        return `<div class="v" style="width:${size}%;height:${size}%;${tones[Math.min(k, 2)]}"><div class="lab${k === 0 ? " dark" : ""}">${esc(it.value)}${it.label ? `<small>${esc(it.label)}</small>` : ""}</div></div>`;
      })
      .join("");
    return shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="blk"><div class="wrap">${boxes}</div><div class="side"><div class="big">${esc(s.big || "")}</div><div class="cap">${esc(s.bigLabel || "")}</div></div></div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    );
  },

  specs: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="specs">
           ${(s.cells || [])
             .map(
               (c) =>
                 `<div class="spec"><div class="sk">${esc(c.k || "")}</div><div class="st">${esc(c.t)}</div><div class="sd">${esc(c.d || "")}</div></div>`
             )
             .join("")}
         </div>
         ${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    ),

  brick: (s, i) =>
    shell(
      s,
      i,
      `${headline(s)}
       <div class="body">
         ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
         <div class="bricks">
           ${s.bricks
             .map((b) => `<div class="brick"><div class="bi">${esc(b.i)}</div><div class="bt">${esc(b.t)}</div><div class="bd">${esc(b.d)}</div></div>`)
             .join("")}
         </div>
         ${s.verdict ? `<div class="verdict bleed">${esc(s.verdict)}</div>` : ""}
       </div>`
    )
};

const css = CSS.replaceAll("ACCTX", theme.acctx).replaceAll("ONACC", theme.onAcc).replaceAll("ACCENT", theme.accent).replaceAll("PAPER", theme.paper).replaceAll("DEEP", theme.deep).replaceAll("SOFT", theme.soft);
const files = [];
data.slides.slice(0, 5).forEach((s, i) => {
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${i + 1}</title><style>${css}</style></head><body>${builders[s.type](s, i)}</body></html>`;
  const f = path.join(OUT, `slide-${String(i + 1).padStart(2, "0")}.html`);
  fs.writeFileSync(f, html);
  files.push(f);
});
console.log(`${slug} · theme=${themeName} · slides=${files.length}`);
