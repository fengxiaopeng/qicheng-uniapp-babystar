import type { BabyCommand, BabyState } from './types'
import { describe, expect, it } from 'vitest'
import { createLocalRepository } from '../data/local-repository'
import { executeCommand } from './commands'
import {
  availableCards,
  balance,
  CARD_ICONS,
  completedCount,
  WHEEL_PRIZES,
  wheelRemaining,
} from './rules'
import { createDemoState } from './seed'

const now = new Date('2026-10-29T12:00:00')
const initial = () => createDemoState(now)
function run(state: BabyState, command: BabyCommand, random = () => 0) {
  return executeCommand(state, command, now, random)
}

describe('baby points atomic business transactions', () => {
  it('starts with a consistent demo balance and awards points plus a card exactly once', () => {
    const state = initial()
    expect(balance(state)).toBe(128)
    const command: BabyCommand = {
      id: 'same-id',
      type: 'completeTask',
      taskId: 'reading',
    }
    const first = run(state, command)
    const retry = run(first.state, command)
    expect(balance(retry.state)).toBe(138)
    expect(
      retry.state.cards.filter(c => c.ledgerId === first.receipt.entryId),
    ).toHaveLength(1)
    expect(completedCount(retry.state, 'reading', now)).toBe(1)
    expect(retry.receipt).toEqual(first.receipt)
    expect(balance(state)).toBe(128)
  })

  it('rejects another completion at the daily limit without mutating the snapshot', () => {
    const first = run(initial(), {
      id: 'one',
      type: 'completeTask',
      taskId: 'reading',
    })
    const before = JSON.stringify(first.state)
    expect(() =>
      run(first.state, { id: 'two', type: 'completeTask', taskId: 'reading' }),
    ).toThrow('今天已经完成')
    expect(JSON.stringify(first.state)).toBe(before)
  })

  it('reverses a completion by a compensating entry, removes its card and allows a new completion', () => {
    const first = run(initial(), {
      id: 'one',
      type: 'completeTask',
      taskId: 'reading',
    })
    const reverse = run(first.state, {
      id: 'undo',
      type: 'reverse',
      entryId: first.receipt.entryId!,
      reason: '重复记录',
    })
    expect(balance(reverse.state)).toBe(128)
    expect(
      reverse.state.ledger.some(e => e.id === first.receipt.entryId),
    ).toBe(true)
    expect(
      reverse.state.ledger.find(e => e.reversesId === first.receipt.entryId)
        ?.note,
    ).toBe('重复记录')
    expect(
      reverse.state.cards.some(c => c.ledgerId === first.receipt.entryId),
    ).toBe(false)
    expect(completedCount(reverse.state, 'reading', now)).toBe(0)
    expect(() =>
      run(reverse.state, {
        id: 'undo-again',
        type: 'reverse',
        entryId: first.receipt.entryId!,
        reason: 'again',
      }),
    ).toThrow('已经撤销')
    expect(
      balance(
        run(reverse.state, {
          id: 'new-completion',
          type: 'completeTask',
          taskId: 'reading',
        }).state,
      ),
    ).toBe(138)
  })

  it('retains historical task name and amount when a task is edited', () => {
    const first = run(initial(), {
      id: 'one',
      type: 'completeTask',
      taskId: 'reading',
    })
    const task = { ...first.state.tasks[0], name: '阅读新任务', points: 50 }
    const saved = run(first.state, { id: 'edit', type: 'saveTask', task })
    expect(
      saved.state.ledger.find(e => e.id === first.receipt.entryId),
    ).toMatchObject({ title: '自主阅读20分钟', points: 10 })
  })

  it('checks scheduled weekdays and prevents archived or other-child task completion', () => {
    const state = initial()
    state.tasks[0].frequency = 'custom'
    state.tasks[0].weekdays = [0]
    expect(() =>
      run(state, { id: 'wrong-day', type: 'completeTask', taskId: 'reading' }),
    ).toThrow('今天不需要')
    state.activeChildId = 'milo'
    expect(() =>
      run(state, {
        id: 'wrong-child',
        type: 'completeTask',
        taskId: 'brushing',
      }),
    ).toThrow('今天不需要')
    state.activeChildId = 'dodo'
    state.tasks[1].archived = true
    expect(() =>
      run(state, { id: 'archived', type: 'completeTask', taskId: 'brushing' }),
    ).toThrow('今天不需要')
  })

  it('rejects insufficient balance and refunds a cancelled wish only once', () => {
    expect(() =>
      run(initial(), { id: 'expensive', type: 'redeem', rewardId: 'blocks' }),
    ).toThrow('积分还不够')
    const redeemed = run(initial(), {
      id: 'redeem',
      type: 'redeem',
      rewardId: 'icecream',
    })
    expect(balance(redeemed.state)).toBe(78)
    expect(redeemed.state.orders.at(-1)?.status).toBe('pending')
    const cancelled = run(redeemed.state, {
      id: 'cancel',
      type: 'cancelOrder',
      orderId: 'redeem-order',
      reason: '改变心愿',
    })
    expect(balance(cancelled.state)).toBe(128)
    expect(() =>
      run(cancelled.state, {
        id: 'cancel-twice',
        type: 'cancelOrder',
        orderId: 'redeem-order',
        reason: '再次取消',
      }),
    ).toThrow('只能取消')
  })

  it('cannot cancel an already received reward', () => {
    const redeemed = run(initial(), {
      id: 'redeem',
      type: 'redeem',
      rewardId: 'icecream',
    })
    const received = run(redeemed.state, {
      id: 'receive',
      type: 'receiveOrder',
      orderId: 'redeem-order',
    })
    expect(() =>
      run(received.state, {
        id: 'cancel',
        type: 'cancelOrder',
        orderId: 'redeem-order',
        reason: 'late',
      }),
    ).toThrow('只能取消')
  })

  it('persists every wheel result, charges misses, enforces daily limits and restores the next day', () => {
    let state = initial()
    for (let i = 0; i < 3; i++)
      state = run(state, { id: `spin-${i}`, type: 'spin' }, () => 0.3).state
    expect(balance(state)).toBe(98)
    expect(state.ledger.filter(e => e.kind === 'spin')).toHaveLength(3)
    expect(state.orders).toHaveLength(1) // Only the original demo order: .3 is the miss sector.
    expect(wheelRemaining(state, now)).toBe(0)
    expect(() => run(state, { id: 'fourth', type: 'spin' })).toThrow(
      '机会用完',
    )
    expect(wheelRemaining(state, new Date('2026-10-30T12:00:00'))).toBe(3)
  })

  it('matches displayed wheel probabilities and never refunds a consumed draw fee', () => {
    expect(WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0)).toBe(100)
    const spin = run(initial(), { id: 'spin', type: 'spin' }, () => 0)
    expect(spin.receipt.prizeIndex).toBe(0)
    expect(spin.state.orders.at(-1)?.name).toBe(WHEEL_PRIZES[0].name)
    const cancelled = run(spin.state, {
      id: 'cancel',
      type: 'cancelOrder',
      orderId: 'spin-order',
      reason: '不需要贴纸',
    })
    expect(balance(cancelled.state)).toBe(118)
    expect(wheelRemaining(cancelled.state, now)).toBe(2)
  })

  it('requires all six distinct cards, consumes one set without points, and refunds cards on cancellation', () => {
    const state = initial()
    expect(() =>
      run(state, { id: 'missing', type: 'redeemCollection' }),
    ).toThrow('没有集齐')
    const art = run(state, {
      id: 'art',
      type: 'completeTask',
      taskId: 'drawing',
    })
    art.state.tasks.find(t => t.id === 'tidying')!.dailyLimit = 2
    const toys = run(art.state, {
      id: 'toys',
      type: 'completeTask',
      taskId: 'tidying',
    })
    const before = balance(toys.state)
    const redeemed = run(toys.state, {
      id: 'collection',
      type: 'redeemCollection',
    })
    expect(balance(redeemed.state)).toBe(before)
    expect(
      CARD_ICONS.every(
        icon => availableCards(redeemed.state, icon).length === 0,
      ),
    ).toBe(true)
    expect(() =>
      run(redeemed.state, {
        id: 'undo',
        type: 'reverse',
        entryId: art.receipt.entryId!,
        reason: '误记',
      }),
    ).toThrow('卡片已经兑换')
    const cancelled = run(redeemed.state, {
      id: 'cancel',
      type: 'cancelOrder',
      orderId: 'collection-order',
      reason: '改天再去',
    })
    expect(
      CARD_ICONS.every(
        icon => availableCards(cancelled.state, icon).length === 1,
      ),
    ).toBe(true)
  })

  it('rejects normalized invalid birth dates and future birthdays', () => {
    const state = initial()
    const child = { ...state.children[0], birthday: '2020-02-31' }
    expect(() => run(state, { id: 'invalid-date', type: 'saveChild', child })).toThrow('有效的出生日期')
    expect(() => run(state, { id: 'future-date', type: 'saveChild', child: { ...child, birthday: '2027-01-01' } })).toThrow('有效的出生日期')
  })

  it('enforces member permissions and keeps at least one administrator', () => {
    const state = initial()
    expect(() =>
      run(state, {
        id: 'demote',
        type: 'saveMember',
        member: { ...state.members[0], role: 'recorder' },
      }),
    ).toThrow('至少需要')
    state.activeMemberId = 'dad'
    expect(() =>
      run(state, { id: 'edit', type: 'saveTask', task: state.tasks[0] }),
    ).toThrow('管理员')
    expect(() =>
      run(state, {
        id: 'undo',
        type: 'reverse',
        entryId: 'today-toys',
        reason: '误记',
      }),
    ).toThrow('自己记录')
    expect(
      balance(
        run(state, { id: 'record', type: 'completeTask', taskId: 'reading' })
          .state,
      ),
    ).toBe(138)
  })

  it('keeps both child data and historical actor names independent of current selection', () => {
    const state = initial()
    const first = run(state, {
      id: 'record',
      type: 'completeTask',
      taskId: 'reading',
    })
    const switched = run(first.state, {
      id: 'switch',
      type: 'selectChild',
      childId: 'milo',
    })
    expect(balance(switched.state)).toBe(0)
    expect(balance(switched.state, 'dodo')).toBe(138)
    const renamed = run(switched.state, {
      id: 'rename',
      type: 'saveMember',
      member: { ...state.members[0], name: '妈妈新称呼' },
    })
    expect(
      renamed.state.ledger.find(e => e.id === first.receipt.entryId)
        ?.memberName,
    ).toBe('妈妈')
  })
})

