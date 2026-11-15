# Compound interest calculator

React + TypeScript + Vite form built with shadcn/ui (Tailwind CSS v4, dark theme).

## Run

```bash
npm install
npm run dev
npm run build
npm test
```

## How the math works

The interest rate is **yearly** (percent per year). It accrues every day at a
pro-rata rate and is capitalized into the balance every `cutoff_days` days. A
year is counted as 360 days (`DAYS_PER_YEAR`) and a month as 30
(`DAYS_PER_MONTH`), so a 15-day cutoff compounds 1/24 of the yearly rate.
Elapsed time can be entered in days, months or years and is converted to days
first (`toDays`, 1 year = 12 × 30 days).

```
yearly_rate   = yearly_interest / 100
daily_rate    = yearly_rate / 360
cycles        = floor(days_passed / cutoff_days)
balance       = principal * (1 + daily_rate * cutoff_days) ^ cycles
pending       = balance * daily_rate * (days_passed % cutoff_days)
final_balance = balance + pending
interest      = final_balance - principal
```

Example: 10 000 at 24 %/year with a 15-day cutoff grows 1 % per cutoff, so
after 60 days it is `10000 * 1.01 ^ 4 = 10 406.04`.

The calculator is a pure function in `src/lib/compound-interest.ts` with no
React or DOM dependency. Form state and handlers live in `src/App.tsx`.

## Behavior

- The balance recalculates on every change of principal, yearly interest, time
  passed or cutoff (cutoff defaults to 15).
- Time passed can be entered in days, months or years using the button group
  under the field; switching units converts the typed value (60 days → 2
  months) and the hint below shows the exact number of days used.
- The results card shows accrued interest (`balance - principal`) and the final
  balance (`principal + interest`) as equal headline figures, followed by the
  multiplier (`balance / principal`, rounded to 2 decimals), the compounded and
  pending interest and the days until the next compounding.
- `current_balance` shows the calculated balance and is editable, but editing it
  does not trigger recalculation. `Calculate` restores the derived value.
- `Reset` returns the form to its defaults.
- The form is serialized to `localStorage` under
  `quanloop:compound-interest-form` 500 ms after the last change and restored
  on page load.
- From the `lg` breakpoint up the results card sits to the right of the form
  (two-column grid, stats stacked); below that it stacks underneath.
- Numeric inputs use native HTML validation (`type="number"`, `min`, `step`,
  `required`), so invalid values block submission before React handles the form.
