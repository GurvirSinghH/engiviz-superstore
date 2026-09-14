// Builds the three single-page answer sheets (HTML with inline SVG) from answers_data.json.
// No dependencies:  node make_pages.mjs   (export to PDF/PNG with headless Chrome afterwards)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const D = JSON.parse(fs.readFileSync(path.join(HERE, 'answers_data.json'), 'utf8'))
const T = D.totals

const C = {
  page: '#f4f3ef', card: '#fcfcfb', ink: '#0b0b0b', ink2: '#52514e', muted: '#7a7872', grid: '#e1e0d9', axis: '#c3c2b7',
  blue: '#2a78d6', red: '#e34948', redSoft: '#f0a8a7', cat: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'],
}
const MINUS = '−'
const money = (v, { sign = false, digits } = {}) => {
  const a = Math.abs(v)
  let s
  if (a >= 1e6) s = `$${(a / 1e6).toFixed(digits ?? 2)}M`
  else if (a >= 1e3) s = `$${(a / 1e3).toFixed(digits ?? (a >= 100e3 ? 0 : 1))}K`
  else s = `$${a.toFixed(digits ?? 0)}`
  if (v < 0) return MINUS + s
  return sign && v > 0 ? '+' + s : s
}
const pct = (v, d = 1, { sign = false } = {}) => {
  const s = `${Math.abs(v * 100).toFixed(d)}%`
  if (v < 0 && Number(Math.abs(v * 100).toFixed(d)) !== 0) return MINUS + s
  return sign && v > 0 ? '+' + s : s
}
const num = (v) => Math.round(v).toLocaleString('en-US')
const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mixHex = (a, b, t) => '#' + hex(a).map((c, i) => Math.round(c + (hex(b)[i] - c) * t).toString(16).padStart(2, '0')).join('')
const DISC_STOPS = [[0, '#efede7'], [0.2, '#d6d3ca'], [0.3, '#9d998f'], [0.8, '#2f2d29']]
const discColor = (d) => {
  for (let i = 1; i < DISC_STOPS.length; i++) {
    const [d0, c0] = DISC_STOPS[i - 1], [d1, c1] = DISC_STOPS[i]
    if (d <= d1) return mixHex(c0, c1, (d - d0) / (d1 - d0))
  }
  return DISC_STOPS.at(-1)[1]
}
const lum = (h) => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 }
const txt = (x, y, s, { size = 12, weight = 400, fill = C.ink, anchor = 'start', extra = '' } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${extra}>${s}</text>`

function shell({ title, qn, question, finding, body, note }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>
@page { size: 1600px 1130px; margin: 0 }
html, body { margin: 0; padding: 0 }
body { width: 1600px; height: 1130px; overflow: hidden; background: ${C.page}; color: ${C.ink};
  font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { box-sizing: border-box; width: 1600px; height: 1130px; padding: 40px 56px 26px; display: flex; flex-direction: column; }
.top { display: flex; justify-content: space-between; align-items: baseline; }
.eyebrow { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; color: ${C.muted}; }
h1 { font-size: 43px; line-height: 1.06; font-weight: 900; letter-spacing: -0.02em; margin: 10px 0 0; }
.finding { margin-top: 14px; display: flex; gap: 14px; align-items: flex-start; }
.pill { flex: none; margin-top: 4px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; font-weight: 800; color: ${C.card}; background: ${C.ink}; border-radius: 999px; padding: 4px 10px; }
.finding p { margin: 0; font-size: 20.5px; line-height: 1.38; font-weight: 600; max-width: 1360px; }
.body { flex: 1; min-height: 0; margin-top: 22px; display: flex; flex-direction: column; gap: 16px; }
.row { display: flex; gap: 16px; min-height: 0; }
.card { box-sizing: border-box; background: ${C.card}; border: 1px solid rgba(11,11,11,.10); border-radius: 16px; padding: 16px 20px; }
.ct { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; }
.cs { font-size: 12.5px; color: ${C.ink2}; margin-top: 3px; line-height: 1.4; }
.lab { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; font-weight: 700; color: ${C.muted}; }
.big { font-size: 38px; font-weight: 900; letter-spacing: -0.02em; line-height: 1.05; }
.legend { font-size: 11.5px; color: ${C.ink2}; margin-top: 6px; display: flex; gap: 18px; flex-wrap: wrap; }
.sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; vertical-align: -1px; margin-right: 5px; }
.note { margin-top: 12px; font-size: 11.3px; color: ${C.ink2}; line-height: 1.5; border-top: 1px solid rgba(11,11,11,.12); padding-top: 9px; }
.note b { color: ${C.ink}; }
svg text { font-family: inherit; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
th { text-align: right; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: ${C.muted}; font-weight: 700; padding: 6px 8px; border-bottom: 1px solid ${C.axis}; }
td { text-align: right; padding: 8px 8px; border-bottom: 1px solid ${C.grid}; font-variant-numeric: tabular-nums; }
th:first-child, td:first-child { text-align: left; }
</style></head><body><div class="page">
<div class="top"><div class="eyebrow">ENGIVIZ · Superstore dataset 2014–2017 · Question ${qn} of 3</div><div class="eyebrow">Where Prices Fall Below Cost</div></div>
<h1>${question}</h1>
<div class="finding"><span class="pill">Finding</span><p>${finding}</p></div>
<div class="body">${body}</div>
<div class="note">${note}</div>
</div></body></html>`
}

