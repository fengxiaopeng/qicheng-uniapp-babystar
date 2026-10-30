<script setup lang="ts">
import type { ScratchActivity } from '../../domain/types'
import { computed, reactive, ref } from 'vue'
import { newId, useBaby } from '../../application/use-baby'
import { chooseRewardImage } from '../../data/local-image'
import BabyIcon from '../BabyIcon.vue'
import BabySheet from '../BabySheet.vue'
import ScratchTile from './ScratchTile.vue'

defineProps<{ management?: boolean }>()
const { scratchActivities, child, send, busy, isAdmin, points } = useBaby()
const selectedId = ref('')
const activity = computed(
  () =>
    scratchActivities.value.find(a => a.id === selectedId.value)
    ?? scratchActivities.value.find(a => !a.completedAt)
    ?? scratchActivities.value[0],
)
const activeIndex = ref<number | null>(null)
const activePiece = computed(
  () =>
    activity.value?.pieces.find(
      p => p.index === activeIndex.value && p.entryId && !p.revealed,
    ) ?? activity.value?.pieces.find(p => p.entryId && !p.revealed),
)
const editing = ref(false)
const processingImage = ref(false)
const pendingPiece = ref<number | null>(null)
const confirmExchange = ref(false)
const draft = reactive<ScratchActivity>({
  id: '',
  childId: '',
  name: '',
  image: '',
  gridSize: 3,
  pointsPerPiece: 5,
  pieces: [],
  createdAt: '',
})
const revealedCount = computed(
  () => activity.value?.pieces.filter(p => p.revealed).length ?? 0,
)
const allRevealed = computed(() =>
  Boolean(activity.value && activity.value.pieces.every(p => p.revealed)),
)
const canEdit = computed(
  () => activity.value && !activity.value.pieces.some(p => p.entryId),
)
function edit(value?: ScratchActivity) {
  Object.assign(
    draft,
    value ?? {
      id: newId('scratch'),
      childId: child.value?.id,
      name: '',
      image: '',
      gridSize: 3,
      pointsPerPiece: 5,
      pieces: [],
      createdAt: new Date().toISOString(),
    },
  )
  editing.value = true
}
async function upload() {
  processingImage.value = true
  try {
    const image = await chooseRewardImage()
    if (image)
      draft.image = image
  }
  catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '图片读取失败',
      icon: 'none',
    })
  }
  finally {
    processingImage.value = false
  }
}
async function save() {
  const result = await send({
    id: newId(),
    type: 'saveScratch',
    activity: { ...draft, pointsPerPiece: Number(draft.pointsPerPiece) },
  })
  if (result) {
    selectedId.value = draft.id
    editing.value = false
  }
}
async function buy() {
  if (!activity.value || pendingPiece.value === null)
    return
  if (
    await send({
      id: newId(),
      type: 'buyScratchPiece',
      activityId: activity.value.id,
      index: pendingPiece.value,
    })
  ) {
    activeIndex.value = pendingPiece.value
    pendingPiece.value = null
  }
}
async function reveal(index: number) {
  if (activity.value) {
    await send(
      {
        id: newId(),
        type: 'revealScratchPiece',
        activityId: activity.value.id,
        index,
      },
      true,
    )
  }
}
async function redeem() {
  if (
    activity.value
    && (await send({
      id: newId(),
      type: 'redeemScratch',
      activityId: activity.value.id,
    }))
  ) {
    confirmExchange.value = false
  }
}
</script>

