<script setup lang="ts">
withDefaults(defineProps<{ name: string, size?: number }>(), { size: 22 })
const icons: Record<string, string> = {
  home: 'i-carbon-home',
  tasks: 'i-carbon-task',
  gift: 'i-carbon-gift',
  user: 'i-carbon-user-avatar',
  back: 'i-carbon-chevron-left',
  next: 'i-carbon-chevron-right',
  down: 'i-carbon-chevron-down',
  plus: 'i-carbon-add',
  close: 'i-carbon-close',
  check: 'i-carbon-checkmark',
  chart: 'i-carbon-chart-column',
  ledger: 'i-carbon-catalog',
  settings: 'i-carbon-settings',
  family: 'i-carbon-group',
  edit: 'i-carbon-edit',
  help: 'i-carbon-help',
  clock: 'i-carbon-time',
  leaf: 'i-carbon-sprout',
  star: 'i-carbon-star-filled',
  download: 'i-carbon-download',
}
</script>

<template>
  <view
    :class="icons[name] || icons.star"
    :style="{ width: `${size}px`, height: `${size}px`, flexShrink: 0 }"
    aria-hidden="true"
  />
</template>
