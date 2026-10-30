import type { BabyCommand, BabyRepository, BabyState } from '../domain/types'
import { BabyError, executeCommand } from '../domain/commands'
import { validImageSource, wheelSettingsError } from '../domain/rules'
import { migrateSnapshot } from './migrate'
import { createDemoState } from '../domain/seed'

export const STORAGE_KEY = 'babystar:family:v1'

export interface LocalStoragePort {
  read: () => unknown
  write: (state: BabyState) => void
}

/** Validate the untrusted storage boundary. Corrupt/future versions are never overwritten. */
function parseState(raw: unknown): BabyState {
  const s = raw as Partial<BabyState> | null
  const arrays = [
    'children',
    'members',
    'tasks',
    'rewards',
    'ledger',
    'orders',
    'scratchActivities',
    'receipts',
  ] as const
  if (
    !s
    || typeof s !== 'object'
    || s.version !== 2
    || arrays.some(k => !Array.isArray(s[k]))
  ) {
    throw new BabyError(
      '本地数据格式不兼容，数据已保留。请勿清理存储，联系开发者处理',
    )
  }
  const state = s as BabyState
  const strings = (value: unknown, keys: string[]) =>
    value !== null
    && typeof value === 'object'
    && keys.every(
      k => typeof (value as Record<string, unknown>)[k] === 'string',
    )
  if (
    !state.children.every(c =>
      strings(c, ['id', 'name', 'birthday', 'avatar']),
    )
    || !state.members.every(
      m =>
        strings(m, ['id', 'name', 'avatar'])
        && ['admin', 'recorder'].includes(m.role),
    )
    || !state.tasks.every(
      t =>
        strings(t, [
          'id',
          'childId',
          'name',
          'icon',
          'category',
          'frequency',
          'reminderTime',
        ])
        && Number.isInteger(t.points)
        && t.points > 0
        && Number.isInteger(t.dailyLimit)
        && t.dailyLimit > 0
        && Array.isArray(t.weekdays),
    )
    || !state.rewards.every(
      r =>
        strings(r, ['id', 'childId', 'name', 'art'])
        && Number.isInteger(r.points)
        && r.points > 0,
    )
    || !state.ledger.every(
      e =>
        strings(e, [
          'id',
          'childId',
          'memberId',
          'memberName',
          'title',
          'kind',
          'createdAt',
        ])
        && Number.isInteger(e.points)
        && Number.isFinite(Date.parse(e.createdAt)),
    )
    || !state.orders.every(
      o =>
        strings(o, [
          'id',
          'childId',
          'name',
          'source',
          'createdAt',
          'memberName',
        ]) && Number.isInteger(o.points),
    )
    || !state.scratchActivities.every(
      a =>
        strings(a, ['id', 'childId', 'name', 'image', 'createdAt'])
        && validImageSource(a.image)
        && [2, 3, 4].includes(a.gridSize)
        && Number.isInteger(a.pointsPerPiece)
        && a.pointsPerPiece >= 1
        && a.pointsPerPiece <= 999
        && Array.isArray(a.pieces)
        && a.pieces.length === a.gridSize ** 2
        && new Set(a.pieces.map(p => p?.index)).size === a.pieces.length
        && a.pieces.every(
          p =>
            p
            && Number.isInteger(p.index)
            && p.index >= 0
            && p.index < a.pieces.length
            && typeof p.revealed === 'boolean'
            && (!p.revealed || typeof p.entryId === 'string')
            && (!p.entryId
              || state.ledger.some(
                e =>
                  e.id === p.entryId
                  && e.kind === 'scratch'
                  && e.childId === a.childId
                  && e.points === -a.pointsPerPiece,
              )),
        )
        && (!a.completedAt || a.pieces.every(p => p.revealed)),
    )
    || (state.legacy !== undefined
      && (!state.legacy
        || !Array.isArray(state.legacy.cards)
        || !state.legacy.cards.every(c =>
          strings(c, ['id', 'childId', 'icon', 'ledgerId']),
        )
        || !Array.isArray(state.legacy.cancelledOrders)
        || !state.legacy.cancelledOrders.every(
          o =>
            strings(o, [
              'id',
              'childId',
              'name',
              'source',
              'createdAt',
              'memberName',
            ])
            && o.status === 'cancelled'
            && Number.isInteger(o.points),
        )))
        || (state.wheelSettings !== undefined && (!Array.isArray(state.wheelSettings)
          || new Set(state.wheelSettings.map(w => w?.childId)).size !== state.wheelSettings.length
          || !state.wheelSettings.every(w => w && state.children.some(c => c.id === w.childId) && !wheelSettingsError(w))))
        || !state.receipts.every(r => strings(r, ['commandId', 'message']))
        || !state.children.some(c => c.id === state.activeChildId)
        || !state.members.some(m => m.id === state.activeMemberId)
  ) {
    throw new BabyError(
      '本地数据校验未通过，原始数据已保留，请勿清理浏览器数据',
    )
  }
  return state
}

/** Serializes writes within the app. Cross-device concurrency belongs to the future API. */
export function createLocalRepository(
  storage: LocalStoragePort,
  clock = () => new Date(),
  random = Math.random,
): BabyRepository {
  let queue: Promise<unknown> = Promise.resolve()
  const loadState = () => {
    const raw = storage.read()
    if (raw === undefined || raw === null || raw === '') {
      const demo = createDemoState(clock())
      storage.write(demo)
      return demo
    }
    const migrated = migrateSnapshot(raw)
    const state = parseState(migrated)
    if (migrated !== raw)
      storage.write(state)
    return state
  }
  return {
    load: async () => loadState(),
    execute(command: BabyCommand) {
      const pending = queue.then(() => {
        const result = executeCommand(loadState(), command, clock(), random)
        storage.write(result.state)
        return result
      })
      queue = pending.catch(() => undefined)
      return pending
    },
  }
}
