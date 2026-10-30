<script setup lang="ts">
import { ref } from 'vue'
import { useBaby } from '@/features/baby/application/use-baby'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import CollectionRewards from '@/features/baby/components/rewards/CollectionRewards.vue'
import WishRewards from '@/features/baby/components/rewards/WishRewards.vue'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '奖励设置' },
})
const { isAdmin } = useBaby()
const tab = ref('wish')
</script>

<template>
  <BabyPage title="奖励设置" back>
    <view v-if="!isAdmin" class="note">
      仅管理员可以设置奖励，请先切换管理员。
    </view>
    <template v-else>
      <view class="note mb-4">
        和宝宝一起约定小心愿。普通奖励兑换即完成，图片刮卡会按格消耗积分，全部刮开后兑换。
      </view>
      <view class="segmented mb-4">
        <button
          class="segment"
          :class="{ active: tab === 'wish' }"
          @click="tab = 'wish'"
        >
          心愿奖励
        </button><button
          class="segment"
          :class="{ active: tab === 'scratch' }"
          @click="tab = 'scratch'"
        >
          图片刮卡
        </button>
      </view>
      <WishRewards v-if="tab === 'wish'" management />
      <CollectionRewards v-else management />
    </template>
  </BabyPage>
</template>
