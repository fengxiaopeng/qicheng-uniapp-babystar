import type { BabyCommand, BabyState, Task } from './types'
import { describe, expect, it } from 'vitest'
import { createLocalRepository } from '../data/local-repository'
import { executeCommand } from './commands'
import {
  balance,
  completedCount,
  isTaskDue,
  WHEEL_PRIZES,
  wheelRemaining,
} from './rules'
import { createDemoState } from './seed'

const now = new Date('2026-10-29T12:00:00')
const initial = () => createDemoState(now)
function run(
  state: BabyState,
  command: BabyCommand,
  date = now,
  random = () => 0,
) {
  return executeCommand(state, command, date, random)
}
function setTask(state: BabyState, changes: Partial<Task>) {
  return run(state, {
    id: 'configure-task',
    type: 'saveTask',
    task: { ...state.tasks[0], ...changes },
  }).state
}
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

describe('task scheduling and points', () => {
  it('records points once for a retry and enforces the daily limit', () => {
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
    expect(retry.receipt).toEqual(first.receipt)
    expect(completedCount(retry.state, 'reading', now)).toBe(1)
    expect(() => run(retry.state, { ...command, id: 'another' })).toThrow(
      '已经完成',
    )
    expect(balance(state)).toBe(128)
  })
  it('reuses a saved daily task on the next day without recreating it', () => {
    const first = run(initial(), {
      id: 'thursday',
      type: 'completeTask',
      taskId: 'reading',
    })
    const tomorrow = new Date('2026-10-30T12:00:00')
    expect(isTaskDue(first.state, first.state.tasks[0], tomorrow)).toBe(true)
    const next = run(
      first.state,
      { id: 'friday', type: 'completeTask', taskId: 'reading' },
      tomorrow,
    )
    expect(balance(next.state)).toBe(148)
    expect(next.state.tasks).toEqual(first.state.tasks)
    expect(completedCount(next.state, 'reading', tomorrow)).toBe(1)
  })
  it('runs an overdue one-time task once and hides it on later days until reversed', () => {
    const state = setTask(initial(), {
      frequency: 'once',
      onceDate: '2026-10-30',
      weekdays: [],
    })
    expect(isTaskDue(state, state.tasks[0], now)).toBe(false)
    const date = new Date('2026-10-31T12:00:00')
    const first = run(
      state,
      { id: 'once', type: 'completeTask', taskId: 'reading' },
      date,
    )
    const later = new Date('2026-11-01T12:00:00')
    expect(isTaskDue(first.state, first.state.tasks[0], later)).toBe(false)
    expect(() =>
      run(
        first.state,
        { id: 'repeat', type: 'completeTask', taskId: 'reading' },
        later,
      ),
    ).toThrow('已经完成')
    const undone = run(
      first.state,
      {
        id: 'undo-once',
        type: 'reverse',
        entryId: first.receipt.entryId!,
        reason: '误记',
      },
      later,
    )
    expect(isTaskDue(undone.state, undone.state.tasks[0], later)).toBe(true)
  })
  it('only schedules weekend tasks on Saturday and Sunday, with independent daily limits', () => {
    const state = setTask(initial(), { frequency: 'weekend', weekdays: [] })
    expect(() =>
      run(state, { id: 'weekday', type: 'completeTask', taskId: 'reading' }),
    ).toThrow('今天不需要')
    const sat = run(
      state,
      { id: 'sat', type: 'completeTask', taskId: 'reading' },
      new Date('2026-10-31T12:00:00'),
    )
    const sun = run(
      sat.state,
      { id: 'sun', type: 'completeTask', taskId: 'reading' },
      new Date('2026-11-01T12:00:00'),
    )
    expect(balance(sun.state)).toBe(148)
  })
  it('accepts hobbies, validates once dates and prevents invalid repetition rules', () => {
    expect(setTask(initial(), { category: '兴趣爱好' }).tasks[0].category).toBe(
      '兴趣爱好',
    )
    expect(() =>
      setTask(initial(), { frequency: 'once', onceDate: '2026-02-31' }),
    ).toThrow('有效执行日期')
    expect(() =>
      setTask(initial(), {
        frequency: 'once',
        onceDate: '2026-11-01',
        dailyLimit: 2,
      }),
    ).toThrow('只能执行一次')
    expect(() =>
      setTask(initial(), { frequency: 'weekly', weekdays: [] }),
    ).toThrow('重复日期')
  })
  it('retains historical task values and reverses by a compensating record', () => {
    const first = run(initial(), {
      id: 'one',
      type: 'completeTask',
      taskId: 'reading',
    })
    const edited = setTask(first.state, { name: '阅读新任务', points: 50 })
    expect(
      edited.ledger.find(e => e.id === first.receipt.entryId),
    ).toMatchObject({ title: '自主阅读20分钟', points: 10 })
    const undone = run(edited, {
      id: 'undo',
      type: 'reverse',
      entryId: first.receipt.entryId!,
      reason: '重复记录',
    })
    expect(balance(undone.state)).toBe(128)
    expect(
      undone.state.ledger.some(e => e.reversesId === first.receipt.entryId),
    ).toBe(true)
    expect(() =>
      run(undone.state, {
        id: 'undo-again',
        type: 'reverse',
        entryId: first.receipt.entryId!,
        reason: '重复',
      }),
    ).toThrow('已经撤销')
  })
  it('prevents cross-child or archived task execution', () => {
    const state = initial()
    state.activeChildId = 'milo'
    expect(() =>
      run(state, {
        id: 'wrong-child',
        type: 'completeTask',
        taskId: 'reading',
      }),
    ).toThrow('今天不需要')
    state.activeChildId = 'dodo'
    state.tasks[0].archived = true
    expect(() =>
      run(state, { id: 'archived', type: 'completeTask', taskId: 'reading' }),
    ).toThrow('今天不需要')
  })
})

