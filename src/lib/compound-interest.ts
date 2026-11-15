/** Day count convention: one month is treated as 30 days. */
export const DAYS_PER_MONTH = 30

export interface CompoundInterestInput {
  principal: number
  /** Monthly interest rate, in percent (for example 2 means 2% per month). */
  monthlyInterest: number
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
 * Interest accrues every day at a pro-rata monthly rate (monthly interest
 * spread over {@link DAYS_PER_MONTH} days) and is capitalized into the balance
 * every `cutoffDays` days.
 *
 * One cutoff cycle therefore grows the balance by
 * `monthlyInterest * cutoffDays / DAYS_PER_MONTH` percent.
 *
 * Pure function: no I/O, no mutation, deterministic output for given input.
 */
export function calculateCompoundInterest(
  input: CompoundInterestInput,
): CompoundInterestResult {
  const { principal, monthlyInterest, daysPassed, cutoffDays } = input

  if (
    ![principal, monthlyInterest, daysPassed, cutoffDays].every((value) =>
      Number.isFinite(value),
    )
  ) {
    throw new RangeError(
      'calculateCompoundInterest: all inputs must be finite numbers',
    )
  }

  if (principal < 0 || monthlyInterest < 0 || daysPassed < 0) {
    throw new RangeError(
      'calculateCompoundInterest: principal, monthlyInterest and daysPassed must not be negative',
    )
  }

  if (cutoffDays < 1) {
    throw new RangeError(
      'calculateCompoundInterest: cutoffDays must be at least 1',
    )
  }

  const monthlyRate = monthlyInterest / 100
  const dailyRate = monthlyRate / DAYS_PER_MONTH
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

