# ENGIVIZ — Superstore Dataset: Data Study & Story Discovery

Source: `dataset/Sample - Superstore.csv` · Analysis done in Python/pandas · All figures are calculated from the file unless marked otherwise.

Labels used throughout:
- **[Fact]**: calculated directly from the data
- **[Obs]**: a pattern seen in the calculated facts
- **[Interp]**: an interpretation; plausible but not proven by the data
- **[Assump]**: an assumption the data does not confirm

---

## PHASE 1 — UNDERSTAND THE DATA

### 1.1 Shape, grain, encoding
- **9,994 rows × 21 columns.** [Fact]
- **Grain: one row = one order line** (one product within one order). Order-level fields (both dates, ship mode, customer, segment, city, state, postal code, region) are constant within every Order ID: 0 conflicts across 5,009 orders. Orders have 1–14 lines (mean 2.0). [Fact]
- **Encoding is Windows-1252/Latin-1, not UTF-8.** 59 product names contain non-breaking spaces (byte 0xA0). Read the file with `encoding="latin-1"` or `cp1252`, or it will fail or garble. [Fact]
- **Date range:** orders 2014-01-03 → 2017-12-30 (4 full years); ships 2014-01-07 → 2018-01-05. [Fact]

### 1.2 Column dictionary

| # | Column | Parsed type | Role | Unique | What it appears to represent / notes |
|---|---|---|---|---|---|
| 1 | Row ID | int | Identifier | 9,994 | Sequential 1–9,994. No analytical meaning. |
| 2 | Order ID | string | Identifier | 5,009 | `CA-2016-152156`: prefix `CA` (8,308 rows) or `US` (1,686); middle = year. Prefix meaning unknown (every row is United States) — **do not interpret**. Year matches the order-date year for 99.93% of rows; 7 rows dated 2016-12-31 carry "2017" IDs. |
| 3 | Order Date | date (stored as text M/D/YYYY) | Temporal | 1,237 | Date the order was placed. |
| 4 | Ship Date | date (text) | Temporal | 1,334 | Always ≥ Order Date (0–7 days later). |
| 5 | Ship Mode | categorical (4) | Categorical | 4 | Standard Class 5,968 rows · Second Class 1,945 · First Class 1,538 · Same Day 543. |
| 6 | Customer ID | string | Identifier | 793 | 1:1 with Customer Name. |
| 7 | Customer Name | string | Identifier (personal name) | 793 | Not useful analytically; don't visualize. |
| 8 | Segment | categorical (3) | Categorical | 3 | Consumer 5,191 · Corporate 3,020 · Home Office 1,783. Constant per customer. |
| 9 | Country | categorical (1) | Geographic | **1** | Always "United States". No information. |
| 10 | City | string | Geographic | 531 names / **604 city+state pairs** | 57 city names exist in several states (Springfield, Columbia ×4). **Always key cities by City + State.** |
| 11 | State | categorical | Geographic | 49 | 48 states + DC. **Alaska and Hawaii are absent.** |
| 12 | Postal Code | parsed as int by default → should be **text** | Geographic | 631 | 438 rows (MA, NJ, CT, RI, NH, ME) have **4-digit codes**: the leading zero was lost upstream. One Vermont code keeps its zero ("05408"), which is inconsistent. ZIP 92024 maps to two cities. |
| 13 | Region | categorical (4) | Geographic | 4 | West 3,203 · East 2,848 · Central 2,323 · South 1,620. Each state belongs to exactly one region. These are **company-defined regions, not US Census regions** (e.g. Ohio = East, Texas = Central). |
| 14 | Product ID | string | Identifier | 1,862 | `FUR-BO-10001798`: the prefix matches Category (100%) and the middle code matches Sub-Category (100%). **32 IDs are reused for two different products** (337 rows), so use ID + Name as the product key. |
| 15 | Category | categorical (3) | Categorical | 3 | Office Supplies 6,026 · Furniture 2,121 · Technology 1,847. |
| 16 | Sub-Category | categorical (17) | Categorical | 17 | Each belongs to exactly one Category. |
| 17 | Product Name | string | Descriptive | 1,850 | 16 names map to more than one ID. |
| 18 | Sales | float | Numerical (currency) | — | 0.44 → 22,638.48; mean 229.86, median 54.49; heavily right-skewed. **Revenue after discount** (proof in Phase 2). Currency not stated [Assump: USD]. |
| 19 | Quantity | int | Numerical | 14 | 1–14 units, median 3. |
| 20 | Discount | float (fraction) | Numerical (effectively ordinal) | 12 | Only 12 values: 0, .10, .15, .20, .30, .32, .40, .45, .50, .60, .70, .80. 48% of rows are 0. |
| 21 | Profit | float | Numerical (currency) | — | −6,599.98 → 8,399.98; **1,871 rows negative (18.7%)**; 65 exactly 0. |

**Groups**
- **Identifiers:** Row ID, Order ID, Customer ID, Product ID (plus Customer Name, Product Name)
- **Temporal:** Order Date, Ship Date
- **Categorical:** Ship Mode, Segment, Category, Sub-Category
- **Geographic:** Country (constant), Region, State, City, Postal Code
- **Numerical:** Sales, Quantity, Discount, Profit

### 1.3 Missing values & duplicates
- **Missing values: 0 in every column.** [Fact]
- **Exact duplicate rows: 0.** [Fact]
- **Duplicate if Row ID is ignored: 1 pair.** Rows 3406 and 3407 (order US-2014-150119, Global Leather Highback Executive Chair, Sales 281.372, Qty 2, Discount 0.3, Profit −12.06) are identical. Likely a true duplicate; its impact is negligible (−$12). [Fact/Interp]
- 7 more order+product pairs appear twice with *different* quantities. These look like legitimate split lines. [Interp]

