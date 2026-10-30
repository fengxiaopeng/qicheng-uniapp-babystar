<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import {
  navigate,
  switchTab,
  useBaby,
} from '@/features/baby/application/use-baby'
import BabyArt from '@/features/baby/components/BabyArt.vue'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import BabySheet from '@/features/baby/components/BabySheet.vue'
import ChildSwitcher from '@/features/baby/components/ChildSwitcher.vue'
import TaskRow from '@/features/baby/components/TaskRow.vue'
import { dayKey, isReversed } from '@/features/baby/domain/rules'

definePage({
  type: 'home',
  style: { navigationStyle: 'custom', navigationBarTitleText: '宝宝积分' },
})

const { state, points, todayEarned, todayTasks, streak, rewards, calendarDate, completed, refresh } = useBaby()
const pointsHelpOpen = ref(false)
const displayedTaskIds = ref<string[]>([])
const completedToday = computed(() => todayTasks.value.filter(task => completed(task.id) >= task.dailyLimit).length)
const homeTasks = computed(() => displayedTaskIds.value.flatMap(id => todayTasks.value.filter(task => task.id === id)))
function chooseHomeTasks() {
  // Keep rows stable after recording so the result and undo action stay visible.
  displayedTaskIds.value = [...todayTasks.value]
    .sort((a, b) => Number(completed(a.id) >= a.dailyLimit) - Number(completed(b.id) >= b.dailyLimit))
    .slice(0, 3)
    .map(task => task.id)
}
watch([
  () => state.value?.activeChildId,
  () => dayKey(calendarDate.value),
  () => todayTasks.value.map(task => task.id).join('|'),
], chooseHomeTasks, { immediate: true })
onShow(async () => {
  await refresh()
  chooseHomeTasks()
})
const goal = computed(
  () =>
    rewards.value.find(r => r.id === 'park')
    ?? rewards.value.find(r => r.points > points.value)
    ?? rewards.value[0],
)
const week = computed(() => {
  const now = calendarDate.value
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return ['一', '二', '三', '四', '五', '六', '日'].map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      label,
      today: dayKey(date) === dayKey(now),
      done: state.value?.ledger.some(
        e =>
          e.childId === state.value?.activeChildId
          && e.kind === 'task'
          && dayKey(e.createdAt) === dayKey(date)
          && !isReversed(state.value!, e.id),
      ),
    }
  })
})
</script>

