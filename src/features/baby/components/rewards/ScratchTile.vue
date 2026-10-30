<script setup lang="ts">
import {
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

// #ifdef MP-WEIXIN
defineOptions({ options: { virtualHost: true } })
// #endif

const props = defineProps<{
  canvasId: string
  index: number
  active: boolean
  paid: boolean
  revealed: boolean
  cost: number
  busy: boolean
  dense?: boolean
}>()
const emit = defineEmits<{ buy: [], resume: [], reveal: [] }>()
const instance = getCurrentInstance()
const area = ref({ width: 0, height: 0, left: 0, top: 0 })
const coverage = new Set<number>()
let context: UniApp.CanvasContext | undefined
let disposed = false
let drawing = false
let requested = false
let disposePointer: (() => void) | undefined

function measure() {
  return new Promise<void>((resolve) => {
    if (!instance?.proxy) {
      resolve()
      return
    }
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .select('.scratch-tile')
      .boundingClientRect((rect) => {
        if (rect && !Array.isArray(rect)) {
          area.value = {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top,
          }
        }
        resolve()
      })
      .exec()
  })
}
async function paint() {
  if (!props.active || !props.paid || props.revealed) {
    disposePointer?.()
    return
  }
  await nextTick()
  await measure()
  if (
    disposed
    || !props.active
    || props.revealed
    || !instance?.proxy
    || !area.value.width
  ) {
    return
  }
  coverage.clear()
  context = uni.createCanvasContext(props.canvasId, instance.proxy)
  context.setFillStyle('#d5decf')
  context.fillRect(0, 0, area.value.width, area.value.height)
  context.setFillStyle('#54795b')
  context.setTextAlign('center')
  context.setFontSize(props.dense ? 11 : 14)
  context.fillText('✦', area.value.width / 2, area.value.height / 2 - 9)
  context.fillText(
    '滑动刮开',
    area.value.width / 2,
    area.value.height / 2 + 15,
  )
  context.draw()
  // #ifdef H5
  disposePointer?.()
  const element = document.getElementById(props.canvasId)
  if (element) {
    const point = (e: PointerEvent) => {
      const bounds = element.getBoundingClientRect()
      scratch(e.clientX - bounds.left, e.clientY - bounds.top)
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        drawing = true
        point(e)
        e.preventDefault()
      }
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && drawing) {
        point(e)
        e.preventDefault()
      }
    }
    const up = () => {
      drawing = false
    }
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointerleave', up)
    disposePointer = () => {
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointerleave', up)
    }
  }
  // #endif
}
function reveal() {
  if (props.busy || props.revealed || requested)
    return
  requested = true
  emit('reveal')
}
function scratch(x: number, y: number) {
  if (!context || !props.paid || props.revealed || requested)
    return
  const { width, height } = area.value
  const radius = Math.max(12, width * 0.13)
  context.clearRect(x - radius, y - radius, radius * 2, radius * 2)
  context.draw(true)
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      if (
        Math.abs(((column + 0.5) / 8) * width - x) <= radius
        && Math.abs(((row + 0.5) / 8) * height - y) <= radius
      ) {
        coverage.add(row * 8 + column)
      }
    }
  }
  if (coverage.size >= 24)
    reveal()
}
interface ScratchTouch {
  touches?: { x?: number, y?: number, clientX?: number, clientY?: number }[]
}
function touch(event: ScratchTouch) {
  const point = event.touches?.[0]
  if (point) {
    scratch(
      point.x ?? (point.clientX ?? 0) - area.value.left,
      point.y ?? (point.clientY ?? 0) - area.value.top,
    )
  }
}
async function start(event: ScratchTouch) {
  await measure()
  touch(event)
}
onMounted(paint)
watch(() => [props.paid, props.active, props.revealed], paint)
watch(
  () => props.busy,
  (busy) => {
    if (!busy && !props.revealed)
      requested = false
  },
)
onBeforeUnmount(() => {
  disposed = true
  disposePointer?.()
})
</script>

<template>
  <view class="scratch-tile" :class="{ dense }">
    <button
      v-if="!paid"
      class="scratch-cover"
      :disabled="busy"
      :aria-label="`解锁第${index + 1}格，${cost}积分`"
      @click="emit('buy')"
    >
      <text class="scratch-number">{{ index + 1 }}</text><text class="mt-1 block text-12px font-semibold">{{ cost }} 积分</text><text v-if="!dense" class="mt-1 block text-10px opacity-70">
        解锁后刮开
      </text>
    </button>
    <button
      v-else-if="!revealed && !active"
      class="scratch-cover"
      :aria-label="`继续刮开第${index + 1}格`"
      @click="emit('resume')"
    >
      <text class="scratch-number">{{ index + 1 }}</text><text class="mt-1 block text-11px">已支付，继续刮开</text>
    </button>
    <template v-else-if="!revealed">
      <canvas
        :id="canvasId"
        :canvas-id="canvasId"
        class="scratch-canvas"
        :disable-scroll="true"
        @touchstart.stop.prevent="start"
        @touchmove.stop.prevent="touch"
      />
      <button
        class="scratch-access"
        :disabled="busy"
        :aria-label="`直接揭开第${index + 1}格`"
        @click="reveal"
      >
        直接揭开
      </button>
    </template>
    <view v-else class="scratch-revealed">
      <text>✓</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.scratch-tile {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.baby-page .scratch-cover {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #d7dfcb;
  color: #557555;
}
.scratch-number {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid #91ac81;
  border-radius: 50%;
  font-size: 15px;
}
.dense .scratch-number {
  width: 23px;
  height: 23px;
  font-size: 12px;
}
.scratch-canvas {
  width: 100%;
  height: 100%;
}
.baby-page .scratch-access {
  position: absolute;
  bottom: 3px;
  left: 0;
  right: 0;
  width: 100%;
  color: #436449;
  font-size: 10px;
  text-decoration: underline;
}
.scratch-revealed {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px #ffffff60;
}
.scratch-revealed text {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #34785cb0;
  color: #fff;
  font-size: 10px;
}
</style>