### 1.4 Suspicious, inconsistent or unusual values
1. **Discount is 100% determined by State × Sub-Category.** All 656 State×Sub-Category combinations have exactly one discount value, including the 121 combinations with ≥20 rows (e.g. California·Paper: 289 rows, all 0%). Within a state, discount never varies by date, customer, segment, product or ship mode. [Fact] This is a strong sign of **rule-generated (synthetic) data**. [Interp]
2. **Profit follows an exact formula.** Every product has one fixed unit cost across all its rows: 1,801 products have more than one row and 0 of them vary by more than 1%, whatever the discount, state, date or ship mode. So `Profit = Sales − Quantity × UnitCost` and row margin = `1 − (1 − m₀)/(1 − d)`, where m₀ is the product's full-price margin. Maximum error: 9×10⁻¹⁶. [Fact]
3. **A line loses money if and only if its discount exceeds the product's full-price margin.** This holds for all 1,871 loss lines (100% agreement). [Fact]
4. **No line with a 0% discount loses money** (0 of 4,798). [Fact]
5. **Customers are not tied to one place:** 766 of 793 customers have orders in more than one region. [Fact] So geography most likely describes the **order's ship-to location**, not where the customer is based. [Assump] This is also typical of synthetic data. [Interp]
6. **Extreme values:** one line has $22,638 sales (Cisco TelePresence, 50% off, −$1,811 profit); another has −$6,600 profit (Cubify 3D printer, 70% off). The top 1% of lines (100 lines) produce 47.1% of net profit. [Fact]
7. **Ship days vs mode:** mostly consistent (Same Day 0 · First Class ~2.2 · Second ~3.2 · Standard ~5.0 days). Minor oddities: 12 Same Day orders took 1 day, 1 First Class order took 4 days, 1 Standard order took 3 days. [Fact]
8. Data-hygiene issues: 4-digit ZIPs, reused Product IDs, cp1252 encoding, 7 Order-ID/year mismatches. [Fact]

### 1.5 Relationships that matter
- **Hierarchies:** Category → Sub-Category → Product · Region → State → City → Postal Code · Customer → Order → Line.
- **Discount ← State × Sub-Category** (deterministic).
- **Profit ← Sales, Quantity, Discount, product unit cost** (deterministic).
- **Ship Mode ↔ ship days** (strong, as expected).
- **Ship Mode is independent of everything else tested:** region (χ² p = 0.97), segment (p = 0.08), year (p = 0.69), category (p = 0.73), state discount policy (p = 0.65).
- **Quantity is independent of Discount** (Spearman ρ = −0.001, p = 0.93) and of row margin (ρ = 0.001).

---

## PHASE 2 — UNDERSTAND THE BUSINESS METRICS

| Metric | What it is in this dataset | Evidence / caveat |
|---|---|---|
| **Sales** | Line revenue **after discount** = list unit price × Quantity × (1 − Discount) | For 1,589 products sold at more than one discount level, `Sales/Qty` varies in 100% of them, but `Sales/Qty/(1−Discount)` varies in 0%. So Sales is net of discount. [Fact → Interp] |
| **Profit** | Sales minus the cost of the goods (fixed unit cost × Quantity) | Which costs are included is undocumented. Unit cost is identical across ship modes, so **shipping cost does not appear to be included**. [Fact → Interp] |
| **Quantity** | Units on the line | Says nothing about value by itself: 14 units of labels ≠ 14 copiers. |
| **Discount** | Fractional price reduction off list price (0.2 = 20% off) | Mean line discount 15.6%; sales-weighted 14.0%. Set per State × Sub-Category. |
| **Profit margin** | **Not provided.** Can be calculated reliably as **Profit ÷ Sales** | For any group, use **ΣProfit ÷ ΣSales**, never the average of line margins. Company margin = 286,397 / 2,297,201 = **12.47%**; the unweighted mean of line margins is 12.03%, and the gap is much larger for some sub-categories. |

**Company totals [Fact]:** Sales $2,297,201 · Profit $286,397 · Margin 12.47% · 5,009 orders · 37,873 units · 1,871 loss lines (18.7%).

### Useful derived metrics
| Derived metric | Formula | Company value |
|---|---|---|
| Implied list-price value | Sales ÷ (1 − Discount) | $2,863,935 |
| **Discount given ($)** | List value − Sales | **$566,734 = 1.98× net profit** |
| Unit cost | (Sales − Profit) ÷ Quantity | constant per product |
| **Full-price margin (m₀)** | 1 − UnitCost ÷ ListUnitPrice | 29.8% company-wide |
| **Break-even discount** | = m₀ (a discount above this always loses money) | varies 5%–48% by sub-category |
| Gross gains / gross losses | Σ positive profit / Σ negative profit | +$442,528 / −$156,131 (losses erase 35.3% of gains) |
| Loss-line share | loss lines ÷ lines | 18.7% |
| Average order value (AOV) | Sales ÷ distinct orders | $458.61 (reliable, because ship mode and geography are order-level) |
| Ship days | Ship Date − Order Date | mean 3.96 |
| Sales-weighted discount | Σ(Discount × Sales) ÷ ΣSales | 14.0% |
| State discount policy | share of a state's lines at 0% discount | three groups: see Q2 |

---

## PHASE 3 — ANSWER THE THREE QUESTIONS

### QUESTION 1 — Which sub-categories drive the highest profit margins?

**Full ranking (sorted by margin).** Rank = position by Sales / Profit / Margin. "Full-price margin" = margin if sold with no discount.

