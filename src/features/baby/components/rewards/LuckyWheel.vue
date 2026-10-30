<script setup lang="ts">
import type { Receipt } from '../../domain/types'
import { onHide } from '@dcloudio/uni-app'
import { onUnmounted, ref } from 'vue'
import { navigate, newId, useBaby } from '../../application/use-baby'
import {
  WHEEL_COST,
  WHEEL_DAILY_LIMIT,
  WHEEL_PRIZES,
} from '../../domain/rules'
import BabyArt from '../BabyArt.vue'
import BabyIcon from '../BabyIcon.vue'
import BabySheet from '../BabySheet.vue'

const { points, busy, wheelRemaining, send } = useBaby()
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
  const target = (360 - (result.prizeIndex * 60 + 30)) % 360
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
}
onHide(stopAnimation)
onUnmounted(stopAnimation)
</script>

<template>
  <view>
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
      <view class="wheel-disc" :style="{ transform: `rotate(${rotation}deg)` }">
        <view
          v-for="(prize, index) in WHEEL_PRIZES"
          :key="prize.id"
          class="wheel-prize"
          :style="{
            transform: `translate(-50%, -50%) rotate(${index * 60 + 30}deg) translateY(-108px) rotate(-${index * 60 + 30}deg)`,
          }"
        >
          <text class="block text-27px">{{ prize.icon }}</text><text class="mt-1 block text-11px font-semibold">
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
      <view v-for="prize in WHEEL_PRIZES" :key="prize.id" class="form-row">
        <text>{{ prize.icon }} {{ prize.name }}</text><text class="text-primary">{{ prize.weight }}%</text>
      </view><text class="footnote">
        包含「再接再厉」未中奖项；每次转动独立计算。结果生成后立即保存，退出页面不会丢失。
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
