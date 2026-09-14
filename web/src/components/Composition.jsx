import { useMemo, useState } from 'react'
import * as d3 from 'd3'
import story from '../data/story.json'
import { useWidth, money, pct, discLabel } from '../lib'

const WH = story.what

export function LossBars({ pal }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const w = Math.max(320, width || 700)
  const narrow = w < 560
  const rows = useMemo(() => WH.subs.filter((s) => s.grossLosses < 0), [])
  const labelW = narrow ? 92 : 118
  const netW = narrow ? 78 : 104
  const rowH = 30
  const h = rows.length * rowH + 28
  const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => -r.grossLosses)]).range([0, w - labelW - netW - 76])
  const B = WH.binders

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={h} role="img" aria-label="Horizontal bars of line-level losses by sub-category, with net profit on the right.">
        <text x={labelW} y={12} fontSize={11} fill={pal.muted}>Line-level losses →</text>
        <text x={w - 4} y={12} fontSize={11} fill={pal.muted} textAnchor="end">Net profit</text>
        {rows.map((r, i) => {
          const yy = 24 + i * rowH
          const isB = r.sub === 'Binders'
          const segA = isB ? x(-B.machineLosses) : x(-r.grossLosses)
          const segB = isB ? x(-B.otherLosses) : 0
          const dim = hover && hover.sub !== r.sub
          return (
            <g key={r.sub} opacity={dim ? 0.5 : 1} onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(null)}>
              <rect x={0} y={yy} width={w} height={rowH} fill="transparent" />
              <text x={labelW - 10} y={yy + rowH / 2} dy="0.33em" textAnchor="end" fontSize={12.5} fontWeight={r.net < 0 ? 700 : 500} fill={pal.ink}>
                {r.sub}
              </text>
              <rect x={labelW} y={yy + 7} width={Math.max(2, segA)} height={rowH - 14} rx={4} fill={pal.loss} />
              {isB && <rect x={labelW + segA + 2} y={yy + 7} width={Math.max(2, segB)} height={rowH - 14} rx={4} fill={pal.lossSoft} />}
              <text x={labelW + segA + segB + (isB ? 2 : 0) + 6} y={yy + rowH / 2} dy="0.33em" fontSize={11.5} fill={pal.ink2} className="num">
                {money(r.grossLosses)}
              </text>
              <text x={w - 4} y={yy + rowH / 2} dy="0.33em" textAnchor="end" fontSize={12} fontWeight={r.net < 0 ? 700 : 500} fill={r.net < 0 ? pal.ink : pal.ink2} className="num">
                {money(r.net, { sign: true })}
              </text>
            </g>
          )
        })}
      </svg>
      {hover && (
        <div className="tip" style={{ left: Math.min(w - 250, labelW + 40), top: 24 + rows.indexOf(hover) * rowH + rowH }}>
          <div style={{ fontWeight: 650, marginBottom: 6 }}>{hover.sub} <span className="ink2" style={{ fontWeight: 400 }}>· {hover.cat}</span></div>
          <div className="row"><span>Sales</span><span>{money(hover.sales)}</span></div>
          <div className="row"><span>Profit on profitable lines</span><span>{money(hover.grossGains, { sign: true })}</span></div>
          <div className="row"><span>Line-level losses</span><span>{money(hover.grossLosses)}</span></div>
          <div className="row"><span>Net profit</span><span>{money(hover.net, { sign: true })}</span></div>
          {hover.sub === 'Binders' && (
            <div className="ink2" style={{ marginTop: 6, fontSize: 11.5 }}>
              Binding machines (list ≥ $100): {money(B.machineLosses)} · other binder products: {money(B.otherLosses)}
            </div>
          )}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] ink2">
        <span><span className="swatch" style={{ background: pal.loss }} /> losses (Binders: binding machines listed at $100+)</span>
        <span><span className="swatch" style={{ background: pal.lossSoft }} /> Binders: other products</span>
        <span className="muted">Bold = negative net profit</span>
      </div>
    </div>
  )
}

export function BindersSplit({ pal }) {
  const B = WH.binders
  const [ref, width] = useWidth()
  const w = Math.max(240, width || 300)
  const a = w * B.machineShare
  return (
    <div ref={ref}>
      <svg width={w} height={40} role="img" aria-label={`Binding machines carry ${pct(B.machineShare)} of Binders line-level losses`}>
        <rect x={0} y={6} width={a - 1} height={20} rx={4} fill={pal.loss} />
        <rect x={a + 1} y={6} width={w - a - 1} height={20} rx={4} fill={pal.lossSoft} />
        <text x={0} y={39} fontSize={11} fill={pal.ink2}>binding machines {pct(B.machineShare)}</text>
        <text x={w} y={39} fontSize={11} fill={pal.ink2} textAnchor="end">other {pct(1 - B.machineShare)}</text>
      </svg>
    </div>
  )
}

