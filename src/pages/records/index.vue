<script setup lang="ts">
import type { LedgerEntry } from '@/features/baby/domain/types'
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import {
  displayDate,
  newId,
  useBaby,
} from '@/features/baby/application/use-baby'
import BabyArt from '@/features/baby/components/BabyArt.vue'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import BabySheet from '@/features/baby/components/BabySheet.vue'
import LedgerList from '@/features/baby/components/LedgerList.vue'
import { dayKey, isReversed } from '@/features/baby/domain/rules'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '成长记录' },
})

const { state, ledger, member, busy, send } = useBaby()
const tab = ref('stats')
const period = ref('week')
const offset = ref(0)
const filter = ref('全部类型')
const recorder = ref('全部成员')
const selected = ref<LedgerEntry | null>(null)
const reason = ref('')
const typeOptions = ['全部类型', '获得积分', '积分消耗', '撤销与退款']
onLoad((options) => {
  if (options?.tab === 'ledger')
    tab.value = 'ledger'
})
const range = computed(() => {
  const today = new Date()
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  if (period.value === 'week') {
    start.setDate(
      start.getDate() - ((start.getDay() + 6) % 7) + offset.value * 7,
    )
  }
  else {
    start.setDate(1)
    start.setMonth(start.getMonth() + offset.value)
  }
  const end = new Date(start)
  if (period.value === 'week')
    end.setDate(end.getDate() + 7)
  else end.setMonth(end.getMonth() + 1)
  return { start, end }
})
const rangeLabel = computed(() => {
  const { start, end } = range.value
  const last = new Date(end.getTime() - 1)
  return period.value === 'month'
    ? `${start.getFullYear()}年${start.getMonth() + 1}月`
    : `${offset.value === 0 ? '本周 ' : ''}${start.getMonth() + 1}.${start.getDate()} — ${last.getMonth() + 1}.${last.getDate()}`
})
const periodEntries = computed(() =>
  ledger.value.filter(
    e =>
      new Date(e.createdAt) >= range.value.start
        && new Date(e.createdAt) < range.value.end,
  ),
)
const validTasks = computed(() =>
  periodEntries.value.filter(
    e => e.kind === 'task' && state.value && !isReversed(state.value, e.id),
  ),
)
const earned = computed(() =>
  validTasks.value.reduce((sum, e) => sum + e.points, 0),
)
const spent = computed(() =>
  periodEntries.value
    .filter(e => ['redeem', 'spin', 'refund'].includes(e.kind))
    .reduce((sum, e) => sum - e.points, 0),
)
const filtered = computed(() =>
  periodEntries.value.filter((entry) => {
    const matchMember
      = recorder.value === '全部成员' || entry.memberName === recorder.value
    const matchType
      = filter.value === '全部类型'
        || (filter.value === '获得积分' && entry.kind === 'task')
        || (filter.value === '积分消耗'
          && ['redeem', 'spin'].includes(entry.kind))
        || (filter.value === '撤销与退款'
          && ['reversal', 'refund'].includes(entry.kind))
    return matchMember && matchType
  }),
)
const recorderOptions = computed(() => [
  '全部成员',
  ...Array.from(new Set(ledger.value.map(e => e.memberName))),
])
const bars = computed(() => {
  const count = Math.round(
    (range.value.end.getTime() - range.value.start.getTime()) / 86400000,
  )
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(range.value.start)
    date.setDate(date.getDate() + i)
    return {
      label:
        period.value === 'week'
          ? ['一', '二', '三', '四', '五', '六', '日'][i]
          : String(i + 1),
      value: validTasks.value
        .filter(e => dayKey(e.createdAt) === dayKey(date))
        .reduce((sum, e) => sum + e.points, 0),
    }
  })
})
const max = computed(() => Math.max(20, ...bars.value.map(b => b.value)))
const canReverse = computed(
  () =>
    selected.value?.kind === 'task'
    && state.value
    && !isReversed(state.value, selected.value.id)
    && (member.value?.role === 'admin'
      || member.value?.id === selected.value.memberId),
)
async function reverse() {
  if (
    selected.value
    && (await send({
      id: newId(),
      type: 'reverse',
      entryId: selected.value.id,
      reason: reason.value,
    }))
  ) {
    selected.value = null
    reason.value = ''
  }
}
function select(entry: LedgerEntry) {
  selected.value = entry
  reason.value = ''
}
</script>

