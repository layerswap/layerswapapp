---
"@layerswap/widget": patch
---

Speed up the route picker with large route lists: balance-based sorting uses indexed lookups instead of scanning each network's balances inside sort comparators, the picker list is only built while the picker is open, it no longer rebuilds on balance-store updates that don't change any balances, search input stays responsive while results update, and visible rows no longer re-render on every scroll step.
