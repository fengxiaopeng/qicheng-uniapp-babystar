<script setup lang="ts">
import { computed } from 'vue'
import {
  navigate,
  switchTab,
  useBaby,
} from '@/features/baby/application/use-baby'
import BabyArt from '@/features/baby/components/BabyArt.vue'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import ChildSwitcher from '@/features/baby/components/ChildSwitcher.vue'
import TaskRow from '@/features/baby/components/TaskRow.vue'
import { dayKey, isReversed } from '@/features/baby/domain/rules'

definePage({
  type: 'home',
  style: { navigationStyle: 'custom', navigationBarTitleText: '宝宝积分' },
})

const { state, points, todayEarned, todayTasks, streak, rewards } = useBaby()
const goal = computed(
  () =>
    rewards.value.find(r => r.id === 'park')
    ?? rewards.value.find(r => r.points > points.value)
    ?? rewards.value[0],
)
const week = computed(() => {
  const now = new Date()
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
  <BabyPage title="宝宝积分" root>
    <view class="mb-4 mt-1 flex items-center justify-between">
      <ChildSwitcher />
      <button
        class="family-shortcut"
        aria-label="家庭管理"
        @click="navigate('/pages/family/index')"
      >
        <view class="flex justify-end -space-x-2">
          <view
            v-for="person in state?.members.slice(0, 2)"
            :key="person.id"
            class="member-avatar"
          >
            {{ person.avatar }}
          </view>
          <view class="member-avatar bg-#e9ece4 text-22px text-#8c9589">
            ＋
          </view>
        </view>
        <text class="muted mt-1 block text-10px">全家一起陪伴成长</text>
      </button>
    </view>

    <view class="balance-hero">
      <view class="relative z-1">
        <view class="flex items-center gap-1 text-13px font-semibold">
          可用积分 <BabyIcon name="help" :size="13" />
        </view>
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
      <view class="relative z-1 mt-4 flex gap-2">
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

    <view class="card mt-3">
      <view class="mb-3 flex items-center justify-between">
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

    <view class="card mt-3">
      <view class="section-heading">
        <text class="section-title">今日任务</text>
        <button class="text-link" @click="switchTab('/pages/tasks/index')">
          查看全部 <BabyIcon name="next" :size="14" />
        </button>
      </view>
      <TaskRow
        v-for="task in todayTasks.slice(0, 3)"
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
      class="goal-card mt-3"
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
  </BabyPage>
</template>

<style scoped lang="scss">
.balance-hero {
  position: relative;
  overflow: hidden;
  padding: 19px 16px 13px;
  border: 1px solid #d6e9dd;
  border-radius: 21px;
  background: #dfefe4;
}
.balance-number {
  margin: 1px 0 3px;
  color: #ee913b;
  font-size: 62px;
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
  height: 165px;
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
  position: relative;
  display: flex;
  width: 100%;
  overflow: hidden;
  align-items: center;
  gap: 12px;
  padding: 14px 10px 14px 14px;
  border-radius: 18px;
  background: #fff;
}
.goal-art {
  width: 99px;
  height: 70px;
  overflow: hidden;
  border-radius: 12px;
}
</style>
