<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import FgTabbar from '@/tabbar/index.vue'
import { isPageTabbar } from './tabbar/store'
import { currRoute } from './utils'

// Keep the bottom navigation on root tabs only; detail pages own their back navigation.
const isCurrentPageTabbar = ref(true)
onShow(() => {
  isCurrentPageTabbar.value = isPageTabbar(currRoute().path)
})
</script>

<template>
  <view>
    <KuRootView />
    <FgTabbar v-if="isCurrentPageTabbar" />
  </view>
</template>
