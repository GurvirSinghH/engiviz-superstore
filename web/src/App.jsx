import { useEffect, useState } from 'react'
import story from './data/story.json'
import { PALETTES, useReveal, useWidth, money, pct, discLabel } from './lib'
import Mechanism from './components/Mechanism.jsx'
import Matrix from './components/Matrix.jsx'
import { LossBars, BindersSplit, TablesYears, CategoryMargins } from './components/Composition.jsx'
import Shipping from './components/Shipping.jsx'

const T = story.totals
const WR = story.where
const WH = story.what

function Section({ id, eyebrow, title, lede, children }) {
  const ref = useReveal()
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
      <div ref={ref} className="reveal">
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-4xl">{title}</h2>
        {lede && <p className="mt-5 text-base sm:text-lg ink2 max-w-3xl leading-relaxed">{lede}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  )
}

function Stat({ value, label, strong }) {
  return (
    <div className="card p-5">
      <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight num ${strong ? '' : ''}`}>{value}</div>
      <div className="mt-2 text-[13.5px] ink2 leading-snug">{label}</div>
    </div>
  )
}

function Bridge({ pal }) {
  const [ref, width] = useWidth()
  const w = Math.max(300, width || 700)
  const scale = (w - 4) / T.grossGains
  const lossW = -T.grossLosses * scale
  const narrow = w < 560
  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={narrow ? 110 : 96} role="img" aria-label={`Profitable lines earned ${money(T.grossGains)}; losing lines subtracted ${money(-T.grossLosses)}; net profit ${money(T.profit)}.`}>
        <rect x={0} y={22} width={w - 4} height={26} rx={5} fill={pal.profit} />
        <rect x={w - 4 - lossW} y={22} width={lossW} height={26} rx={5} fill={pal.loss} />
        <line x1={w - 4 - lossW} x2={w - 4 - lossW} y1={narrow ? 18 : 10} y2={narrow ? 52 : 62} stroke={pal.ink} strokeWidth={2} />
        <text x={0} y={14} fontSize={12} fill={pal.ink2}>{narrow ? 'Profitable lines' : 'Profit earned on profitable lines'} {money(T.grossGains, { sign: true, digits: 1 })}</text>
        <text x={w - 4} y={narrow ? 66 : 14} fontSize={12} fill={pal.ink2} textAnchor="end">{narrow ? 'Losing lines ' : ''}{money(T.grossLosses, { digits: 1 })}{narrow ? '' : ' on losing lines'}</text>
        <text x={narrow ? 0 : w - 4 - lossW} y={narrow ? 96 : 80} fontSize={13} fontWeight={700} fill={pal.ink} textAnchor={narrow ? 'start' : 'middle'}>
          = {money(T.profit, { digits: 1 })} net profit
        </text>
      </svg>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState('light')
  const pal = PALETTES[theme]
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const tx = WR.cells.find((c) => c.state === 'Texas' && c.sub === 'Binders')
  const everyYear = WR.states.filter((s) => s.profit < 0 && s.lossYears === 4 && ['Texas', 'Ohio', 'Pennsylvania', 'Illinois'].includes(s.state))
  const B = WH.binders
  const worstB = B.worst[0]
  const furn = WH.categories.find((c) => c.category === 'Furniture')
  const office = WH.categories.find((c) => c.category === 'Office Supplies')
  const tech = WH.categories.find((c) => c.category === 'Technology')
  const shipMin = Math.min(...story.ship.map((s) => s.margin))
  const shipMax = Math.max(...story.ship.map((s) => s.margin))

  return (
    <div>
      {/* nav */}
      <header className="sticky top-0 z-30 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--page) 82%, transparent)', borderBottom: '1px solid var(--border)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <a href="#top" className="font-extrabold tracking-tight text-[15px] whitespace-nowrap" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
            Where Prices Fall Below Cost
          </a>
          <nav className="hidden md:flex items-center gap-6 text-[13px]">
            {[['mechanism', 'Mechanism'], ['where', 'Where'], ['what', 'What'], ['shipping', 'Shipping'], ['method', 'Method']].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="ink2 hover:underline" style={{ textDecoration: 'none' }}>{label}</a>
            ))}
          </nav>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-[12.5px] px-3 py-1.5 rounded-full cursor-pointer"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
            aria-label="Toggle light and dark theme"
          >
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </header>

      {/* opening */}
      <section id="top" className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-28 pb-10">
        <div className="eyebrow">ENGIVIZ · Superstore dataset · {story.meta.years[0]}–{story.meta.years[story.meta.years.length - 1]}</div>
        <h1 className="mt-4 text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] max-w-5xl">
          Where prices fall below cost
        </h1>
        <p className="mt-6 text-lg sm:text-xl ink2 max-w-3xl leading-relaxed">
          Fixed product economics and a state × sub-category discount rulebook concentrate the losses in a small share of order lines.
        </p>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="eyebrow">Sales</div>
            <div className="mt-2 text-5xl sm:text-6xl font-black tracking-tight">{money(T.sales)}</div>
          </div>
          <div className="card p-6">
            <div className="eyebrow">Profit</div>
            <div className="mt-2 text-5xl sm:text-6xl font-black tracking-tight">{money(T.profit)}</div>
          </div>
          <div className="card p-6">
            <div className="eyebrow">Overall margin</div>
            <div className="mt-2 text-5xl sm:text-6xl font-black tracking-tight">{pct(T.margin, 2)}</div>
          </div>
        </div>
        <div className="card p-6 mt-4">
          <Bridge pal={pal} />
          <p className="mt-2 text-[13.5px] ink2">
            {T.lossLines.toLocaleString()} of {T.lines.toLocaleString()} order lines lost money. Together they subtracted {money(-T.grossLosses, { digits: 1 })} from what the profitable lines earned.
          </p>
        </div>
        <div className="mt-24 sm:mt-32 text-center">
          <div className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none">
            Where did the profit disappear?
          </div>
          <a href="#mechanism" className="inline-block mt-8 text-[13px] ink2" style={{ textDecoration: 'none' }}>Scroll ↓</a>
        </div>
      </section>

      {/* 1 mechanism */}
      <Section
        id="mechanism"
        eyebrow="01 · Mechanism"
        title="Past 30% off, most lines sit below cost"
        lede={
          <>
            In this dataset every product has one fixed list price and one fixed unit cost. A line’s profit per $1 of list price is therefore the product’s
            full-price margin (between 0% and 50%) minus its discount. When the discount is larger than that margin, the line is priced below cost.
          </>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat value="1 in 7" label={`${T.deepLines.toLocaleString()} of ${T.lines.toLocaleString()} lines carry a 30–80% discount (${pct(T.deepLineShare)}).`} />
          <Stat value={money(T.deepProfit)} label={`Net profit of those lines (${money(T.deepProfit, { digits: 1 })}).`} />
          <Stat value={pct(T.deepLossShare, 0)} label={`Share of all line-level losses: ${money(-T.deepGrossLosses, { digits: 1 })} of ${money(-T.grossLosses, { digits: 1 })}.`} />
          <Stat value={money(T.shallowProfit, { sign: true })} label={`Net profit of the ${T.shallowLines.toLocaleString()} lines under 30% off (${pct(T.shallowMargin)} margin).`} />
        </div>
        <div className="card p-4 sm:p-6 mt-4">
          <Mechanism pal={pal} />
        </div>
        <p className="mt-4 text-[13.5px] ink2 max-w-3xl">
          No line sold at full price lost money ({T.zeroDiscLossLines} of {T.zeroDiscLines.toLocaleString()}). The dashed diagonals bound every possible line: a product’s profit per $1 of list price falls one-for-one with its discount.
        </p>
      </Section>

      {/* 2 where */}
      <Section
        id="where"
        eyebrow="02 · Where"
        title="Deep discounts follow a fixed state × sub-category rulebook"
        lede={`Each state applies one discount rate to each sub-category, and the same rate in every year. Deep rates of 30–80% appear in ${WR.deepCells} of ${WR.totalCells} state × sub-category cells across ${WR.deepCellStates} states; ${WR.deepCellsLosing} of those cells lost money.`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="card p-5">
            <div className="eyebrow">Largest loss cell</div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight">Texas × Binders</div>
            <div className="mt-2 text-[13.5px] ink2 leading-snug">
              {discLabel(tx.discount)} off on all {tx.lines} lines · {money(tx.sales)} sales · <span className="loss-text">{money(tx.profit)}</span> profit
            </div>
          </div>
          <div className="card p-5">
            <div className="eyebrow">Loss-making states</div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight">{WR.lossStates.length} of {WR.states.length}</div>
            <div className="mt-2 text-[13.5px] ink2 leading-snug">
              {everyYear.map((s) => s.state).join(', ').replace(/, ([^,]*)$/, ' and $1')} lost money in all four years. Yearly results for the smaller loss states are too noisy to call consistent.
            </div>
          </div>
          <div className="card p-5">
            <div className="eyebrow">How to read</div>
            <div className="mt-2 text-[13.5px] ink2 leading-snug">
              Shade = the cell’s fixed discount rate. Red circle = the cell lost money (area ∝ loss). Rows run from largest net loss to largest net profit; faded rows have fewer than 30 lines. Hover any cell.
            </div>
          </div>
        </div>
        <div className="card p-4 sm:p-6">
          <Matrix pal={pal} />
        </div>
      </Section>

      {/* 3 what */}
      <Section
        id="what"
        eyebrow="03 · What"
        title="Losses land on expensive equipment and thin-margin furniture"
        lede={`Line-level losses by sub-category, next to each sub-category’s net profit. A sub-category can carry large losses and still be profitable overall: Binders nets ${money(B.net, { sign: true, digits: 1 })}.`}
      >
        <div className="card p-4 sm:p-6">
          <LossBars pal={pal} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="card p-5">
            <div className="eyebrow">Binders</div>
            <div className="mt-2 text-xl font-extrabold tracking-tight">Binding machines, not binders</div>
            <p className="mt-2 text-[13.5px] ink2 leading-snug">
              {B.machineProducts} binding-machine products listed at $100 or more ({B.machineLines} of {B.lines.toLocaleString()} Binders lines) carry {pct(B.machineShare)} of Binders’ line-level losses.
              Largest single loss: {worstB.name.replace(/ System.*$/, ' System')} in {worstB.state}, {worstB.qty} units at {discLabel(worstB.disc)} off, {money(worstB.sales, { digits: 1 })} sales, {money(worstB.profit, { digits: 1 })} profit.
            </p>
            <div className="mt-4"><BindersSplit pal={pal} /></div>
          </div>
          <div className="card p-5">
            <div className="eyebrow">Machines</div>
            <div className="mt-2 text-xl font-extrabold tracking-tight">{money(WH.machines.grossLosses, { digits: 1 })} of losses, {money(WH.machines.net, { sign: true, digits: 1 })} net</div>
            <p className="mt-2 text-[13.5px] ink2 leading-snug">
              Machines have a {pct(WH.machines.fullPriceMargin)} margin at full list price but realize {pct(WH.machines.margin)}. Lines discounted 50% or more account for {money(WH.machines.deepLosses, { digits: 1 })} of the losses: expensive printers and office equipment priced far below cost.
            </p>
            <div className="mt-4 text-5xl font-black tracking-tight num">{pct(WH.machines.margin)}</div>
            <div className="text-[12px] muted">realized margin, Machines</div>
          </div>
          <div className="card p-5">
            <div className="eyebrow">Tables</div>
            <div className="mt-2 text-xl font-extrabold tracking-tight">{money(WH.tables.net, { digits: 1 })}, negative every year</div>
            <p className="mt-2 text-[13.5px] ink2 leading-snug">
              Tables rank #{WH.tables.salesRank} in sales but last of 17 sub-categories in net profit; {pct(WH.tables.lossLineShare)} of Tables lines lose money. Full-price margin is only {pct(WH.tables.fullPriceMargin)}.
            </p>
            <div className="mt-3"><TablesYears pal={pal} /></div>
          </div>
          <div className="card p-5">
            <div className="eyebrow">Furniture</div>
            <div className="mt-2 text-xl font-extrabold tracking-tight">Furniture starts with a thinner margin</div>
            <p className="mt-2 text-[13.5px] ink2 leading-snug">
              At full list price Furniture earns {pct(furn.fullPriceMargin)}, versus {pct(office.fullPriceMargin)} for Office Supplies and {pct(tech.fullPriceMargin)} for Technology.
              With a similar average discount (about {pct(furn.listWeightedDiscount, 0)}), Furniture ends at {pct(furn.margin)}.
            </p>
            <div className="mt-3"><CategoryMargins pal={pal} /></div>
          </div>
        </div>
      </Section>

      {/* 4 shipping */}
      <Section id="shipping" eyebrow="04 · Shipping" title="No detectable link to recorded profit">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          <div className="md:col-span-2">
            <p className="text-base ink2 leading-relaxed">
              Recorded margins by ship mode range from {pct(shipMin)} to {pct(shipMax)}, and every 95% interval overlaps the others.
            </p>
            <p className="mt-4 text-base font-bold leading-relaxed">Shipping cost is not recorded in this dataset.</p>
            <p className="mt-2 text-[13.5px] ink2 leading-relaxed">So this chart says nothing about what faster shipping costs; it only shows that recorded profit does not differ detectably by mode.</p>
          </div>
          <div className="md:col-span-3 card p-4 sm:p-6">
            <Shipping pal={pal} />
          </div>
        </div>
      </Section>

      {/* 5 method */}
      <section id="method" className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-24">
        <div className="card p-6 sm:p-8" style={{ background: 'transparent' }}>
          <div className="eyebrow">Method & data note</div>
          <p className="mt-3 text-base sm:text-lg leading-relaxed max-w-4xl">
            The discount structure is highly rule-generated: state × sub-category combinations use fixed discount rates. Findings describe this dataset and should not be interpreted as real-world retail behavior.
          </p>
          <ul className="mt-5 grid md:grid-cols-2 gap-x-10 gap-y-2 text-[13px] ink2 leading-relaxed list-disc pl-5">
            <li>Source: Sample - Superstore.csv · {T.lines.toLocaleString()} order lines · {T.orders.toLocaleString()} orders · {story.meta.states} states. Every figure is computed from the file by <code>scripts/build_data.py</code>.</li>
            <li>Sales are recorded after discount. List price = Sales ÷ (1 − Discount). Profit per $1 of list price = Profit ÷ list price.</li>
            <li>{WR.singleDiscountCells} of {WR.multiLineCells} state × sub-category cells with two or more lines use a single discount rate; each product’s implied unit cost is identical on every line.</li>
            <li>Line-level losses = total profit of lines with negative profit ({money(T.grossLosses, { digits: 1 })}). Deep discount = 30% or more.</li>
            <li>Patterns shown are associations in recorded data. The dataset has no information on how demand would respond to different prices.</li>
            <li>Shipping intervals: 1,000 bootstrap resamples of orders. States with fewer than 30 lines are de-emphasized in the matrix.</li>
          </ul>
        </div>
        <div className="mt-8 text-[12px] muted">Where Prices Fall Below Cost · ENGIVIZ submission</div>
      </section>
    </div>
  )
}
