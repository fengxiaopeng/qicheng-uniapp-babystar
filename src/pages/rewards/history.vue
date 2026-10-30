<script setup lang="ts">
import { displayDate, useBaby } from '@/features/baby/application/use-baby'
import BabyArt from '@/features/baby/components/BabyArt.vue'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '兑换记录' },
})
const { orders } = useBaby()
const sourceLabels = {
  wish: '心愿兑换',
  wheel: '幸运转盘',
  collection: '图片刮卡',
}
</script>

<template>
  <BabyPage title="兑换记录" back>
    <view class="note mb-4">
      <BabyIcon name="gift" :size="20" /><text>
        每一份小期待，都已经变成奖励。兑换即完成，无需再确认领取。
      </text>
    </view>
    <view v-for="order in orders" :key="order.id" class="card mb-3">
      <view class="flex items-center gap-3">
        <view class="h-64px w-70px overflow-hidden rounded-3">
          <image
            v-if="order.image"
            :src="order.image"
            mode="aspectFill"
            class="h-full w-full"
          />
          <BabyArt
            v-else
            :name="
              order.source === 'wheel'
                ? 'bear-gift'
                : order.name.includes('冰淇淋')
                  ? 'icecream'
                  : order.name.includes('电影')
                    ? 'movie'
                    : 'blocks'
            "
          />
        </view>
        <view class="min-w-0 flex-1">
          <view class="text-15px font-bold">
            {{ order.name }}
          </view><view class="muted mt-1 text-10px">
            {{ sourceLabels[order.source] }} ·
            {{ displayDate(order.createdAt) }}
          </view><view class="mt-2 text-11px text-primary">
            {{
              order.source === "collection"
                ? `刮卡累计消耗 ${order.points} 积分`
                : `${order.points} 积分`
            }}
            · {{ order.memberName }}
          </view>
        </view>
        <BabyIcon name="check" :size="20" />
      </view>
    </view>
    <view v-if="!orders.length" class="empty-state">
      <view class="h-130px w-160px">
        <BabyArt name="bear-gift" />
      </view><text class="font-bold">这里还没有兑换记录</text><text class="muted mt-2 text-12px">
        小小心愿，会随着努力慢慢实现。
      </text>
    </view>
  </BabyPage>
</template>