/* =============================== Q1 =============================== */
function q1Dumbbell(W, H) {
  const subs = Object.values(D.subs).sort((a, b) => b.margin - a.margin)
  const labelW = 112
  const cols = [{ k: 'full', w: 78, h: 'Full price' }, { k: 'real', w: 78, h: 'Realized' }, { k: 'deep', w: 96, h: '30–80% off*' }]
  const numsW = cols.reduce((a, c) => a + c.w, 0)
  const x0 = labelW + 12, x1 = W - numsW - 18
  const x = lin(-0.1, 0.5, x0, x1)
  const top = 30, bottom = 24
  const rh = (H - top - bottom) / subs.length
  const hi = new Set(['Labels', 'Binders', 'Copiers', 'Tables'])
  let s = `<svg width="${W}" height="${H}">`
  ;[-0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5].forEach((t) => {
    s += `<line x1="${x(t)}" x2="${x(t)}" y1="${top - 6}" y2="${H - bottom}" stroke="${t === 0 ? C.ink : C.grid}" stroke-width="${t === 0 ? 1.5 : 1}"/>`
    s += txt(x(t), H - 6, pct(t, 0), { size: 11, fill: C.muted, anchor: 'middle' })
  })
  let cx = x1 + 18
  cols.forEach((c) => { s += txt(cx + c.w - 4, 14, c.h, { size: 11, weight: 700, fill: C.muted, anchor: 'end' }); cx += c.w })
  s += txt(x0, 14, 'Profit margin', { size: 11, weight: 700, fill: C.muted })
  subs.forEach((d, i) => {
    const yy = top + i * rh + rh / 2
    if (d.sub === 'Labels' || d.sub === 'Binders') s += `<rect x="0" y="${top + i * rh + 1}" width="${W}" height="${rh - 2}" rx="6" fill="#f1efe8"/>`
    s += txt(labelW, yy + 4, d.sub, { size: 13, weight: hi.has(d.sub) ? 800 : 500, anchor: 'end' })
    s += `<line x1="${x(Math.min(d.margin, d.fullPriceMargin))}" x2="${x(Math.max(d.margin, d.fullPriceMargin))}" y1="${yy}" y2="${yy}" stroke="${C.axis}" stroke-width="3" stroke-linecap="round"/>`
    s += `<circle cx="${x(d.fullPriceMargin)}" cy="${yy}" r="6" fill="${C.card}" stroke="${C.ink}" stroke-width="2"/>`
    s += `<circle cx="${x(d.margin)}" cy="${yy}" r="6.5" fill="${d.margin < 0 ? C.red : C.blue}" stroke="${C.card}" stroke-width="2"/>`
    let cx2 = x1 + 18
    const vals = [pct(d.fullPriceMargin), pct(d.margin), d.deepListShare > 0 ? pct(d.deepListShare, 0) : '—']
    vals.forEach((v, j) => {
      s += txt(cx2 + cols[j].w - 4, yy + 4, v, { size: 13, weight: j === 1 ? 800 : 500, fill: j === 1 ? C.ink : C.ink2, anchor: 'end', extra: 'font-variant-numeric="tabular-nums"' })
      cx2 += cols[j].w
    })
  })
  return s + '</svg>'
}

function q1SalesProfit(W, H) {
  const subs = Object.values(D.subs).sort((a, b) => b.profit - a.profit)
  const labelW = 100
  const sx0 = labelW + 10, sw = (W - labelW - 10) * 0.36
  const px0 = sx0 + sw + 26, px1 = W - 8
  const sx = lin(0, 340000, 0, sw - 46)
  const px = lin(-22000, 64000, px0, px1 - 50)
  const top = 30, bottom = 8
  const rh = (H - top - bottom) / subs.length
  const hi = new Set(['Copiers', 'Phones', 'Tables', 'Chairs'])
  let s = `<svg width="${W}" height="${H}">`
  s += txt(sx0, 14, 'Sales (rank)', { size: 11, weight: 700, fill: C.muted })
  s += txt(px0, 14, 'Net profit', { size: 11, weight: 700, fill: C.muted })
  s += `<line x1="${px(0)}" x2="${px(0)}" y1="${top - 6}" y2="${H - bottom}" stroke="${C.ink}" stroke-width="1.5"/>`
  subs.forEach((d, i) => {
    const yy = top + i * rh + rh / 2
    const bh = Math.min(14, rh - 8)
    s += txt(labelW, yy + 4, d.sub, { size: 12.5, weight: hi.has(d.sub) ? 800 : 500, anchor: 'end' })
    s += `<rect x="${sx0}" y="${yy - bh / 2}" width="${Math.max(2, sx(d.sales))}" height="${bh}" rx="3" fill="#cfccc3"/>`
    s += txt(sx0 + sx(d.sales) + 5, yy + 4, `${money(d.sales)} <tspan fill="${C.muted}">#${d.salesRank}</tspan>`, { size: 11.5, fill: C.ink2 })
    const a = px(Math.min(0, d.profit)), b = px(Math.max(0, d.profit))
    s += `<rect x="${a}" y="${yy - bh / 2}" width="${Math.max(2, b - a)}" height="${bh}" rx="3" fill="${d.profit < 0 ? C.red : C.blue}"/>`
    s += txt(d.profit < 0 ? a - 5 : b + 5, yy + 4, money(d.profit, { sign: true }), { size: 11.5, weight: hi.has(d.sub) ? 800 : 500, anchor: d.profit < 0 ? 'end' : 'start', fill: C.ink })
  })
  return s + '</svg>'
}

