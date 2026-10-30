<script setup lang="ts">
import type { Reward } from '../../domain/types'
import { reactive, ref } from 'vue'
import { newId, useBaby } from '../../application/use-baby'
import BabyArt from '../BabyArt.vue'
import BabyIcon from '../BabyIcon.vue'
import BabySheet from '../BabySheet.vue'

const props = withDefaults(defineProps<{ management?: boolean }>(), {
  management: false,
})
const { child, points, rewards, send, busy, isAdmin } = useBaby()
const selected = ref<Reward | null>(null)
const manage = ref(props.management)
const editOpen = ref(false)
const draft = reactive<Reward>({
  id: '',
  childId: '',
  name: '',
  points: 50,
  art: 'icecream',
})
const artOptions: Reward['art'][] = ['icecream', 'park', 'movie', 'blocks']
const artLabels = {
  icecream: '冰淇淋',
  park: '公园',
  movie: '电影',
  blocks: '积木',
}
function editReward(reward?: Reward) {
  Object.assign(
    draft,
    reward ?? {
      id: newId('reward'),
      childId: child.value?.id,
      name: '',
      points: 50,
      art: 'icecream',
    },
  )
  editOpen.value = true
}
async function saveReward() {
  if (
    await send({
      id: newId(),
      type: 'saveReward',
      reward: { ...draft, points: Number(draft.points) },
    })
  ) {
    editOpen.value = false
  }
}
async function redeem() {
  if (!selected.value)
    return
  if (await send({ id: newId(), type: 'redeem', rewardId: selected.value.id }))
    selected.value = null
}
</script>

<template>
  <view>
    <view class="rewards-banner peach">
      <view class="relative z-1">
        <view class="text-22px font-bold tracking-1px">
          小小努力，大大惊喜
        </view><view class="mt-2 text-11px text-#8f6f48 leading-5">
          每一份坚持，<br>都会离心愿更近一步！
        </view>
      </view>
      <view class="banner-art">
        <BabyArt name="bear-gift" />
      </view>
    </view>
    <view class="section-heading mb-3 mt-4">
      <text class="section-title">我的小心愿</text><button
        v-if="isAdmin && !management"
        class="text-link"
        @click="manage = !manage"
      >
        {{ manage ? "完成管理" : "管理" }}
        <BabyIcon :name="manage ? 'check' : 'next'" :size="14" />
      </button>
    </view>
    <view class="grid grid-cols-2 gap-3">
      <view v-for="reward in rewards" :key="reward.id" class="reward-card">
        <view class="reward-art">
          <BabyArt :name="reward.art" />
        </view>
        <view class="px-1 pb-1 pt-2">
          <view class="mb-2 text-14px font-semibold">
            {{ reward.name }}
          </view><view class="flex flex-wrap items-center justify-between gap-2">
            <view class="points-text">
              <text class="text-20px font-bold">{{ reward.points }}</text><text class="ml-1 text-10px">积分</text>
            </view><button
              v-if="manage"
              class="button button-small button-outline"
              @click="editReward(reward)"
            >
              编辑
            </button><button
              v-else
              class="button button-small"
              :class="
                points >= reward.points ? 'button-primary' : 'button-disabled'
              "
              :disabled="points < reward.points"
              @click="selected = reward"
            >
              {{
                points >= reward.points
                  ? "兑换"
                  : `还差${reward.points - points}积分`
              }}
            </button>
          </view>
        </view>
      </view>
    </view>
    <view v-if="!rewards.length" class="empty-state">
      <text class="text-36px">🎁</text><text class="mt-3 font-bold">给努力一个小小的期待</text><text class="muted mt-2 text-12px">
        和宝宝一起，添加想实现的心愿吧。
      </text>
    </view>
    <button
      v-if="isAdmin && (manage || !rewards.length)"
      class="button button-outline mt-4"
      @click="editReward()"
    >
      <BabyIcon name="plus" :size="19" />添加小心愿
    </button>

    <BabySheet
      :open="Boolean(selected)"
      title="兑换这份小期待？"
      @close="selected = null"
    >
      <template v-if="selected">
        <view class="mx-auto h-110px w-150px">
          <BabyArt :name="selected.art" />
        </view><view class="mb-5 mt-2 text-center text-18px font-bold">
          {{ selected.name }}
        </view>
        <view class="form-row">
          <text>本次消耗</text><text class="points-text text-20px font-bold">
            {{ selected.points }} 积分
          </text>
        </view>
        <view class="form-row">
          <text>当前积分</text><text>{{ points }} 积分</text>
        </view>
        <view class="form-row">
          <text>兑换后剩余</text><text>{{ points - selected.points }} 积分</text>
        </view>
        <view class="note my-4 justify-center">
          <BabyIcon name="clock" :size="17" /><text>
            确认后立即完成兑换，并自动记入成长记录
          </text>
        </view>
        <button class="button button-primary" :disabled="busy" @click="redeem">
          {{ busy ? "兑换中…" : `确认兑换 · ${selected.points}积分` }}
        </button>
        <button
          class="text-link mx-auto mt-3 justify-center !flex"
          @click="selected = null"
        >
          再想想
        </button>
      </template>
    </BabySheet>
    <BabySheet
      :open="editOpen"
      :title="
        rewards.some((r) => r.id === draft.id) ? '编辑小心愿' : '添加小心愿'
      "
      @close="editOpen = false"
    >
      <text class="field-label">奖励名称</text><input
        v-model="draft.name"
        class="field-input"
        :maxlength="20"
        placeholder="比如：亲子电影之夜"
        aria-label="奖励名称"
      ><text class="field-label mt-5">需要多少积分？</text><input
        v-model="draft.points"
        class="field-input"
        type="number"
        aria-label="兑换所需积分"
      ><text class="field-label mt-5">选择封面</text><view class="grid grid-cols-4 mb-5 gap-2">
        <button
          v-for="art in artOptions"
          :key="art"
          class="h-60px overflow-hidden border-2 rounded-3 border-solid"
          :class="draft.art === art ? 'border-primary' : 'border-transparent'"
          :aria-label="`选择${artLabels[art]}封面`"
          @click="draft.art = art"
        >
          <BabyArt :name="art" />
        </button>
      </view><button
        class="button button-primary"
        :disabled="busy"
        @click="saveReward"
      >
        保存小心愿
      </button>
    </BabySheet>
  </view>
</template>
