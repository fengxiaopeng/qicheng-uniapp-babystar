<script setup lang="ts">
import type { WheelSettings } from '../../domain/types'
import { computed, reactive, watch } from 'vue'
import { newId, useBaby } from '../../application/use-baby'
import {
  defaultWheelSettings,
  percentToBasisPoints,
  WHEEL_COST,
  WHEEL_DAILY_LIMIT,
} from '../../domain/rules'
import BabyIcon from '../BabyIcon.vue'

interface EditablePrize {
  id: string
  name: string
  icon: string
  win: boolean
  probability: string
}
const icons = [
  '⭐',
  '🌱',
  '🎬',
  '🍎',
  '🎮',
  '📖',
  '🎁',
  '🧸',
  '🎨',
  '🍦',
  '🎟️',
  '🚲',
]
const { child, wheelSettings, send, busy, isAdmin } = useBaby()
const draft = reactive<{
  probabilityMode: WheelSettings['probabilityMode']
  prizes: EditablePrize[]
}>({ probabilityMode: 'equal', prizes: [] })
function load(settings?: WheelSettings) {
  if (!child.value)
    return
  const source
    = settings ?? wheelSettings.value ?? defaultWheelSettings(child.value.id)
  draft.probabilityMode = source.probabilityMode
  const base = Math.floor(10000 / source.prizes.length)
  const remainder = 10000 % source.prizes.length
  draft.prizes = source.prizes.map((prize, index) => ({
    id: prize.id,
    name: prize.name,
    icon: prize.icon,
    win: prize.win,
    probability: (
      (source.probabilityMode === 'equal'
        ? base + (index < remainder ? 1 : 0)
        : prize.weight) / 100
    ).toFixed(2),
  }))
}
watch(
  () => child.value?.id,
  () => load(),
  { immediate: true },
)
const total = computed(() =>
  draft.prizes.reduce(
    (sum, p) => sum + (percentToBasisPoints(p.probability) ?? 0),
    0,
  ),
)
const customValid = computed(
  () =>
    draft.prizes.every(p => percentToBasisPoints(p.probability) !== null)
    && total.value === 10000,
)
function equalizeDraftProbabilities() {
  const base = Math.floor(10000 / draft.prizes.length)
  const remainder = 10000 % draft.prizes.length
  draft.prizes.forEach((prize, index) => {
    prize.probability = ((base + (index < remainder ? 1 : 0)) / 100).toFixed(2)
  })
}
function addPrize() {
  if (draft.prizes.length >= 8)
    return
  draft.prizes.push({
    id: newId('prize'),
    name: '',
    icon: '🎁',
    win: true,
    probability: '0',
  })
  if (draft.probabilityMode === 'equal')
    equalizeDraftProbabilities()
}
function removePrize(index: number) {
  if (draft.prizes.length <= 2)
    return
  draft.prizes.splice(index, 1)
  if (draft.probabilityMode === 'equal')
    equalizeDraftProbabilities()
}
async function save() {
  if (!child.value || !isAdmin.value)
    return
  const settings: WheelSettings = {
    childId: child.value.id,
    probabilityMode: draft.probabilityMode,
    prizes: draft.prizes.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      win: p.win,
      weight:
        draft.probabilityMode === 'equal'
          ? 1
          : (percentToBasisPoints(p.probability) ?? -1),
    })),
  }
  await send({ id: newId(), type: 'saveWheel', settings })
}
</script>

