import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Calculator, RotateCcw, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  calculateCompoundInterest,
  type CompoundInterestResult,
} from '@/lib/compound-interest'

const DEFAULT_CUTOFF_DAYS = '15'

interface FormValues {
  principal: string
  dailyInterest: string
  daysPassed: string
  cutoffDays: string
}

const INITIAL_VALUES: FormValues = {
  principal: '',
  dailyInterest: '',
  daysPassed: '',
  cutoffDays: DEFAULT_CUTOFF_DAYS,
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function calculateFromValues(
  values: FormValues,
): CompoundInterestResult | null {
  const principal = parseNumber(values.principal)
  const dailyInterest = parseNumber(values.dailyInterest)
  const daysPassed = parseNumber(values.daysPassed)
  const cutoffDays = parseNumber(values.cutoffDays)

  if (
    principal === null ||
    dailyInterest === null ||
    daysPassed === null ||
    cutoffDays === null
  ) {
    return null
  }

  if (principal < 0 || dailyInterest < 0 || daysPassed < 0 || cutoffDays < 1) {
    return null
  }

  return calculateCompoundInterest({
    principal,
    dailyInterest,
    daysPassed,
    cutoffDays,
  })
}

interface StatProps {
  label: string
  value: string
  hint?: string
}

function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function App() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  // Manual edit of the derived balance input. It is only valid for the exact
  // set of values it was typed against, so any recalculation discards it.
  const [balanceEdit, setBalanceEdit] = useState<{
    values: FormValues
    text: string
  } | null>(null)

  // Recalculates whenever a form input changes. `balanceEdit` is not a
  // dependency: editing the balance never triggers a recalculation.
  const result = useMemo(() => calculateFromValues(values), [values])
  const calculatedBalance = result
    ? currencyFormatter.format(result.balance)
    : ''
  const balanceInput =
    balanceEdit && balanceEdit.values === values
      ? balanceEdit.text
      : calculatedBalance

  function handleChange(field: keyof FormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setValues((current) => ({ ...current, [field]: value }))
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Native HTML validation blocks submit while any input is invalid.
    event.preventDefault()
    setBalanceEdit(null)
  }

  function handleReset() {
    setValues(INITIAL_VALUES)
    setBalanceEdit(null)
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-56 left-1/4 h-80 w-[32rem] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto w-full max-w-xl">
        <header className="mb-8 space-y-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <TrendingUp
              className="size-3.5 text-emerald-400"
              aria-hidden="true"
            />
            Daily accrual, periodic compounding
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Compound interest calculator
          </h1>
          <p className="text-sm text-muted-foreground">
            Interest accrues every day and is capitalized into the balance at
            each cutoff.
          </p>
        </header>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-border">
              <CardTitle>Investment inputs</CardTitle>
              <CardDescription>
                All values are numbers. Results update as you type.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 pt-(--card-spacing) sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="principal">Principal</Label>
                <Input
                  id="principal"
                  name="principal"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  required
                  placeholder="10000"
                  value={values.principal}
                  onChange={handleChange('principal')}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Amount initially invested.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dailyInterest">Daily interest (%)</Label>
                <Input
                  id="dailyInterest"
                  name="dailyInterest"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.0001"
                  required
                  placeholder="0.1"
                  value={values.dailyInterest}
                  onChange={handleChange('dailyInterest')}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  0.1 means 0.1% of the balance per day.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="daysPassed">Days passed</Label>
                <Input
                  id="daysPassed"
                  name="daysPassed"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  required
                  placeholder="60"
                  value={values.daysPassed}
                  onChange={handleChange('daysPassed')}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Days since the investment started.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cutoffDays">Cutoff (days)</Label>
                <Input
                  id="cutoffDays"
                  name="cutoffDays"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  required
                  value={values.cutoffDays}
                  onChange={handleChange('cutoffDays')}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Interest compounds after this many days.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="currentBalance">Current balance</Label>
                <Input
                  id="currentBalance"
                  name="currentBalance"
                  type="text"
                  inputMode="decimal"
                  value={balanceInput}
                  onChange={(event) =>
                    setBalanceEdit({ values, text: event.target.value })
                  }
                  className="h-9 font-medium tabular-nums"
                />
                <p className="text-xs text-muted-foreground">
                  Calculated from the inputs above. Editing it does not trigger
                  a recalculation.
                </p>
              </div>
            </CardContent>

            <CardFooter className="justify-end gap-3 bg-transparent">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-9 px-3.5"
              >
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                Reset
              </Button>
              <Button type="submit" className="h-9 px-3.5">
                <Calculator data-icon="inline-start" aria-hidden="true" />
                Calculate
              </Button>
            </CardFooter>
          </form>
        </Card>

        <section className="mt-6" aria-live="polite">
          <Card>
            <CardHeader>
              <CardDescription>Accrued compound interest</CardDescription>
              <CardTitle className="text-3xl tabular-nums text-emerald-400">
                {result ? currencyFormatter.format(result.interest) : '—'}
              </CardTitle>
              <CardDescription>
                {result
                  ? `${numberFormatter.format(result.cycles)} full ${
                      result.cycles === 1 ? 'cycle' : 'cycles'
                    } of ${numberFormatter.format(result.cutoffDays)} ${
                      result.cutoffDays === 1 ? 'day' : 'days'
                    }`
                  : 'Fill in every input to see the projection.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Stat
                  label="Balance"
                  value={
                    result ? currencyFormatter.format(result.balance) : '—'
                  }
                  hint="Including pending interest"
                />
                <Stat
                  label="Compounded interest"
                  value={
                    result
                      ? currencyFormatter.format(result.compoundedInterest)
                      : '—'
                  }
                  hint="Already capitalized"
                />
                <Stat
                  label="Pending interest"
                  value={
                    result
                      ? currencyFormatter.format(result.pendingInterest)
                      : '—'
                  }
                  hint="Not compounded yet"
                />
                <Stat
                  label="Next compounding"
                  value={
                    result
                      ? `${numberFormatter.format(result.daysToNextCycle)} ${
                          result.daysToNextCycle === 1 ? 'day' : 'days'
                        }`
                      : '—'
                  }
                  hint="Until the next cutoff"
                />
              </dl>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

export default App
