import type { BabyState, WheelSettings } from './types'
import { describe, expect, it } from 'vitest'
import { createLocalRepository } from '../data/local-repository'
import { executeCommand } from './commands'
import {
  balance,
  defaultWheelSettings,
  percentToBasisPoints,
  probabilityLabel,
  wheelRemaining,
  wheelSettingsFor,
} from './rules'
import { createDemoState } from './seed'

const now = new Date('2026-10-30T12:00:00')
function save(state: BabyState, settings: WheelSettings, id = 'save') {
  return executeCommand(state, { id, type: 'saveWheel', settings }, now).state
}
function draw(state: BabyState, value: number, id = 'draw') {
  return executeCommand(state, { id, type: 'spin' }, now, () => value)
}
function custom() {
  const settings = defaultWheelSettings('dodo')
  settings.probabilityMode = 'custom'
  settings.prizes = settings.prizes
    .slice(0, 3)
    .map((p, i) => ({ ...p, weight: [0, 6000, 4000][i], win: true }))
  return settings
}

describe('per-child wheel settings', () => {
  it('uses equal defaults for existing snapshots without changing the ledger', () => {
    const state = createDemoState(now)
    expect(state.wheelSettings).toBeUndefined()
    const before = JSON.stringify(state)
    const settings = wheelSettingsFor(state)
    expect(settings.probabilityMode).toBe('equal')
    expect(settings.prizes.every(p => p.weight === 1)).toBe(true)
    for (let index = 0; index < settings.prizes.length; index++) {
      const outcome = draw(state, (index + 0.5) / settings.prizes.length)
      expect(outcome.receipt.prizeIndex).toBe(index)
    }
    expect(JSON.stringify(state)).toBe(before)
  })
  it('parses decimal percentages without silently rounding or accepting invalid inputs', () => {
    expect(percentToBasisPoints('16.67')).toBe(1667)
    expect(percentToBasisPoints('100.00')).toBe(10000)
    expect(percentToBasisPoints('0')).toBe(0)
    for (const input of ['', '-1', 'NaN', '2e1', '0.001', '100.01'])
      expect(percentToBasisPoints(input)).toBeNull()
  })
  it('rejects totals above or below 100 percent and duplicate or missing prize definitions', () => {
    const state = createDemoState(now)
    for (const last of [3999, 4001]) {
      const settings = custom()
      settings.prizes[2].weight = last
      expect(() => save(state, settings)).toThrow('合计必须为100%')
    }
    const duplicate = custom()
    duplicate.prizes[2].id = duplicate.prizes[1].id
    expect(() => save(state, duplicate)).toThrow('不能重复')
    const blank = custom()
    blank.prizes[0].name = ' '
    expect(() => save(state, blank)).toThrow('奖项名称')
    const tooFew = custom()
    tooFew.prizes = tooFew.prizes.slice(0, 1)
    expect(() => save(state, tooFew)).toThrow('2–8')
  })
  it('draws from custom weights, skips zero percent prizes and respects boundary values', () => {
    const state = save(createDemoState(now), custom())
    expect(draw(state, 0).receipt.prizeIndex).toBe(1)
    expect(draw(state, 0.599999).receipt.prizeIndex).toBe(1)
    expect(draw(state, 0.6).receipt.prizeIndex).toBe(2)
    expect(draw(state, 0.999999).receipt.prizeIndex).toBe(2)
    expect(probabilityLabel(wheelSettingsFor(state).prizes, 0)).toBe('0%')
    expect(probabilityLabel(wheelSettingsFor(state).prizes, 1)).toBe('60%')
  })
  it('normalizes equal mode after adding or removing prizes', () => {
    const settings = defaultWheelSettings('dodo')
    settings.prizes = settings.prizes
      .slice(0, 4)
      .map(p => ({ ...p, weight: 88 }))
    const state = save(createDemoState(now), settings)
    expect(wheelSettingsFor(state).prizes.map(p => p.weight)).toEqual([
      1,
      1,
      1,
      1,
    ])
    expect(probabilityLabel(wheelSettingsFor(state).prizes, 0)).toBe('25%')
    expect(draw(state, 0.875).receipt.prizeIndex).toBe(3)
  })
  it('enforces admin access and separates settings for different children', () => {
    const state = createDemoState(now)
    state.activeMemberId = 'dad'
    expect(() => save(state, custom())).toThrow('管理员')
    state.activeMemberId = 'mom'
    state.activeChildId = 'milo'
    expect(() => save(state, custom())).toThrow('不属于当前宝宝')
    const dodo = save(createDemoState(now), custom())
    dodo.activeChildId = 'milo'
    expect(wheelSettingsFor(dodo).probabilityMode).toBe('equal')
    const milo = save(dodo, { ...custom(), childId: 'milo' }, 'milo-settings')
    expect(milo.wheelSettings).toHaveLength(2)
    expect(wheelSettingsFor(milo, 'dodo').probabilityMode).toBe('custom')
  })
  it('freezes the actual result layout and preserves completed rewards after later edits', () => {
    const state = save(createDemoState(now), custom())
    const first = draw(state, 0.1)
    const snapshot = JSON.stringify(first.receipt.wheelPrizes)
    const nextSettings = custom()
    nextSettings.prizes[1].name = '换一个新奖品'
    const edited = save(first.state, nextSettings, 'edit')
    expect(
      JSON.stringify(
        edited.receipts.find(r => r.commandId === 'draw')?.wheelPrizes,
      ),
    ).toBe(snapshot)
    expect(edited.orders.at(-1)?.name).toBe(custom().prizes[1].name)
    expect(wheelRemaining(edited, now)).toBe(2)
    expect(balance(edited)).toBe(118)
  })
  it('persists settings and rejects corrupt probability snapshots without overwriting them', async () => {
    let saved = save(createDemoState(now), custom())
    const storage = {
      read: () => JSON.parse(JSON.stringify(saved)),
      write: (next: BabyState) => {
        saved = next
      },
    }
    const restored = await createLocalRepository(storage).load()
    expect(wheelSettingsFor(restored).prizes[1].weight).toBe(6000)
    saved.wheelSettings![0].prizes[1].weight = 9000
    await expect(createLocalRepository(storage).load()).rejects.toThrow(
      '校验未通过',
    )
    expect(saved.wheelSettings![0].prizes[1].weight).toBe(9000)
  })
})
