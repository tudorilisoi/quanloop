import assert from 'node:assert/strict'
import { test } from 'node:test'

import { calculateCompoundInterest } from '../src/lib/compound-interest.ts'

const close = (actual, expected, message) =>
  assert.ok(
    Math.abs(actual - expected) < 0.005,
    `${message}: ${actual} !== ${expected}`,
  )

test('compounds every cutoff period with no partial cycle', () => {
  const result = calculateCompoundInterest({
    principal: 10000,
    dailyInterest: 0.1,
    daysPassed: 60,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 4)
  assert.equal(result.cutoffDays, 15)
  assert.equal(result.daysSinceLastCycle, 0)
  assert.equal(result.daysToNextCycle, 15)
  close(result.balance, 10000 * Math.pow(1.015, 4), 'balance')
  close(result.interest, result.balance - 10000, 'interest')
  close(result.compoundedInterest, result.balance - 10000, 'compounded')
  close(result.pendingInterest, 0, 'pending')
})

test('adds simple interest for the days after the last cutoff', () => {
  const result = calculateCompoundInterest({
    principal: 10000,
    dailyInterest: 0.1,
    daysPassed: 20,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 1)
  assert.equal(result.daysSinceLastCycle, 5)
  assert.equal(result.daysToNextCycle, 10)
  close(result.compoundedInterest, 150, 'compounded')
  close(result.pendingInterest, 10150 * 0.001 * 5, 'pending')
  close(result.balance, 10200.75, 'balance')
})

test('returns the principal when no days have passed', () => {
  const result = calculateCompoundInterest({
    principal: 500,
    dailyInterest: 1,
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
    dailyInterest: 0.5,
    daysPassed: 10.5,
    cutoffDays: 15,
  })

  assert.equal(result.cycles, 0)
  close(result.balance, 1000 + 1000 * 0.005 * 10.5, 'balance')
})

test('rejects invalid input', () => {
  const valid = {
    principal: 1,
    dailyInterest: 1,
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
    () => calculateCompoundInterest({ ...valid, dailyInterest: Number.NaN }),
    RangeError,
  )
})
