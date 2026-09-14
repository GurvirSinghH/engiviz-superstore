import { useState } from 'react'
import * as d3 from 'd3'
import story from '../data/story.json'
import { useWidth, money, pct } from '../lib'

export default function Shipping({ pal }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const w = Math.max(300, width || 560)
  const labelW = 118
  const rowH = 38
  const data = story.ship
  const h = data.length * rowH + 30
  const x = d3.scaleLinear().domain([0, 0.25]).range([labelW, w - 56])
  const overall = story.totals.margin

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={h} role="img" aria-label="Recorded profit margin by ship mode with 95% intervals; all intervals overlap.">
        {[0, 0.05, 0.1, 0.15, 0.2, 0.25].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={4} y2={h - 22} stroke={pal.grid} />
            <text x={x(t)} y={h - 6} textAnchor="middle" fontSize={11} fill={pal.muted} className="num">{Math.round(t * 100)}%</text>
          </g>
        ))}
        <line x1={x(overall)} x2={x(overall)} y1={4} y2={h - 22} stroke={pal.ink2} strokeDasharray="3 3" />
        {data.map((d, i) => {
          const yy = 8 + i * rowH + rowH / 2
          return (
            <g key={d.mode} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)} opacity={hover && hover !== d ? 0.55 : 1}>
              <rect x={0} y={yy - rowH / 2} width={w} height={rowH} fill="transparent" />
              <text x={labelW - 12} y={yy} dy="0.33em" textAnchor="end" fontSize={12.5} fill={pal.ink}>{d.mode}</text>
              <line x1={x(d.lo)} x2={x(d.hi)} y1={yy} y2={yy} stroke={pal.ink2} strokeWidth={2} strokeLinecap="round" />
              <line x1={x(d.lo)} x2={x(d.lo)} y1={yy - 5} y2={yy + 5} stroke={pal.ink2} strokeWidth={2} />
              <line x1={x(d.hi)} x2={x(d.hi)} y1={yy - 5} y2={yy + 5} stroke={pal.ink2} strokeWidth={2} />
              <circle cx={x(d.margin)} cy={yy} r={6} fill={pal.profit} stroke={pal.surface} strokeWidth={2} />
              <text x={w - 4} y={yy} dy="0.33em" textAnchor="end" fontSize={12.5} fontWeight={650} fill={pal.ink} className="num">
                {pct(d.margin)}
              </text>
            </g>
          )
        })}
      </svg>
      {hover && (
        <div className="tip" style={{ left: Math.min(w - 250, labelW), top: 8 + (data.indexOf(hover) + 1) * rowH }}>
          <div style={{ fontWeight: 650, marginBottom: 6 }}>{hover.mode}</div>
          <div className="row"><span>Orders</span><span>{hover.orders.toLocaleString()}</span></div>
          <div className="row"><span>Sales</span><span>{money(hover.sales)}</span></div>
          <div className="row"><span>Recorded profit</span><span>{money(hover.profit, { sign: true })}</span></div>
          <div className="row"><span>Margin</span><span>{pct(hover.margin)}</span></div>
          <div className="row"><span>95% interval</span><span>{pct(hover.lo)} – {pct(hover.hi)}</span></div>
        </div>
      )}
      <div className="mt-1 text-[11.5px] ink2">
        ● recorded margin · ├─┤ 95% interval from resampling orders · dashed line = overall {pct(overall, 2)}
      </div>
    </div>
  )
}
