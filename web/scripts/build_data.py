"""Build the JSON used by the site directly from dataset/Sample - Superstore.csv.

Standard library only:  python scripts/build_data.py
Every number shown on the site is computed here (nothing is hand-typed).
"""
import csv, json, random, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(HERE, "..", "..", "dataset", "Sample - Superstore.csv")
OUT = os.path.join(HERE, "..", "src", "data")
os.makedirs(OUT, exist_ok=True)

rows = []
with open(CSV, newline="", encoding="cp1252") as f:
    for r in csv.DictReader(f):
        s, p, q, d = float(r["Sales"]), float(r["Profit"]), int(r["Quantity"]), float(r["Discount"])
        list_val = s / (1 - d)
        cost = s - p
        rows.append(dict(
            order=r["Order ID"], date=r["Order Date"], mode=r["Ship Mode"], state=r["State"], region=r["Region"],
            cat=r["Category"], sub=r["Sub-Category"], pid=r["Product ID"], name=r["Product Name"].replace("\xa0", " "),
            sales=s, profit=p, qty=q, disc=d, list_val=list_val, cost=cost, list_unit=list_val / q,
            year=int(r["Order Date"].split("/")[2]),
        ))

def rnd(x, n=2): return round(x, n)
S = sum(r["sales"] for r in rows); P = sum(r["profit"] for r in rows)
gains = sum(r["profit"] for r in rows if r["profit"] > 0)
losses = sum(r["profit"] for r in rows if r["profit"] < 0)
deep = [r for r in rows if r["disc"] >= 0.3]; shallow = [r for r in rows if r["disc"] < 0.3]
deep_losses = sum(r["profit"] for r in deep if r["profit"] < 0)

totals = dict(
    sales=rnd(S), profit=rnd(P), margin=P / S, lines=len(rows), orders=len({r["order"] for r in rows}),
    grossGains=rnd(gains), grossLosses=rnd(losses), lossLines=sum(1 for r in rows if r["profit"] < 0),
    deepLines=len(deep), deepLineShare=len(deep) / len(rows), deepProfit=rnd(sum(r["profit"] for r in deep)),
    deepGrossLosses=rnd(deep_losses), deepLossShare=deep_losses / losses,
    deepListShare=sum(r["list_val"] for r in deep) / sum(r["list_val"] for r in rows),
    shallowLines=len(shallow), shallowProfit=rnd(sum(r["profit"] for r in shallow)),
    shallowMargin=sum(r["profit"] for r in shallow) / sum(r["sales"] for r in shallow),
    zeroDiscLossLines=sum(1 for r in rows if r["disc"] == 0 and r["profit"] < 0),
    zeroDiscLines=sum(1 for r in rows if r["disc"] == 0),
)

# ---------- hero: one point per line ----------
states = sorted({r["state"] for r in rows}); subs = sorted({r["sub"] for r in rows})
pkeys = {}; names = []
pts = []
for r in rows:
    k = r["pid"] + "|" + r["name"]
    if k not in pkeys: pkeys[k] = len(names); names.append(r["name"])
    # profit per $ of list price = full-price margin - discount (exact in this dataset)
    pts.append([r["disc"], rnd(r["profit"] / r["list_val"], 4), rnd(r["profit"]), rnd(r["sales"]),
                states.index(r["state"]), subs.index(r["sub"]), pkeys[k], r["qty"]])

levels = defaultdict(lambda: dict(lines=0, sales=0.0, profit=0.0, listVal=0.0, losses=0.0))
for r in rows:
    L = levels[r["disc"]]; L["lines"] += 1; L["sales"] += r["sales"]; L["profit"] += r["profit"]; L["listVal"] += r["list_val"]
    if r["profit"] < 0: L["losses"] += r["profit"]
by_level = [dict(discount=d, lines=v["lines"], sales=rnd(v["sales"]), profit=rnd(v["profit"]), listVal=rnd(v["listVal"]),
                 losses=rnd(v["losses"]), margin=v["profit"] / v["sales"]) for d, v in sorted(levels.items())]