describe('immediately completed rewards', () => {
  it('deducts a wish once and creates a completed exchange without statuses', () => {
    expect(() =>
      run(initial(), { id: 'expensive', type: 'redeem', rewardId: 'blocks' }),
    ).toThrow('积分还不够')
    const command: BabyCommand = {
      id: 'redeem',
      type: 'redeem',
      rewardId: 'icecream',
    }
    const first = run(initial(), command)
    const retry = run(first.state, command)
    expect(balance(retry.state)).toBe(78)
    expect(
      retry.state.orders.filter(o => o.id === 'redeem-order'),
    ).toHaveLength(1)
    expect(retry.state.orders.at(-1)).not.toHaveProperty('status')
  })
  it('saves a winning wheel reward immediately and still charges misses and enforces limits', () => {
    expect(WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0)).toBe(100)
    const first = run(initial(), { id: 'win', type: 'spin' })
    expect(first.state.orders.at(-1)).toMatchObject({
      name: WHEEL_PRIZES[0].name,
      source: 'wheel',
    })
    expect(first.state.orders.at(-1)).not.toHaveProperty('status')
    let state = first.state
    for (let i = 0; i < 2; i++) {
      state = run(
        state,
        { id: `miss-${i}`, type: 'spin' },
        now,
        () => 0.3,
      ).state
    }
    expect(balance(state)).toBe(98)
    expect(wheelRemaining(state, now)).toBe(0)
    expect(state.orders).toHaveLength(2)
    expect(() => run(state, { id: 'fourth', type: 'spin' })).toThrow(
      '机会用完',
    )
    expect(wheelRemaining(state, new Date('2026-10-30T12:00:00'))).toBe(3)
  })
})