<template>
  <BabyPage title="成长记录" back>
    <view class="segmented mb-4">
      <button
        class="segment"
        :class="{ active: tab === 'stats' }"
        @click="tab = 'stats'"
      >
        成长统计
      </button><button
        class="segment"
        :class="{ active: tab === 'ledger' }"
        @click="tab = 'ledger'"
      >
        积分明细
      </button>
    </view>
    <view class="mb-4 flex items-center justify-between gap-3">
      <view class="segmented subtle w-110px">
        <button
          class="segment !min-h-29px !text-11px"
          :class="{ active: period === 'week' }"
          @click="
            period = 'week';
            offset = 0;
          "
        >
          周
        </button><button
          class="segment !min-h-29px !text-11px"
          :class="{ active: period === 'month' }"
          @click="
            period = 'month';
            offset = 0;
          "
        >
          月
        </button>
      </view>
      <view class="flex items-center gap-1">
        <button class="icon-button" aria-label="上一周期" @click="offset--">
          <BabyIcon name="back" :size="18" />
        </button><text class="text-12px font-semibold">{{ rangeLabel }}</text><button
          class="icon-button"
          aria-label="下一周期"
          :disabled="offset >= 0"
          :class="{ 'opacity-25': offset >= 0 }"
          @click="offset++"
        >
          <BabyIcon name="next" :size="18" />
        </button>
      </view>
    </view>
    <template v-if="tab === 'stats'">
      <view class="grid grid-cols-2 gap-3">
        <view class="metric-card">
          <view class="metric-icon !bg-#ffe1a1 !text-#d79531">
            <BabyIcon name="star" :size="26" />
          </view><view>
            <text class="text-12px">获得积分</text><text class="mt-1 block text-28px font-bold leading-8">
              {{
                earned
              }}
            </text>
          </view>
        </view>
        <view class="metric-card">
          <view class="metric-icon">
            <BabyIcon name="check" :size="28" />
          </view><view>
            <text class="text-12px">完成任务</text><text class="mt-1 block text-28px font-bold leading-8">
              {{ validTasks.length
              }}<text class="ml-1 text-12px font-normal">次</text>
            </text>
          </view>
        </view>
      </view>
      <view class="card relative mb-5 mt-3 overflow-hidden">
        <view class="section-title">
          每天都有小进步
        </view>
        <view class="absolute right-3 top-1 h-76px w-88px">
          <BabyArt name="bear-wave" />
        </view>
        <view
          class="chart"
          :class="{ monthly: period === 'month' }"
          role="img"
          :aria-label="`${rangeLabel}，获得${earned}积分，完成${validTasks.length}次任务`"
        >
          <view class="chart-labels">
            <text>{{ max }}</text><text>{{ Math.round(max / 2) }}</text><text>0</text>
          </view>
          <view class="chart-columns">
            <view class="chart-gridline middle" /><view
              class="chart-gridline top"
            />
            <view
              v-for="(bar, index) in bars"
              :key="index"
              class="chart-column"
            >
              <view
                class="bar-value"
                :class="{ 'opacity-0': period === 'month' && index % 5 !== 0 }"
              >
                {{ bar.value || "" }}
              </view><view
                class="bar"
                :class="{ peak: bar.value === max }"
                :style="{ height: `${(bar.value / max) * 125}px` }"
              /><text
                class="bar-label"
                :class="{ 'opacity-0': period === 'month' && index % 5 !== 0 }"
              >
                {{ bar.label }}
              </text>
            </view>
          </view>
        </view>
        <view
          class="muted mt-7 flex justify-between border-x-0 border-b-0 border-t-1 border-#f0f1e9 border-solid pt-3 text-11px"
        >
          <text>本期净消耗 {{ spent }} 积分</text><text>每一步，都算数</text>
        </view>
      </view>
    </template>
    <view class="section-heading mb-3">
      <text class="section-title">
        {{
          tab === "stats" ? "最近记录" : "积分明细"
        }}
      </text><view class="flex gap-2">
        <picker
          :range="typeOptions"
          @change="filter = typeOptions[Number($event.detail.value)]"
        >
          <view class="filter-select">
            {{ filter }} <BabyIcon name="down" :size="12" />
          </view>
        </picker><picker
          v-if="tab === 'ledger'"
          :range="recorderOptions"
          @change="recorder = recorderOptions[Number($event.detail.value)]"
        >
          <view class="filter-select">
            {{ recorder }} <BabyIcon name="down" :size="12" />
          </view>
        </picker>
      </view>
    </view>
    <LedgerList
      :entries="tab === 'stats' ? filtered.slice(0, 4) : filtered"
      @select="select"
    />
    <button
      v-if="tab === 'stats' && filtered.length"
      class="text-link mx-auto my-3 justify-center !flex"
      @click="tab = 'ledger'"
    >
      查看全部明细 <BabyIcon name="next" :size="15" />
    </button>
    <text class="footnote">
      统计仅包含所选宝宝和日期范围内的记录，撤销的任务不计入成长统计。
    </text>
    <BabySheet
      :open="Boolean(selected)"
      title="每一笔，都有迹可循"
      @close="selected = null"
    >
      <template v-if="selected">
        <view class="mb-2 text-center text-16px font-semibold">
          {{ selected.title }}
        </view><view
          class="mb-5 text-center text-38px font-bold"
          :class="selected.points < 0 ? 'points-text' : 'text-primary'"
        >
          {{ selected.points > 0 ? "+" : "" }}{{ selected.points }}
        </view>
        <view class="form-row">
          <text>记录时间</text><text>{{ displayDate(selected.createdAt) }}</text>
        </view><view class="form-row">
          <text>记录人</text><text>{{ selected.memberName }}</text>
        </view><view v-if="selected.note" class="form-row">
          <text>备注</text><text>{{ selected.note }}</text>
        </view><view v-if="state && isReversed(state, selected.id)" class="note my-4">
          此笔记分已撤销，原记录保留以便核对。
        </view>
        <template v-if="canReverse">
          <text class="field-label mt-5">记错了？可以撤销这笔积分</text><input
            v-model="reason"
            class="field-input mb-3"
            :maxlength="100"
            placeholder="请填写原因，比如：重复记录"
            aria-label="撤销原因"
          ><button
            class="button button-outline"
            :disabled="busy || !reason.trim()"
            @click="reverse"
          >
            确认撤销这笔记分
          </button>
        </template>
        <text class="footnote">
          任务编辑不会改变历史名称或分值。撤销会生成关联记录，不会删除原始记分。
        </text>
      </template>
    </BabySheet>
  </BabyPage>
