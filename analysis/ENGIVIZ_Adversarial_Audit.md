# ENGIVIZ Superstore — Adversarial Audit of the Earlier Analysis

**Scope.** This audits `ENGIVIZ_Superstore_Analysis.md`, which was produced earlier in this same project, so it is effectively a self-audit.

**Method.** Four fresh scripts read the raw CSV (`cp1252`) directly and reuse none of the earlier intermediate files. They:
- recalculate every headline number;
- re-test the evidence *logic* behind each claim;
- run leave-one-out tests (predict each line using only the product's other lines), bootstrap confidence intervals and permutation tests.

**Bottom line.** **The arithmetic is almost entirely correct.** The sub-category table, ship-mode table, region, state, city and cell figures all reproduce, with 0 mismatches. The problems are in:
1. **one circular proof;**
2. **a few factual slips:** "highest margin", "11 states", "22% break-even";
3. **framing that overstates robustness or implies causation;**
4. **important structure the analysis missed:** binding machines, Furniture's thin margins, deep discounts outside the 11 states, and the Order ID prefix.

---

## 1. Claim-by-claim audit

### 1.1 "11 states generate 93% of losses"

**Recalculation**
| Measure | Value |
|---|---|
| States with zero full-price lines | AZ, CO, FL, IL, NC, OH, OR, PA, TN, TX, **WY** |
| Their gross line losses | −$145,620.72 |
| Company gross line losses | −$156,131.29 |
| Share | **93.27% ✓** |

**Problems**
- **"11 states" is misleading.** Wyoming has **1 line, +$100.20 profit**. The accurate statement is **10 loss-making states** (plus one single-line state).
- **The result depends on what "losses" means:**

| Definition of "losses" | Share from this group |
|---|---|
| Sum of negative line profits (the 93%) | 93.3% |
| Count of loss lines (1,681 / 1,871) | 89.8% |
| Negative State × Sub-Category cells | 95.8% |
| Negative orders | 95.7% |
| Net losses of loss-making states | 100%, **a tautology** (every loss-making state is in the group) |

- **The comparison figure was too small.** "31% of sales" is the wrong denominator: Sales is *after* discount, so the group's own discounts shrink it.
  - On **list-price value** (before discount) the group is **40.2%** of the business, and 38.8% of lines.
  - The correct contrast is **40% of the business → 93% of the losses**. Still very lopsided, but less dramatic.
- **The grouping was chosen after looking at the data.** Robustness checks:
  - Alternative groupings defined without hindsight give the same picture: the top third of states by discount (17 states) = **99.3%**; states with any line discounted ≥30% (19 states) = **97.3%**.
  - Excluding Texas: 91.2%. Excluding the 50 worst loss lines: 89.0%. **Robust.**
- **The label points to the wrong mechanism.** "Never sells at full price" suggests blanket discounting causes the losses. But in these states:
  - **65.4% of lines are at exactly 20% off and are profitable** (+$31,508, 8.6% margin);
  - **91.2% of the group's losses come from lines discounted 30–80%** (1,344 lines, −$129,655).

**Confounders tested**
| Possible confounder | Test | Result |
|---|---|---|
| Product mix | Full-price margin of each group's basket | Never 29.8% · Mixed 29.6% · Never-full-price **30.0%**, so **not mix** |
| Different customers | 434 customers bought in *both* never-discount and never-full-price states | Their margin: **30.2% vs −14.2%**; 92.2% of them did worse in the never-full-price states, so **not customers** |
| Segment mix | Sales share by segment | Consumer 48–53% in every group, so not segment |
| Ship mode | Mode mix by group | p = 0.65, so not shipping |
| Order ID prefix | "US"-prefix share of orders | 21.0% vs 12.7–14.8% (p ≈ 10⁻¹²). A **correlate**, fully explained by State × Sub-Category mix (see C8) |

**Verdict:** numerically correct and robust. The wording should become **"10 states account for ~93% of line-level losses, driven by their 30–80% discounts"**.

### 1.2 Discount ↔ profit margin

**Recalculation ✓**
- Margin by discount level: 0% → 29.5% · 20% → 11.8% · 30% → −10.0% · 40% → −19.8% · 50% → −34.8% · 70% → −98.7% · 80% → −180.0%.
- 0 of 4,798 zero-discount lines lose money.

**Critical flaw: the evidence was circular**
- The report's proof, "1,871 of 1,871 loss lines have discount > full-price margin (identity error 9×10⁻¹⁶)", computed the full-price margin **from the same line it was testing**.
- The algebra: m₀(line) = 1 − (1 − d)(1 − margin), so **d > m₀ ⇔ margin < 0**. This holds for *any* dataset and proves nothing.

**Non-circular re-test (leave-one-out)**
- For each line, the product's unit cost and list price were estimated **only from that product's other lines** (1,801 products, 9,901 lines).
- Predicted profit error: **max 0.0000**. Sign agreement: **100%**.
- → **The claim is true; the earlier proof was invalid.** Use this test instead.

**Shape and mix**
- **Not linear.** Margin = 1 − (1 − m₀)/(1 − d), which falls off steeply at deep discounts, so a single slope misdescribes it.
- **The discount schedule doesn't target low- or high-margin products.** Line discount vs product margin: ρ = 0.04. Sub-category margin vs discount: r = 0.08.
- **But the by-level table is mixed by product.** The 45% level (−45.5%) looks worse than 50% (−34.8%) only because 45% hits Tables (basket full-price margin 20%) while 50% hits 33%-margin baskets.
- **The denominator inflates deep-discount margins.** At 80% off, profit ÷ Sales = −180%, but profit ÷ list value = **−36%**.

**Causal wording to avoid**
- Safe: "lines priced below unit cost lose money" (arithmetic in this dataset).
- Not supported: "discounts cause losses" in the business sense, meaning profit would rise without them.
  - The data contains no demand response: quantity is unrelated to price (ρ = −0.007) and to discount (ρ = −0.001).

### 1.3 The r = −0.97 relationship

**Recalculation ✓**
| Check | Value |
|---|---|
| Pearson, 38 states with ≥30 lines | **−0.9714** |
| Threshold sensitivity | −0.965 (all 49) … −0.982 (≥100 lines) |
| Discount weighted by list value | −0.977 |
| Bootstrap 95% CI | [−0.984, −0.951] |
| Spearman | −0.78 (lower because of ties at zero discount) |

**Why it must not be headlined as a discovery**
1. **It's arithmetic.** Take one company-wide full-price margin (29.8%) plus each state's discount. The formula alone predicts state margins with **R² = 0.959**.
   - States buy near-identical baskets: full-price margin 21–37%, SD 3.5 points, and uncorrelated with discount (r = 0.02).
2. **It's driven by clusters.** The **three group labels alone explain 93.3%** of state-margin variance (continuous discount: 94.4%).
   - Within the 10 never-full-price states: **r = −0.51, p = 0.13 (not significant)**.
   - Within the 13 mixed states: r = −0.79, p = 0.001.
   - The 15 never-discount states all sit at x = 0.
   - There is an **empty gap between 12.5% and 25.3%** average discount (states ≥30 lines): the line spans separate clouds.
3. **The "break-even near 22% average discount" is wrong.**
   - The 22% comes from weighting by Sales, which is already net of discount.
   - With list-value weights the linear fit crosses zero at 26.3%.
   - The formula's actual break-even is **29.8%**.
4. **Aggregation inflates r modestly:** line level r = −0.86; within the same product r = −0.90; state level −0.97.

**Verdict:** the number is correct. It's misleading as "we found a strong correlation", and the 22% should be dropped.

### 1.4 The "Binders paradox"

**Recalculation ✓**
- Sales $203,412.73; profit $30,221.76; margin 14.86%.
- Gross losses −$38,510.50, #1 among sub-categories. They come from discounts of 70% (380 lines, −$16,601) and 80% (233 lines, −$21,909).
- The Avery binder example reproduces.

**Problems**
| Claim | Finding |
|---|---|
| "Highest full-price margin in the store" | ✗ **Labels 47.811% > Binders 47.793%**. A tie to one decimal; say "among the highest (~48%)" |
| "Biggest loss source" | Only for **gross** losses. Binders is still **#5 in net profit (+$30.2k)**. Net losers are Tables (−$17.7k), Bookcases (−$3.5k) and Supplies (−$1.2k) |
| Implied: ordinary binders lose money | ✗ **Missed composition.** 17 products listed ≥$100 (binding machines: GBC DocuBind, Ibico EPK-21, Fellowes PB500) are 118 of 1,523 lines (7.7%) but **74.8% of Binders sales and 77.9% of Binders' losses**. Items under $30 = 12.5% of losses. The 8 worst Binders lines are all binding systems sold at 70–80% off in TX, IL, NC and TN |
| "Paradox" | Not a paradox: a 48% margin is simply below a 70–80% discount. And the discount is set by state, so this is **the same finding as the geography, not independent confirmation** |
| −106.6% Binders margin in never-full-price states | = **−26.9% of list value** (denominator effect) |
| "$4 Avery binder" explainer | Real, but trivial in dollars (−$1.83 in Arizona). It misplaces where the money is lost |

### 1.5 The Tables finding

**Recalculation ✓**
- Sales $206,965.53 (#4); profit −$17,725.48 (last); margin −8.56%.
- 63.6% of lines lose money; 42 of 56 products lose (43 of 57 when products are matched by ID + name).
- Negative every year: −$3,124 · −$3,510 · −$2,951 · −$8,141.

**What was missed or overstated**
- **It contradicts the story's "not a product problem".**
  - Tables' full-price margin is 19.1%, third lowest.
  - **In the mixed states Tables still lose money:** 1.1% margin, −$7,393 gross losses, 22.8% of all Tables losses. New York Tables alone: −$4,536 at 40% off.
  - 74% of Tables' list value carries a discount, 54% at ≥30%.
- **Category level:**

  | Category | Full-price margin | List-weighted discount | Actual margin |
  |---|---:|---:|---:|
  | Furniture | **22.0%** | 20.0% | **2.5%** |
  | Office Supplies | 33.6% | 20.0% | 17.0% |
  | Technology | 33.5% | 19.5% | 17.4% |

  All three get the same discount; Furniture's thin structure is a **real second factor**.

### 1.6 Geographic consistency across years

**Recalculation ✓**
- TX, OH, PA, IL and OR are negative all 4 years; NC, CO, TN, AZ and FL in 3 of 4.
- No profitable state with ≥30 lines had a negative year.
- All regions are profitable every year (Central 2014: +$539.55).
- The never-full-price group's share of gross losses by year: 91.3% · 93.0% · 92.3% · 95.3%.

**Problems**
- **The consistency is built in.** **0 of 656** State × Sub-Category discount rates change between years. With fixed prices, costs and discounts, year-to-year persistence is automatic; it is not independent evidence of a "persistent business problem".
- **Some yearly signs are noise.** Resampling each state-year's lines and asking how often that year would come out positive:

  | State | P(year positive), 2014 · 2015 · 2016 · 2017 |
  |---|---|
  | Texas | 0.00 · 0.04 · 0.00 · 0.00 |
  | Ohio | 0.00 · 0.00 · 0.02 · 0.04 |
  | Pennsylvania | 0.00 · 0.00 · 0.02 · 0.00 |
  | Illinois | 0.01 · **0.21** · 0.00 · 0.00 |
  | Oregon | **0.35 · 0.39** · 0.14 · **0.23** |
  | Florida | 0.27 · 0.05 · 0.17 · **0.64** |
  | Colorado | **0.89** · 0.08 · 0.07 · 0.01 |

- **Whole-period state losses (95% CI from resampling orders):**
  - **Robust:** TX [−38.5k, −15.1k], OH [−35.5k, −6.3k], PA [−22.4k, −9.3k], IL [−21.5k, −5.8k], CO [−15.1k, −0.9k], TN [−10.3k, −1.1k], AZ [−6.7k, −0.3k].
  - **Not robust (CI crosses 0):** **North Carolina [−17.6k, +0.1k], Florida [−8.8k, +0.8k], Oregon [−2.8k, +0.3k].**
- **Cities:** Chicago's "every year" includes 2015 at **−$5.50**, which is effectively zero.

**Verdict:** "consistently loss-making" is defensible for **Texas, Ohio, Pennsylvania** (and Illinois); soften it for the rest.

### 1.7 Does shipping mode really have little relationship with profitability?

**Recalculation ✓:** margins 12.4% / 13.9% / 12.5% / 12.1%; AOV $486 / $447 / $476 / $454.

**Checks**
- **An undisclosed contradiction.** The earlier run's own line-level Kruskal-Wallis test on discount by mode gave **p = 0.001**, yet the report said "no different discounting".
  - That test counted lines within the same order as independent observations. At order level: KW p = 0.17; shuffling mode labels across orders: p = 0.55.
  - → The conclusion survives, but the evidence was incompletely reported.
- **Margin differences look random.** The spread across modes is 1.85 points; shuffling labels gives p = 0.95. But a random shuffle alone produces spreads up to **10.0 points** (95th percentile), and **Same Day's detectable difference is about ±12 points**.
  - → "No *detectable* relationship", not "no relationship".
- **The null result is guaranteed by construction.** Ship mode is unrelated to state (p = 0.07), sub-category (p = 0.41), product margin (p = 0.46), order value (p = 0.46) and quantity (p = 0.54).
  - Unit costs and list prices are identical across modes, and **Profit contains no shipping cost**.
  - Ship times don't vary by weekday.

**Verdict:** "shipping mode has no detectable relationship with *recorded* profit" ✓. "Shipping mode doesn't affect profitability" ✗.

### 1.8 Does the dataset appear synthetic/rule-generated?

| Test (all fresh) | Result |
|---|---|
| One discount per State × Sub-Category | 552 groups with ≥2 lines: **100%** single-valued. With discounts shuffled within sub-category (300 shuffles), only 10.0% on average (max 12.1%). **Not a small-group coincidence** |
| Constant unit cost per product | Leave-one-out profit error **0.0000** over 9,901 lines |
| Full-price margins | **Exactly 51 values: every whole percentage from 0% to 50%** (all 1,894 products) |
| Demand curve | None: quantity vs list unit price ρ = −0.007. Copiers (median $550) average 3.44 units per line, fasteners ($3.29) 4.21; 13 copier lines sold 5 units |
| Customers | 301 of 793 ordered into all 4 regions; median 5 states per customer; **66.6% never shipped to the same city twice** |
| Calendar | One weekday is almost empty each year: **Thursday 2014 (25 orders), Wednesday 2015–17 (18, 27, 34)** vs ~150–310 on other days. Weekends are as busy as weekdays |
| Ship mode | Behaves like a random label |

*Outside context, not derived from the data:* the file name matches Tableau's "Sample - Superstore" demo dataset, widely known to be fictional.

**Verdict:** strongly supported. **The findings describe the generator's rules, not retail behaviour.**

---

## 2. Visualizations that could mislead

1. **Discount-vs-margin scatter with r = −0.97 and a fitted line.**
   - Problem: clusters plus arithmetic; the 22% break-even is wrong.
   - Fix: plot the formula's curve with the State × Sub-Category cells on it, and don't headline r.
2. **Equal-area tile map coloured by margin.**
   - Problem: Wyoming (1 line), West Virginia (4) and North Dakota (7) get the same weight as Texas (985), and NC, FL and OR are statistically uncertain.
   - Fix: grey out states with fewer than 30 lines, and encode size and uncertainty.
3. **Any geographic map invites spatial stories** ("Rust Belt", "Sun Belt").
   - Problem: the discount clusters aren't neighbours (TX–IL, FL–NC/TN and OR–AZ/CO don't border each other).
   - Also, "every region hides a cluster" oversells the West, where the cluster is 11.9% of sales.
4. **Margins on deep-discount cells** (−180%, −255%, −106.6%).
   - Problem: the discount itself shrinks the denominator.
   - Fix: use profit $ or profit ÷ list value.
5. **Break-even ladder dots sized by Sales.**
   - Problem: shrinks deep-discount volume by 70–80%.
   - Fix: size by list value or quantity.
6. **The "$4 Avery binder" explainer.**
   - Problem: the dollars are lost on $200–$1,000 binding machines.
   - Fix: use GBC DocuBind P400 in Texas (8 units, $2,178 sales, −$3,702 profit).
7. **"Region margin without its loss states" / ranking reversal.**
   - Problem: removing loss-makers always raises a margin, so this is selection.
   - Fix: show composition (stacked contributions), not "what the region would be".
8. **"93% of losses" next to "31% of sales".**
   - Problem: understates the group's size.
   - Fix: use 40% of list value or 39% of lines.
9. **Year stepper "red every year".**
   - Problem: expected with a fixed schedule; small-state colours flip by chance.
10. **"$567k discounts ≈ 2× profit" headline.**
    - Problem: implies money that could be recovered.
11. **"Top 1% of lines = 47% of profit".**
    - Problem: uses net profit as the denominator. It's 30.5% of gross gains.
12. **Shipping-mode bars without confidence intervals.**
    - Problem: invites reading noise as a finding.

---

## A. VERIFIED findings

1. **Totals:** 9,994 rows × 21 columns; sales $2,297,200.86; profit $286,397.02 (12.47%); 5,009 orders; 1,871 loss lines; gross gains $442,528 / gross losses −$156,131 (35.3%). 1 duplicate line. No missing values.
2. **No zero-discount line loses money** (0 of 4,798).
3. **Profit is fully determined** by each product's fixed list price and unit cost, the State × Sub-Category discount, and quantity. Verified out of sample (leave-one-out error 0.0000).
4. **Discount is one fixed rate per State × Sub-Category** (100% vs a 10% shuffled baseline), constant across all years.
5. **10 states (+Wyoming, 1 line) account for 93.3% of gross line losses.** Robust to the loss definition (90–96%), to excluding Texas (91%), to dropping the 50 worst lines (89%), and to other groupings (97–99%).
6. **Not product mix and not customers:** basket full-price margin ~30% in every group; the same 434 customers earn 30.2% vs −14.2%.
7. **State discount vs state margin r = −0.971** (CI −0.984 to −0.951), true as arithmetic.
8. **No region loses money in any year.** Central's 7.9% margin is 49.9% of its sales coming from TX and IL (−15.3%); without them, 31.1%.
9. **Texas, Ohio, Pennsylvania (and Illinois) lose money robustly overall and in every year.** Colorado, Tennessee and Arizona are robustly negative overall.
10. **Rank mismatches:** Texas #3 in sales → #49 in profit; PA #5 → #47; OH #8 → #48; IL #7 → #46; FL #6 → #41.
11. **Binders:** +$30.2k net, −$38.5k gross losses (#1), 100% at 70–80% off.
12. **Tables:** #4 in sales, last in profit (−$17.7k), negative every year, 63.6% of lines lose money.
13. **Sub-category sales vs margin:** ρ = −0.58 (p = 0.015). Furniture: 32.3% of sales, 6.4% of profit.
14. **Shipping mode:** no detectable association with margin, order value, quantity or (order-level) discount.
15. **The dataset is almost certainly synthetic.**

## B. INCORRECT or questionable findings

| # | Earlier claim | Problem | Corrected version |
|---|---|---|---|
| 1 | "1,871 of 1,871 loss lines fit the rule" as proof | **Circular**: true for any data | Cite the leave-one-out test (0.0000 error, 100% sign agreement) |
| 2 | "Binders have the store's highest full-price margin" | **Incorrect**: Labels 47.81% > 47.79% | "Among the highest (~48%)" |
| 3 | "11 states" | Wyoming is 1 profitable line | "10 states" |
| 4 | "31% of sales → 93% of losses" | Denominator already shrunk by discounts | "40% of list value (39% of lines) → 93% of losses" |
| 5 | "Margin crosses zero near 22% average discount" | **Incorrect**: artefact of weighting by Sales | Break-even = full-price margin ≈ 29.8% (list-weighted) |
| 6 | r = −0.97 as a strong empirical relationship | Arithmetic + clusters; r = −0.51 (n.s.) within the loss group | "State margin follows mechanically from discount depth" |
| 7 | "TX, OH, PA, IL, OR lose every year"; "10 loss-making states" | OR yearly signs are noise; NC, FL, OR overall CIs cross 0 | Robust: TX, OH, PA, IL (+CO, TN, AZ overall); others uncertain |
| 8 | "Not a product problem" | **Contradicted**: Furniture full-price margin 22% vs ~33.5%; Tables lose in mixed states | "Deep discounts × thin-margin furniture/equipment" |
| 9 | "Binders paradox" / "$4 binder" | 78% of Binders losses = 17 binding machines ≥$100 | "Binding machines at 70–80% off" |
| 10 | "Never sells at full price" as mechanism | Their 20%-off lines are profitable (+$31.5k) | "30–80% discounts on specific sub-categories" |
| 11 | "Shipping not associated with different discounting" | Line-level test (p = 0.001) went unreported | Order-level p = 0.17 / shuffle p = 0.55; report properly |
| 12 | "Shipping mode doesn't affect profit" | Low power (Same Day ±12 pts) and no shipping cost in Profit | "No detectable relationship with recorded profit" |
| 13 | "Top 1% of lines = 47% of profit" | Net-profit denominator | "30.5% of gross gains" |
| 14 | "$567k discounts ≈ 2× profit" | Arithmetic ✓, but implies a counterfactual | "Gap between list-price and actual revenue" |
| 15 | "Every region contains a cluster" | West's cluster = 11.9% of its sales | Quantify each region's share |
| 16 | "Ignore the Order ID prefix" | It's correlated with the discount states (missed) | Treat it as a proxy; document, don't interpret |
| 17 | "Discounts don't come with bigger baskets" | True, but the data has no demand model | Don't present as a business insight |

## C. NEW findings

1. **Three levers fully explain every line's profit:** *what* (product: fixed full-price margin of 0–50%), *where* (state: fixed discount per sub-category), *how many* (quantity). Verified out of sample.
2. **Full-price margins are exactly whole percentages 0–50%**, conclusive synthetic structure.
3. **Deep discounts, not discounting, are the loss mechanism.**
   - **Lines ≥30% off:** 1,393 lines (13.9%), 25.4% of list value, **−$135,376, 88.7% of gross losses**.
   - **Lines under 30% off:** $421,773 profit on $1.93M (**21.8% margin**).
   - Deep-discount State × Sub-Category cells exist in **19 states**, including 9 "mixed" states (NY, NJ, MA, CT, MD, DE, RI, NH, WV), mostly Tables and Bookcases at 30–40%.
4. **Binding machines drive Binders' losses:** 17 products, 7.7% of lines, 77.9% of losses.
5. **Furniture is structurally fragile:** 22.0% full-price margin vs 33.6% / 33.5%, under the same ~20% discount, becomes 2.5% vs 17%.
6. **Same-customer control:** 434 customers ordered into both group types, earning 30.2% vs −14.2%; 92% did worse in the discount states.
7. **Basket full-price margin is identical across state groups (29.6–30.0%)**, so the geographic gap is essentially all discount.
8. **Order ID prefix "US":** margin 3.9% vs 14.2% (gap 10.3 points, CI 5.6–15.2).
   - It is over-represented in discount states (21% of orders vs 13–15%; state-level r = 0.76 with discount).
   - Fully explained by State × Sub-Category mix (expected 4.25% vs actual 3.89%). **A proxy, not a driver.**
9. **Calendar anomaly:** a near-empty weekday each year (Thursday 2014, Wednesday 2015–17).
10. **Loss concentration:** the worst 20 lines = 27.9% of gross losses; the worst 100 = 54.6%.
11. **Statistical robustness:** 7 of the 10 loss-making states are robustly negative; North Carolina, Florida and Oregon are not.
12. **The three deep-discount cells that stay profitable** are Copiers at 40% (OH, PA) and Machines at 30% (IL): their full-price margins exceed the discount.

## D. The strongest defensible story

> **"Where prices fall below cost."**
>
> In this dataset, every line's profit is set by three things: what is sold (each product carries a fixed margin of 0–50%), where it ships (each state applies a fixed discount per sub-category), and how many.
>
> - **Most discounting is harmless.** Lines under 30% off still earn 21.8%.
> - **1 in 7 lines is discounted 30–80%**, below cost for most products. Those lines produce **89% of all line-level losses (−$135k)**.
> - **They cluster in a handful of states**, led by Texas, Ohio, Pennsylvania and Illinois, which lose money reliably every year.
> - **They hit hardest on expensive equipment and thin-margin furniture:** binding machines at 70–80% off, Machines at 50–70%, Tables at 30–50%.
> - **The same products, the same customers and the same basket margins earn ~30% in states that don't discount.**
> - **Regional totals average it away.** Shipping mode shows no detectable link to recorded profit, but this dataset doesn't record shipping cost.

**Defensible visual sequence**
1. **Composition first:** region totals as stacked state contributions, with gains above and losses below the line (not margin colours).
2. **Mechanism:** a "price vs cost" chart.
   - x = discount, y = profit ÷ list value.
   - Plot the 656 State × Sub-Category cells, coloured by product full-price margin, with break-even curves.
   - Label it honestly as "the rule of this dataset".
3. **Where:** a State × Sub-Category matrix of *discount rates*, with profit $ on hover and cells under 30 lines greyed.
4. **What:** binding machines and tables as worked examples.
5. **Controls:** same basket margin, same customers.
6. **Shipping:** margin dots with 95% CI whiskers, plus a note that shipping cost isn't in Profit.
7. **A data-honesty panel:** synthetic data, fixed rules, no demand response.

## E. Claims to absolutely avoid

1. **"Discounts cause losses / cutting discounts would add $X / $567k could be recovered."** There is no demand data, and quantity is independent of price by construction.
2. **"Discounts don't drive sales volume"** as a business truth.
3. **"We found a −0.97 correlation"** as an empirical discovery, and **"break-even at 22%"**.
4. **"11 states"; "Oregon, Florida, North Carolina consistently lose money"** (not statistically robust).
5. **"Binders — the highest-margin product — lose the most"; "cheap binders lose money".**
6. **"It isn't a product problem."**
7. **"Shipping mode doesn't affect profitability"; "faster shipping costs nothing".**
8. **Real-world explanations:** Texas market conditions, regional competition, Rust/Sun Belt, sales-rep behaviour.
9. **Any claim about the real Superstore, real retail, or where customers live.**
10. **"Top 1% of lines = 47% of profit"** without saying "net".
11. **Interpreting the Order ID prefix or the weekday gap.**
12. **"Central would be the best region"** (a selection counterfactual).
13. **Margins below −100% used as intensity** (use $ or profit ÷ list value).
14. **"1,871 of 1,871 lines prove the rule"** (circular).
