import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import lines from '../data/lines.json'
import story from '../data/story.json'
import { useWidth, money, moneyFull, pct, discLabel } from '../lib'

function jitter(i, salt) {
  let h = Math.imul(i + 1, 2654435761) ^ Math.imul(salt, 40503)
  h ^= h >>> 15
  h = Math.imul(h, 2246822519)
  h ^= h >>> 13
  return ((h >>> 0) % 10000) / 10000 - 0.5
}
const cents = (v) => {
  const c = Math.round(v * 100)
  return c === 0 ? '0¢' : `${c > 0 ? '+' : '−'}${Math.abs(c)}¢`
}

export default function Mechanism({ pal }) {
  const [ref, width] = useWidth()
  const canvasRef = useRef(null)
  const [hover, setHover] = useState(null)
  const [levelHover, setLevelHover] = useState(null)
  const w = Math.max(320, width || 960)
  const narrow = w < 640
  const h = narrow ? 420 : 540
  const hb = narrow ? 170 : 200
  const m = { t: 56, r: narrow ? 10 : 20, b: 36, l: narrow ? 46 : 62 }
  const T = story.totals

  const x = useMemo(() => d3.scaleLinear().domain([-0.03, 0.83]).range([m.l, w - m.r]), [w, m.l, m.r])
  const y = useMemo(() => d3.scaleLinear().domain([-0.86, 0.56]).range([h - m.b, m.t]), [h, m.b, m.t])
  const pos = useMemo(
    () => lines.points.map((p, i) => [x(p[0] + jitter(i, 7) * 0.018), y(p[1] + jitter(i, 13) * 0.009)]),
    [x, y],
  )
  const delaunay = useMemo(() => d3.Delaunay.from(pos), [pos])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    cv.width = w * dpr
    cv.height = h * dpr
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const r = narrow ? 1.6 : 2.1
    for (const [color, pass] of [[pal.profit, (p) => p[2] >= 0], [pal.loss, (p) => p[2] < 0]]) {
      ctx.fillStyle = color
      ctx.globalAlpha = pal.dotAlpha
      ctx.beginPath()
      lines.points.forEach((p, i) => {
        if (!pass(p)) return
        const [px, py] = pos[i]
        ctx.moveTo(px + r, py)
        ctx.arc(px, py, r, 0, Math.PI * 2)
      })
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [pos, w, h, pal, narrow])

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const i = delaunay.find(mx, my)
    if (i >= 0 && Math.hypot(pos[i][0] - mx, pos[i][1] - my) < 14) setHover(i)
    else setHover(null)
  }

  // contribution bars (same x scale)
  const levels = story.byLevel
  const yb = useMemo(() => {
    const ext = d3.extent(levels, (d) => d.profit)
    return d3.scaleLinear().domain([Math.min(ext[0], 0) * 1.9, ext[1] * 1.12]).range([hb - 24, 14]).nice()
  }, [levels, hb])
  const barW = narrow ? 8 : 14

  const hp = hover != null ? lines.points[hover] : null
  const tipX = hover != null ? pos[hover][0] : 0
  const tipY = hover != null ? pos[hover][1] : 0
  const yTicks = [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4]
  const xTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
  const split = x(0.25)

  return (
    <div ref={ref} className="w-full">
      {/* scatter */}
      <div className="relative" style={{ height: h }}>
        <canvas ref={canvasRef} style={{ width: w, height: h, position: 'absolute', inset: 0 }} aria-hidden="true" />
        <svg
          width={w}
          height={h}
          className="absolute inset-0"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Scatter of 9,994 order lines: discount on the x axis, profit per dollar of list price on the y axis. Lines under 30% discount sit mostly above zero; lines at 30 to 80% sit mostly below."
        >
          <rect x={split} y={m.t - 24} width={w - m.r - split} height={h - m.b - m.t + 24} fill={pal.wash} />
          <line x1={split} x2={split} y1={m.t - 24} y2={h - m.b} stroke={pal.loss} strokeDasharray="3 4" strokeOpacity={0.6} />
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke={pal.grid} strokeWidth={t === 0 ? 0 : 1} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={pal.muted} className="num">
                {cents(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={h - m.b + 20} textAnchor="middle" fontSize={11} fill={pal.muted} className="num">
              {discLabel(t)}
            </text>
          ))}
          <text x={w - m.r} y={h - 4} textAnchor="end" fontSize={11} fill={pal.ink2}>
            Discount on the line →
          </text>
          <text x={2} y={12} fontSize={11} fill={pal.ink2}>
            ↑ Profit per $1 of list price
          </text>
          {/* guides: product full-price margin 50% and 0% */}
          <line x1={x(0)} y1={y(0.5)} x2={x(0.8)} y2={y(-0.3)} stroke={pal.ink2} strokeDasharray="5 5" strokeOpacity={0.55} />
          <line x1={x(0)} y1={y(0)} x2={x(0.8)} y2={y(-0.8)} stroke={pal.ink2} strokeDasharray="5 5" strokeOpacity={0.55} />
          {!narrow && (
            <>
              <text x={x(0.52)} y={y(0.5 - 0.52) - 8} fontSize={11} fill={pal.ink2} transform={`rotate(${(Math.atan2(y(-0.3) - y(0.5), x(0.8) - x(0)) * 180) / Math.PI} ${x(0.52)} ${y(0.5 - 0.52) - 8})`}>
                products with a 50% full-price margin
              </text>
              <text x={x(0.52)} y={y(-0.52) + 16} fontSize={11} fill={pal.ink2} transform={`rotate(${(Math.atan2(y(-0.8) - y(0), x(0.8) - x(0)) * 180) / Math.PI} ${x(0.52)} ${y(-0.52) + 16})`}>
                products with a 0% full-price margin
              </text>
            </>
          )}
          {/* break-even */}
          <line x1={m.l} x2={w - m.r} y1={y(0)} y2={y(0)} stroke={pal.ink} strokeWidth={2} />
          <text x={w - m.r - 6} y={y(0) - 8} textAnchor="end" fontSize={12} fontWeight={700} fill={pal.ink}>
            Break-even: profit = $0
          </text>
          <text x={m.l + 6} y={m.t - 8} fontSize={12} fontWeight={650} fill={pal.ink}>
            Under 30% off
          </text>
          <text x={split + 8} y={m.t - 8} fontSize={12} fontWeight={650} fill={pal.ink}>
            30–80% off
          </text>
          {hp && (
            <circle cx={tipX} cy={tipY} r={6} fill="none" stroke={pal.ink} strokeWidth={2} />
          )}
        </svg>
        {hp && (
          <div
            className="tip"
            style={{
              left: Math.min(Math.max(tipX + 14, 0), w - 290),
              top: tipY > h / 2 ? tipY - 180 : tipY + 14,
            }}
          >
            <div style={{ fontWeight: 650, marginBottom: 4 }}>{lines.names[hp[6]]}</div>
            <div className="ink2" style={{ marginBottom: 6 }}>
              {lines.states[hp[4]]} · {lines.subs[hp[5]]}
            </div>
            <div className="row"><span>Discount</span><span>{discLabel(hp[0])}</span></div>
            <div className="row"><span>Quantity</span><span>{hp[7]}</span></div>
            <div className="row"><span>Sales</span><span>{moneyFull(hp[3])}</span></div>
            <div className="row"><span>Profit</span><span>{moneyFull(hp[2])}</span></div>
            <div className="row"><span>Profit per $1 list</span><span>{cents(hp[1])}</span></div>
          </div>
        )}
      </div>

      {/* contribution by discount level */}
      <div className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2" style={{ paddingLeft: m.l }}>
          <div className="text-[13px] font-semibold">Total profit contributed at each discount level</div>
          <div className="text-[12px] muted">Same horizontal axis as above · hover a bar</div>
        </div>
        <div className="relative" style={{ height: hb }}>
          <svg width={w} height={hb} role="img" aria-label="Bar chart of total profit by discount level; levels of 30% and above are negative.">
            <rect x={split} y={0} width={w - m.r - split} height={hb - 20} fill={pal.wash} />
            {yb.ticks(4).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={w - m.r} y1={yb(t)} y2={yb(t)} stroke={t === 0 ? pal.ink : pal.grid} strokeWidth={t === 0 ? 1.5 : 1} />
                <text x={m.l - 8} y={yb(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={pal.muted} className="num">
                  {money(t, { sign: true, digits: 0 })}
                </text>
              </g>
            ))}
            {levels.map((d) => {
              const y0 = yb(0)
              const y1 = yb(d.profit)
              const top = Math.min(y0, y1)
              const hh = Math.max(1, Math.abs(y1 - y0))
              const active = levelHover && levelHover.discount === d.discount
              return (
                <g key={d.discount} onMouseEnter={() => setLevelHover(d)} onMouseLeave={() => setLevelHover(null)}>
                  <rect x={x(d.discount) - 14} y={0} width={28} height={hb - 20} fill="transparent" />
                  <rect
                    x={x(d.discount) - barW / 2}
                    y={top}
                    width={barW}
                    height={hh}
                    rx={Math.min(4, barW / 2)}
                    fill={d.profit >= 0 ? pal.profit : pal.loss}
                    opacity={levelHover && !active ? 0.45 : 1}
                  />
                  {Math.abs(d.profit) > 20000 && !narrow && (
                    <text
                      x={d.profit >= 0 ? x(d.discount) + barW / 2 + 4 : x(d.discount)}
                      y={d.profit >= 0 ? top + 10 : top + hh + 13}
                      textAnchor={d.profit >= 0 ? 'start' : 'middle'}
                      fontSize={11}
                      fill={pal.ink2}
                      className="num"
                    >
                      {money(d.profit, { sign: true })}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          {levelHover && (
            <div className="tip" style={{ left: Math.min(x(levelHover.discount) + 16, w - 230), top: 8 }}>
              <div style={{ fontWeight: 650, marginBottom: 6 }}>{discLabel(levelHover.discount)} discount</div>
              <div className="row"><span>Lines</span><span>{levelHover.lines.toLocaleString()}</span></div>
              <div className="row"><span>Sales</span><span>{money(levelHover.sales)}</span></div>
              <div className="row"><span>Net profit</span><span>{money(levelHover.profit, { sign: true })}</span></div>
              <div className="row"><span>Realized margin</span><span>{pct(levelHover.margin)}</span></div>
              <div className="row"><span>Profit per $1 list</span><span>{cents(levelHover.profit / levelHover.listVal)}</span></div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] ink2" style={{ paddingLeft: m.l }}>
        <span><span className="swatch" style={{ background: pal.profit }} /> line at or above break-even</span>
        <span><span className="swatch" style={{ background: pal.loss }} /> line below break-even</span>
        <span>Each dot is one of {T.lines.toLocaleString()} order lines (slightly jittered).</span>
      </div>
    </div>
  )
}
