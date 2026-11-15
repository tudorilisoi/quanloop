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

The interest rate is **monthly** (percent per month). It accrues every day at a
pro-rata rate and is capitalized into the balance every `cutoff_days` days. A
month is counted as 30 days (`DAYS_PER_MONTH`), so a 15-day cutoff compounds
half of the monthly rate.

```
monthly_rate  = monthly_interest / 100
daily_rate    = monthly_rate / 30
cycles        = floor(days_passed / cutoff_days)
balance       = principal * (1 + daily_rate * cutoff_days) ^ cycles
pending       = balance * daily_rate * (days_passed % cutoff_days)
final_balance = balance + pending
interest      = final_balance - principal
```

Example: 10 000 at 2 %/month with a 15-day cutoff grows 1 % per cutoff, so
after 60 days it is `10000 * 1.01 ^ 4 = 10 406.04`.

The calculator is a pure function in `src/lib/compound-interest.ts` with no
React or DOM dependency. Form state and handlers live in `src/App.tsx`.

## Behavior

- The balance recalculates on every change of principal, monthly interest, days
  passed or cutoff (cutoff defaults to 15).
- `current_balance` shows the calculated balance and is editable, but editing it
  does not trigger recalculation. `Calculate` restores the derived value.
- `Reset` returns the form to its defaults.
- Numeric inputs use native HTML validation (`type="number"`, `min`, `step`,
  `required`), so invalid values block submission before React handles the form.