<template>
  <BabyPage title="宝宝积分" root hide-child-switcher>
    <view class="mb-2 mt-1 flex items-center justify-between">
      <ChildSwitcher />
    </view>

    <view class="balance-hero">
      <view class="relative z-1">
        <button class="balance-help" aria-label="积分说明" @click="pointsHelpOpen = true">
          可用积分 <BabyIcon name="help" :size="15" />
        </button>
        <view class="balance-number">
          {{ points }}
        </view>
        <view
          class="inline-flex items-center gap-2 rounded-full bg-#ffffffb0 px-3 py-1 text-11px"
        >
          <text>今天获得</text><text class="points-text font-bold">+{{ todayEarned }} ✦</text>
        </view>
      </view>
      <view class="hero-whisper">
        今天也在<br>慢慢长大呀～
      </view>
      <view class="hero-bear">
        <BabyArt name="bear-star" />
      </view>
      <view class="relative z-1 mt-3 flex gap-2">
        <button
          class="hero-shortcut"
          @click="navigate('/pages/records/index?tab=ledger')"
        >
          <BabyIcon name="ledger" :size="18" />积分明细
        </button>
        <button class="hero-shortcut" @click="navigate('/pages/records/index')">
          <BabyIcon name="chart" :size="18" />成长统计
        </button>
      </view>
    </view>

    <view class="card streak-card mt-3">
      <view class="mb-2 flex items-center justify-between">
        <text class="text-13px font-semibold">
          已坚持
          <text class="text-19px text-primary">{{ streak }}</text> 天
        </text>
        <text class="muted text-10px">好习惯，正悄悄让你变更棒！</text>
      </view>
      <view class="flex justify-between">
        <view v-for="day in week" :key="day.label" class="text-center">
          <view
            class="streak-dot"
            :class="{ done: day.done, today: day.today }"
          >
            <BabyIcon v-if="day.done" name="check" :size="19" /><text v-else>
              ·
            </text>
          </view>
          <text class="muted mt-1 block text-10px">周{{ day.label }}</text>
        </view>
      </view>
    </view>

    <view class="card today-task-card mt-3">
      <view class="section-heading">
        <view class="flex items-center gap-2">
          <text class="section-title">今日任务</text>
          <text v-if="todayTasks.length" class="muted text-11px">已完成 {{ completedToday }}/{{ todayTasks.length }}</text>
        </view>
        <button class="text-link" @click="switchTab('/pages/tasks/index')">
          查看全部 <BabyIcon name="next" :size="14" />
        </button>
      </view>
      <TaskRow
        v-for="task in homeTasks"
        :key="task.id"
        :task="task"
      />
      <view v-if="!todayTasks.length" class="py-5 text-center">
        <text class="muted text-13px">给今天安排一个小小的目标吧</text>
        <button
          class="button button-soft mt-3"
          @click="navigate('/pages/tasks/edit')"
        >
          添加第一个任务
        </button>
      </view>
    </view>

    <button
      v-if="goal"
      class="goal-card"
      @click="switchTab('/pages/rewards/index')"
    >
      <view class="relative z-1 flex-1 text-left">
        <view class="text-12px font-semibold">
          {{
            points >= goal.points
              ? "小心愿已经可以实现啦"
              : `离「${goal.name}」还差`
          }}
          <text v-if="points < goal.points" class="points-text text-18px">
            {{
              goal.points - points
            }}
          </text><text v-if="points < goal.points" class="points-text ml-1">
            积分
          </text>
        </view>
        <text class="mt-2 block text-10px">
          {{ points }} / {{ goal.points }}
        </text>
        <view class="progress-track mt-1">
          <view
            class="progress-fill"
            :style="{
              width: `${Math.min(100, (points / goal.points) * 100)}%`,
            }"
          />
        </view>
      </view>
      <view class="goal-art">
        <BabyArt :name="goal.art" />
      </view>
    </button>
    <text class="footnote">每一份努力，都值得被看见。</text>
    <BabySheet :open="pointsHelpOpen" title="积分说明" @close="pointsHelpOpen = false">
      <view class="form-row">
        <text>当前可用积分</text><text class="points-text font-bold">{{ points }} 积分</text>
      </view>
      <view class="text-14px leading-7">
        <text class="mt-4 block">可用积分 = 初始赠送 + 任务获得 − 奖励消耗，撤销记分会同步扣回对应积分。</text>
        <text class="mt-3 block">「我的」中的任务累计积分，只统计未撤销的任务记分，不含初始赠送，也不会因兑换奖励而减少。</text>
        <text class="muted mt-3 block">今天获得仅统计今天的任务记分；详细收支可以在积分明细中查看。</text>
      </view>
      <button class="button button-primary mt-5" @click="pointsHelpOpen = false">
        知道了
      </button>
    </BabySheet>
  </BabyPage>
</template>

<style scoped lang="scss">
.balance-hero {
  position: relative;
  overflow: hidden;
  padding: 16px 14px 12px;
  border: 1px solid #d6e9dd;
  border-radius: 21px;
  background: #dfefe4;
}
.baby-page .balance-help {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  font-size: 13px;
  font-weight: 600;
}
.balance-number {
  margin: 1px 0 3px;
  color: #ee913b;
  font-size: 56px;
  font-weight: 800;
  line-height: 1.13;
  letter-spacing: -2px;
  font-variant-numeric: tabular-nums;
}
.hero-bear {
  position: absolute;
  top: 2px;
  right: -31px;
  width: 218px;
  height: 152px;
}
.hero-whisper {
  position: absolute;
  top: 27px;
  right: 104px;
  z-index: 1;
  transform: rotate(-10deg);
  font-size: 11px;
  line-height: 1.6;
  letter-spacing: 2px;
}
.baby-page .hero-shortcut {
  display: flex;
  min-height: 36px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #6f9b81;
  border-radius: 10px;
  background: #fffdfbe8;
  font-size: 12px;
}
.streak-dot {
  display: flex;
  width: 27px;
  height: 27px;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 50%;
  background: #eceee9;
  color: #b2b9af;
}
.streak-dot.done {
  background: #438768;
  color: #fff;
}
.streak-dot.today {
  box-shadow: 0 0 0 3px #e4efe1;
}
.baby-page .goal-card {
  margin-top: 20px;
  margin-bottom: 8px;
  position: relative;
  display: flex;
  width: 100%;
  overflow: hidden;
  align-items: center;
  gap: 12px;
  padding: 12px 10px 12px 14px;
  border-radius: 18px;
  background: #fff;
}
.goal-art {
  width: 82px;
  height: 58px;
  overflow: hidden;
  border-radius: 12px;
}
.baby-page .streak-card,
.baby-page .today-task-card {
  padding: 12px;
}
.today-task-card .section-heading {
  margin-bottom: 8px;
}
.today-task-card :deep(.text-link) {
  min-height: 26px;
}
.today-task-card :deep(.task-row) {
  padding: 8px 0;
}
.today-task-card :deep(.task-row:last-child) {
  padding-bottom: 0;
}
.today-task-card :deep(.task-symbol) {
  width: 36px;
  height: 38px;
}
</style>
