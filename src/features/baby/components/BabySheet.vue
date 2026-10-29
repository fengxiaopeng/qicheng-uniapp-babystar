<script setup lang="ts">
import BabyIcon from './BabyIcon.vue'

defineProps<{ open: boolean, title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <view
    v-if="open"
    class="baby-overlay"
    @click="emit('close')"
    @touchmove.stop.prevent
  >
    <view
      class="baby-sheet"
      role="dialog"
      :aria-label="title"
      @click.stop
      @touchmove.stop
    >
      <view class="sheet-handle" />
      <view class="mb-5 flex items-center justify-between gap-3">
        <text class="text-21px font-bold">{{ title }}</text>
        <button class="icon-button" aria-label="关闭" @click="emit('close')">
          <BabyIcon name="close" :size="22" />
        </button>
      </view>
      <scroll-view scroll-y class="sheet-scroll">
        <slot />
      </scroll-view>
    </view>
  </view>
</template>
