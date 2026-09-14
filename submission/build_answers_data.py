"""Numbers for the three Google-Form answer pages, computed from the raw CSV (stdlib only)."""
import csv, json, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(HERE, "..", "dataset", "Sample - Superstore.csv")
STORY = json.load(open(os.path.join(HERE, "..", "web", "src", "data", "story.json")))

rows = []
with open(CSV, newline="", encoding="cp1252") as f:
    for r in csv.DictReader(f):
        s, p, q, d = float(r["Sales"]), float(r["Profit"]), int(r["Quantity"]), float(r["Discount"])
        rows.append(dict(order=r["Order ID"], cust=r["Customer ID"], mode=r["Ship Mode"], state=r["State"], region=r["Region"],
                         cat=r["Category"], sub=r["Sub-Category"], sales=s, profit=p, qty=q, disc=d, lv=s / (1 - d), cost=s - p,
                         year=int(r["Order Date"].split("/")[2])))

S = sum(r["sales"] for r in rows); P = sum(r["profit"] for r in rows)
gross_losses = sum(r["profit"] for r in rows if r["profit"] < 0)
years = sorted({r["year"] for r in rows})

def agg(rs):
    s = sum(r["sales"] for r in rs); p = sum(r["profit"] for r in rs); lv = sum(r["lv"] for r in rs); c = sum(r["cost"] for r in rs)
    return dict(sales=s, profit=p, margin=p / s if s else 0, fullPriceMargin=1 - c / lv if lv else 0, lines=len(rs),
                orders=len({r["order"] for r in rs}), losses=sum(r["profit"] for r in rs if r["profit"] < 0),
                deepListShare=sum(r["lv"] for r in rs if r["disc"] >= 0.3) / lv if lv else 0)

def group(key):
    g = defaultdict(list)
    for r in rows: g[r[key]].append(r)
    return g

# ---------- Q1 ----------
subs = {k: agg(v) for k, v in group("sub").items()}
for k, v in subs.items():
    v["sub"] = k; v["cat"] = group("sub")[k][0]["cat"]
    v["byYear"] = {y: sum(r["profit"] for r in group("sub")[k] if r["year"] == y) for y in years}
for rank, k in enumerate(sorted(subs, key=lambda k: -subs[k]["sales"]), 1): subs[k]["salesRank"] = rank
for rank, k in enumerate(sorted(subs, key=lambda k: -subs[k]["profit"]), 1): subs[k]["profitRank"] = rank
for rank, k in enumerate(sorted(subs, key=lambda k: -subs[k]["margin"]), 1): subs[k]["marginRank"] = rank

# ---------- Q2 ----------
states = {k: agg(v) for k, v in group("state").items()}
for k, v in states.items():
    v["state"] = k; v["region"] = group("state")[k][0]["region"]
    v["byYear"] = {y: sum(r["profit"] for r in group("state")[k] if r["year"] == y) for y in years}
    v["lossYears"] = sum(1 for y in years if v["byYear"][y] < 0)
    v["zeroDiscShare"] = sum(1 for r in group("state")[k] if r["disc"] == 0) / v["lines"]
loss_states = sorted([k for k in states if states[k]["profit"] < 0], key=lambda k: states[k]["profit"])
ten_losses = sum(r["profit"] for r in rows if r["state"] in loss_states and r["profit"] < 0)

regions = {}
for k, rs in group("region").items():
    a = agg(rs)
    st = sorted({r["state"] for r in rs})
    a.update(region=k, states=len(st),
             lossStates=[s for s in loss_states if s in st],
             lossStateProfit=sum(states[s]["profit"] for s in st if states[s]["profit"] < 0),
             profitableStateProfit=sum(states[s]["profit"] for s in st if states[s]["profit"] >= 0),
             byYear={y: sum(r["profit"] for r in rs if r["year"] == y) for y in years})
    regions[k] = a

MATRIX_STATES = ["Texas", "Ohio", "Pennsylvania", "Illinois", "North Carolina", "Colorado", "Tennessee", "Arizona", "Florida", "Oregon",
                 "California", "New York", "Washington"]
