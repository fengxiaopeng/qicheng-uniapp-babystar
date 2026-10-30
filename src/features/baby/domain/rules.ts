import type {
  BabyState,
  Task,
  TaskIcon,
  WheelPrize,
  WheelSettings,
} from './types'

export const TASK_CATEGORIES = [
  '学习成长',
  '生活习惯',
  '运动健康',
  '兴趣爱好',
] as const
export const MAX_SCRATCH_IMAGE_LENGTH = 1_500_000

export const TASK_ICONS: TaskIcon[] = [
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
/** Template defaults only; actual draws use wheelSettingsFor(state). */
export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'sticker', name: '贴纸一张', icon: '⭐', weight: 1, win: true },
  { id: 'again', name: '再接再厉', icon: '🌱', weight: 1, win: false },
  { id: 'movie', name: '选一部电影', icon: '🎬', weight: 1, win: true },
  { id: 'fruit', name: '加餐水果', icon: '🍎', weight: 1, win: true },
  { id: 'game', name: '亲子游戏', icon: '🎮', weight: 1, win: true },
  { id: 'story', name: '故事时间', icon: '📖', weight: 1, win: true },
]

export function defaultWheelSettings(childId: string): WheelSettings {
  return {
    childId,
    probabilityMode: 'equal',
    prizes: WHEEL_PRIZES.map(p => ({ ...p })),
  }
}

export function wheelSettingsFor(
  state: BabyState,
  childId = state.activeChildId,
): WheelSettings {
  return (
    state.wheelSettings?.find(s => s.childId === childId)
    ?? defaultWheelSettings(childId)
  )
}

/** Parse percentages exactly to integer basis points; never silently round invalid precision. */
export function percentToBasisPoints(text: string): number | null {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text.trim()))
    return null
  const [whole, fraction = ''] = text.trim().split('.')
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return result >= 0 && result <= 10000 ? result : null
}

export function wheelSettingsError(settings: WheelSettings): string | null {
  if (!settings || !['equal', 'custom'].includes(settings.probabilityMode))
    return '请选择等概率或自定义概率'
  if (
    !Array.isArray(settings.prizes)
    || settings.prizes.length < 2
    || settings.prizes.length > 8
  ) {
    return '请设置2–8个奖项'
  }
  if (
    new Set(settings.prizes.map(p => p?.id)).size !== settings.prizes.length
  )
    return '奖项标识不能重复'
  if (
    !settings.prizes.every(
      p =>
        p
        && typeof p.id === 'string'
        && p.id.length > 0
        && typeof p.name === 'string'
        && p.name.trim().length > 0
        && p.name.trim().length <= 12
        && typeof p.icon === 'string'
        && p.icon.length > 0
        && p.icon.length <= 20
        && typeof p.win === 'boolean'
        && Number.isInteger(p.weight)
        && p.weight >= 0
        && p.weight <= 10000,
    )
  ) {
    return '请填写奖项名称、图标和有效概率'
  }
  if (
    settings.probabilityMode === 'equal'
    && settings.prizes.some(p => p.weight !== 1)
  ) {
    return '等概率模式下每项权重必须相同'
  }
  if (
    settings.probabilityMode === 'custom'
    && settings.prizes.reduce((sum, p) => sum + p.weight, 0) !== 10000
  ) {
    return '自定义概率合计必须为100%'
  }
  return null
}

export function probabilityLabel(prizes: WheelPrize[], index: number) {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0)
  if (!total)
    return '0%'
  return `${Number(((prizes[index].weight / total) * 100).toFixed(2))}%`
}

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
      && (state.tasks.find(t => t.id === taskId)?.frequency === 'once'
        || dayKey(e.createdAt) === dayKey(date))
      && !isReversed(state, e.id),
  ).length
}

export function isScheduled(task: Task, date = new Date()) {
  if (task.archived)
    return false
  if (task.frequency === 'daily')
    return true
  if (task.frequency === 'once')
    return Boolean(task.onceDate && task.onceDate <= dayKey(date))
  if (task.frequency === 'weekend')
    return [0, 6].includes(date.getDay())
  return task.weekdays.includes(date.getDay())
}

export function isTaskDue(state: BabyState, task: Task, date = new Date()) {
  if (!isScheduled(task, date))
    return false
  if (task.frequency !== 'once' || completedCount(state, task.id, date) === 0)
    return true
  // Keep today's completion visible for feedback; hide it from later daily lists.
  return state.ledger.some(
    e =>
      e.taskId === task.id
      && e.kind === 'task'
      && dayKey(e.createdAt) === dayKey(date)
      && !isReversed(state, e.id),
  )
}

export function taskFrequencyLabel(task: Task) {
  if (task.frequency === 'daily')
    return '每天自动执行'
  if (task.frequency === 'weekend')
    return '周六、周日自动执行'
  if (task.frequency === 'once')
    return `单次任务 · ${task.onceDate ?? '不限日期'}`
  return `每周 ${task.weekdays.map(d => ['日', '一', '二', '三', '四', '五', '六'][d]).join('、')}`
}

export function validImageSource(value: string) {
  return (
    value.length <= MAX_SCRATCH_IMAGE_LENGTH
    && (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)
      || /^\/static\/baby\/[a-z-]+\.svg$/.test(value))
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
