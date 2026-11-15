export interface CompoundInterestInput {
  principal: number
  /** Daily interest rate, in percent (for example 0.1 means 0.1% per day). */
  dailyInterest: number
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
 * Interest accrues daily (simple interest on the current balance) and is
 * capitalized into the balance every `cutoffDays` days.
 *
 * Pure function: no I/O, no mutation, deterministic output for given input.
 */
export function calculateCompoundInterest(
  input: CompoundInterestInput,
): CompoundInterestResult {
  const { principal, dailyInterest, daysPassed, cutoffDays } = input

  if (
    ![principal, dailyInterest, daysPassed, cutoffDays].every((value) =>
      Number.isFinite(value),
    )
  ) {
    throw new RangeError(
      'calculateCompoundInterest: all inputs must be finite numbers',
    )
  }

  if (principal < 0 || dailyInterest < 0 || daysPassed < 0) {
    throw new RangeError(
      'calculateCompoundInterest: principal, dailyInterest and daysPassed must not be negative',
    )
  }

  if (cutoffDays < 1) {
    throw new RangeError(
      'calculateCompoundInterest: cutoffDays must be at least 1',
    )
  }

  const dailyRate = dailyInterest / 100
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