</template>

<style scoped lang="scss">
.metric-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 13px;
  border-radius: 18px;
  background: #e6f2e9;
}
.metric-icon {
  display: flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #cde7d4;
  color: #40896a;
}
.chart {
  position: relative;
  height: 150px;
  padding-top: 25px;
  margin-top: 28px;
  padding-left: 27px;
}
.chart-labels {
  position: absolute;
  top: 25px;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #a0a79a;
  font-size: 10px;
}
.chart-columns {
  position: relative;
  display: flex;
  height: 100%;
  align-items: flex-end;
  justify-content: space-around;
  gap: 10px;
  border-bottom: 1px solid #dce3d5;
}
.chart-column {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  max-width: 28px;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
}
.bar {
  width: 100%;
  min-height: 2px;
  border-radius: 5px 5px 0 0;
  background: #bddbc4;
}
.bar.peak {
  background: #4f9876;
}
.bar-value {
  padding-bottom: 5px;
  text-align: center;
  font-size: 10px;
}
.bar-label {
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  color: #8c9488;
  font-size: 11px;
}
.chart-gridline {
  position: absolute;
  right: 0;
  left: 0;
  border-top: 1px dashed #e9ede3;
}
.chart-gridline.top {
  top: 2px;
}
.chart-gridline.middle {
  top: 50%;
}
.chart.monthly .chart-columns {
  gap: 3px;
}
.chart.monthly .bar-value {
  font-size: 8px;
}
.filter-select {
  display: flex;
  min-height: 28px;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e4e8de;
  border-radius: 18px;
  background: #fff;
  font-size: 10px;
}
</style>
