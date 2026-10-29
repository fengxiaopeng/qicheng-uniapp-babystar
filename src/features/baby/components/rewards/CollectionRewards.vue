<script setup lang="ts">
import type { TaskIcon } from '../../domain/types'
import { computed, ref } from 'vue'
import { newId, switchTab, useBaby } from '../../application/use-baby'
import {
  availableCards,
  COLLECTION_REWARD,
  TASK_EMOJI,
} from '../../domain/rules'
import BabyArt from '../BabyArt.vue'
import BabyIcon from '../BabyIcon.vue'
import BabySheet from '../BabySheet.vue'

const { state, cardCount, tasks, busy, send } = useBaby()
const collectionConfirm = ref(false)
const showCardHelp = ref(false)
const definitions: { icon: TaskIcon, name: string, animal: string }[] = [
  { icon: 'book', name: '勇气小熊', animal: 'bear' },
  { icon: 'brush', name: '友善小鹿', animal: 'deer' },
  { icon: 'ball', name: '专注猫头鹰', animal: 'owl' },
  { icon: 'plant', name: '勤劳松鼠', animal: 'squirrel' },
  { icon: 'art', name: '坚持小兔', animal: 'rabbit' },
  { icon: 'blocks', name: '探索小狐狸', animal: 'fox' },
]
const cards = computed(() =>
  definitions.map(card => ({
    ...card,
    count: state.value ? availableCards(state.value, card.icon).length : 0,
    task:
      tasks.value.find(t => t.icon === card.icon)?.name
      ?? '添加对应图标的任务',
  })),
)
async function collect() {
  if (await send({ id: newId(), type: 'redeemCollection' }))
    collectionConfirm.value = false
}
</script>

<template>
  <view>
    <view class="rewards-banner mint !min-h-142px">
      <view class="relative z-1">
        <view class="text-22px font-bold">
          集齐小小勇气
        </view><text class="mt-2 block text-11px">
          森林探险卡 · 集齐6张换亲子露营
        </text><view class="mt-4 text-12px">
          已收集
          <text class="points-text text-17px font-bold">{{ cardCount }}</text>
          / 6
        </view><view class="progress-track mt-2 w-52">
          <view
            class="progress-fill !bg-#4d8e6e"
            :style="{ width: `${(cardCount / 6) * 100}%` }"
          />
        </view>
      </view>
      <view class="banner-art !w-172px !-right-10">
        <BabyArt name="card-bear" />
      </view>
    </view>
    <view class="grid grid-cols-2 mt-3 gap-3">
      <button
        v-for="card in cards"
        :key="card.icon"
        class="collection-card"
        @click="showCardHelp = true"
      >
        <view class="collection-art" :class="{ missing: !card.count }">
          <BabyArt :name="`card-${card.animal}`" />
        </view>
        <view class="relative z-1 flex-1">
          <view class="text-12px font-bold">
            {{ card.name }}
          </view><text class="tag mt-2" :class="{ 'missing-tag': !card.count }">
            {{
              card.count
                ? `已拥有${card.count > 1 ? ` ×${card.count}` : ""}`
                : "未收集"
            }}
          </text>
        </view>
      </button>
    </view>
    <button
      class="card mt-3 items-center justify-between !w-full !flex"
      @click="showCardHelp = true"
    >
      <text class="text-14px font-semibold">如何获得卡片？</text><BabyIcon name="next" :size="18" />
    </button>
    <text class="muted mx-2 my-3 block text-11px leading-5">
      完成指定图标的任务可获得对应卡片；<br>集齐后消耗一套卡片兑换，不扣积分。
    </text>
    <button
      class="button"
      :class="cardCount === 6 ? 'button-primary' : 'button-disabled'"
      :disabled="cardCount < 6 || busy"
      @click="collectionConfirm = true"
    >
      {{
        cardCount === 6 ? "兑换亲子露营" : `还差 ${6 - cardCount} 张，继续加油`
      }}
    </button>

    <BabySheet
      :open="showCardHelp"
      title="完成小任务，收集大勇气"
      @close="showCardHelp = false"
    >
      <view v-for="card in cards" :key="card.icon" class="choice-row">
        <view class="mr-3 text-28px">
          {{ TASK_EMOJI[card.icon] }}
        </view><view class="flex-1">
          <view class="font-semibold">
            {{ card.name }}
          </view><text class="muted mt-1 block text-11px">
            {{ card.task }}
          </text>
        </view><text class="tag">{{ card.count ? "已拥有" : "去收集" }}</text>
      </view><button
        class="button button-primary mt-4"
        @click="
          showCardHelp = false;
          switchTab('/pages/tasks/index');
        "
      >
        去完成任务
      </button><text class="footnote">
        每次记分获得一张同图标卡片；撤销记分会收回对应卡片。已用于兑换的卡片需先取消兑换，才能撤销。
      </text>
    </BabySheet>
    <BabySheet
      :open="collectionConfirm"
      title="把成长变成一次小冒险"
      @close="collectionConfirm = false"
    >
      <view class="mx-auto h-150px w-200px">
        <BabyArt name="park" />
      </view><view class="mt-3 text-center text-18px font-bold">
        {{ COLLECTION_REWARD }}
      </view><view class="note my-5">
        本次消耗六种卡片各一张，不扣除积分。兑换后由家长确认并发放奖励。
      </view><button class="button button-primary" :disabled="busy" @click="collect">
        确认兑换 · 消耗一套卡片
      </button>
    </BabySheet>
  </view>
</template>
