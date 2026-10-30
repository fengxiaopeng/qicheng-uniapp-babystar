<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import { useBaby } from '../application/use-baby'
import BabyIcon from './BabyIcon.vue'
import ChildSwitcher from './ChildSwitcher.vue'

defineProps<{ title: string, back?: boolean, root?: boolean, hideChildSwitcher?: boolean }>()
const { error, refresh } = useBaby()
const statusHeight = ref(0)
onMounted(() => {
  // #ifndef H5
  statusHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
  // #endif
  void refresh()
})
onShow(() => {
  void refresh()
})
function goBack() {
  if (getCurrentPages().length > 1)
    uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="baby-page" :class="{ 'root-page': root }">
    <view class="baby-header" :style="{ paddingTop: `${statusHeight}px` }">
      <view class="header-inner">
        <button
          v-if="back"
          class="icon-button header-left"
          aria-label="返回"
          @click="goBack"
        >
          <BabyIcon name="back" :size="25" />
        </button>
        <text class="text-18px font-bold tracking-1px">{{ title }}</text>
        <!-- #ifdef H5 -->
        <view v-if="!hideChildSwitcher" class="header-right">
          <ChildSwitcher compact />
        </view>
        <!-- #endif -->
      </view>
      <!-- #ifndef H5 -->
      <view v-if="!hideChildSwitcher" class="flex items-center justify-between px-4 pb-3">
        <ChildSwitcher compact />
        <text class="muted text-10px">一起看见每一步成长</text>
      </view>
      <!-- #endif -->
    </view>
    <view v-if="error" class="mx-4 mt-4 rounded-4 bg-#ffeed9 p-4 text-14px">
      <text>{{ error }}</text>
      <button class="button button-outline mt-3" @click="refresh">
        重新读取
      </button>
    </view>
    <view v-else class="page-content">
      <slot />
    </view>
    <view class="page-bottom-space" />
  </view>
</template>
