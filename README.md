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

Interest accrues daily on the current balance. Every `cutoff_days` days the
accrued interest is capitalized into the balance.

```
cycles        = floor(days_passed / cutoff_days)
balance       = principal * (1 + daily_rate * cutoff_days) ^ cycles
pending       = balance * daily_rate * (days_passed % cutoff_days)
final_balance = balance + pending
interest      = final_balance - principal
```

`daily_rate` is `daily_interest / 100`.

The calculator is a pure function in `src/lib/compound-interest.ts` with no
React or DOM dependency. Form state and handlers live in `src/App.tsx`.

## Behavior

- The balance recalculates on every change of principal, daily interest, days
  passed or cutoff (cutoff defaults to 15).
- `current_balance` shows the calculated balance and is editable, but editing it
  does not trigger recalculation. `Calculate` restores the derived value.
- `Reset` returns the form to its defaults.
- Numeric inputs use native HTML validation (`type="number"`, `min`, `step`,
  `required`), so invalid values block submission before React handles the form.
