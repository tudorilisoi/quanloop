import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DAYS_PER_MONTH,
  DAYS_PER_UNIT,
  DAYS_PER_YEAR,
  calculateCompoundInterest,
  toDays,
} from '../src/lib/compound-interest.ts'

const close = (actual, expected, message) =>
  assert.ok(
    Math.abs(actual - expected) < 0.005,
    `${message}: ${actual} !== ${expected}`,
  )

test('uses a 360-day year convention', () => {
  assert.equal(DAYS_PER_MONTH, 30)
  assert.equal(DAYS_PER_YEAR, 360)
  assert.deepEqual(DAYS_PER_UNIT, { days: 1, months: 30, years: 360 })

  const result = calculateCompoundInterest({
    principal: 1000,
    yearlyInterest: 24,
    daysPassed: 360,
    cutoffDays: 360,
  })

  close(result.balance, 1240, 'one year at 24%')
  close(result.interest, 240, 'one year of interest')
})

test('a 15-day cutoff compounds 1/24 of the yearly rate', () => {
  const result = calculateCompoundInterest({
    principal: 1000,
    yearlyInterest: 24,
    daysPassed: 15,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 1)
  close(result.balance, 1010, '15 days at 24%/year')
  close(result.compoundedInterest, 10, 'compounded')
})

test('compounds every cutoff period with no partial cycle', () => {
  const result = calculateCompoundInterest({
    principal: 10000,
    yearlyInterest: 24,
    daysPassed: 60,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 4)
  assert.equal(result.cutoffDays, 15)
  assert.equal(result.daysSinceLastCycle, 0)
  assert.equal(result.daysToNextCycle, 15)
  close(result.balance, 10000 * Math.pow(1.01, 4), 'balance')
  close(result.interest, result.balance - 10000, 'interest')
  close(result.compoundedInterest, result.balance - 10000, 'compounded')
  close(result.pendingInterest, 0, 'pending')
})

test('adds pro-rata interest for the days after the last cutoff', () => {
  const result = calculateCompoundInterest({
    principal: 10000,
    yearlyInterest: 24,
    daysPassed: 20,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 1)
  assert.equal(result.daysSinceLastCycle, 5)
  assert.equal(result.daysToNextCycle, 10)
  close(result.compoundedInterest, 100, 'compounded')
  close(result.pendingInterest, 10100 * (0.24 / 360) * 5, 'pending')
  close(result.balance, 10133.6666667, 'balance')
  close(result.interest, result.balance - 10000, 'interest')
})

test('returns the principal when no days have passed', () => {
  const result = calculateCompoundInterest({
    principal: 500,
    yearlyInterest: 60,
    daysPassed: 0,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 0)
  assert.equal(result.balance, 500)
  assert.equal(result.interest, 0)
  assert.equal(result.daysToNextCycle, 15)
})

test('supports fractional days', () => {
  const result = calculateCompoundInterest({
    principal: 1000,
    yearlyInterest: 36,
    daysPassed: 10.5,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 0)
  close(result.balance, 1000 + 1000 * 0.001 * 10.5, 'balance')
})

test('converts time units into days', () => {
  assert.equal(toDays(60, 'days'), 60)
  assert.equal(toDays(2, 'months'), 60)
  assert.equal(toDays(1, 'years'), 360)
  assert.equal(toDays(1.5, 'months'), 45)

  // 2 months entered as a value equals 60 days entered directly.
  const inMonths = calculateCompoundInterest({
    principal: 10000,
    yearlyInterest: 24,
    daysPassed: toDays(2, 'months'),
    cutoffDays: 15,
  })
  const inDays = calculateCompoundInterest({
    principal: 10000,
    yearlyInterest: 24,
    daysPassed: 60,
    cutoffDays: 15,
  })

  assert.deepEqual(inMonths, inDays)
})

test('rejects invalid input', () => {
  const valid = {
    principal: 1,
    yearlyInterest: 1,
    daysPassed: 1,
    cutoffDays: 15,
  }

  assert.throws(
    () => calculateCompoundInterest({ ...valid, cutoffDays: 0 }),
    RangeError,
  )
  assert.throws(
    () => calculateCompoundInterest({ ...valid, principal: -1 }),
    RangeError,
  )
  assert.throws(
    () => calculateCompoundInterest({ ...valid, yearlyInterest: -1 }),
    RangeError,
  )
  assert.throws(
    () => calculateCompoundInterest({ ...valid, yearlyInterest: Number.NaN }),
    RangeError,
  )
})