function tablesYears(W, H) {
  const t = D.subs.Tables.byYear
  const years = Object.keys(t)
  const bw = (W - 20) / years.length
  const y = lin(0, -9000, 22, H - 18)
  let s = `<svg width="${W}" height="${H}">`
  s += `<line x1="0" x2="${W}" y1="22" y2="22" stroke="${C.ink}" stroke-width="1.5"/>`
  years.forEach((yr, i) => {
    const cx = 10 + i * bw + bw / 2
    s += txt(cx, 14, yr, { size: 11, fill: C.ink2, anchor: 'middle' })
    s += `<rect x="${cx - bw * 0.3}" y="22" width="${bw * 0.6}" height="${y(t[yr]) - 22}" rx="4" fill="${C.red}"/>`
    s += txt(cx, Math.min(H - 2, y(t[yr]) + 14), money(t[yr]), { size: 11, weight: 600, anchor: 'middle' })
  })
  return s + '</svg>'
}

function splitBar(W, share, a, b) {
  const x = W * share
  return `<svg width="${W}" height="42"><rect x="0" y="4" width="${x - 1}" height="20" rx="4" fill="${C.red}"/><rect x="${x + 1}" y="4" width="${W - x - 1}" height="20" rx="4" fill="${C.redSoft}"/>
  ${txt(0, 38, a, { size: 11.5, fill: C.ink2 })}${txt(W, 38, b, { size: 11.5, fill: C.ink2, anchor: 'end' })}</svg>`
}

function Q1() {
  const S = D.subs, B = D.binders
  const body = `
<div class="row" style="height:600px">
  <div class="card" style="width:880px">
    <div class="ct">Profit margin by sub-category: at full list price vs. realized</div>
    <div class="cs">Sorted by realized margin (profit ÷ sales). The gap between the two dots is margin given up to discounts. Labels and Binders start from the same ~47.8% full-price margin.</div>
    <div style="margin-top:8px">${q1Dumbbell(838, 478)}</div>
    <div class="legend"><span>○ margin if sold at full list price</span><span><span class="sw" style="background:${C.blue}"></span>realized margin</span><span><span class="sw" style="background:${C.red}"></span>negative realized margin</span><span>* share of list-price value sold at 30–80% discount</span></div>
  </div>
  <div class="card" style="flex:1">
    <div class="ct">High sales ≠ high profit</div>
    <div class="cs">Sorted by net profit. Copiers earn the most profit from the 8th-largest sales; Phones and Chairs lead sales but not profit; Tables lose money on the 4th-largest sales.</div>
    <div style="margin-top:8px">${q1SalesProfit(552, 500)}</div>
  </div>
</div>
<div class="row" style="flex:1">
  <div class="card" style="flex:1">
    <div class="lab">Most total profit</div>
    <div class="big" style="margin-top:6px;font-size:30px">Copiers ${money(S.Copiers.profit, { sign: true, digits: 1 })}</div>
    <div class="cs" style="font-size:13.5px;margin-top:8px">${pct(S.Copiers.margin)} realized margin on ${money(S.Copiers.sales, { digits: 1 })} of sales (#${S.Copiers.salesRank} in sales). Highest realized margins: Labels ${pct(S.Labels.margin)}, Paper ${pct(S.Paper.margin)}, Envelopes ${pct(S.Envelopes.margin)}.</div>
  </div>
  <div class="card" style="flex:1">
    <div class="lab">Tables · lowest net profit</div>
    <div class="big" style="margin-top:6px;font-size:30px">${money(S.Tables.profit, { digits: 1 })}, negative every year</div>
    <div style="margin-top:8px">${tablesYears(430, 92)}</div>
  </div>
  <div class="card" style="flex:1">
    <div class="lab">Binders · deep discounts</div>
    <div class="big" style="margin-top:6px;font-size:30px">${pct(S.Binders.fullPriceMargin)} → ${pct(S.Binders.margin)}</div>
    <div class="cs" style="font-size:13px;margin-top:6px">Full-price vs realized margin. Binders still net ${money(S.Binders.profit, { sign: true, digits: 1 })}; binding machines (list price ≥ $100) account for ${pct(B.machineShare)} of Binders’ line-level losses.</div>
    <div style="margin-top:8px">${splitBar(430, B.machineShare, `binding machines ${pct(B.machineShare)}`, `other binder products ${pct(1 - B.machineShare)}`)}</div>
  </div>
</div>`
  return shell({
    title: 'Q1 Product Profitability', qn: 1,
    question: 'Which product sub-categories drive the highest profit margins?',
    finding: `Labels (${pct(S.Labels.margin)}), Paper (${pct(S.Paper.margin)}) and Envelopes (${pct(S.Envelopes.margin)}) earn the highest realized margins and Copiers earn the most total profit (${money(S.Copiers.profit, { digits: 1 })}), while sub-categories sold at deep 30–80% discounts or with thin full-price margins keep far less, with Tables losing ${money(-S.Tables.profit, { digits: 1 })}.`,
    body,
    note: `<b>Method.</b> Realized margin = total profit ÷ total sales. Full-price margin = margin if every line had been sold at list price (list price = Sales ÷ (1 − Discount); each product’s unit cost is fixed in this data). Line-level losses = total profit of order lines with negative profit. Binding machines = Binders products with a list price of $100 or more. <b>Data:</b> Sample - Superstore.csv, ${num(T.lines)} order lines, ${num(T.orders)} orders, 2014–2017; overall margin ${pct(T.margin, 2)}. The discount structure is highly rule-generated (fixed rates per state × sub-category); findings describe this dataset, not real-world retail behavior, and show associations rather than causes.`,
  })
}

