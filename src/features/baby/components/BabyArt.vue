<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <image
    :src="`/static/baby/${name}.svg`"
    mode="aspectFit"
    class="h-full w-full"
  />
</template>
