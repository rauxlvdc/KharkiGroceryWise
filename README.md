# Kharki's GroceryWise — starter v0.1

A responsive, local-first grocery budgeting web app and installable PWA starter.

## Included
- Responsive dashboard and navigation
- Grocery item CRUD (add, edit, delete)
- Categories and common units
- Automatic price calculation for grams/kg and ml/liter
- Regular per-piece, pack, bottle and can pricing
- Budget, estimated total, remaining balance and category breakdown
- Purchased / to-buy status
- Search and category/status filters
- Local shopping history snapshots
- Browser localStorage persistence
- PWA manifest and service worker for supported browsers

## Run locally
For the simplest preview, open `index.html` in a browser. For PWA installation and offline caching, serve the folder over localhost or HTTPS. For example, with Python installed:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Important notes
- All app data is stored in the current browser on the current device. Clearing browser data may remove it.
- This starter does not have accounts or cloud synchronization.
- Currency is currently Philippine Peso (PHP).
- The demo uses illustrative prices entered by the user; it does not fetch live market prices.
- The font is loaded from Google Fonts when online; system fonts are used as fallback.
