<script setup lang="ts">
import type { RewardOrder } from '@/features/baby/domain/types'
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

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '兑换记录' },
})

const { orders, isAdmin, busy, send } = useBaby()
const filter = ref('all')
const selected = ref<RewardOrder | null>(null)
const reason = ref('')
const list = computed(() =>
  orders.value.filter(
    o => filter.value === 'all' || o.status === filter.value,
  ),
)
const labels = { pending: '待领取', received: '已领取', cancelled: '已取消' }
const sourceLabels = {
  wish: '心愿兑换',
  wheel: '幸运转盘',
  collection: '集卡兑换',
}
async function receive(order: RewardOrder) {
  const result = await uni.showModal({
    title: '奖励已经交给宝宝了吗？',
    content: `确认「${order.name}」已发放后，将记录为已领取。`,
    confirmText: '确认已发放',
    confirmColor: '#34785c',
  })
  if (result.confirm)
    await send({ id: newId(), type: 'receiveOrder', orderId: order.id })
}
async function cancel() {
  if (
    selected.value
    && (await send({
      id: newId(),
      type: 'cancelOrder',
      orderId: selected.value.id,
      reason: reason.value,
    }))
  ) {
    selected.value = null
    reason.value = ''
  }
}
</script>

<template>
  <BabyPage title="兑换记录" back>
    <view class="note mb-4">
      <BabyIcon name="gift" :size="20" /><text>
        期待变成快乐的那一刻，也值得被记录。
      </text>
    </view>
    <view class="segmented mb-4">
      <button
        v-for="item in [
          ['all', '全部'],
          ['pending', '待领取'],
          ['received', '已领取'],
          ['cancelled', '已取消'],
        ]"
        :key="item[0]"
        class="segment !text-12px"
        :class="{ active: filter === item[0] }"
        @click="filter = item[0]"
      >
        {{ item[1] }}
      </button>
    </view>
    <view v-for="order in list" :key="order.id" class="card mb-3">
      <view class="flex items-center gap-3">
        <view class="h-64px w-70px overflow-hidden rounded-3">
          <BabyArt
            :name="
              order.source === 'collection'
                ? 'park'
                : order.source === 'wheel'
                  ? 'bear-gift'
                  : order.name.includes('冰淇淋')
                    ? 'icecream'
                    : order.name.includes('电影')
                      ? 'movie'
                      : 'blocks'
            "
          />
        </view><view class="min-w-0 flex-1">
          <view class="text-15px font-bold">
            {{ order.name }}
          </view><view class="muted mt-1 text-10px">
            {{ sourceLabels[order.source] }} ·
            {{ displayDate(order.createdAt) }}
          </view><view class="mt-2 text-11px text-primary">
            {{
              order.source === "collection"
                ? "消耗一套卡片"
                : `${order.points} 积分`
            }}
            · {{ order.memberName }}
          </view>
        </view><text
          class="tag"
          :class="{
            'bg-#fff0d7 !text-#bb843b': order.status === 'pending',
            'bg-#eeefe9 !text-#92988c': order.status === 'cancelled',
          }"
        >
          {{ labels[order.status] }}
        </text>
      </view>
      <view
        v-if="order.status === 'pending' && isAdmin"
        class="mt-4 flex items-center justify-end gap-3 border-x-0 border-b-0 border-t-1 border-#f0f1ea border-solid pt-3"
      >
        <button class="text-link !text-#8b918b" @click="selected = order">
          取消兑换
        </button><button
          class="button button-small button-primary"
          :disabled="busy"
          @click="receive(order)"
        >
          确认已发放
        </button>
      </view>
      <text
        v-else-if="order.status === 'pending'"
        class="muted mt-3 block text-11px"
      >
        请让管理员确认发放，或者联系管理员取消兑换。
      </text>
    </view>
    <view v-if="!list.length" class="empty-state">
      <view class="h-130px w-160px">
        <BabyArt name="bear-gift" />
      </view><text class="font-bold">这里还没有兑换记录</text><text class="muted mt-2 text-12px">小小心愿，会随着努力慢慢实现。</text>
    </view>
    <BabySheet
      :open="Boolean(selected)"
      title="取消这份奖励？"
      @close="selected = null"
    >
      <view class="note mb-4">
        {{
          selected?.source === "wish"
            ? `取消后将退回 ${selected.points} 积分，原记录会保留。`
            : selected?.source === "collection"
              ? "取消后将退回本次消耗的六张卡片。"
              : "转盘已经参与，取消奖品不退回10积分，也不恢复次数。"
        }}
      </view>
      <input
        v-model="reason"
        class="field-input mb-4"
        :maxlength="100"
        placeholder="请填写取消原因"
        aria-label="取消原因"
      ><button
        class="button button-primary"
        :disabled="busy || !reason.trim()"
        @click="cancel"
      >
        确认取消并保留记录
      </button>
    </BabySheet>
  </BabyPage>
</template>