describe('uploaded image scratch rewards', () => {
  it('charges each tile once, retains paid progress after reloading and blocks unpaid revealing', async () => {
    const storage = port()
    const repository = createLocalRepository(storage, () => now)
    await expect(
      repository.execute({
        id: 'free',
        type: 'revealScratchPiece',
        activityId: 'demo-scratch',
        index: 0,
      }),
    ).rejects.toThrow('先支付')
    await Promise.all([
      repository.execute({
        id: 'buy-a',
        type: 'buyScratchPiece',
        activityId: 'demo-scratch',
        index: 0,
      }),
      repository.execute({
        id: 'buy-b',
        type: 'buyScratchPiece',
        activityId: 'demo-scratch',
        index: 0,
      }),
    ])
    const state = await createLocalRepository(storage).load()
    expect(balance(state)).toBe(118)
    expect(state.scratchActivities[0].pieces[0]).toMatchObject({
      entryId: 'buy-a-entry',
      revealed: false,
    })
    expect(state.ledger.filter(e => e.kind === 'scratch')).toHaveLength(1)
  })
  it('requires every tile, redeems with no additional charge and cannot redeem twice', () => {
    let state = initial()
    expect(() =>
      run(state, {
        id: 'early',
        type: 'redeemScratch',
        activityId: 'demo-scratch',
      }),
    ).toThrow('所有格子')
    for (let index = 0; index < 4; index++) {
      state = run(state, {
        id: `buy-${index}`,
        type: 'buyScratchPiece',
        activityId: 'demo-scratch',
        index,
      }).state
      state = run(state, {
        id: `reveal-${index}`,
        type: 'revealScratchPiece',
        activityId: 'demo-scratch',
        index,
      }).state
    }
    expect(balance(state)).toBe(88)
    const redeemed = run(state, {
      id: 'exchange',
      type: 'redeemScratch',
      activityId: 'demo-scratch',
    })
    expect(balance(redeemed.state)).toBe(88)
    expect(redeemed.state.orders.at(-1)).toMatchObject({
      source: 'collection',
      points: 40,
      image: '/static/baby/park.svg',
    })
    expect(redeemed.state.orders.at(-1)).not.toHaveProperty('status')
    expect(() =>
      run(redeemed.state, {
        id: 'again',
        type: 'redeemScratch',
        activityId: 'demo-scratch',
      }),
    ).toThrow('已经兑换')
  })
  it('rejects insufficient points, invalid tile indices and cross-child purchases without changing balances', () => {
    const state = initial()
    state.scratchActivities[0].pointsPerPiece = 999
    expect(() =>
      run(state, {
        id: 'cost',
        type: 'buyScratchPiece',
        activityId: 'demo-scratch',
        index: 0,
      }),
    ).toThrow('积分还不够')
    expect(() =>
      run(state, {
        id: 'invalid',
        type: 'buyScratchPiece',
        activityId: 'demo-scratch',
        index: -1,
      }),
    ).toThrow('格子不存在')
    state.activeChildId = 'milo'
    expect(() =>
      run(state, {
        id: 'other',
        type: 'buyScratchPiece',
        activityId: 'demo-scratch',
        index: 0,
      }),
    ).toThrow('不存在')
    expect(balance(state, 'dodo')).toBe(128)
  })
  it('only lets admins configure images and rebuilds tile definitions rather than trusting submitted progress', () => {
    const state = initial()
    const activity = {
      ...state.scratchActivities[0],
      id: 'new-image',
      gridSize: 3 as const,
      image: 'data:image/png;base64,aGVsbG8=',
      pieces: [{ index: 0, revealed: true, entryId: 'fake' }],
    }
    const saved = run(state, { id: 'save', type: 'saveScratch', activity })
    expect(saved.state.scratchActivities.at(-1)?.pieces).toHaveLength(9)
    expect(
      saved.state.scratchActivities
        .at(-1)
        ?.pieces
        .every(p => !p.entryId && !p.revealed),
    ).toBe(true)
    state.activeMemberId = 'dad'
    expect(() =>
      run(state, { id: 'not-admin', type: 'saveScratch', activity }),
    ).toThrow('管理员')
    state.activeMemberId = 'mom'
    expect(() =>
      run(state, {
        id: 'url',
        type: 'saveScratch',
        activity: { ...activity, image: 'https://example.com/photo.jpg' },
      }),
    ).toThrow('请选择')
  })
  it('locks image, grid and pricing once a scratch reward has started', () => {
    const state = run(initial(), {
      id: 'buy',
      type: 'buyScratchPiece',
      activityId: 'demo-scratch',
      index: 0,
    }).state
    expect(() =>
      run(state, {
        id: 'edit',
        type: 'saveScratch',
        activity: { ...state.scratchActivities[0], gridSize: 4 },
      }),
    ).toThrow('已经开始')
    expect(balance(state)).toBe(118)
  })
})

