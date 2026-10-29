<script setup lang="ts">
import { ref } from 'vue'
import { navigate, useBaby } from '@/features/baby/application/use-baby'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import WishRewards from '@/features/baby/components/rewards/WishRewards.vue'
import LuckyWheel from '@/features/baby/components/rewards/LuckyWheel.vue'
import CollectionRewards from '@/features/baby/components/rewards/CollectionRewards.vue'

definePage({ style: { navigationStyle: 'custom', navigationBarTitleText: '奖励' } })
const { points } = useBaby()
const tab = ref('wish')
</script>

<template>
  <BabyPage title="奖励" root>
    <view class="mb-4 mt-1 flex items-center justify-between">
      <view class="balance-pill">
        <view class="coin">
          ★
        </view><text class="text-12px">可用积分</text><text class="points-text text-23px font-bold">{{ points }}</text>
      </view>
      <button class="text-link" @click="navigate('/pages/rewards/history')">
        兑换记录 <BabyIcon name="next" :size="15" />
      </button>
    </view>
    <view class="segmented mb-4">
      <button
        v-for="item in [
          ['wish', '心愿兑换'],
          ['wheel', '幸运转盘'],
          ['collection', '集卡兑换'],
        ]"
        :key="item[0]"
        class="segment"
        :class="{ active: tab === item[0] }"
        @click="tab = item[0]"
      >
        {{ item[1] }}
      </button>
    </view>

    <WishRewards v-if="tab === 'wish'" />
    <LuckyWheel v-else-if="tab === 'wheel'" />
    <CollectionRewards v-else />
  </BabyPage>
</template>
