<script setup lang="ts">
import { ref } from 'vue'
import { ageLabel, navigate, newId, useBaby } from '../application/use-baby'
import BabyArt from './BabyArt.vue'
import BabyIcon from './BabyIcon.vue'
import BabySheet from './BabySheet.vue'

defineProps<{ compact?: boolean }>()
const { child, state, send } = useBaby()
const open = ref(false)
async function select(childId: string) {
  if (await send({ id: newId(), type: 'selectChild', childId }, true))
    open.value = false
}
</script>

<template>
  <button
    v-if="child"
    class="child-switcher"
    :class="{ compact }"
    aria-label="切换宝宝"
    @click="open = true"
  >
    <view v-if="!compact" class="child-avatar">
      <BabyArt v-if="child.avatar === 'bear'" name="bear-wave" />
      <text v-else class="text-33px">🐰</text>
    </view>
    <view class="text-left">
      <view class="flex items-center gap-1">
        <text class="font-bold" :class="compact ? 'text-12px' : 'text-18px'">
          {{
            child.name
          }}
        </text>
        <BabyIcon name="down" :size="compact ? 12 : 15" />
      </view>
      <text v-if="!compact" class="muted text-12px">
        {{
          ageLabel(child.birthday)
        }}
      </text>
    </view>
  </button>
  <BabySheet :open="open" title="今天陪谁一起成长？" @close="open = false">
    <button
      v-for="item in state?.children"
      :key="item.id"
      class="choice-row"
      @click="select(item.id)"
    >
      <text class="mr-3 text-28px">
        {{
          item.avatar === "bear" ? "🐻" : "🐰"
        }}
      </text>
      <view class="flex-1 text-left">
        <view class="font-bold">
          {{ item.name }}
        </view>
        <text class="muted text-12px">{{ ageLabel(item.birthday) }}</text>
      </view>
      <BabyIcon v-if="item.id === child?.id" name="check" />
    </button>
    <button
      class="button button-soft mt-4"
      @click="
        open = false;
        navigate('/pages/children/index');
      "
    >
      管理宝宝档案
    </button>
    <text class="footnote">每个宝宝都有独立的积分、任务与奖励。</text>
  </BabySheet>
</template>