<template>
  <view>
    <view class="rewards-banner mint !min-h-110px">
      <view class="text-22px font-bold">
        一点点刮开，小心愿成真
      </view><text class="mt-2 block text-11px leading-5">
        每次用积分刮开一格，揭开整张图片，<br>就可以兑换这份约定好的奖励。
      </text>
    </view>
    <view v-if="scratchActivities.length > 1" class="my-3 flex flex-wrap gap-2">
      <button
        v-for="item in scratchActivities"
        :key="item.id"
        class="scratch-chip"
        :class="{ active: activity?.id === item.id }"
        @click="selectedId = item.id"
      >
        {{ item.name }}{{ item.completedAt ? " ✓" : "" }}
      </button>
    </view>
    <view v-if="activity" :key="activity.id" class="card mt-4">
      <view class="section-heading">
        <view>
          <text class="section-title">{{ activity.name }}</text><text class="muted mt-1 block text-11px">
            已揭开 {{ revealedCount }} / {{ activity.pieces.length }} 格 · 每格
            {{ activity.pointsPerPiece }} 积分
          </text>
        </view><button
          v-if="management && canEdit"
          class="icon-button"
          aria-label="编辑刮卡奖励"
          @click="edit(activity)"
        >
          <BabyIcon name="edit" :size="19" />
        </button>
      </view>
      <view class="scratch-board">
        <image
          :src="activity.image"
          mode="aspectFill"
          class="scratch-picture"
        />
        <view
          class="scratch-grid"
          :style="{
            gridTemplateColumns: `repeat(${activity.gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${activity.gridSize}, 1fr)`,
          }"
        >
          <ScratchTile
            v-for="piece in activity.pieces"
            :key="`${activity.id}-${piece.index}`"
            :canvas-id="`scratch-${activity.id}-${piece.index}`"
            :index="piece.index"
            :active="piece.index === activePiece?.index"
            :paid="Boolean(piece.entryId)"
            :revealed="piece.revealed"
            :cost="activity.pointsPerPiece"
            :busy="busy"
            :dense="activity.gridSize === 4"
            @resume="activeIndex = piece.index"
            @buy="pendingPiece = piece.index"
            @reveal="reveal(piece.index)"
          />
        </view>
      </view>
      <view class="progress-track my-4">
        <view
          class="progress-fill !bg-#4d8e6e"
          :style="{
            width: `${(revealedCount / activity.pieces.length) * 100}%`,
          }"
        />
      </view>
      <view v-if="activity.completedAt" class="note justify-center">
        <BabyIcon name="check" :size="18" /><text>
          这份小心愿已经兑换完成
        </text>
      </view>
      <button
        v-else
        class="button"
        :class="allRevealed ? 'button-primary' : 'button-disabled'"
        :disabled="busy || !allRevealed"
        @click="confirmExchange = true"
      >
        {{
          allRevealed
            ? "图片已揭开 · 兑换奖励"
            : `再刮开 ${activity.pieces.length - revealedCount} 格，心愿就能实现`
        }}
      </button>
      <text class="footnote">
        已支付的格子可以随时继续刮开，不会重复扣分。全部刮开后兑换，不再额外扣积分。
      </text>
    </view>
    <view v-else class="empty-state mt-4">
      <text class="text-36px">🖼️</text><text class="mt-3 font-bold">把小心愿藏进一张图片</text><text class="muted mt-2 text-12px">
        请管理员上传奖励图片，设置格数与每格积分。
      </text>
    </view>
    <button v-if="isAdmin" class="button button-outline mt-4" @click="edit()">
      <BabyIcon name="plus" :size="19" />{{
        management ? "新建图片刮卡奖励" : "设置图片刮卡奖励"
      }}
    </button>
    <BabySheet
      :open="editing"
      :title="
        scratchActivities.some((a) => a.id === draft.id)
          ? '编辑图片刮卡'
          : '新建图片刮卡'
      "
      @close="editing = false"
    >
      <text class="field-label">约定的奖励名称</text><input
        v-model="draft.name"
        class="field-input"
        :maxlength="30"
        placeholder="比如：一起去动物园"
        aria-label="刮卡奖励名称"
      >
      <text class="field-label mt-4">奖励图片</text><button class="image-upload" :disabled="processingImage" @click="upload">
        <image
          v-if="draft.image"
          :src="draft.image"
          mode="aspectFill"
          class="h-full w-full"
        /><view v-else class="text-center">
          <BabyIcon name="plus" :size="28" /><text class="mt-2 block">
            {{ processingImage ? "正在处理图片…" : "从相册选择或拍摄图片" }}
          </text>
        </view>
      </button><text class="muted mt-2 block text-10px">
        图片保存在本机，自动分格，无需手工裁切。已开始刮开的奖励不能更改。
      </text>
      <text class="field-label mt-4">拆分成多少格？</text><view class="segmented mb-4">
        <button
          v-for="size in [2, 3, 4] as const"
          :key="size"
          class="segment"
          :class="{ active: draft.gridSize === size }"
          @click="draft.gridSize = size"
        >
          {{ size * size }} 格
        </button>
      </view>
      <text class="field-label">每次刮一格消耗</text><input
        v-model="draft.pointsPerPiece"
        class="field-input"
        type="number"
        aria-label="每格积分"
      ><view class="note my-4">
        共 {{ draft.gridSize ** 2 }} 格，全部刮开累计消耗
        {{ draft.gridSize ** 2 * Number(draft.pointsPerPiece || 0) }}
        积分。
      </view><button
        class="button button-primary"
        :disabled="busy || processingImage || !draft.image"
        @click="save"
      >
        保存图片刮卡奖励
      </button>
    </BabySheet>
    <BabySheet
      :open="pendingPiece !== null"
      title="刮开一点小期待？"
      @close="pendingPiece = null"
    >
      <template v-if="activity">
        <view class="form-row">
          <text>本次消耗</text><text class="points-text text-21px font-bold">
            {{ activity.pointsPerPiece }} 积分
          </text>
        </view><view class="form-row">
          <text>当前积分</text><text>{{ points }}</text>
        </view><view class="form-row">
          <text>支付后剩余</text><text>{{ points - activity.pointsPerPiece }}</text>
        </view><view class="note my-4">
          支付后，在选中的格子上滑动即可刮开。中途退出也可以免费继续。
        </view><button
          class="button"
          :class="
            points >= activity.pointsPerPiece
              ? 'button-primary'
              : 'button-disabled'
          "
          :disabled="busy || points < activity.pointsPerPiece"
          @click="buy"
        >
          {{
            points >= activity.pointsPerPiece
              ? `支付 ${activity.pointsPerPiece} 积分，开始刮开`
              : "积分还不够，再完成一些任务吧"
          }}
        </button>
      </template>
    </BabySheet>
    <BabySheet
      :open="confirmExchange"
      title="小心愿，终于完整出现啦"
      @close="confirmExchange = false"
    >
      <template v-if="activity">
        <image
          :src="activity.image"
          mode="aspectFill"
          class="mx-auto block h-180px w-full rounded-4"
        /><text class="my-4 block text-center text-19px font-bold">
          {{ activity.name }}
        </text><view class="note mb-4">
          全部格子已刮开，确认后立即完成奖励兑换，不再额外扣积分。
        </view><button class="button button-primary" :disabled="busy" @click="redeem">
          确认兑换奖励
        </button>
      </template>
    </BabySheet>
  </view>
</template>

<style scoped lang="scss">
.scratch-board {
  position: relative;
  height: 0;
  padding-bottom: 100%;
  overflow: hidden;
  border-radius: 15px;
  background: #e4ebdd;
}
.scratch-picture,
.scratch-grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.scratch-grid {
  display: grid;
  gap: 2px;
}
.baby-page .scratch-chip {
  padding: 8px 11px;
  border: 1px solid #d8e3d1;
  border-radius: 20px;
  background: #fff;
  font-size: 11px;
}
.baby-page .scratch-chip.active {
  background: #34785c;
  color: #fff;
}
.baby-sheet .image-upload {
  display: flex;
  width: 100%;
  height: 150px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border: 1px dashed #9eb593;
  border-radius: 13px;
  background: #f0f5e9;
  color: #66805c;
  font-size: 12px;
}
</style>
