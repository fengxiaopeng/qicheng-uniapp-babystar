import type { BabyState, Task, TaskIcon, WheelPrize } from './types'

export const CARD_ICONS: TaskIcon[] = [
  'book',
  'brush',
  'ball',
  'plant',
  'art',
  'blocks',
]
export const ICON_LABELS: Record<TaskIcon, string> = {
  book: '小小阅读家',
  brush: '洁牙小卫士',
  ball: '活力运动员',
  plant: '自然观察员',
  art: '创意小画家',
  blocks: '整理小能手',
}
export const TASK_EMOJI: Record<TaskIcon, string> = {
  book: '📖',
  brush: '🪥',
  ball: '🏀',
  plant: '🌱',
  art: '🎨',
  blocks: '🧸',
}
export const WHEEL_COST = 10
export const WHEEL_DAILY_LIMIT = 3
export const COLLECTION_REWARD = '一次亲子露营'
export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'sticker', name: '贴纸一张', icon: '⭐', weight: 25, win: true },
  { id: 'again', name: '再接再厉', icon: '🌱', weight: 20, win: false },
  { id: 'movie', name: '选一部电影', icon: '🎬', weight: 10, win: true },
  { id: 'fruit', name: '加餐水果', icon: '🍎', weight: 20, win: true },
  { id: 'game', name: '亲子游戏', icon: '🎮', weight: 15, win: true },
  { id: 'story', name: '故事时间', icon: '📖', weight: 10, win: true },
]

export function dayKey(value: Date | string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function balance(state: BabyState, childId = state.activeChildId) {
  return state.ledger
    .filter(e => e.childId === childId)
    .reduce((sum, e) => sum + e.points, 0)
}

export function isReversed(state: BabyState, entryId: string) {
  return state.ledger.some(e => e.reversesId === entryId)
}

export function completedCount(
  state: BabyState,
  taskId: string,
  date = new Date(),
) {
  return state.ledger.filter(
    e =>
      e.taskId === taskId
      && e.kind === 'task'
      && dayKey(e.createdAt) === dayKey(date)
      && !isReversed(state, e.id),
  ).length
}

export function isScheduled(task: Task, date = new Date()) {
  return (
    !task.archived
    && (task.frequency === 'daily' || task.weekdays.includes(date.getDay()))
  )
}

export function availableCards(
  state: BabyState,
  icon: TaskIcon,
  childId = state.activeChildId,
) {
  return state.cards.filter(
    c => c.childId === childId && c.icon === icon && !c.consumedBy,
  )
}

export function wheelRemaining(state: BabyState, date = new Date()) {
  return Math.max(
    0,
    WHEEL_DAILY_LIMIT
    - state.ledger.filter(
      e =>
        e.childId === state.activeChildId
        && e.kind === 'spin'
        && dayKey(e.createdAt) === dayKey(date),
    ).length,
  )
}

export function streak(state: BabyState, date = new Date()) {
  const days = new Set(
    state.ledger
      .filter(
        e =>
          e.childId === state.activeChildId
          && e.kind === 'task'
          && !isReversed(state, e.id),
      )
      .map(e => dayKey(e.createdAt)),
  )
  const cursor = new Date(date)
  if (!days.has(dayKey(cursor)))
    cursor.setDate(cursor.getDate() - 1)
  let count = 0
  while (days.has(dayKey(cursor))) {
    count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}