export function TablesYears({ pal }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const w = Math.max(240, width || 300)
  const h = 130
  const data = WH.tables.byYear
  const x = d3.scaleBand().domain(data.map((d) => d.year)).range([0, w]).padding(0.38)
  const y = d3.scaleLinear().domain([d3.min(data, (d) => d.profit) * 1.1, 0]).range([h - 18, 20])
  return (
    <div ref={ref} className="relative">
      <svg width={w} height={h} role="img" aria-label="Tables net profit by year, negative in all four years">
        <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={pal.ink} strokeWidth={1.5} />
        {data.map((d) => (
          <g key={d.year} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}>
            <rect x={x(d.year) - 6} y={0} width={x.bandwidth() + 12} height={h} fill="transparent" />
            <rect x={x(d.year)} y={y(0)} width={x.bandwidth()} height={y(d.profit) - y(0)} rx={4} fill={pal.loss} opacity={hover && hover !== d ? 0.5 : 1} />
            <text x={x(d.year) + x.bandwidth() / 2} y={12} textAnchor="middle" fontSize={11} fill={pal.ink2}>{d.year}</text>
            <text x={x(d.year) + x.bandwidth() / 2} y={Math.min(h - 4, y(d.profit) + 13)} textAnchor="middle" fontSize={11} fill={pal.ink} className="num">
              {money(d.profit)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function CategoryMargins({ pal }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const w = Math.max(240, width || 300)
  const labelW = 104
  const rowH = 34
  const cats = WH.categories
  const h = cats.length * rowH + 30
  const x = d3.scaleLinear().domain([0, 0.4]).range([labelW, w - 12])
  return (
    <div ref={ref} className="relative">
      <svg width={w} height={h} role="img" aria-label="Full-price margin versus realized margin by category">
        {[0, 0.1, 0.2, 0.3, 0.4].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={6} y2={h - 20} stroke={pal.grid} />
            <text x={x(t)} y={h - 6} textAnchor="middle" fontSize={10.5} fill={pal.muted} className="num">{Math.round(t * 100)}%</text>
          </g>
        ))}
        {cats.map((c, i) => {
          const yy = 12 + i * rowH + rowH / 2
          const isF = c.category === 'Furniture'
          return (
            <g key={c.category} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
              <rect x={0} y={yy - rowH / 2} width={w} height={rowH} fill="transparent" />
              <text x={labelW - 10} y={yy} dy="0.33em" textAnchor="end" fontSize={12} fontWeight={isF ? 700 : 500} fill={pal.ink}>{c.category}</text>
              <line x1={x(c.margin)} x2={x(c.fullPriceMargin)} y1={yy} y2={yy} stroke={pal.axis} strokeWidth={3} strokeLinecap="round" />
              <circle cx={x(c.fullPriceMargin)} cy={yy} r={6} fill={pal.surface} stroke={pal.ink} strokeWidth={2} />
              <circle cx={x(c.margin)} cy={yy} r={6} fill={isF ? pal.loss : pal.ink2} stroke={pal.surface} strokeWidth={2} />
            </g>
          )
        })}
      </svg>
      {hover && (
        <div className="tip" style={{ left: 8, top: h - 8 }}>
          <div style={{ fontWeight: 650, marginBottom: 6 }}>{hover.category}</div>
          <div className="row"><span>Full-price margin</span><span>{pct(hover.fullPriceMargin)}</span></div>
          <div className="row"><span>Average discount (list-weighted)</span><span>{pct(hover.listWeightedDiscount)}</span></div>
          <div className="row"><span>Realized margin</span><span>{pct(hover.margin)}</span></div>
          <div className="row"><span>Net profit</span><span>{money(hover.profit, { sign: true })}</span></div>
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-x-4 text-[11.5px] ink2">
        <span>○ margin at full list price</span>
        <span>● realized margin</span>
      </div>
    </div>
  )
}

export function worstBinderLine() {
  const b = WH.binders.worst[0]
  return `${b.name.split(' ').slice(0, 4).join(' ')} in ${b.state}: ${b.qty} units at ${discLabel(b.disc)} off, ${money(b.sales)} sales, ${money(b.profit)} profit`
}
