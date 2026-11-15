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

test('uses a 30-day month convention', () => {
  assert.equal(DAYS_PER_MONTH, 30)
  assert.equal(DAYS_PER_YEAR, 360)
  assert.deepEqual(DAYS_PER_UNIT, { days: 1, months: 30, years: 360 })

  const result = calculateCompoundInterest({
    principal: 1000,
    monthlyInterest: 2,
    daysPassed: 30,
    cutoffDays: 30,
  })

  close(result.balance, 1020, 'one month at 2%')
  close(result.interest, 20, 'one month of interest')
})

test('a 15-day cutoff compounds half of the monthly rate', () => {
  const result = calculateCompoundInterest({
    principal: 1000,
    monthlyInterest: 2,
    daysPassed: 15,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 1)
  close(result.balance, 1010, 'half month at 2%')
  close(result.compoundedInterest, 10, 'compounded')
})

test('compounds every cutoff period with no partial cycle', () => {
  const result = calculateCompoundInterest({
    principal: 10000,
    monthlyInterest: 2,
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
    monthlyInterest: 2,
    daysPassed: 20,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 1)
  assert.equal(result.daysSinceLastCycle, 5)
  assert.equal(result.daysToNextCycle, 10)
  close(result.compoundedInterest, 100, 'compounded')
  close(result.pendingInterest, 10100 * (0.02 / 30) * 5, 'pending')
  close(result.balance, 10133.6666667, 'balance')
  close(result.interest, result.balance - 10000, 'interest')
})

test('returns the principal when no days have passed', () => {
  const result = calculateCompoundInterest({
    principal: 500,
    monthlyInterest: 5,
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
    monthlyInterest: 3,
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
    monthlyInterest: 2,
    daysPassed: toDays(2, 'months'),
    cutoffDays: 15,
  })
  const inDays = calculateCompoundInterest({
    principal: 10000,
    monthlyInterest: 2,
    daysPassed: 60,
    cutoffDays: 15,
  })

  assert.deepEqual(inMonths, inDays)
})

test('rejects invalid input', () => {
  const valid = {
    principal: 1,
    monthlyInterest: 1,
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
    () => calculateCompoundInterest({ ...valid, monthlyInterest: -1 }),
    RangeError,
  )
  assert.throws(
    () => calculateCompoundInterest({ ...valid, monthlyInterest: Number.NaN }),
    RangeError,
  )
})
