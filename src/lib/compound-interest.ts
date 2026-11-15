/** Day count convention: one month is treated as 30 days. */
export const DAYS_PER_MONTH = 30

/** Day count convention: one year is treated as twelve 30-day months. */
export const DAYS_PER_YEAR = DAYS_PER_MONTH * 12

/** Units the user can enter the elapsed time in. */
export type TimeUnit = 'days' | 'months' | 'years'

/** Number of days in one unit of {@link TimeUnit}. */
export const DAYS_PER_UNIT: Readonly<Record<TimeUnit, number>> = {
  days: 1,
  months: DAYS_PER_MONTH,
  years: DAYS_PER_YEAR,
}

/** Converts an amount of time expressed in `unit` into days. */
export function toDays(value: number, unit: TimeUnit): number {
  return value * DAYS_PER_UNIT[unit]
}

export interface CompoundInterestInput {
  principal: number
  /** Yearly interest rate, in percent (for example 24 means 24% per year). */
  yearlyInterest: number
  daysPassed: number
  /** Number of days between two compounding events. */
  cutoffDays: number
}

export interface CompoundInterestResult {
  principal: number
  /** Balance after the elapsed days, including not yet compounded interest. */
  balance: number
  /** Total interest accrued: balance minus principal. */
  interest: number
  /** Interest already capitalized into the balance. */
  compoundedInterest: number
  /** Interest accrued since the last compounding event, not yet capitalized. */
  pendingInterest: number
  /** Number of completed compounding cycles. */
  cycles: number
  /** Cutoff length used for the calculation, in days. */
  cutoffDays: number
  /** Days elapsed since the last compounding event. */
  daysSinceLastCycle: number
  /** Days left until the next compounding event. */
  daysToNextCycle: number
}

/**
 * Interest accrues every day at a pro-rata yearly rate (yearly interest spread
 * over {@link DAYS_PER_YEAR} days) and is capitalized into the balance every
 * `cutoffDays` days.
 *
 * One cutoff cycle therefore grows the balance by
 * `yearlyInterest * cutoffDays / DAYS_PER_YEAR` percent.
 *
 * Pure function: no I/O, no mutation, deterministic output for given input.
 */
export function calculateCompoundInterest(
  input: CompoundInterestInput,
): CompoundInterestResult {
  const { principal, yearlyInterest, daysPassed, cutoffDays } = input

  if (
    ![principal, yearlyInterest, daysPassed, cutoffDays].every((value) =>
      Number.isFinite(value),
    )
  ) {
    throw new RangeError(
      'calculateCompoundInterest: all inputs must be finite numbers',
    )
  }

  if (principal < 0 || yearlyInterest < 0 || daysPassed < 0) {
    throw new RangeError(
      'calculateCompoundInterest: principal, yearlyInterest and daysPassed must not be negative',
    )
  }

  if (cutoffDays < 1) {
    throw new RangeError(
      'calculateCompoundInterest: cutoffDays must be at least 1',
    )
  }

  const yearlyRate = yearlyInterest / 100
  const dailyRate = yearlyRate / DAYS_PER_YEAR
  const cycles = Math.floor(daysPassed / cutoffDays)
  const daysSinceLastCycle = daysPassed % cutoffDays

  const balanceAfterCycles =
    principal * Math.pow(1 + dailyRate * cutoffDays, cycles)
  const compoundedInterest = balanceAfterCycles - principal
  const pendingInterest = balanceAfterCycles * dailyRate * daysSinceLastCycle

  return {
    principal,
    balance: balanceAfterCycles + pendingInterest,
    interest: balanceAfterCycles + pendingInterest - principal,
    compoundedInterest,
    pendingInterest,
    cycles,
    cutoffDays,
    daysSinceLastCycle,
    daysToNextCycle: cutoffDays - daysSinceLastCycle,
  }
}

