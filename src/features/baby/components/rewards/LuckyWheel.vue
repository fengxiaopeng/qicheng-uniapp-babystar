<script setup lang="ts">
import type { Receipt, WheelPrize } from '../../domain/types'
import { onHide } from '@dcloudio/uni-app'
import { computed, onUnmounted, ref, watch } from 'vue'
import { navigate, newId, useBaby } from '../../application/use-baby'
import {
  probabilityLabel,
  WHEEL_COST,
  WHEEL_DAILY_LIMIT,
  WHEEL_PRIZES,
} from '../../domain/rules'
import BabyArt from '../BabyArt.vue'
import BabyIcon from '../BabyIcon.vue'
import BabySheet from '../BabySheet.vue'

const { points, busy, wheelRemaining, send, wheelSettings, child, isAdmin }
  = useBaby()
const frozenPrizes = ref<WheelPrize[] | null>(null)
const prizes = computed(
  () => frozenPrizes.value ?? wheelSettings.value?.prizes ?? WHEEL_PRIZES,
)
const wheelBackground = computed(() => {
  const colors = [
    '#fff0cd',
    '#e0f1e5',
    '#f9e1dd',
    '#e4edce',
    '#fff0cd',
    '#e0eef5',
    '#e9e2f4',
    '#f7e6cf',
  ]
  const step = 360 / prizes.value.length
  return `conic-gradient(${prizes.value.map((_, i) => `${colors[i]} ${i * step}deg ${(i + 1) * step - 0.8}deg, #fffdf3 ${(i + 1) * step - 0.8}deg ${(i + 1) * step}deg`).join(',')})`
})
const showOdds = ref(false)
const spinning = ref(false)
const rotation = ref(0)
const spinResult = ref<Receipt | null>(null)
let spinTimer: ReturnType<typeof setTimeout> | undefined
async function spin() {
  if (spinning.value || busy.value)
    return
  spinning.value = true
  const result = await send({ id: newId(), type: 'spin' }, true)
  if (!result || result.prizeIndex === undefined) {
    spinning.value = false
    return
  }
  frozenPrizes.value
    = result.wheelPrizes ?? prizes.value.map(p => ({ ...p }))
  const angle = 360 / frozenPrizes.value.length
  const target = (360 - (result.prizeIndex * angle + angle / 2)) % 360
  rotation.value
    = rotation.value + 360 * 5 + ((target - (rotation.value % 360) + 360) % 360)
  spinTimer = setTimeout(() => {
    spinning.value = false
    spinResult.value = result
  }, 2600)
}
function stopAnimation() {
  if (spinTimer)
    clearTimeout(spinTimer)
  spinning.value = false
  frozenPrizes.value = null
}
onHide(stopAnimation)
onUnmounted(stopAnimation)
watch(
  () => child.value?.id,
  () => {
    stopAnimation()
    spinResult.value = null
  },
)
</script>

<template>
  <view>
    <view class="mb-1 flex items-center justify-between">
      <text class="tag">
        {{
          wheelSettings?.probabilityMode === "custom"
            ? "自定义概率"
            : "默认等概率"
        }}
      </text><button
        v-if="isAdmin"
        class="text-link"
        :disabled="spinning"
        @click="navigate('/pages/manage/rewards?tab=wheel')"
      >
        <BabyIcon name="settings" :size="15" />设置奖项
      </button>
    </view>
    <view class="wheel-heading">
      <view class="relative z-1 pt-2">
        <view class="text-24px font-bold">
          转出一份小惊喜
        </view><text class="muted mt-2 block text-11px">
          小小的运气，也是努力的奖励！
        </text>
      </view><view class="absolute bottom-0 right-0 h-115px w-135px">
        <BabyArt name="bear-wave" />
      </view>
    </view>
    <view class="wheel-area">
      <view class="wheel-pointer" />
      <view
        class="wheel-disc" :class="{ 'wheel-many-prizes': prizes.length > 6 }"
        :style="{
          transform: `rotate(${rotation}deg)`,
          background: wheelBackground,
        }"
      >
        <view
          v-for="(prize, index) in prizes"
          :key="prize.id"
          class="wheel-prize"
          :style="{
            transform: `translate(-50%, -50%) rotate(${((index + 0.5) * 360) / prizes.length}deg) translateY(calc(0px - var(--wheel-label-radius, 108px))) rotate(-${((index + 0.5) * 360) / prizes.length}deg)`,
          }"
        >
          <text class="wheel-prize-icon block text-27px">{{ prize.icon }}</text><text class="wheel-prize-name mt-1 block text-11px font-semibold">
            {{ prize.name }}
          </text>
        </view>
      </view>
      <button
        class="wheel-center"
        :disabled="
          spinning || busy || points < WHEEL_COST || wheelRemaining < 1
        "
        @click="spin"
      >
        <text class="text-20px font-bold">
          {{ spinning ? "好运中" : "转一转" }}
        </text><text class="mt-1 block text-10px opacity-80">
          {{ spinning ? "✦ ✦ ✦" : "小惊喜等着你" }}
        </text>
      </button>
    </view>
    <view class="mt-4 flex items-center justify-center gap-4 text-12px">
      <text>
        每次消耗
        <text class="points-text font-bold">{{ WHEEL_COST }}</text> 积分
      </text><text class="text-#d4d7cb">|</text><text>
        今日剩余
        <text class="points-text font-bold">{{ wheelRemaining }}</text>
        次
      </text>
    </view>
    <text
      v-if="points < WHEEL_COST || wheelRemaining < 1"
      class="footnote !text-#c28a4f"
    >
      {{
        points < WHEEL_COST
          ? "再积攒一点积分，就可以来试试好运啦"
          : "今天的机会已用完，明天再来吧"
      }}
    </text>
    <button
      class="text-link mx-auto my-2 justify-center !flex"
      @click="showOdds = true"
    >
      查看奖品与概率 <BabyIcon name="next" :size="13" />
    </button>
    <view class="note">
      <BabyIcon name="help" :size="17" /><text>
        中奖即完成兑换，可在兑换记录中查看，每天最多参与
        {{ WHEEL_DAILY_LIMIT }} 次。
      </text>
    </view>

    <BabySheet
      :open="showOdds"
      title="小惊喜，每一份都有机会"
      @close="showOdds = false"
    >
      <view v-for="(prize, index) in prizes" :key="prize.id" class="form-row">
        <text>{{ prize.icon }} {{ prize.name }}</text><text class="text-primary">
          {{
            probabilityLabel(prizes, index)
          }}
        </text>
      </view><text class="footnote">
        所有奖项都列在这里，含鼓励项。转盘格子等大展示，实际概率以本表为准；等概率的百分比为近似值。结果生成后立即保存，退出页面不会丢失。
      </text>
    </BabySheet>
    <BabySheet
      :open="Boolean(spinResult)"
      title="你的幸运结果"
      @close="spinResult = null"
    >
      <view class="mx-auto h-140px w-170px">
        <BabyArt name="bear-gift" />
      </view><view class="mb-5 text-center text-19px font-bold">
        {{ spinResult?.message }}
      </view><button
        class="button button-primary"
        @click="
          spinResult = null;
          navigate('/pages/rewards/history');
        "
      >
        查看兑换记录
      </button><text class="footnote">
        每次转盘费用为{{ WHEEL_COST }}积分，抽奖结果已保存，中奖即完成兑换。
      </text>
    </BabySheet>
  </view>
</template>
