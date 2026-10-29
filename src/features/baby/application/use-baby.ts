import type { BabyCommand, BabyRepository, BabyState } from '../domain/types'
import { computed, ref } from 'vue'
import { createLocalRepository, STORAGE_KEY } from '../data/local-repository'
import {
  availableCards,
  balance,
  CARD_ICONS,
  completedCount,
  dayKey,
  isScheduled,
  streak,
  wheelRemaining,
} from '../domain/rules'

// The composition root: replace this repository with an HTTP adapter when the API is ready.
const repository: BabyRepository = createLocalRepository({
  read: () => uni.getStorageSync(STORAGE_KEY),
  write: state => uni.setStorageSync(STORAGE_KEY, state),
})
const state = ref<BabyState | null>(null)
const busy = ref(false)
const error = ref('')
let loading: Promise<void> | undefined

export function newId(prefix = 'action') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function useBaby() {
  // Refresh at entry (including tab changes) so another local page's changes are visible.
  async function refresh() {
    if (loading)
      return loading
    loading = repository
      .load()
      .then((snapshot) => {
        state.value = snapshot
        error.value = ''
      })
      .catch((reason: unknown) => {
        error.value
          = reason instanceof Error
            ? reason.message
            : '读取本地数据失败，请检查存储空间'
      })
      .finally(() => {
        loading = undefined
      })
    return loading
  }

  async function send(command: BabyCommand, silent = false) {
    if (busy.value)
      return null
    busy.value = true
    try {
      const result = await repository.execute(command)
      state.value = result.state
      error.value = ''
      if (!silent) {
        uni.showToast({
          title: result.receipt.message,
          icon: 'none',
          duration: 2200,
        })
      }
      return result.receipt
    }
    catch (reason) {
      uni.showToast({
        title:
          reason instanceof Error
            ? reason.message
            : '保存失败，请检查本机存储空间后重试',
        icon: 'none',
      })
      return null
    }
    finally {
      busy.value = false
    }
  }

  const child = computed(() =>
    state.value?.children.find(c => c.id === state.value?.activeChildId),
  )
  const member = computed(() =>
    state.value?.members.find(m => m.id === state.value?.activeMemberId),
  )
  const tasks = computed(
    () =>
      state.value?.tasks.filter(
        t => t.childId === child.value?.id && !t.archived,
      ) ?? [],
  )
  const ledger = computed(
    () =>
      state.value?.ledger
        .filter(e => e.childId === child.value?.id)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) ?? [],
  )
  return {
    state,
    error,
    busy,
    child,
    member,
    tasks,
    ledger,
    refresh,
    send,
    isAdmin: computed(() => member.value?.role === 'admin'),
    points: computed(() => (state.value ? balance(state.value) : 0)),
    todayEarned: computed(() =>
      ledger.value
        .filter(
          e =>
            dayKey(e.createdAt) === dayKey(new Date())
            && e.kind === 'task'
            && !state.value?.ledger.some(r => r.reversesId === e.id),
        )
        .reduce((sum, e) => sum + e.points, 0),
    ),
    todayTasks: computed(() => tasks.value.filter(t => isScheduled(t))),
    rewards: computed(
      () =>
        state.value?.rewards.filter(r => r.childId === child.value?.id) ?? [],
    ),
    orders: computed(
      () =>
        state.value?.orders
          .filter(o => o.childId === child.value?.id)
          .slice()
          .reverse() ?? [],
    ),
    streak: computed(() => (state.value ? streak(state.value) : 0)),
    wheelRemaining: computed(() =>
      state.value ? wheelRemaining(state.value) : 0,
    ),
    cardCount: computed(() =>
      state.value
        ? CARD_ICONS.filter(
          icon => availableCards(state.value!, icon).length > 0,
        ).length
        : 0,
    ),
    completed: (taskId: string) =>
      state.value ? completedCount(state.value, taskId) : 0,
  }
}

export function ageLabel(birthday: string) {
  const now = new Date()
  const birth = new Date(`${birthday}T00:00:00`)
  let months
    = (now.getFullYear() - birth.getFullYear()) * 12
      + now.getMonth()
      - birth.getMonth()
  if (now.getDate() < birth.getDate())
    months--
  months = Math.max(0, months)
  return `${Math.floor(months / 12)}岁${months % 12}个月`
}

export function navigate(url: string) {
  uni.navigateTo({ url })
}

export function displayDate(value: string) {
  const date = new Date(value)
  const prefix
    = dayKey(date) === dayKey(new Date())
      ? '今天'
      : `${date.getMonth() + 1}月${date.getDate()}日`
  return `${prefix} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function switchTab(url: string) {
  uni.switchTab({ url })
}
