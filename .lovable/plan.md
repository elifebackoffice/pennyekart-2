

## Goal

Two fixes in one pass:

1. Resolve the **build error**: `Cannot find module 'jspdf'` in `SalesReportPage.tsx`.
2. Make **unassigned grocery seller products** impossible to miss in `/admin/products` so the BIRIYANI MASALA situation (created by partner, invisible to all customers, no signal to admin) doesn't silently happen again.

## Verified facts

- `BIRIYANI MASALA ബിരിയാണി മസാല 30g` exists with `is_grocery=true`, `assign_to_all_micro_godowns=false`, **0 rows** in `seller_product_micro_godowns`. So zero customers can see it — by design of the visibility model already shipped.
- Same is true for 4 other grocery products from seller `0605d859…` (Chicken / Garam / Mandhi / Masala Powder).
- The customer hook (`useAreaProducts.tsx`) correctly skips these — no bug there.
- `SalesReportPage.tsx` imports `jspdf` and `jspdf-autotable` but the packages are not in `package.json`, breaking the build.

## Plan

### 1. Fix build error

Add the missing dependencies to `package.json`:
- `jspdf`
- `jspdf-autotable`

(Both are already imported and used in `SalesReportPage.tsx` for PDF export.)

### 2. Admin UX — surface unassigned grocery items

In `src/pages/admin/ProductsPage.tsx` Seller Products tab:

a. **Top-of-tab alert banner** (only renders when count > 0):
   > "⚠️ N grocery product(s) are unassigned and invisible to customers. [Show unassigned]"
   The button sets `sellerGroceryFilter='unassigned_grocery'`.

b. **Auto-sort** unassigned grocery rows to the top of the seller products table, regardless of active filter, so admins always see them first.

c. **Row highlight**: rows where `is_grocery && !assign_to_all_micro_godowns && microGodownCounts[id] === 0` get a soft yellow background + the existing "Unassigned" badge already present.

d. **Tab badge**: add a small red count chip on the "Seller Products" tab trigger showing the unassigned-grocery count, so admins notice it even from the Admin Products tab.

### 3. Notify admin on new grocery seller product (lightweight)

When a selling partner creates a product (via their dashboard or admin form) and the resulting row has `is_grocery=true` with no assignment, no extra DB work needed — the new alert + tab badge in step 2 covers discovery. (No notifications-table insert in scope to keep this small.)

## Files touched

- `package.json` — add `jspdf`, `jspdf-autotable`
- `src/pages/admin/ProductsPage.tsx` — alert banner, row highlight, auto-sort, tab badge

## Verification

1. App builds cleanly (no TS2307).
2. Open `/admin/products` → Seller Products tab → see banner "5 grocery product(s) unassigned…" and BIRIYANI MASALA row at top with yellow highlight + "Unassigned" badge.
3. Click "Show unassigned" → table filters to those 5 rows.
4. Open assign dialog on BIRIYANI MASALA → tick a micro godown → save → row no longer flagged, banner count drops by 1.
5. Customer in the assigned micro godown's ward now sees BIRIYANI MASALA on home/category pages.