/* =============================== Q2 =============================== */
function q2Regions(W, H) {
  const R = Object.values(D.q2.regions).sort((a, b) => b.profit - a.profit)
  const labelW = 190
  const x = lin(-45000, 152000, labelW + 10, W - 16)
  const top = 22
  const rh = (H - top) / R.length
  const abbr = { Texas: 'TX', Illinois: 'IL', Ohio: 'OH', Pennsylvania: 'PA', 'North Carolina': 'NC', Tennessee: 'TN', Florida: 'FL', Colorado: 'CO', Arizona: 'AZ', Oregon: 'OR' }
  let s = `<svg width="${W}" height="${H}">`
  s += `<line x1="${x(0)}" x2="${x(0)}" y1="${top - 8}" y2="${H}" stroke="${C.ink}" stroke-width="1.5"/>`
  s += txt(x(0) - 6, 12, '← loss-making states', { size: 11, fill: C.muted, anchor: 'end' })
  s += txt(x(0) + 6, 12, 'profitable states →', { size: 11, fill: C.muted })
  R.forEach((r, i) => {
    const y0 = top + i * rh
    const yy = y0 + rh / 2
    s += txt(0, yy - 5, r.region, { size: 17, weight: 800 })
    s += txt(0, yy + 13, `net ${money(r.profit, { sign: true, digits: 1 })} · ${pct(r.margin)} margin`, { size: 12, fill: C.ink2 })
    s += `<rect x="${x(r.lossStateProfit)}" y="${yy - 16}" width="${x(0) - x(r.lossStateProfit)}" height="14" rx="3" fill="${C.red}"/>`
    s += `<rect x="${x(0)}" y="${yy - 16}" width="${x(r.profitableStateProfit) - x(0)}" height="14" rx="3" fill="${C.blue}"/>`
    s += txt(x(r.lossStateProfit) - 5, yy - 5, money(r.lossStateProfit, { digits: 1 }), { size: 11, weight: 600, anchor: 'end' })
    s += txt(x(r.profitableStateProfit) + 5, yy - 5, money(r.profitableStateProfit, { sign: true, digits: 1 }), { size: 11, weight: 600 })
    // net bar
    s += `<rect x="${x(0)}" y="${yy + 2}" width="${x(r.profit) - x(0)}" height="9" rx="3" fill="${C.ink}"/>`
    s += txt(x(r.profit) + 5, yy + 10.5, `net ${money(r.profit, { sign: true, digits: 1 })}`, { size: 11, weight: 700 })
    s += txt(x(0) - 5, yy + 12, r.lossStates.map((n) => abbr[n]).join(', '), { size: 10.5, fill: C.muted, anchor: 'end' })
    if (i < R.length - 1) s += `<line x1="0" x2="${W}" y1="${y0 + rh}" y2="${y0 + rh}" stroke="${C.grid}"/>`
  })
  return s + '</svg>'
}