describe('family permissions and persistence', () => {
  it('retains the last admin, historical names and independent child balances', () => {
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
    const recorded = run(state, {
      id: 'record',
      type: 'completeTask',
      taskId: 'reading',
    })
    const switched = run(recorded.state, {
      id: 'switch',
      type: 'selectChild',
      childId: 'milo',
    })
    expect(balance(switched.state)).toBe(0)
    expect(balance(switched.state, 'dodo')).toBe(138)
    expect(switched.state.ledger.at(-1)?.memberName).toBe('爸爸')
  })
  it('rejects normalized invalid and future birth dates', () => {
    const state = initial()
    for (const birthday of ['2020-02-31', '2027-01-01']) {
      expect(() =>
        run(state, {
          id: birthday,
          type: 'saveChild',
          child: { ...state.children[0], birthday },
        }),
      ).toThrow('有效的出生日期')
    }
  })
  it('serializes competing task writes and keeps balances after reloading', async () => {
    const storage = port()
    const repository = createLocalRepository(storage, () => now)
    const results = await Promise.allSettled(
      ['a', 'b'].map(id =>
        repository.execute({ id, type: 'completeTask', taskId: 'reading' }),
      ),
    )
    expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected'])
    expect(balance(await createLocalRepository(storage).load())).toBe(138)
  })
  it('migrates v1 without losing points, task schedules or cancelled exchange history', async () => {
    const current = initial()
    const { scratchActivities: _activities, ...base } = current
    const old = {
      ...base,
      version: 1,
      cards: [
        { id: 'card', childId: 'dodo', icon: 'book', ledgerId: 'history-0' },
      ],
      orders: [
        { ...current.orders[0], status: 'pending' },
        { ...current.orders[0], id: 'cancelled', status: 'cancelled' },
      ],
    }
    const storage = port(old)
    const migrated = await createLocalRepository(storage).load()
    expect(migrated.version).toBe(2)
    expect(balance(migrated)).toBe(128)
    expect(migrated.ledger).toEqual(current.ledger)
    expect(migrated.tasks).toEqual(current.tasks)
    expect(migrated.orders).toHaveLength(1)
    expect(migrated.orders[0]).not.toHaveProperty('status')
    expect(migrated.legacy?.cancelledOrders[0].id).toBe('cancelled')
    expect(migrated.legacy?.cards).toHaveLength(1)
    expect(migrated.scratchActivities).toEqual([])
    expect((storage.read() as BabyState).version).toBe(2)
    expect(await createLocalRepository(storage).load()).toEqual(migrated)
  })
  it('preserves corrupt and future snapshots instead of overwriting them', async () => {
    const raw = { version: 3, preserve: 'family-data' }
    const storage = port(raw)
    await expect(createLocalRepository(storage).load()).rejects.toThrow(
      '不兼容',
    )
    expect(storage.read()).toEqual(raw)
    const invalid = initial()
    invalid.ledger[0].points = Number.NaN
    await expect(createLocalRepository(port(invalid)).load()).rejects.toThrow(
      '校验未通过',
    )
  })
  it('does not consume points when a persistent write fails', async () => {
    const state = initial()
    const storage = {
      read: () => state,
      write: () => {
        throw new Error('quota exceeded')
      },
    }
    await expect(
      createLocalRepository(storage).execute({
        id: 'buy',
        type: 'buyScratchPiece',
        activityId: 'demo-scratch',
        index: 0,
      }),
    ).rejects.toThrow('quota')
    expect(balance(state)).toBe(128)
  })
})
