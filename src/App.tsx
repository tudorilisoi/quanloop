import { useEffect, useMemo, useState } from 'react'
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
  DAYS_PER_MONTH,
  DAYS_PER_UNIT,
  DAYS_PER_YEAR,
  calculateCompoundInterest,
  toDays,
  type CompoundInterestResult,
  type TimeUnit,
} from '@/lib/compound-interest'

const STORAGE_KEY = 'quanloop:compound-interest-form'

/** How long the form has to stay untouched before it is saved. */
const SAVE_DEBOUNCE_MS = 500

const DEFAULT_CUTOFF_DAYS = '15'

const TIME_UNIT_OPTIONS: { value: TimeUnit; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
]

const DAYS_PLACEHOLDER: Record<TimeUnit, string> = {
  days: '60',
  months: '2',
  years: '1',
}

/** Trims float noise so unit conversions stay readable in the input. */
function formatUnitValue(value: number): string {
  return String(Math.round(value * 100) / 100)
}

interface FormValues {
  principal: string
  yearlyInterest: string
  daysPassed: string
  cutoffDays: string
}

const INITIAL_VALUES: FormValues = {
  principal: '',
  yearlyInterest: '',
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
  unit: TimeUnit,
): CompoundInterestResult | null {
  const principal = parseNumber(values.principal)
  const yearlyInterest = parseNumber(values.yearlyInterest)
  const timePassed = parseNumber(values.daysPassed)
  const cutoffDays = parseNumber(values.cutoffDays)

  if (
    principal === null ||
    yearlyInterest === null ||
    timePassed === null ||
    cutoffDays === null
  ) {
    return null
  }

  if (
    principal < 0 ||
    yearlyInterest < 0 ||
    timePassed < 0 ||
    cutoffDays < 1
  ) {
    return null
  }

  return calculateCompoundInterest({
    principal,
    yearlyInterest,
    daysPassed: toDays(timePassed, unit),
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

interface UnitSelectorProps {
  value: TimeUnit
  onChange: (unit: TimeUnit) => void
}

function UnitSelector({ value, onChange }: UnitSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Time unit"
      className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/30 p-1"
    >
      {TIME_UNIT_OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className="h-7 text-xs font-medium"
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}

function App() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('days')
  // Manual edit of the derived balance input. It is only valid for the exact
  // set of values it was typed against, so any recalculation discards it.
  const [balanceEdit, setBalanceEdit] = useState<{
    values: FormValues
    text: string
  } | null>(null)

  // Restore the form saved during the previous visit.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return
    }

    try {
      const saved = JSON.parse(stored) as {
        values: FormValues
        timeUnit: TimeUnit
      }
      // Merge over the defaults so older payloads (e.g. one saved before the
      // monthly → yearly rate switch) cannot leave fields undefined.
      setValues({ ...INITIAL_VALUES, ...saved.values })
      setTimeUnit(saved.timeUnit)
    } catch {
      // Unreadable state: keep the defaults.
    }
  }, [])

  // Debounced save: every edit restarts the timer, so the form is only written
  // once the inputs have been left alone for `SAVE_DEBOUNCE_MS`.
  useEffect(() => {
    const timer = setTimeout(() => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ values, timeUnit }),
      )
    }, SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [values, timeUnit])

  // Recalculates whenever a form input changes. `balanceEdit` is not a
  // dependency: editing the balance never triggers a recalculation.
  const result = useMemo(
    () => calculateFromValues(values, timeUnit),
    [values, timeUnit],
  )
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

  // Switching the unit converts the typed time so the duration stays the same
  // (60 days -> 2 months). Values that do not convert cleanly are rounded to
  // two decimals; the input hint always shows the exact day equivalent.
  function handleUnitChange(nextUnit: TimeUnit) {
    if (nextUnit === timeUnit) {
      return
    }

    setValues((current) => {
      const parsed = parseNumber(current.daysPassed)
      if (parsed === null) {
        return current
      }

      const days = toDays(parsed, timeUnit)
      return {
        ...current,
        daysPassed: formatUnitValue(days / DAYS_PER_UNIT[nextUnit]),
      }
    })
    setTimeUnit(nextUnit)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Native HTML validation blocks submit while any input is invalid.
    event.preventDefault()
    setBalanceEdit(null)
  }

  function handleReset() {
    setValues(INITIAL_VALUES)
    setTimeUnit('days')
    setBalanceEdit(null)
  }

  const timePassed = parseNumber(values.daysPassed)
  const daysPreview = timePassed === null ? null : toDays(timePassed, timeUnit)

  return (
    <div className="relative min-h-svh overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-56 left-1/4 h-80 w-[32rem] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto w-full max-w-xl lg:max-w-5xl">
        <header className="mb-8 space-y-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <TrendingUp
              className="size-3.5 text-emerald-400"
              aria-hidden="true"
            />
            Yearly rate, periodic compounding
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Compound interest calculator
          </h1>
          <p className="text-sm text-muted-foreground">
            The yearly rate accrues daily and is capitalized into the balance at
            each cutoff.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
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
                  <Label htmlFor="yearlyInterest">Yearly interest (%)</Label>
                  <Input
                    id="yearlyInterest"
                    name="yearlyInterest"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    required
                    placeholder="24"
                    value={values.yearlyInterest}
                    onChange={handleChange('yearlyInterest')}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    24 means 24% per year, accrued daily over a 360-day year.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="daysPassed">Time passed</Label>
                  <Input
                    id="daysPassed"
                    name="daysPassed"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    required
                    placeholder={DAYS_PLACEHOLDER[timeUnit]}
                    value={values.daysPassed}
                    onChange={handleChange('daysPassed')}
                    className="h-9"
                  />
                  <UnitSelector value={timeUnit} onChange={handleUnitChange} />
                  <p className="text-xs text-muted-foreground">
                    {daysPreview === null
                      ? `1 month = ${DAYS_PER_MONTH} days · 1 year = ${DAYS_PER_YEAR} days.`
                      : `= ${numberFormatter.format(daysPreview)} ${
                          daysPreview === 1 ? 'day' : 'days'
                        } · 1 month = ${DAYS_PER_MONTH} days.`}
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

          <section aria-live="polite">
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
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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
        </div>
      </main>
    </div>
  )
}

export default App
