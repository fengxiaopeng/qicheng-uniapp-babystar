<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useBaby } from '@/features/baby/application/use-baby'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import CollectionRewards from '@/features/baby/components/rewards/CollectionRewards.vue'
import WheelSettingsEditor from '@/features/baby/components/rewards/WheelSettingsEditor.vue'
import WishRewards from '@/features/baby/components/rewards/WishRewards.vue'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '奖励设置' },
})
const { isAdmin } = useBaby()
const tab = ref('wish')
onLoad((options) => {
  if (options?.tab === 'wheel')
    tab.value = 'wheel'
})
</script>

<template>
  <BabyPage title="奖励设置" back>
    <view v-if="!isAdmin" class="note">
      仅管理员可以设置奖励，请先切换管理员。
    </view>
    <template v-else>
      <view class="note mb-4">
        和宝宝一起约定小心愿，在这里管理心愿、转盘和图片刮卡。
      </view>
      <view class="segmented mb-4">
        <button
          class="segment"
          :class="{ active: tab === 'wish' }"
          @click="tab = 'wish'"
        >
          心愿奖励
        </button><button class="segment" :class="{ active: tab === 'wheel' }" @click="tab = 'wheel'">
          幸运转盘
        </button><button
          class="segment"
          :class="{ active: tab === 'scratch' }"
          @click="tab = 'scratch'"
        >
          图片刮卡
        </button>
      </view>
      <WishRewards v-if="tab === 'wish'" management />
      <WheelSettingsEditor v-else-if="tab === 'wheel'" />
      <CollectionRewards v-else management />
    </template>
  </BabyPage>
</template>
