# Baby Tracker V8 No-Cache Recovery
- Fixes GitHub Pages working differently from local.
- Uses new asset names to bypass old cache.
- Unregisters old service workers and clears old Baby Tracker caches.
- Keeps localStorage records on the same device/browser.

- V9: Pump Milk quick amounts changed to 10, 20, 30, 40, 50, and 60 ml.

- V10: Pumped Milk now means the amount of expressed breast milk given to the baby, not the amount pumped.

- V11: Fixed “Time since last feeding started.”
- The app identifies the most recently completed feeding, then counts from that feeding's start time.
- Example: a 40-minute breast feed saved at 9:40 starts at 9:00, so at 10:00 it displays 1 hr, not 20 min.

## V12
- Recent Records appears before Calendar Day Statistics.
- Recent Records shows only the rolling past 24 hours.
- CSV export still includes all historical records.
- Breast Feed uses end time for last-feed timing and statistics.
- Pumped Milk updates last-feed timing.
