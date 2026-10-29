<script setup lang="ts">
import type { LedgerEntry } from '../domain/types'
import { displayDate } from '../application/use-baby'
import { TASK_EMOJI } from '../domain/rules'

defineProps<{ entries: LedgerEntry[] }>()
const emit = defineEmits<{ select: [entry: LedgerEntry] }>()
</script>

<template>
  <view v-if="!entries.length" class="empty-state">
    <text class="text-35px">🌱</text>
    <view class="mt-3 font-bold">
      成长，会慢慢留下足迹
    </view>
    <text class="muted mt-2 text-12px">
      这个时间段还没有记录，试试其他日期吧。
    </text>
  </view>
  <button
    v-for="entry in entries"
    :key="entry.id"
    class="ledger-row"
    @click="emit('select', entry)"
  >
    <view
      class="ledger-symbol"
      :class="entry.points < 0 ? 'expense' : 'income'"
    >
      {{
        entry.taskIcon
          ? TASK_EMOJI[entry.taskIcon]
          : entry.kind === "spin"
            ? "⭐"
            : entry.kind === "redeem"
              ? "🎁"
              : entry.kind === "reversal"
                ? "↩"
                : "🌱"
      }}
    </view>
    <view class="min-w-0 flex-1 text-left">
      <view class="text-14px font-semibold">
        {{ entry.title }}
      </view>
      <text class="muted mt-1 block text-11px">
        {{ displayDate(entry.createdAt) }} · {{ entry.memberName }}记录
      </text>
    </view>
    <text
      class="ml-2 text-21px font-bold"
      :class="entry.points < 0 ? 'points-text' : 'text-primary'"
    >
      {{ entry.points > 0 ? "+" : "" }}{{ entry.points }}
    </text>
  </button>
</template>