describe('local repository persistence boundary', () => {
  function port(raw: unknown = initial()) {
    let saved = raw
    return {
      read: () =>
        saved === undefined ? undefined : JSON.parse(JSON.stringify(saved)),
      write: (s: BabyState) => {
        saved = JSON.parse(JSON.stringify(s))
      },
    }
  }
  it('serializes two competing submissions at a one-per-day limit', async () => {
    const storage = port()
    const repository = createLocalRepository(storage, () => now)
    const results = await Promise.allSettled([
      repository.execute({ id: 'a', type: 'completeTask', taskId: 'reading' }),
      repository.execute({ id: 'b', type: 'completeTask', taskId: 'reading' }),
    ])
    expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected'])
    expect(balance(await repository.load())).toBe(138)
    expect(balance(await createLocalRepository(storage).load())).toBe(138)
  })
  it('does not overwrite unknown versions or malformed storage', async () => {
    const raw = { version: 2, privateData: 'preserve-me' }
    const storage = port(raw)
    await expect(createLocalRepository(storage).load()).rejects.toThrow(
      '不兼容',
    )
    expect(storage.read()).toEqual(raw)
    const malformed = initial()
    malformed.ledger[0].points = Number.NaN
    await expect(createLocalRepository(port(malformed)).load()).rejects.toThrow(
      '校验未通过',
    )
  })
  it('reports storage write failure and does not consume points', async () => {
    const raw = initial()
    const storage = {
      read: () => raw,
      write: () => {
        throw new Error('quota exceeded')
      },
    }
    await expect(
      createLocalRepository(storage).execute({
        id: 'redeem',
        type: 'redeem',
        rewardId: 'icecream',
      }),
    ).rejects.toThrow('quota')
    expect(balance(raw)).toBe(128)
  })
})