function q2States(W, H) {
  const L = D.q2.lossStates
  const robust = new Set(['Texas', 'Ohio', 'Pennsylvania', 'Illinois'])
  const labelW = 112
  const zero = W - 208
  const x = lin(-27000, 0, labelW + 10, zero)
  const top = 6
  const rh = (H - top) / L.length
  let s = `<svg width="${W}" height="${H}">`
  s += `<line x1="${zero}" x2="${zero}" y1="0" y2="${H}" stroke="${C.ink}" stroke-width="1.5"/>`
  L.forEach((d, i) => {
    const yy = top + i * rh + rh / 2
    const r = robust.has(d.state)
    s += txt(labelW, yy + 4, d.state, { size: 13, weight: r ? 800 : 500, anchor: 'end', fill: r ? C.ink : C.ink2 })
    s += `<rect x="${x(d.profit)}" y="${yy - 7}" width="${zero - x(d.profit)}" height="14" rx="3" fill="${r ? C.red : C.redSoft}"/>`
    s += txt(zero + 8, yy + 4, `${money(d.profit, { digits: 1 })}`, { size: 12.5, weight: 700 })
    s += txt(zero + 70, yy + 4, r ? 'loss in all 4 years' : `${pct(d.margin)} margin`, { size: 11.5, weight: r ? 700 : 400, fill: r ? C.ink : C.muted })
  })
  return s + '</svg>'
}

function q2Matrix(W, H) {
  const { cells, matrixStates: rowsS, matrixSubs: subs } = D.q2
  const labelW = 128
  const cw = (W - labelW) / subs.length
  const headerH = 26
  const groupGap = 22
  const ch = (H - headerH - groupGap * 2) / rowsS.length
  const yOf = (i) => headerH + groupGap + i * ch + (i >= 10 ? groupGap : 0)
  let s = `<svg width="${W}" height="${H}">`
  subs.forEach((sub, j) => { s += txt(labelW + j * cw + cw / 2, 16, sub, { size: 12, weight: 700, anchor: 'middle', fill: sub === 'Binders' ? C.ink : C.ink2 }) })
  s += txt(0, headerH + 15, '10 LOSS-MAKING STATES', { size: 10.5, weight: 700, fill: C.muted, extra: 'letter-spacing="1.2"' })
  s += txt(0, yOf(10) - 7, 'LARGEST PROFITABLE STATES, FOR CONTRAST', { size: 10.5, weight: 700, fill: C.muted, extra: 'letter-spacing="1.2"' })
  rowsS.forEach((st, i) => {
    const y0 = yOf(i)
    const bold = ['Texas', 'Ohio', 'Pennsylvania', 'Illinois'].includes(st)
    s += txt(labelW - 10, y0 + ch / 2 + 4, st, { size: 12.5, weight: bold ? 800 : 500, anchor: 'end', fill: i < 10 ? C.ink : C.ink2 })
    subs.forEach((sub, j) => {
      const c = cells[`${st}|${sub}`]
      const x0 = labelW + j * cw
      if (!c) { s += txt(x0 + cw / 2, y0 + ch / 2 + 4, '—', { size: 12, fill: C.axis, anchor: 'middle' }); return }
      const fill = discColor(c.discount)
      const ink = lum(fill) < 0.5 ? '#ffffff' : C.ink
      s += `<rect x="${x0 + 1.5}" y="${y0 + 1.5}" width="${cw - 3}" height="${ch - 3}" rx="4" fill="${fill}"/>`
      s += txt(x0 + 9, y0 + ch / 2 + 4.5, `${Math.round(c.discount * 100)}%`, { size: 12.5, weight: 800, fill: ink })
      s += txt(x0 + cw - 9, y0 + ch / 2 + 4.5, money(c.profit, { digits: Math.abs(c.profit) >= 1000 ? 1 : 0 }), { size: 11.5, weight: c.profit < 0 ? 700 : 400, fill: ink, anchor: 'end' })
      if (c.profit < 0) s += `<circle cx="${x0 + cw - 5}" cy="${y0 + 6}" r="3.6" fill="${C.red}" stroke="${C.card}" stroke-width="1.2"/>`
    })
  })
  const ti = rowsS.indexOf('Texas'), bj = subs.indexOf('Binders')
  s += `<rect x="${labelW + bj * cw - 1}" y="${yOf(ti) - 1}" width="${cw + 2}" height="${ch + 2}" rx="5" fill="none" stroke="${C.red}" stroke-width="3"/>`
  return s + '</svg>'
}