| Sub-Category | Sales | Profit | **Margin** | Qty | Lines | Orders | Avg disc | Loss lines | Full-price margin | Rank S/P/M |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Labels | 12,486 | 5,546 | **44.4%** | 1,400 | 364 | 346 | 6.9% | 0% | 47.8% | 16/12/1 |
| Paper | 78,479 | 34,054 | **43.4%** | 5,178 | 1,370 | 1,191 | 7.5% | 0% | 47.6% | 12/4/2 |
| Envelopes | 16,476 | 6,964 | **42.3%** | 906 | 254 | 249 | 8.0% | 0% | 47.0% | 15/10/3 |
| Copiers | 149,528 | 55,618 | **37.2%** | 234 | 68 | 68 | 16.2% | 0% | 46.3% | 8/**1**/4 |
| Fasteners | 3,024 | 950 | 31.4% | 914 | 217 | 215 | 8.2% | 5.5% | 37.6% | 17/14/5 |
| Accessories | 167,380 | 41,937 | 25.1% | 2,976 | 775 | 718 | 7.8% | 11.7% | 30.2% | 7/3/6 |
| Art | 27,119 | 6,528 | 24.1% | 3,000 | 796 | 731 | 7.5% | 0% | 30.0% | 14/11/7 |
| Appliances | 107,532 | 18,138 | 16.9% | 1,729 | 466 | 451 | 16.7% | 14.4% | 29.6% | 10/8/8 |
| Binders | 203,413 | 30,222 | 14.9% | 5,974 | 1,523 | 1,316 | **37.2%** | **40.2%** | **47.8%** | 5/5/9 |
| Furnishings | 91,705 | 13,059 | 14.2% | 3,563 | 957 | 877 | 13.8% | 17.5% | 26.9% | 11/9/10 |
| Phones | 330,007 | 44,516 | 13.5% | 3,289 | 889 | 814 | 15.5% | 15.3% | 27.9% | **1**/2/11 |
| Storage | 223,844 | 21,279 | 9.5% | 3,158 | 846 | 777 | 7.5% | 19.0% | 15.7% | 3/7/12 |
| Chairs | 328,449 | 26,590 | 8.1% | 2,356 | 617 | 576 | 17.0% | 38.1% | 23.4% | **2**/6/13 |
| Machines | 189,239 | 3,385 | 1.8% | 440 | 115 | 112 | 30.6% | 38.3% | 35.5% | 6/13/14 |
| Supplies | 46,674 | **−1,189** | −2.5% | 647 | 190 | 187 | 7.7% | 17.4% | **5.1%** | 13/15/15 |
| Bookcases | 114,880 | **−3,473** | −3.0% | 868 | 228 | 224 | 21.1% | 47.8% | 20.1% | 9/16/16 |
| Tables | 206,966 | **−17,725** | **−8.6%** | 1,241 | 319 | 307 | 26.1% | **63.6%** | 19.1% | **4**/17/17 |

**Category level:** Technology 17.4% margin (36.4% of sales, 50.8% of profit) · Office Supplies 17.0% (31.3% / 42.8%) · **Furniture 2.5% (32.3% of sales, only 6.4% of profit).** [Fact]

**High sales ≠ high margin [Fact]:** the rank correlation between sub-category sales and margin is **ρ = −0.58**. The four biggest sellers (Phones, Chairs, Storage, Tables) rank 11th, 13th, 12th and 17th on margin.

**Winners**
- **Copiers.** #1 in profit ($55.6k) from only 68 lines; 37.2% margin; zero loss lines. [Fact] *Fragile:* Canon imageCLASS 2200 alone = $25.2k from 5 lines (8.8% of company profit). [Fact]
- **Paper, Labels, Envelopes.** 42–44% margin, zero loss lines, never discounted beyond 20%. Paper is also #4 in profit dollars. Stable every year (Paper 42.9–43.9%). [Fact]
- **Accessories.** #3 in profit at 25.1%. [Fact]

**Losers**
- **Tables.** 4th in sales, **last in profit (−$17.7k)**. 63.6% of lines lose money; 42 of 56 table products lose money overall; negative every year (−$3.1k, −$3.5k, −$3.0k, −$8.1k in 2017). [Fact]
- **Bookcases.** −$3.5k, negative in 3 of 4 years. [Fact]
- **Supplies.** −$1.2k and worsening (+$490 → −$25 → −$699 → −$955). [Fact]

**Surprising cases**
- **The Binders paradox.** Binders have the **highest full-price margin in the store (47.8%)**, yet realize only 14.9%. They are the **single largest source of gross losses (−$38.5k)**, and 100% of those losses come from lines discounted 70–80%. Without lines discounted ≥30%, Binders' margin would be 41.1%. [Fact]
- **Machines.** 6th in sales, 1.8% margin. The worst 5 lines total −$18.3k (3D printers and a laser printer at 50–70% off). Without lines discounted ≥30%, the margin would be 29.3%. Profit turned negative in 2017 (−$2.9k). [Fact]
- **Supplies** is the one loser *not* driven by deep discounts (average only 7.7%). Its full-price margin is just 5.1%, so even a 20% discount crosses break-even. The losses come from electric letter openers ($42.6k sales, −$2.1k profit). [Fact]
- **Storage** (3rd in sales) has a thin full-price margin (15.7%), so all of its losses come from 20% discounts. [Fact]

**Explanation supported by the data [Obs]:** a sub-category's margin is explained by two things:
1. its **full-price margin**: low for Supplies (5%), Storage (16%), Tables (19%), Bookcases (20%); high for Binders, Paper, Labels, Envelopes, Copiers (46–48%);
2. **how often it is sold above that break-even discount**: Tables 64% of lines, Bookcases 48%, Binders 40%, Chairs 40%, Machines 38%, versus 0% for Paper, Labels, Envelopes, Art and Copiers.

Where every product's full-price margin is above the discount it receives (Paper, Labels, Envelopes, Art, Copiers), **no line loses money**. Accessories and Fasteners are never discounted beyond 20% but still lose on some lines, because *individual* products inside them have full-price margins below 20%. The rule works at product level, not sub-category average.

---

### QUESTION 2 — Do specific geographic regions consistently operate at a loss?

#### Region level — no region loses money
| Region | Sales | Profit | Margin | Avg line disc | Loss lines | Loss-making states | Profit 2014/15/16/17 |
|---|---:|---:|---:|---:|---:|---|---|
| West | 725,458 | 108,418 | **14.9%** | 10.9% | 9.9% | 3 of 11 | 20.1k / 20.5k / 24.1k / 43.8k |
| East | 678,781 | 91,523 | 13.5% | 14.5% | 19.4% | 2 of 14 | 17.1k / 21.1k / 20.1k / 33.2k |
| South | 391,722 | 46,749 | 11.9% | 14.7% | 16.0% | 3 of 11 | 11.9k / 8.3k / 17.7k / 8.8k |
| Central | 501,240 | 39,706 | **7.9%** | 24.0% | 31.9% | 2 of 13 | **0.5k** / 11.7k / 19.9k / 7.6k |

