import { useMemo, useState } from 'react'
import * as d3 from 'd3'
import story from '../data/story.json'
import { useWidth, money, moneyFull, discLabel, pct } from '../lib'

const W = story.where
const MIN_LINES = 30

export default function Matrix({ pal }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const cw = Math.max(320, width || 960)

  const states = useMemo(() => [...W.states].sort((a, b) => a.profit - b.profit), [])
  const subs = useMemo(
    () => [...W.subs].sort((a, b) => (a.grossLosses - b.grossLosses) || (b.net - a.net)),
    [],
  )
  const cellMap = useMemo(() => new Map(W.cells.map((c) => [`${c.state}|${c.sub}`, c])), [])

  const labelW = 124
  const rightW = 96
  const headerH = 104
  const cellH = 16
  const cellWidth = Math.max(26, Math.floor((cw - labelW - rightW) / subs.length))
  const gridW = cellWidth * subs.length
  const svgW = labelW + gridW + rightW
  const svgH = headerH + cellH * states.length + 8

  const color = useMemo(
    () => d3.scaleLinear().domain([0, 0.2, 0.3, 0.8]).range(pal.disc).interpolate(d3.interpolateLab).clamp(true),
    [pal],
  )
  const rScale = useMemo(() => {
    const maxLoss = d3.max(W.cells, (c) => -c.profit)
    return d3.scaleSqrt().domain([0, maxLoss]).range([0, cellH / 2 - 1])
  }, [])
  const maxState = d3.max(states, (s) => Math.abs(s.profit))
  const barHalf = 30

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const ci = Math.floor((mx - labelW) / cellWidth)
    const ri = Math.floor((my - headerH) / cellH)
    if (ci >= 0 && ci < subs.length && ri >= 0 && ri < states.length) {
      const s = states[ri]
      const sub = subs[ci]
      setHover({ ri, ci, state: s, sub: sub.sub, cell: cellMap.get(`${s.state}|${sub.sub}`), mx, my })
    } else setHover(null)
  }

  const txIdx = states.findIndex((s) => s.state === 'Texas')
  const biIdx = subs.findIndex((s) => s.sub === 'Binders')

  return (
    <div ref={ref} className="w-full">
      <div className="scroll-x">
        <div className="relative" style={{ width: svgW }}>
          <svg
            width={svgW}
            height={svgH}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            role="img"
            aria-label="Matrix of 49 states by 17 sub-categories. Cell shade is the fixed discount rate; red circles mark cells that lost money, sized by the loss."
          >
            {/* column headers */}
            {subs.map((s, i) => (
              <g key={s.sub} transform={`translate(${labelW + i * cellWidth + cellWidth / 2}, ${headerH - 8})`}>
                <text
                  transform="rotate(-50)"
                  fontSize={11.5}
                  fill={hover && hover.ci === i ? pal.ink : pal.ink2}
                  fontWeight={s.grossLosses < -25000 || (hover && hover.ci === i) ? 700 : 500}
                >
                  {s.sub}
                </text>
              </g>
            ))}
            <text x={labelW + gridW + rightW / 2} y={headerH - 10} textAnchor="middle" fontSize={11} fill={pal.ink2}>
              State net profit
            </text>

            {states.map((s, ri) => {
              const yy = headerH + ri * cellH
              const low = s.lines < MIN_LINES
              const active = hover && hover.ri === ri
              return (
                <g key={s.state} opacity={low ? 0.32 : 1}>
                  <text
                    x={labelW - 8}
                    y={yy + cellH / 2}
                    dy="0.33em"
                    textAnchor="end"
                    fontSize={11.5}
                    fontWeight={s.profit < 0 || active ? 700 : 400}
                    fill={active ? pal.ink : s.profit < 0 ? pal.ink : pal.ink2}
                  >
                    {s.state}
                    {low ? ' ·' : ''}
                  </text>
                  {subs.map((sub, ci) => {
                    const c = cellMap.get(`${s.state}|${sub.sub}`)
                    const xx = labelW + ci * cellWidth
                    if (!c) return <circle key={sub.sub} cx={xx + cellWidth / 2} cy={yy + cellH / 2} r={1} fill={pal.axis} />
                    return (
                      <g key={sub.sub}>
                        <rect x={xx + 1} y={yy + 1} width={cellWidth - 2} height={cellH - 2} rx={2} fill={color(c.discount)} />
                        {c.profit < 0 && (
                          <circle
                            cx={xx + cellWidth / 2}
                            cy={yy + cellH / 2}
                            r={Math.max(1.8, rScale(-c.profit))}
                            fill={pal.loss}
                            stroke={pal.surface}
                            strokeWidth={1.2}
                          />
                        )}
                      </g>
                    )
                  })}
                  {/* state net profit bar */}
                  <line x1={labelW + gridW + 14 + barHalf} x2={labelW + gridW + 14 + barHalf} y1={yy} y2={yy + cellH} stroke={pal.axis} />
                  <rect
                    x={s.profit < 0 ? labelW + gridW + 14 + barHalf - (barHalf * -s.profit) / maxState : labelW + gridW + 14 + barHalf}
                    y={yy + 4}
                    width={Math.max(1, (barHalf * Math.abs(s.profit)) / maxState)}
                    height={cellH - 8}
                    rx={2}
                    fill={s.profit < 0 ? pal.loss : pal.profit}
                  />
                </g>
              )
            })}

            {/* loss-state divider */}
            {(() => {
              const n = states.filter((s) => s.profit < 0).length
              const yy = headerH + n * cellH
              return (
                <g>
                  <line x1={8} x2={labelW + gridW + rightW - 8} y1={yy} y2={yy} stroke={pal.ink} strokeWidth={1.2} strokeDasharray="4 3" />
                </g>
              )
            })()}

            {/* Texas x Binders highlight */}
            <rect
              x={labelW + biIdx * cellWidth - 1}
              y={headerH + txIdx * cellH - 1}
              width={cellWidth + 2}
              height={cellH + 2}
              fill="none"
              stroke={pal.ink}
              strokeWidth={2}
              rx={3}
            />

            {/* crosshair */}
            {hover && (
              <g pointerEvents="none">
                <rect x={labelW} y={headerH + hover.ri * cellH} width={gridW} height={cellH} fill="none" stroke={pal.ink2} strokeOpacity={0.5} />
                <rect x={labelW + hover.ci * cellWidth} y={headerH} width={cellWidth} height={cellH * states.length} fill="none" stroke={pal.ink2} strokeOpacity={0.5} />
              </g>
            )}
          </svg>

          {hover && (
            <div
              className="tip"
              style={{
                left: Math.min(hover.mx + 16, svgW - 250),
                top: Math.min(hover.my + 14, svgH - 190),
              }}
            >
              <div style={{ fontWeight: 650 }}>{hover.state.state} × {hover.sub}</div>
              {hover.cell ? (
                <div style={{ marginTop: 6 }}>
                  <div className="row"><span>Discount</span><span>{discLabel(hover.cell.discount)}</span></div>
                  <div className="row"><span>Sales</span><span>{moneyFull(hover.cell.sales)}</span></div>
                  <div className="row"><span>Profit</span><span>{moneyFull(hover.cell.profit)}</span></div>
                  <div className="row"><span>Lines</span><span>{hover.cell.lines}</span></div>
                </div>
              ) : (
                <div className="ink2" style={{ marginTop: 4 }}>No sales recorded</div>
              )}
              <div className="ink2" style={{ marginTop: 6, fontSize: 11.5, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                {hover.state.state}: {hover.state.lines} lines · net {money(hover.state.profit, { sign: true })} · margin {pct(hover.state.margin)}
                {hover.state.lines < MIN_LINES ? ' · fewer than 30 lines (de-emphasized)' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] ink2">
        <div className="flex items-center gap-2">
          <span>Fixed discount rate</span>
          {[0, 0.2, 0.3, 0.5, 0.8].map((d) => (
            <span key={d} className="flex items-center gap-1">
              <span className="swatch" style={{ background: color(d), width: 16, height: 12, border: '1px solid var(--border)' }} />
              <span className="num">{discLabel(d)}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span>Loss in cell</span>
          {[1000, 5000, 14700].map((v) => (
            <span key={v} className="flex items-center gap-1">
              <svg width={16} height={16}>
                <circle cx={8} cy={8} r={Math.max(1.8, rScale(v))} fill={pal.loss} />
              </svg>
              <span className="num">{money(-v)}</span>
            </span>
          ))}
        </div>
        <span>Blank · no sales</span>
        <span>Dashed line · the {W.lossStates.length} loss-making states sit above it</span>
        <span>
          <span className="muted">Faded rows ·</span> states with fewer than {MIN_LINES} lines
        </span>
      </div>
    </div>
  )
}