<template>
  <view>
    <view class="card mb-3">
      <view class="section-heading !mb-2">
        <text class="section-title">{{ child?.name }}的幸运转盘</text><text class="tag">{{ draft.prizes.length }}个奖项</text>
      </view>
      <text class="muted block text-11px leading-5">
        设置奖项、图标与中奖概率。保存后立即生效，历史抽奖结果不会变化。
      </text>
      <view class="segmented mt-3">
        <button
          class="segment"
          :class="{ active: draft.probabilityMode === 'equal' }"
          @click="draft.probabilityMode = 'equal'"
        >
          等概率（默认）
        </button><button
          class="segment"
          :class="{ active: draft.probabilityMode === 'custom' }"
          @click="draft.probabilityMode = 'custom'"
        >
          自定义概率
        </button>
      </view>
      <view v-if="draft.probabilityMode === 'equal'" class="note mt-3">
        每个奖项机会完全相同，均为 1 /
        {{ draft.prizes.length }}。添加或移除奖项后自动平分，无需填写百分比。
      </view>
      <view
        v-else
        class="note mt-3"
        :class="{ '!bg-#fff0d9 !text-#a06f37': !customValid }"
      >
        概率合计 {{ (total / 100).toFixed(2) }}% / 100%。支持最多两位小数，0%
        表示该项不会被抽中。
      </view>
    </view>
    <view
      v-for="(prize, index) in draft.prizes"
      :key="prize.id"
      class="card wheel-editor-row mb-3"
    >
      <view class="mb-3 flex items-center justify-between">
        <text class="muted text-11px">奖项 {{ index + 1 }}</text><button
          v-if="draft.prizes.length > 2"
          class="text-link !min-h-22px !text-11px !text-#a18d78"
          :aria-label="`移除奖项${index + 1}`"
          @click="removePrize(index)"
        >
          移除
        </button>
      </view>
      <view class="flex items-center gap-2">
        <picker
          :range="icons"
          :value="Math.max(0, icons.indexOf(prize.icon))"
          @change="prize.icon = icons[Number($event.detail.value)]"
        >
          <view
            class="wheel-icon-picker"
            :aria-label="`选择奖项${index + 1}图标`"
          >
            {{ prize.icon }}
          </view>
        </picker><input
          v-model="prize.name"
          class="field-input min-w-0 flex-1"
          :maxlength="12"
          placeholder="填写奖项名称"
          :aria-label="`奖项${index + 1}名称`"
        >
      </view>
      <view class="mt-3 flex items-center justify-between gap-2">
        <button
          class="prize-kind"
          :class="{ encouragement: !prize.win }"
          :aria-label="`切换奖项${index + 1}类型`"
          @click="prize.win = !prize.win"
        >
          {{ prize.win ? "🎁 获得奖励" : "🌱 鼓励项（不中奖）" }}
          <text class="opacity-60">⌄</text>
        </button><view
          v-if="draft.probabilityMode === 'custom'"
          class="flex items-center gap-1"
        >
          <input
            v-model="prize.probability"
            class="probability-input"
            type="digit"
            :aria-label="`奖项${index + 1}概率`"
          ><text class="muted text-12px">%</text>
        </view><text v-else class="muted text-12px">
          机会 1 / {{ draft.prizes.length }}
        </text>
      </view>
    </view>
    <button
      v-if="draft.prizes.length < 8"
      class="button button-outline mb-3"
      @click="addPrize"
    >
      <BabyIcon name="plus" :size="19" />添加奖项
    </button>
    <text class="muted mb-4 block text-11px leading-5">
      最多8个、至少2个奖项。点击奖项类型可切换为鼓励项；鼓励项仍消耗
      {{ WHEEL_COST }} 积分，但不产生奖励兑换。每天最多参与
      {{ WHEEL_DAILY_LIMIT }} 次。
    </text>
    <button
      class="button button-primary"
      :disabled="
        busy
          || !child
          || !isAdmin
          || (draft.probabilityMode === 'custom' && !customValid)
      "
      @click="save"
    >
      {{ busy ? "正在保存…" : "保存转盘设置" }}
    </button>
    <button
      class="text-link mx-auto mt-3 justify-center !flex"
      @click="load(defaultWheelSettings(child?.id ?? ''))"
    >
      恢复默认奖项与等概率
    </button>
  </view>
</template>

<style scoped lang="scss">
.wheel-icon-picker {
  display: flex;
  width: 42px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e9df;
  border-radius: 11px;
  background: #f7f7ee;
  font-size: 25px;
}
.baby-page .prize-kind {
  padding: 6px 9px;
  border-radius: 12px;
  background: #eaf3e7;
  color: #477455;
  font-size: 11px;
}
.baby-page .prize-kind.encouragement {
  background: #f6f0e0;
  color: #9c8455;
}
.probability-input {
  box-sizing: border-box;
  width: 68px;
  height: 32px;
  padding: 0 6px;
  border: 1px solid #dbe3d3;
  border-radius: 8px;
  background: #fafbf6;
  text-align: right;
  font-size: 13px;
}
</style>
