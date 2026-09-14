# Where Prices Fall Below Cost

ENGIVIZ data story on the Superstore dataset. It shows how fixed product economics and state × sub-category discount rules concentrate losses.

React + D3 + Tailwind (Vite). No backend. Every figure is computed from `../dataset/Sample - Superstore.csv`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

## Rebuild the data (optional; the JSON is already committed)

```bash
npm run data       # python scripts/build_data.py  (standard library only)
```

## Production build / deploy

```bash
npm run build      # outputs dist/ (static, relative paths)
npm run preview    # http://localhost:4173
```

`dist/` can be dropped onto any static host (Netlify, Vercel, GitHub Pages, S3).

## Sections
1. **Opening:** sales, profit, margin, and profitable-line gains vs line-level losses.
2. **Mechanism:** every order line plotted as discount vs profit per $1 of list price, plus profit by discount level.
3. **Where:** a state × sub-category matrix of fixed discount rates and loss cells.
4. **What:** line-level losses by sub-category (binding machines, Machines, Tables, Furniture).
5. **Shipping:** recorded margin by ship mode with 95% bootstrap intervals.
6. **Method and data note.**
