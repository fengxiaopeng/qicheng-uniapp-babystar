import type { BabyState, CardGrant, RewardOrder } from '../domain/types'
import { BabyError } from '../domain/commands'

interface LegacyState
  extends Omit<
    BabyState,
    'version' | 'orders' | 'scratchActivities' | 'legacy'
  > {
  version: 1
  cards: CardGrant[]
  orders: (RewardOrder & { status: 'pending' | 'received' | 'cancelled' })[]
}

/** Preserve the original ledger and archive cancelled exchanges instead of presenting them as completed. */
export function migrateSnapshot(raw: unknown): unknown {
  if (
    !raw
    || typeof raw !== 'object'
    || (raw as { version?: unknown }).version !== 1
  ) {
    return raw
  }
  const previous = raw as LegacyState
  if (
    !Array.isArray(previous.cards)
    || !Array.isArray(previous.orders)
    || !previous.orders.every(
      o => o && ['pending', 'received', 'cancelled'].includes(o.status),
    )
  ) {
    throw new BabyError('旧版数据校验未通过，原数据已保留')
  }
  const { cards, orders, ...rest } = previous
  return {
    ...rest,
    version: 2,
    orders: orders
      .filter(o => o.status !== 'cancelled')
      .map(({ status: _status, ...order }) => order),
    scratchActivities: [],
    legacy: {
      cards,
      cancelledOrders: orders.filter(o => o.status === 'cancelled'),
    },
  }
}