MATRIX_SUBS = ["Binders", "Tables", "Machines", "Bookcases", "Chairs", "Appliances", "Furnishings", "Phones", "Paper"]
cells = {}
for r in rows:
    if r["state"] in MATRIX_STATES and r["sub"] in MATRIX_SUBS:
        c = cells.setdefault(f'{r["state"]}|{r["sub"]}', dict(discount=r["disc"], sales=0.0, profit=0.0, lines=0))
        c["sales"] += r["sales"]; c["profit"] += r["profit"]; c["lines"] += 1

# same customer: states that never discount vs states that never sell at full price
never = {k for k, v in states.items() if v["zeroDiscShare"] == 1}
never_full = {k for k, v in states.items() if v["zeroDiscShare"] == 0}
cs = defaultdict(lambda: dict(ns=0.0, np=0.0, fs=0.0, fp=0.0))
for r in rows:
    if r["state"] in never: cs[r["cust"]]["ns"] += r["sales"]; cs[r["cust"]]["np"] += r["profit"]
    if r["state"] in never_full: cs[r["cust"]]["fs"] += r["sales"]; cs[r["cust"]]["fp"] += r["profit"]
both = [v for v in cs.values() if v["ns"] > 0 and v["fs"] > 0]
same_customer = dict(customers=len(both), marginNever=sum(v["np"] for v in both) / sum(v["ns"] for v in both),
                     marginNeverFull=sum(v["fp"] for v in both) / sum(v["fs"] for v in both),
                     neverStates=len(never), neverFullStates=len(never_full))

deep = [r for r in rows if r["disc"] >= 0.3]
q2 = dict(regions=regions, lossStates=[states[s] for s in loss_states], tenStateLossShare=ten_losses / gross_losses,
          tenStateLosses=ten_losses, grossLosses=gross_losses, cells=cells, matrixStates=MATRIX_STATES, matrixSubs=MATRIX_SUBS,
          sameCustomer=same_customer, deepLines=len(deep), lines=len(rows), deepLineShare=len(deep) / len(rows),
          deepLossShare=sum(r["profit"] for r in deep if r["profit"] < 0) / gross_losses, deepProfit=sum(r["profit"] for r in deep),
          stateCount=len(states))

# ---------- Q3 ----------
ship = []
for s in STORY["ship"]:
    rs = [r for r in rows if r["mode"] == s["mode"]]
    a = agg(rs)
    ship.append(dict(mode=s["mode"], sales=a["sales"], profit=a["profit"], margin=a["margin"], orders=a["orders"], lines=a["lines"],
                     qty=sum(r["qty"] for r in rs), lo=s["lo"], hi=s["hi"], aov=a["sales"] / a["orders"],
                     salesShare=a["sales"] / S, profitShare=a["profit"] / P, orderShare=a["orders"] / len({r["order"] for r in rows})))

out = dict(totals=dict(sales=S, profit=P, margin=P / S, lines=len(rows), orders=len({r["order"] for r in rows}), grossLosses=gross_losses),
           subs=subs, binders=STORY["what"]["binders"], q2=q2, ship=ship, years=years)
json.dump(out, open(os.path.join(HERE, "answers_data.json"), "w"), indent=1)

print("Labels", round(subs["Labels"]["fullPriceMargin"], 4), round(subs["Labels"]["margin"], 4), "| Binders", round(subs["Binders"]["fullPriceMargin"], 4), round(subs["Binders"]["margin"], 4))
print("Copiers profit", round(subs["Copiers"]["profit"], 2), "rank", subs["Copiers"]["profitRank"], "| Tables", round(subs["Tables"]["profit"], 2), subs["Tables"]["byYear"])
print("regions", {k: (round(v["profit"]), round(v["margin"], 3), min(v["byYear"].values()) > 0, v["lossStates"]) for k, v in regions.items()})
print("10 states", loss_states, "share", round(ten_losses / gross_losses, 4))
print("robust 4 loss years", [(s, states[s]["lossYears"]) for s in ["Texas", "Ohio", "Pennsylvania", "Illinois"]])
print("deep", len(deep), round(len(deep) / len(rows), 4), round(q2["deepLossShare"], 4))
print("same customer", same_customer)
print("ship", [(s["mode"], round(s["sales"]), round(s["margin"], 4)) for s in ship])