- **Answer at region level: no region operates at a loss in any year.** Central is weakest (2014 margin only 0.5%; negative in 4 of 16 quarters). [Fact]
- **The region view hides the problem.** Removing each region's loss-making cluster reverses the ranking completely [Fact]:

| Region | Margin (all states) | Margin without its "never full price" states | Those states | Their share of region sales | Their margin |
|---|---:|---:|---|---:|---:|
| Central | 7.9% (4th) | **31.1% (1st)** | Texas, Illinois | 49.9% | −15.3% |
| South | 11.9% (3rd) | 29.2% (2nd) | Florida, N. Carolina, Tennessee | 44.9% | −9.2% |
| East | 13.5% (2nd) | 25.6% (3rd) | Ohio, Pennsylvania | 28.7% | −16.7% |
| West | 14.9% (1st) | **18.7% (4th)** | Arizona, Colorado, Oregon (+Wyoming, 1 line) | 11.9% | −12.8% |

#### State level — 10 loss-making states
Together these 10 states make **$705,684 in sales (30.7% of the total)** and **−$98,247 in profit**. The other 39 states make $384,644. [Fact]

| State | Region | Sales | Profit | Margin | Sales-wtd discount | Lines at 0% disc | Loss years (of 4) | Loss quarters |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **Texas** | Central | 170,188 | **−25,729** | −15.1% | 30.7% | 0% | **4** | 15/16 |
| **Ohio** | East | 78,258 | −16,971 | −21.7% | 35.8% | 0% | **4** | 12/16 |
| **Pennsylvania** | East | 116,512 | −15,560 | −13.4% | 33.6% | 0% | **4** | 14/16 |
| **Illinois** | Central | 80,166 | −12,608 | −15.7% | 30.8% | 0% | **4** | 13/16 |
| North Carolina | South | 55,603 | −7,491 | −13.5% | 32.6% | 0% | 3 | 7/16 |
| Colorado | West | 32,108 | −6,528 | −20.3% | 29.8% | 0% | 3 | 8/16 |
| Tennessee | South | 30,662 | −5,342 | −17.4% | 33.2% | 0% | 3 | 11/16 |
| Arizona | West | 35,282 | −3,428 | −9.7% | 28.6% | 0% | 3 | 11/15 |
| Florida | South | 89,474 | −3,399 | −3.8% | 31.8% | 0% | 3 | 10/16 |
| **Oregon** | West | 17,431 | −1,190 | −6.8% | 25.3% | 0% | **4** | 6/14 |

- **Consistent losers (every year): Texas, Ohio, Pennsylvania, Illinois, Oregon.** The rest lose money in 3 of 4 years. [Fact]
- **The losses are broad, not one bad product:** Texas loses money in 9 of 17 sub-categories, Ohio and Pennsylvania in 8, Illinois in 7. [Fact]
- **No profitable state with ≥100 lines had even one losing year.** [Fact]
- **Sales rank vs profit rank:** Texas is #3 in sales and **#49 (last) in profit**; Pennsylvania #5 → #47; Florida #6 → #41; Illinois #7 → #46; Ohio #8 → #48. [Fact]
- **Top profit states:** California $76.4k (16.7%), New York $74.0k (23.8%), Washington $33.4k (24.1%), Michigan $24.5k (32.1%), Virginia $18.6k (26.3%), Indiana $18.4k (34.3%). [Fact]

(The full 49-state table is in `analysis/data/by_state.csv`.)

#### Is discount related to geographic losses? Yes — very strongly
- **State sales-weighted discount vs state margin: r = −0.971 (R² = 0.94)** for the 38 states with ≥30 lines; Spearman ρ = −0.78 across all 49. The fitted line: each +10 points of average discount ≈ −13.8 points of margin, crossing zero near a 22% average discount. [Fact]
- **Every one of the 10 loss-making states sells nothing at full price.** [Fact]