function Q2() {
  const q = D.q2
  const tx = q.cells['Texas|Binders']
  const sc = q.sameCustomer
  const scBar = (() => {
    const W = 420, x = lin(-0.32, 0.36, 150, W - 60)
    let s = `<svg width="${W}" height="56">`
    s += `<line x1="${x(0)}" x2="${x(0)}" y1="2" y2="54" stroke="${C.ink}" stroke-width="1.2"/>`
    ;[[sc.marginNever, 'never discount', C.blue, 14], [sc.marginNeverFull, 'never sell at full price', C.red, 42]].forEach(([v, l, col, yy]) => {
      s += txt(0, yy + 4, `States that ${l}`.replace('States that never sell at full price', 'No full-price sales').replace('States that never discount', 'No discounts'), { size: 12, fill: C.ink2 })
      s += `<rect x="${x(Math.min(0, v))}" y="${yy - 8}" width="${Math.abs(x(v) - x(0))}" height="16" rx="3" fill="${col}"/>`
      s += txt(v < 0 ? x(v) - 5 : x(v) + 5, yy + 4.5, pct(v), { size: 13, weight: 800, anchor: v < 0 ? 'end' : 'start' })
    })
    return s + '</svg>'
  })()
  const body = `
<div class="row" style="height:318px">
  <div class="card" style="width:720px">
    <div class="ct"><span class="lab" style="margin-right:8px">Region level</span>All four regions are profitable</div>
    <div class="cs">Each region’s net profit (black) = profit from its profitable states (blue) minus losses from its loss-making states (red). Every region was also profitable in each year 2014–2017.</div>
    <div style="margin-top:8px">${q2Regions(678, 218)}</div>
  </div>
  <div class="card" style="flex:1">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
      <div><div class="ct"><span class="lab" style="margin-right:8px">State level</span>10 of ${q.stateCount} states lose money</div>
      <div class="cs">Net profit 2014–2017. Texas, Ohio, Pennsylvania and Illinois are the major, consistent loss states.</div></div>
      <div style="text-align:right;flex:none"><div class="big" style="font-size:34px">${pct(q.tenStateLossShare)}</div><div class="cs" style="margin-top:0">of all line-level losses<br>(${money(-q.tenStateLosses, { digits: 1 })} of ${money(-q.grossLosses, { digits: 1 })})</div></div>
    </div>
    <div style="margin-top:6px">${q2States(712, 204)}</div>
  </div>
</div>
<div class="row" style="flex:1">
  <div class="card" style="width:1010px">
    <div class="ct">Losses are concentrated where deeper discount rates are present</div>
    <div class="cs">Each cell: the state’s fixed discount rate for that sub-category (shade + left number, same every year) and net profit 2014–2017 (right). Red dot = loss.</div>
    <div style="margin-top:10px">${q2Matrix(968, 376)}</div>
    <div class="legend" style="margin-top:4px"><span>Discount rate:</span>${[0, 0.2, 0.3, 0.5, 0.8].map((d) => `<span><span class="sw" style="background:${discColor(d)};border:1px solid rgba(11,11,11,.12);width:14px"></span>${Math.round(d * 100)}%</span>`).join('')}<span><span class="sw" style="background:${C.red};border-radius:50%"></span>cell lost money</span><span>— no sales</span></div>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;gap:12px">
    <div class="card" style="flex:1">
      <div class="lab">Deep discounts</div>
      <div class="big" style="margin-top:6px">1 in 7 lines → ${pct(q.deepLossShare)}</div>
      <div class="cs" style="font-size:13.5px;margin-top:8px">${num(q.deepLines)} of ${num(q.lines)} order lines (${pct(q.deepLineShare)}) carry a 30–80% discount. They account for ${pct(q.deepLossShare)} of all line-level losses and net ${money(q.deepProfit, { digits: 1 })}.</div>
    </div>
    <div class="card" style="flex:1;border:2px solid ${C.red}">
      <div class="lab">Largest single loss combination</div>
      <div class="big" style="margin-top:6px">Texas × Binders</div>
      <div class="cs" style="font-size:13.5px;margin-top:8px">${Math.round(tx.discount * 100)}% discount on all ${tx.lines} lines · ${money(tx.sales, { digits: 1 })} sales · <b style="color:${C.ink}">${money(tx.profit, { digits: 1 })} profit</b>. The same sub-category earns profit in states with lower rates (e.g. California and New York at 20%).</div>
    </div>
    <div class="card" style="flex:1.15">
      <div class="lab">Same customers, different states</div>
      <div class="cs" style="font-size:13px;margin-top:4px">${sc.customers} customers ordered both in states that never discount and in states that never sell at full price. Their margin:</div>
      <div style="margin-top:6px">${scBar}</div>
    </div>
  </div>
</div>`
  return shell({
    title: 'Q2 Geographic Losses', qn: 2,
    question: 'Are there specific geographic regions that consistently operate at a loss?',
    finding: `No region operates at a loss — all four regions are profitable — but losses are concentrated at the state level: 10 states account for ${pct(q.tenStateLossShare)} of line-level losses, led by Texas, Ohio, Pennsylvania and Illinois, and losses are concentrated where deeper discount rates are present.`,
    body,
    note: `<b>Region vs. state.</b> REGION = the dataset’s four company-defined regions (Central, East, South, West). STATE = the ${q.stateCount} states (incl. DC) inside them; each state belongs to one region. <b>Method.</b> Line-level losses = total profit of order lines with negative profit (${money(q.grossLosses, { digits: 1 })}). “Loss in all 4 years” = negative net profit in each of 2014, 2015, 2016 and 2017; yearly results for the smaller loss states are too noisy to call consistent. Same-customer margins compare each customer’s orders shipped to the 21 states with no discounted lines vs. states with no full-price lines. <b>Data:</b> Sample - Superstore.csv, ${num(T.lines)} order lines. The discount structure is highly rule-generated; findings describe this dataset, not real-world retail behavior. Patterns are associations, not evidence that discounts cause losses.`,
  })
}