# ---------- where: state x sub-category ----------
cell = defaultdict(lambda: dict(sales=0.0, profit=0.0, lines=0, discs=set()))
st_tot = defaultdict(lambda: dict(sales=0.0, profit=0.0, lines=0, region=""))
st_year = defaultdict(lambda: defaultdict(float))
for r in rows:
    c = cell[(r["state"], r["sub"])]; c["sales"] += r["sales"]; c["profit"] += r["profit"]; c["lines"] += 1; c["discs"].add(r["disc"])
    t = st_tot[r["state"]]; t["sales"] += r["sales"]; t["profit"] += r["profit"]; t["lines"] += 1; t["region"] = r["region"]
    st_year[r["state"]][r["year"]] += r["profit"]
multi = [c for c in cell.values() if c["lines"] >= 2]
cells = [dict(state=k[0], sub=k[1], discount=next(iter(v["discs"])), sales=rnd(v["sales"]), profit=rnd(v["profit"]), lines=v["lines"])
         for k, v in cell.items()]
years = sorted({r["year"] for r in rows})
state_rows = [dict(state=s, region=v["region"], sales=rnd(v["sales"]), profit=rnd(v["profit"]), lines=v["lines"], margin=v["profit"] / v["sales"],
                   lossYears=sum(1 for y in years if st_year[s].get(y, 0) < 0), yearsPresent=sum(1 for y in years if y in st_year[s]))
              for s, v in st_tot.items()]
sub_loss = defaultdict(float); sub_net = defaultdict(float); sub_gain = defaultdict(float); sub_sales = defaultdict(float)
for r in rows:
    sub_net[r["sub"]] += r["profit"]; sub_sales[r["sub"]] += r["sales"]
    if r["profit"] < 0: sub_loss[r["sub"]] += r["profit"]
    else: sub_gain[r["sub"]] += r["profit"]

where = dict(
    cells=cells, states=state_rows,
    subs=[dict(sub=s, grossLosses=rnd(sub_loss[s]), net=rnd(sub_net[s])) for s in subs],
    singleDiscountCells=sum(1 for c in multi if len(c["discs"]) == 1), multiLineCells=len(multi), totalCells=len(cells),
    deepCells=sum(1 for c in cells if c["discount"] >= 0.3), deepCellsLosing=sum(1 for c in cells if c["discount"] >= 0.3 and c["profit"] < 0),
    deepCellStates=len({c["state"] for c in cells if c["discount"] >= 0.3}),
    lossStates=sorted([s["state"] for s in state_rows if s["profit"] < 0]),
)

# ---------- what: loss composition ----------
bind = [r for r in rows if r["sub"] == "Binders"]
bm = [r for r in bind if r["list_unit"] >= 100]; bo = [r for r in bind if r["list_unit"] < 100]
def loss(rs): return sum(r["profit"] for r in rs if r["profit"] < 0)
def full_margin(rs): return 1 - sum(r["cost"] for r in rs) / sum(r["list_val"] for r in rs)
tables = [r for r in rows if r["sub"] == "Tables"]
machines = [r for r in rows if r["sub"] == "Machines"]
cats = []
for cname in ["Furniture", "Office Supplies", "Technology"]:
    rs = [r for r in rows if r["cat"] == cname]
    cats.append(dict(category=cname, fullPriceMargin=full_margin(rs), margin=sum(r["profit"] for r in rs) / sum(r["sales"] for r in rs),
                     listWeightedDiscount=1 - sum(r["sales"] for r in rs) / sum(r["list_val"] for r in rs),
                     sales=rnd(sum(r["sales"] for r in rs)), profit=rnd(sum(r["profit"] for r in rs))))