**State discount-policy groups** (defined only by each state's share of 0%-discount lines, so the grouping is not circular):

| Policy group | States | Sales (share) | Profit | **Margin** | Loss-making states | Share of all company losses | Discount given |
|---|---:|---:|---:|---:|---:|---:|---:|
| Never discounts | 21 | $403,664 (17.6%) | $120,321 | **29.8%** | 0 | 0% | $0 |
| Mixed | 17 | $1,186,249 (51.6%) | $264,223 | 22.3% | 0 | 6.7% | $123k |
| **Never sells at full price** | 11 | $707,287 (30.8%) | **−$98,147** | **−13.9%** | **10** (the 11th is Wyoming: 1 line) | **93.3%** | **$443k** |

- Never discounts: AL, AR, DC, GA, IN, IA, KS, KY, LA, ME, MN, MS, MO, NE, ND, OK, SC, SD, VT, VA, WI.
- Mixed: CA, CT, DE, ID, MD, MA, MI, MT, NV, NH, NJ, NM, NY, RI, UT, WA, WV.
- Never full price: AZ, CO, FL, IL, NC, OH, OR, PA, TN, TX, WY.

**Stable over time [Fact]:** the "never full price" group's margin was −11.4%, −13.5%, −13.4% and −16.4% (2014 → 2017). Its losses grew with sales.

**Not explained by product mix [Fact]:** comparing the *same* sub-category across the three groups (never / mixed / never-full-price):
- Binders 47.9% / 38.5% / **−106.6%**
- Machines 39.4% / 27.5% / −38.5%
- Tables 18.1% / 1.1% / −37.4%
- Chairs 24.9% / 11.0% / −5.1%
- Phones 27.2% / 18.0% / 2.1%

With every group given the same sub-category sales mix: 29.4% / 21.9% / **−16.7%**.

**Discount schedules come in clusters that cross region lines [Fact]:**
- **Ohio = Pennsylvania** (identical in all 17 sub-categories): Binders & Machines 70%, Bookcases 50%, Tables, Phones & Copiers 40%, Chairs 30%, everything else 20%.
- **Arizona = Colorado = Oregon** (identical in 16 shared): Binders, Bookcases & Machines 70%, Tables 50%, everything else 20%.
- **North Carolina = Tennessee** (identical in 16); Florida almost the same: Binders 70%, Machines 50%, Tables 40–45%, everything else 20%.
- **Texas ≈ Illinois:** Binders & Appliances 80%, Furnishings 60%, Chairs 30%, Bookcases 30–32%, everything else 20%.

**Worst State × Sub-Category cells [Fact]:**

| Cell | Sales | Profit | Discount | Margin |
|---|---:|---:|---:|---:|
| Texas · Binders | $9,043 | **−$14,705** | 80% | −163% |
| Ohio · Machines | $8,978 | −$11,771 | 70% | −131% (8 lines) |
| Illinois · Binders | $4,539 | −$7,204 | 80% | −159% |
| Texas · Appliances | $2,408 | −$6,147 | 80% | −255% |
| N. Carolina · Machines | $12,621 | −$5,385 | 50% | −43% (4 lines) |
| Pennsylvania · Binders | $6,266 | −$4,571 | 70% | −73% |
| New York · Tables | $13,779 | −$4,536 | 40% | −33% |

- 79 of 656 cells lose money. **55 of the 58 cells discounted ≥30% lose money. 0 cells at 0% discount lose money.** [Fact]

#### City level (use with care)
- 604 city+state pairs; 138 lose money. Only 11 cities have ≥100 lines. [Fact]
- **Consistent losers with real volume (loss in all 4 years):** Philadelphia (−$13,838, 537 lines, −12.7%), Chicago (−$6,655, 314 lines), Jacksonville FL (−$2,446, 75 lines). [Fact]
- Houston (−$10,154) lost in 3 of 4 years (its only profitable year was +$129). San Antonio's −$7,299 is mostly 2014 (−$6,101), including one line at −$3,702. [Fact]
- Top profit cities: New York City $62.0k (24.2%), Los Angeles $30.4k, Seattle $29.2k, San Francisco $17.5k, Detroit $13.2k. [Fact]
- The 10 worst cities account for 59.6% of all city-level losses; the 10 best produce 66.2% of total profit. [Fact]
- **Caveat [Obs]:** discount is set at *state* level, so differences between cities in the same state are only product mix and noise. Cities add little beyond "the big cities in loss-making states lose money".

**Answer to Q2:** No *region* operates at a loss. **Ten states do. Five of them (Texas, Ohio, Pennsylvania, Illinois, Oregon) lose money every year**, and the other five in 3 of 4 years. They are exactly the states where nothing is sold at full price, and each company region contains one such cluster.

---

### QUESTION 3 — How does shipping mode affect profit and sales volume?

| Ship Mode | Sales (share) | Profit (share) | **Margin [95% bootstrap CI]** | Qty | Lines | Orders (share) | AOV [95% CI] | Median order | Profit / order | Avg ship days | Avg disc | Loss lines |
|---|---:|---:|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| Same Day | 128,363 (5.6%) | 15,892 (5.5%) | 12.4% [3.9, 19.9] | 1,960 | 543 | 264 (5.3%) | $486 [389, 603] | $161 | $60.2 | 0.04 | 15.2% | 18.0% |
| First Class | 351,428 (15.3%) | 48,970 (17.1%) | 13.9% [9.4, 18.3] | 5,693 | 1,538 | 787 (15.7%) | $447 [384, 520] | $148 | $62.2 | 2.18 | 16.5% | 19.1% |
| Second Class | 459,194 (20.0%) | 57,447 (20.1%) | 12.5% [9.7, 15.1] | 7,423 | 1,945 | 964 (19.2%) | $476 [421, 531] | $167 | $59.6 | 3.24 | 13.9% | 15.8% |
| Standard Class | 1,358,216 (59.1%) | 164,089 (57.3%) | 12.1% [9.4, 14.6] | 22,797 | 5,968 | 2,994 (59.8%) | $454 [419, 490] | $148 | $54.8 | 5.01 | 16.0% | 19.7% |

**What the data shows**
- **Volume:** Standard Class carries ~59% of orders, sales, units *and* profit. Each mode's share of orders, sales, quantity and profit is almost the same number, so no mode punches above its weight. [Fact]
- **Margin:** 12.1%–13.9%, with heavily overlapping confidence intervals; **no meaningful difference.** [Fact]
- **Order size:** AOV ranges $447–$486 with overlapping CIs; Kruskal-Wallis on order sales p = 0.31 and on order quantity p = 0.54; items per order 1.95–2.06. **No difference.** [Fact]
- **Profit per order:** weakly different (p = 0.03; Standard is lowest at $54.8), but **not robust**. Removing the 10 largest orders reshuffles the ranking (Same Day → 16.4%, First Class → 11.6%). [Fact]
- **Mix explains the small gaps.** If every line earned its State × Sub-Category average margin, the expected margins would be Same Day 11.8% / First 13.3% / Second 12.9% / Standard 12.2%, against actuals of 12.4 / 13.9 / 12.5 / 12.1. The gaps are ≤0.6 points. [Fact]
- **Ship mode is used identically everywhere:** same mix across regions (p = 0.97), segments (p = 0.08), years (p = 0.69), categories (p = 0.73) and discount-policy groups (p = 0.65). [Fact]
- **Structural limit:** each product's unit cost is identical in every ship mode (1,605 products shipped by more than one mode; 0 differ), and list price is too. So **there is no shipping cost in Profit and no expedited-shipping surcharge in Sales.** [Fact → Interp]
- Ship days vs order profit: ρ = −0.01. [Fact]
- Curiosity to **ignore**: South × Same Day shows −8.4% margin, but that is 39 orders, and one order (a 3D printer at 50% off, −$3,840) flips it. Without that order it is +16.1%. [Fact]

**Answer to Q3:** Faster shipping is **not associated** with higher sales per order, higher profit, lower margins or different discounting. Ship mode only determines *how much volume* goes through each channel (Standard ≈ 60%). **Important:** the dataset cannot measure what faster shipping *costs*, because Profit does not appear to include shipping cost. So "shipping mode doesn't affect profit" is true of this data's accounting, not necessarily of the real business.

---

## PHASE 4 — FIND THE STORY

### Insight 1 — Every loss comes from a discount larger than the product's margin
1. **Observation:** a line loses money exactly when its discount exceeds the product's full-price margin. No line at 0% discount loses money.
2. **Numbers:**
   - 1,871 of 1,871 loss lines fit the rule; 0 of 4,798 full-price lines lose.
   - By discount level: 0% → 29.5% margin; 20% → 11.8%; 30% → −10.0%; 40% → −19.8%; 50% → −34.8%; 70% → −98.7%; 80% → −180%.
   - Lines discounted ≥30% are 13.9% of lines and 15.8% of sales, but produce −$135,376 profit and **88.7% of all gross losses**.
3. **Why it's interesting:** it turns "profitability" from a fuzzy outcome into one readable rule (discount vs break-even) that a viewer can see and remember.
4. **Visualization:** break-even ladder per sub-category (full-price margin as a threshold line, actual discount levels as dots sized by sales, red past the threshold).
5. **Strong enough for the final story?** **Yes, core.** (Remember it is an accounting identity: see limitations.)

### Insight 2 — The losses have a geographic address: 11 "never full price" states
1. **Observation:** states fall into three discount-policy groups, and profitability follows the group almost perfectly.
2. **Numbers:**
   - 21 never-discount states: 29.8% margin, 0 losses.
   - 11 never-full-price states: 30.8% of sales, **−13.9% margin, 93.3% of all losses**, negative every year (−11.4% → −16.4%).
   - State discount vs margin: r = −0.97.
3. **Why it's interesting:** it directly answers Q2 and explains *why*. The pattern holds year after year, across sub-categories, and after controlling for product mix.
4. **Visualization:** equal-area tile map of states, colored by margin, with a toggle to color by discount policy. The two maps look almost identical, and that is the point.
5. **Strong enough?** **Yes, core (the centerpiece).**

### Insight 3 — Regions hide the problem (ranking reversal)
1. **Observation:** all four regions are profitable every year, but each contains a loss-making cluster. Remove it and the region ranking flips completely.
2. **Numbers:** Central goes from 7.9% (worst) to **31.1% (best)** without Texas and Illinois; West goes from 14.9% (best) to 18.7% (worst). Texas + Illinois = 49.9% of Central's sales.
3. **Why it's interesting:** a classic aggregation trap. A manager looking at the regional dashboard would never see the problem.
4. **Visualization:** animated transition from 4 region blocks to 49 state tiles, "unfolding" the region.
5. **Strong enough?** **Yes, the opening hook.**

### Insight 4 — Same product, same cost, different state → profit flips sign
1. **Observation:** identical products with identical unit costs are profitable or loss-making depending only on the state's discount.
2. **Numbers:** *Avery Durable Slant Ring Binders* (list $3.98, unit cost $2.11, full-price margin 47%):
   - 47% margin in Georgia, Kentucky, Michigan (0% off)
   - 34% in California, New York (20% off)
   - **−77%** in Arizona, Colorado, Pennsylvania (70% off)
   - **−165%** in Illinois (80% off)

   Similar: *Wilson Jones Leather-Like Binders*: Texas bought 13 units for $22.70 and lost $37.45 on them.
3. **Why it's interesting:** it makes the abstract rule tangible, at the scale of a single $4 binder.
4. **Visualization:** "one product, many prices" unit-economics bar (list price → price paid per state, with the unit-cost line) as a scrolly explainer step.
5. **Strong enough?** **Yes, the explainer moment.**

### Insight 5 — The Binders paradox (best margin, biggest losses)
1. **Observation:** the sub-category with the best full-price economics is the biggest source of losses.
2. **Numbers:**
   - Full-price margin 47.8%, but −$38.5k gross losses (#1 of all sub-categories), 100% from never-full-price states at 70–80% off.
   - Margin by policy group: 47.9% / 38.5% / −106.6%.
   - Texas · Binders: $9,043 sales → −$14,705 profit.
3. **Why it's interesting:** it breaks the intuition that "low-margin products cause losses", which is exactly what Q1 is probing.
4. **Visualization:** State × Sub-Category heatmap (the Binders column is deep red only in the cluster states), plus the break-even ladder.
5. **Strong enough?** **Yes, key supporting evidence for Q1.**

### Insight 6 — High sales ≠ high profit (products and places)
1. **Observation:** the biggest sellers are not the biggest earners, for both sub-categories and states.
2. **Numbers:**
   - Sub-categories: Tables #4 in sales → #17 in profit; Phones #1 in sales → #11 in margin; Chairs #2 → #13 (sales vs margin ρ = −0.58).
   - States: Texas #3 in sales → #49 in profit; Pennsylvania #5 → #47; Ohio #8 → #48.
   - Furniture: 32% of sales but 6% of profit.
3. **Why it's interesting:** it is the judges' explicit ask ("don't just tell me the top seller").
4. **Visualization:** sales-vs-margin bubble scatter (sub-categories or states) with a zero line; or a slope chart from sales rank to profit rank.
5. **Strong enough?** **Yes, supporting.**

### Insight 7 — The discounts don't come with bigger baskets
1. **Observation:** heavily discounting states buy the same amount per order as states that never discount.
2. **Numbers:**
   - Discount vs quantity ρ = −0.001 (p = 0.93).
   - Units per order: 7.90 (never discount) / 7.55 (mixed) / 7.45 (never full price), p = 0.18.
   - List-price value per order: $574 / $558 / $588.
   - Total discount given: **$566,734 = 1.98× net profit**, of which $443k went to the 11 never-full-price states.
3. **Why it's interesting:** it answers the natural objection "maybe the discounts drive volume?". In this data, the baskets are the same size, only cheaper.
4. **Visualization:** a small "same basket, lower price" comparison panel, or a tooltip/annotation, not a main chart.
5. **Strong enough?** **Supporting, with careful wording.** We cannot test whether discounts brought in *more orders or customers* (no market-size data).

### Insight 8 — Shipping mode is a non-factor for profitability
1. **Observation:** margin, order value and discount are statistically indistinguishable across ship modes, and the mode mix is the same everywhere.
2. **Numbers:** margin 12.1–13.9% (overlapping CIs); AOV $447–486; mix-expected margins within 0.6 points of actual; unit cost identical across modes.
3. **Why it's interesting:** an honest, evidence-backed null answer to Q3. It also rules out shipping as an explanation for the geographic losses (mode mix is identical in loss states, p = 0.65).
4. **Visualization:** dot plot with CI whiskers per mode, next to share bars (orders / sales / profit shares nearly identical).
5. **Strong enough?** **Include briefly as "what doesn't explain the losses".** Not a centerpiece.

### Insight 9 — Structural thin-margin products lose even at modest discounts
1. **Observation:** products with thin full-price margins lose money even at modest, "normal" discounts.
2. **Numbers:** Supplies full-price margin 5.1% (electric letter openers), so a 20% discount is already a loss (−2.5% overall). Storage 15.7% loses on 19% of lines, all at 20% off.
3. **Why it's interesting:** it refines Insight 1: the danger zone is "discount > margin", not "big discount".
4. **Visualization:** the same break-even ladder (Supplies' threshold sits at 5%).
5. **Strong enough?** **Minor, but it fits naturally inside the ladder.**

### Insight 10 — Profit is concentrated and fragile
1. **Observation:** a tiny fraction of lines carries a large share of profit.
2. **Numbers:** the top 1% of lines = 47.1% of net profit; Copiers (0.68% of lines) = 19.4% of company profit; one copier model in 5 lines = 8.8%.
3. **Why it's interesting:** a caution against over-reading small sub-categories.
4. **Visualization:** a footnote or tooltip, not a chart.
5. **Strong enough?** **No, context only.**

---

## PHASE 5 — VISUALIZATION IDEAS (concepts only, no code)

Structure the piece as **one guided narrative (scrollytelling, 6–7 steps), then a linked "explore" view** built from the same components.

### V1. Region → State "unfold" tile map (Insights 2 & 3)
- **What the user sees:** 4 region blocks, all colored profitable. On scroll or click, each block splits into its equal-area state tiles, and red clusters appear inside every region.
- **Interaction:** hover a tile for sales, profit, margin, discount policy and its worst sub-category; toggle color between *margin* and *discount policy*.
- **Question answered:** "Are there regions that consistently lose?" → no regions; yes, specific states.
- **Why better than a table or plain chart:** the reversal is a *visual event*. A table shows 4 green numbers and hides it. Equal-area tiles stop Texas and California from dominating by land area and keep DC, RI and DE visible.

### V2. Discount vs Margin state scatter, linked to the map (Insight 2)
- **What the user sees:** 49 bubbles (x = sales-weighted discount, y = margin, size = sales, color = region), a zero-profit line, and a near-perfect downward diagonal (r = −0.97). The three policy groups separate into visible bands.
- **Interaction:** brushing states in the scatter highlights them on the map and vice versa; small states can be hidden (fewer than 30 lines).
- **Question answered:** *why* those states lose.
- **Why better:** the correlation is the whole argument, and a scatter makes it undeniable in one glance. Linking ties "where" to "why".

### V3. Break-even ladder for sub-categories (Insights 1, 5, 9 → Q1)
- **What the user sees:** 17 rows. For each, a vertical tick at the full-price margin (the break-even discount) and dots at each discount level actually used, sized by sales and red past break-even.
  - Binders: threshold at 48%, dots at 70/80%.
  - Tables: threshold 19%, dots at 20–50%.
  - Supplies: threshold 5%, dots at 20%.
  - Paper: threshold 48%, dots only at 0/20%.
- **Interaction:** click a sub-category to recolor the map for that sub-category only (e.g. Binders is profitable everywhere except the cluster); a state filter shows that state's discount schedule on the ladder.
- **Question answered:** which sub-categories drive margin, and why high-margin products still lose.
- **Why better:** a ranked margin bar chart shows *who* but not *why*. The ladder shows the mechanism.

### V4. State × Sub-Category heatmap (drill-down, Insights 2 & 5)
- **What the user sees:** a 49 × 17 grid colored by profit (diverging around zero), with rows grouped by policy cluster (Texas/Illinois, Ohio/Pennsylvania, Arizona/Colorado/Oregon, Florida/N. Carolina/Tennessee). Red blocks form bands in the Binders, Machines and Tables columns.
- **Interaction:** hover a cell for its discount rate, sales, profit and line count; click a cell for its top loss lines.
- **Question answered:** which product × place combinations drive the losses.
- **Why better:** it shows that discount *schedules* are shared by state clusters. This is invisible in any one-dimensional chart.

### V5. "One binder, many prices" explainer (Insight 4)
- **What the user sees:** one product. A fixed unit-cost line and the price paid per state as bars; the part below cost turns red.
- **Interaction:** step through the states, or pick a product from a short list.
- **Question answered:** "How can the same item lose money?"
- **Why better:** it turns a statistical finding into an intuitive unit story. Judges remember a $4 binder.

### V6. Shipping-mode panel (Insight 8 → Q3)
- **What the user sees:** a margin dot plot with CI whiskers for 4 modes (all overlapping), next to 100% bars of orders / sales / profit share (nearly identical shares).
- **Interaction:** minimal; optional filter by policy group to show the same flat pattern holds.
- **Question answered:** does shipping mode matter? No (with the data caveat noted on the panel).
- **Why better:** confidence intervals stop viewers reading noise (13.9% vs 12.1%) as a finding, which a plain bar chart invites.

### V7 (optional). Sales-vs-margin scatter for sub-categories (Insight 6)
Four quadrants: "big and profitable" (Copiers, Accessories, Paper), "big but thin" (Phones, Chairs, Storage), "big and losing" (Tables), "small and rich" (Labels, Envelopes). A compact answer to Q1's "high sales ≠ high profit".

---

## PHASE 6 — FINAL RECOMMENDATION

### A. The 3 strongest insights
1. **Losses have a geographic address.** 11 states never sell at full price. They make 31% of sales but **93% of all losses** (−13.9% margin, negative every year). The 21 states that never discount earn 29.8%. State discount vs margin: **r = −0.97**.
2. **A discount above the product's margin is the only thing that produces a loss.** 1,871 of 1,871 loss lines fit the rule; no full-price line loses. This is why **Binders**, the highest-margin product (47.8%), is the biggest loss source (−$38.5k), and why **Tables** (4th in sales) finish last in profit.
3. **Regions hide it.** All 4 regions are profitable every year. Remove each region's discount cluster and the ranking reverses (Central 7.9% → 31.1%, from worst to best).

### B. The single strongest overall story
> **"Superstore doesn't have a product problem or a region problem. It has a pricing-policy problem with a geographic address."**
> In 11 states nothing is ever sold at full price. There, the same binders, tables and machines that earn 30–48% elsewhere lose money: $98k in total, every year, across most sub-categories. The regional dashboard can't see it, because every region blends one of these states in with profitable neighbors. Shipping mode isn't the explanation, and the discounts don't come with bigger orders. Superstore gave away $567k in discounts, almost twice its entire profit.

It connects all three questions:
- **Q1:** sub-category margins depend on full-price margin vs discount applied.
- **Q2:** geographic losses are the discount clusters.
- **Q3:** shipping is ruled out as an explanation.

### C. The most compelling visualization concept
**"The Discount Map": a linked, scroll-driven view.** Region blocks unfold into an equal-area state tile map (V1). It is linked to the discount-vs-margin scatter (V2), with the break-even ladder (V3) and the State × Sub-Category heatmap (V4) as the drill-down. The "one binder" explainer (V5) sits between "where" and "why".

### D. What the user should see first
One headline figure plus the **region-level map with all four regions profitable**:
> "Every region is profitable. $286k profit on $2.3M sales."

The first interaction ("Split into states") reveals the red clusters, and the second headline lands:
> "11 states produce 93% of the losses."

Opening on the *reassuring* view makes the reveal land.

### E. Interactions to include
1. **Region → State unfold** (scroll or click), the core reveal.
2. **Color toggle: margin ↔ discount policy** on the map. The two maps nearly match, which is the proof.
3. **Linked brushing** between map and scatter.
4. **Click a state** → its sub-category profit bars with that state's discount rate on each bar and a break-even marker.
5. **Sub-category selector** → recolors the map for one sub-category (Binders is the best demo).
6. **Hover tooltips** with sales, profit, margin, discount, lines, and loss years (4/4 etc.) for consistency.
7. **Year stepper** (2014–2017) on the map, used only to show the cluster stays red every year. Keep it light.
8. **"One product, many prices" stepper** for the explainer.

### F. What NOT to include (clutter or weak information)
- **Country** (constant), **Row ID, Order ID, Customer names**, and the **Order-ID prefix** (meaning unknown).
- **A postal-code map** (broken ZIPs, too granular) and a **city choropleth**: 604 cities, most with few lines, and discount is set by state. At most, mark 3–5 big loss cities (Philadelphia, Houston, Chicago) as annotations.
- **Segment analysis** (margins only 11.5% / 13.0% / 14.0%, mix nearly identical): a distraction.
- **Monthly or seasonal sales trends** (real, but unrelated to the profitability story).
- **Ship-days distributions or Sankey diagrams of ship modes.** They imply a flow or effect the data doesn't show. Keep Q3 to one compact panel.
- **Pie or donut charts of category shares; 1,850-product lists; separate unlinked charts per question.**
- **Averages of line-level margins** (always use ΣProfit/ΣSales).
- **The South × Same Day −8.4% "finding"** (one order) and other small-sample combinations.
- **A "discount cap" what-if slider presented as a forecast.** The arithmetic is easy (capping discounts at 30% with *unchanged quantities* would make all 49 states profitable), but it assumes customers would buy the same amount at higher prices, which the data cannot support. If included at all, label it "arithmetic illustration, not a prediction".

### G. Limitations & claims to avoid
1. **The data appears synthetic or rule-generated:**
   - discount is fully determined by State × Sub-Category;
   - unit costs never vary;
   - 97% of customers order into more than one region.

   Present findings as "in this dataset", not as general retail truths.
2. **Correlation vs mechanism.** Given constant unit costs, a discount above a product's margin *arithmetically* produces a loss on that line, so that part is an accounting identity. But you **cannot claim**:
   - that removing discounts would raise profit (demand response is unknown);
   - *why* these states were given discounts (competition, clearance, strategy: not in the data);
   - that the discounts "failed to attract customers". We only see that baskets weren't bigger; there is no data on market size or lost customers.
3. **Shipping.** Profit contains no shipping cost and Sales no shipping fee. **Do not claim faster shipping is "free" or "as profitable"**; only that shipping mode isn't associated with differences in *recorded* profit.
4. **Profit's definition is undocumented** (which costs are included). **Currency is assumed USD.**
5. **Geography most likely describes the order's ship-to location**, not the customer's home. Regions are company-defined, not Census regions. Alaska and Hawaii are absent.
6. **Small samples:**
   - states: Wyoming (1 line), West Virginia (4), North Dakota (7), Maine (8);
   - Copiers (68 lines), Machines (115), Same Day (264 orders).

   Don't rank or headline these by margin.
7. **Heavy tails:** a few lines swing Machines, Copiers and San Antonio. Show line counts in tooltips.
8. **Data hygiene:**
   - 1 duplicate line (−$12, negligible);
   - 32 reused Product IDs (use ID + Name);
   - 4-digit ZIPs (restore leading zeros as text);
   - cp1252 encoding;
   - 7 Order-ID year mismatches.
9. **Only 4 years.** Don't extrapolate trends (e.g. "losses will keep growing").

---

### Files produced
`analysis/data/`:
- `by_subcategory.csv`
- `by_state.csv` (includes policy group)
- `by_city.csv`
- `by_ship_mode.csv`
- `state_x_subcategory.csv` (includes discount rate)
- `state_by_year.csv`
- `by_discount_level.csv`