/* =============================== Q3 =============================== */
const SHIP_ORDER = ['Standard Class', 'Second Class', 'First Class', 'Same Day']
const shipRows = () => SHIP_ORDER.map((m) => D.ship.find((s) => s.mode === m))

function q3Volume(W, H) {
  const R = shipRows()
  const labelW = 124
  const x = lin(0, 1450000, labelW + 10, W - 150)
  const rh = (H - 10) / R.length
  let s = `<svg width="${W}" height="${H}">`
  R.forEach((d, i) => {
    const yy = 5 + i * rh + rh / 2
    s += txt(labelW, yy + 5, d.mode, { size: 15, weight: 700, anchor: 'end' })
    s += `<rect x="${labelW + 10}" y="${yy - 17}" width="${x(d.sales) - labelW - 10}" height="34" rx="5" fill="${C.blue}"/>`
    s += txt(x(d.sales) + 10, yy - 1, money(d.sales, { digits: d.sales >= 1e6 ? 2 : 0 }), { size: 22, weight: 900 })
    s += txt(x(d.sales) + 10, yy + 17, `${pct(d.salesShare)} of sales · ${num(d.orders)} orders`, { size: 11.5, fill: C.ink2 })
  })
  return s + '</svg>'
}

function q3Margin(W, H) {
  const R = shipRows()
  const labelW = 124
  const x = lin(0, 0.25, labelW + 16, W - 70)
  const top = 8, bottom = 26
  const rh = (H - top - bottom) / R.length
  let s = `<svg width="${W}" height="${H}">`
  ;[0, 0.05, 0.1, 0.15, 0.2, 0.25].forEach((t) => {
    s += `<line x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${H - bottom}" stroke="${C.grid}"/>`
    s += txt(x(t), H - 8, pct(t, 0), { size: 11, fill: C.muted, anchor: 'middle' })
  })
  s += `<line x1="${x(T.margin)}" x2="${x(T.margin)}" y1="${top}" y2="${H - bottom}" stroke="${C.ink2}" stroke-dasharray="4 4"/>`
  R.forEach((d, i) => {
    const yy = top + i * rh + rh / 2
    s += txt(labelW, yy + 5, d.mode, { size: 15, weight: 700, anchor: 'end' })
    s += `<line x1="${x(d.lo)}" x2="${x(d.hi)}" y1="${yy}" y2="${yy}" stroke="${C.ink2}" stroke-width="2.5" stroke-linecap="round"/>`
    s += `<line x1="${x(d.lo)}" x2="${x(d.lo)}" y1="${yy - 7}" y2="${yy + 7}" stroke="${C.ink2}" stroke-width="2.5"/><line x1="${x(d.hi)}" x2="${x(d.hi)}" y1="${yy - 7}" y2="${yy + 7}" stroke="${C.ink2}" stroke-width="2.5"/>`
    s += `<circle cx="${x(d.margin)}" cy="${yy}" r="8.5" fill="${C.blue}" stroke="${C.card}" stroke-width="2.5"/>`
    s += txt(W - 4, yy + 7, pct(d.margin), { size: 20, weight: 900, anchor: 'end' })
  })
  return s + '</svg>'
}

function q3Shares(W, H) {
  const R = shipRows()
  const metrics = [['Orders', 'orderShare'], ['Sales', 'salesShare'], ['Profit', 'profitShare']]
  const labelW = 70
  const bw = W - labelW - 6
  const rh = (H - 6) / metrics.length
  let s = `<svg width="${W}" height="${H}">`
  metrics.forEach(([name, k], i) => {
    const yy = 3 + i * rh + rh / 2
    s += txt(labelW - 10, yy + 5, name, { size: 14, weight: 700, anchor: 'end' })
    let x0 = labelW
    R.forEach((d, j) => {
      const w = d[k] * bw
      s += `<rect x="${x0}" y="${yy - 16}" width="${Math.max(1, w - 2)}" height="32" rx="4" fill="${C.cat[j]}"/>`
      if (w > 32) s += txt(x0 + w / 2 - 1, yy + 5, pct(d[k], 1), { size: w > 44 ? 12.5 : 11, weight: 800, fill: j === 3 ? C.ink : '#ffffff', anchor: 'middle' })
      x0 += w
    })
  })
  return s + '</svg>'
}