what = dict(
    subs=sorted([dict(sub=s, grossLosses=rnd(sub_loss[s]), grossGains=rnd(sub_gain[s]), net=rnd(sub_net[s]), sales=rnd(sub_sales[s]),
                      cat=next(r["cat"] for r in rows if r["sub"] == s)) for s in subs], key=lambda x: x["grossLosses"]),
    binders=dict(machineLosses=rnd(loss(bm)), otherLosses=rnd(loss(bo)), machineShare=loss(bm) / loss(bind), machineProducts=len({r["pid"] + r["name"] for r in bm}),
                 machineLines=len(bm), lines=len(bind), machineSalesShare=sum(r["sales"] for r in bm) / sum(r["sales"] for r in bind),
                 net=rnd(sum(r["profit"] for r in bind)), fullPriceMargin=full_margin(bind),
                 worst=[dict(name=r["name"], state=r["state"], disc=r["disc"], qty=r["qty"], sales=rnd(r["sales"]), profit=rnd(r["profit"]))
                        for r in sorted(bind, key=lambda r: r["profit"])[:3]]),
    tables=dict(net=rnd(sum(r["profit"] for r in tables)), sales=rnd(sum(r["sales"] for r in tables)),
                byYear=[dict(year=y, profit=rnd(sum(r["profit"] for r in tables if r["year"] == y))) for y in years],
                lossLineShare=sum(1 for r in tables if r["profit"] < 0) / len(tables), fullPriceMargin=full_margin(tables),
                salesRank=sorted(subs, key=lambda s: -sub_sales[s]).index("Tables") + 1),
    machines=dict(net=rnd(sum(r["profit"] for r in machines)), grossLosses=rnd(loss(machines)), fullPriceMargin=full_margin(machines),
                  deepLosses=rnd(sum(r["profit"] for r in machines if r["profit"] < 0 and r["disc"] >= 0.5)),
                  margin=sum(r["profit"] for r in machines) / sum(r["sales"] for r in machines)),
    categories=cats,
)

# ---------- shipping ----------
orders = defaultdict(lambda: dict(mode="", s=0.0, p=0.0))
for r in rows:
    o = orders[r["order"]]; o["mode"] = r["mode"]; o["s"] += r["sales"]; o["p"] += r["profit"]
rng = random.Random(42)
ship = []
for m in ["First Class", "Same Day", "Second Class", "Standard Class"]:
    os_ = [o for o in orders.values() if o["mode"] == m]
    ss = [o["s"] for o in os_]; ps = [o["p"] for o in os_]; n = len(os_)
    boots = []
    for _ in range(1000):
        idx = [rng.randrange(n) for _ in range(n)]
        boots.append(sum(ps[i] for i in idx) / sum(ss[i] for i in idx))
    boots.sort()
    ship.append(dict(mode=m, orders=n, sales=rnd(sum(ss)), profit=rnd(sum(ps)), margin=sum(ps) / sum(ss),
                     lo=boots[25], hi=boots[974], aov=sum(ss) / n))

meta = dict(products=len(names), states=len(states), subs=len(subs), years=years, source="dataset/Sample - Superstore.csv")
json.dump(dict(totals=totals, byLevel=by_level, where=where, what=what, ship=ship, meta=meta), open(os.path.join(OUT, "story.json"), "w"), indent=1)
json.dump(dict(states=states, subs=subs, names=names, points=pts), open(os.path.join(OUT, "lines.json"), "w"), separators=(",", ":"))

print(f"sales {S:,.2f} profit {P:,.2f} margin {P/S:.4%}")
print(f"deep lines {len(deep)} ({len(deep)/len(rows):.1%}) net {totals['deepProfit']:,.0f} gross-loss share {totals['deepLossShare']:.1%}; shallow net {totals['shallowProfit']:,.0f} margin {totals['shallowMargin']:.1%}")
print(f"cells single-discount {where['singleDiscountCells']}/{where['multiLineCells']}; loss states {len(where['lossStates'])}: {where['lossStates']}")
print(f"binding machines share of binder losses {what['binders']['machineShare']:.1%} ({what['binders']['machineProducts']} products); tables {what['tables']['net']:,.0f} by year {what['tables']['byYear']}")
print("categories", [(c['category'], round(c['fullPriceMargin'],3), round(c['margin'],3)) for c in cats])
print("ship", [(s['mode'], round(s['margin'],4), round(s['lo'],3), round(s['hi'],3)) for s in ship])