function Q3() {
  const R = shipRows()
  const min = Math.min(...R.map((d) => d.margin)), max = Math.max(...R.map((d) => d.margin))
  const table = `<table><thead><tr><th>Ship mode</th><th>Orders</th><th>Sales</th><th>Profit</th><th>Margin</th><th>95% interval</th><th>Avg order</th></tr></thead><tbody>
${R.map((d, j) => `<tr><td><span class="sw" style="background:${C.cat[j]}"></span><b>${d.mode}</b></td><td>${num(d.orders)}</td><td>${money(d.sales, { digits: d.sales >= 1e6 ? 2 : 0 })}</td><td>${money(d.profit, { sign: true, digits: 1 })}</td><td><b>${pct(d.margin)}</b></td><td>${pct(d.lo)} – ${pct(d.hi)}</td><td>$${Math.round(d.aov)}</td></tr>`).join('')}
<tr><td><b>All modes</b></td><td>${num(T.orders)}</td><td>${money(T.sales)}</td><td>${money(T.profit, { sign: true, digits: 1 })}</td><td><b>${pct(T.margin, 2)}</b></td><td></td><td>$${Math.round(T.sales / T.orders)}</td></tr>
</tbody></table>`
  const body = `
<div class="row" style="height:392px">
  <div class="card" style="width:760px">
    <div class="ct">Sales volume differs widely by ship mode</div>
    <div class="cs">Total sales 2014–2017. Standard Class carries more sales than the other three modes combined.</div>
    <div style="margin-top:14px">${q3Volume(718, 300)}</div>
  </div>
  <div class="card" style="flex:1">
    <div class="ct">Recorded profit margin is similar across modes</div>
    <div class="cs">Margin = recorded profit ÷ sales. Bars show 95% intervals; all four overlap. Dashed line = overall margin ${pct(T.margin, 2)}.</div>
    <div style="margin-top:14px">${q3Margin(668, 300)}</div>
  </div>
</div>
<div class="row" style="flex:1">
  <div class="card" style="width:760px">
    <div class="ct">Each mode’s share of orders, sales and profit</div>
    <div class="cs">Profit shares track order and sales shares closely: a mode contributes profit roughly in proportion to its volume.</div>
    <div style="margin-top:14px">${q3Shares(718, 168)}</div>
    <div class="legend" style="margin-top:10px">${R.map((d, j) => `<span><span class="sw" style="background:${C.cat[j]}"></span>${d.mode}</span>`).join('')}</div>
    <div style="margin-top:22px;padding:14px 16px;border-radius:12px;background:#efede7">
      <div style="font-size:15px;font-weight:800">Every mode’s 95% interval includes the overall margin of ${pct(T.margin, 2)}.</div>
      <div style="font-size:12.5px;color:${C.ink2};margin-top:4px;line-height:1.45">No mode’s profit share differs from its sales share by more than ${(Math.max(...R.map((d) => Math.abs(d.profitShare - d.salesShare))) * 100).toFixed(1)} points (Standard Class ${pct(R[0].salesShare)} of sales vs ${pct(R[0].profitShare)} of profit; First Class ${pct(R[2].salesShare)} vs ${pct(R[2].profitShare)}).</div>
    </div>
  </div>
  <div class="card" style="flex:1;display:flex;flex-direction:column">
    <div class="ct">Supporting numbers</div>
    <div style="margin-top:8px">${table}</div>
    <div style="margin-top:auto;padding:12px 14px;border-radius:12px;background:#efede7;font-size:16px;font-weight:800">Shipping cost is not recorded in this dataset.<div style="font-size:12.5px;font-weight:400;color:${C.ink2};margin-top:3px">Recorded profit therefore cannot show what faster shipping costs; it only shows that recorded margins do not differ detectably by mode (${pct(min)}–${pct(max)}).</div></div>
  </div>
</div>`
  return shell({
    title: 'Q3 Shipping Mode', qn: 3,
    question: 'How does shipping mode affect overall profit and sales volume?',
    finding: 'Shipping mode shows large differences in sales volume, but no detectable link to recorded profit.',
    body,
    note: `<b>Method.</b> Sales, orders and recorded profit summed by ship mode (ship mode is recorded once per order). Margin = recorded profit ÷ sales. 95% intervals from 1,000 bootstrap resamples of orders within each mode; “no detectable link” means the margin differences fall within overlapping intervals. Intervals are wide for Same Day because it has few orders (${num(R[3].orders)}). <b>Data:</b> Sample - Superstore.csv, ${num(T.lines)} order lines, ${num(T.orders)} orders, 2014–2017. Shipping cost is not recorded; findings describe this dataset, not real-world retail behavior, and are associations rather than causes.`,
  })
}

const pages = { Q1_Product_Profitability: Q1(), Q2_Geographic_Losses: Q2(), Q3_Shipping_Mode: Q3() }
for (const [name, html] of Object.entries(pages)) {
  fs.writeFileSync(path.join(HERE, `${name}.html`), html)
  console.log('wrote', name + '.html')
}
