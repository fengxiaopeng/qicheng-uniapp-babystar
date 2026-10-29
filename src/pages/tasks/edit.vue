<script setup lang="ts">
import type { Category, Task } from '@/features/baby/domain/types'
import { onLoad } from '@dcloudio/uni-app'
import { reactive, ref } from 'vue'
import { newId, useBaby } from '@/features/baby/application/use-baby'
import BabyArt from '@/features/baby/components/BabyArt.vue'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import { CARD_ICONS, ICON_LABELS, TASK_EMOJI } from '@/features/baby/domain/rules'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '任务设置' },
})

const { state, child, busy, send, refresh, isAdmin } = useBaby()
const editing = ref(false)
const categories: Category[] = ['学习成长', '生活习惯', '运动健康']
const draft = reactive<Task>({
  id: newId('task'),
  childId: '',
  name: '',
  description: '每一次认真，都值得鼓励',
  icon: 'book',
  points: 10,
  category: '学习成长',
  frequency: 'daily',
  weekdays: [1],
  dailyLimit: 1,
  reminder: false,
  reminderTime: '20:00',
  archived: false,
})
onLoad(async (options) => {
  await refresh()
  draft.childId = child.value?.id ?? ''
  if (options?.id) {
    const task = state.value?.tasks.find(
      t => t.id === options.id && t.childId === child.value?.id,
    )
    if (task) {
      Object.assign(draft, JSON.parse(JSON.stringify(task)))
      editing.value = true
    }
  }
})
function toggleDay(day: number) {
  draft.weekdays = draft.weekdays.includes(day)
    ? draft.weekdays.filter(d => d !== day)
    : [...draft.weekdays, day]
}
async function save() {
  if (
    await send({
      id: newId(),
      type: 'saveTask',
      task: {
        ...draft,
        points: Number(draft.points),
        dailyLimit: Number(draft.dailyLimit),
      },
    })
  ) {
    uni.navigateBack()
  }
}
async function archive() {
  const answer = await uni.showModal({
    title: '停用这个任务？',
    content: '历史记分和已获得的卡片会完整保留。',
    confirmColor: '#34785c',
  })
  if (
    answer.confirm
    && (await send({ id: newId(), type: 'archiveTask', taskId: draft.id }))
  ) {
    uni.navigateBack()
  }
}
</script>

<template>
  <BabyPage :title="editing ? '编辑任务' : '新建任务'" back>
    <view v-if="!isAdmin" class="note mb-3">
      当前成员只能记录任务，请在家庭管理中切换到管理员后编辑。
    </view>
    <view class="card mb-3">
      <text class="field-label">选择任务图标</text>
      <view class="flex justify-between gap-2">
        <button
          v-for="icon in CARD_ICONS"
          :key="icon"
          class="icon-choice"
          :class="{ selected: draft.icon === icon }"
          :aria-label="`选择${ICON_LABELS[icon]}图标`"
          @click="draft.icon = icon"
        >
          {{ TASK_EMOJI[icon] }}
        </button>
      </view>
    </view>
    <view class="card mb-3">
      <text class="field-label">任务名称</text>
      <input
        v-model="draft.name"
        class="field-input"
        :maxlength="20"
        placeholder="比如：自主阅读20分钟"
        aria-label="任务名称"
      >
      <view class="muted mt-2 flex justify-between text-10px">
        <text>好的任务名称，更容易坚持哦～</text><text>{{ draft.name.length }}/20</text>
      </view>
      <view class="mt-5 flex items-center justify-between">
        <text class="font-semibold">每次奖励</text><view class="stepper">
          <button
            aria-label="减少积分"
            @click="draft.points = Math.max(1, Number(draft.points) - 1)"
          >
            −
          </button><input
            v-model="draft.points"
            type="number"
            aria-label="奖励积分"
          ><button
            aria-label="增加积分"
            @click="draft.points = Math.min(999, Number(draft.points) + 1)"
          >
            ＋
          </button>
        </view><text class="text-12px">积分</text>
      </view>
      <text class="muted mt-3 block text-10px">
        根据任务难度，设置合适的积分奖励
      </text>
    </view>
    <view class="card mb-3">
      <text class="field-label">完成规则</text>
      <view class="form-row">
        <text>重复频率</text><view class="segmented subtle w-64%">
          <button
            v-for="item in [
              ['daily', '每天'],
              ['weekly', '每周'],
              ['custom', '自定义'],
            ] as const"
            :key="item[0]"
            class="segment"
            :class="{ active: draft.frequency === item[0] }"
            @click="draft.frequency = item[0]"
          >
            {{ item[1] }}
          </button>
        </view>
      </view>
      <view
        v-if="draft.frequency !== 'daily'"
        class="my-3 flex justify-between gap-1"
      >
        <button
          v-for="(label, index) in ['一', '二', '三', '四', '五', '六', '日']"
          :key="label"
          class="weekday"
          :class="{ selected: draft.weekdays.includes((index + 1) % 7) }"
          @click="toggleDay((index + 1) % 7)"
        >
          {{ label }}
        </button>
      </view>
      <view class="form-row">
        <text>每天最多记录</text><picker
          :range="Array.from({ length: 20 }, (_, i) => `${i + 1} 次`)"
          :value="draft.dailyLimit - 1"
          @change="draft.dailyLimit = Number($event.detail.value) + 1"
        >
          <view class="flex items-center gap-2">
            {{ draft.dailyLimit }} 次 <BabyIcon name="next" :size="15" />
          </view>
        </picker>
      </view>
      <view class="form-row">
        <text>执行时间</text><text class="muted">不限，按自己的节奏完成</text>
      </view>
    </view>
    <view class="card mb-3">
      <text class="field-label">提醒与分类</text>
      <view class="form-row">
        <text>任务分类</text><picker
          :range="categories"
          :value="categories.indexOf(draft.category)"
          @change="draft.category = categories[Number($event.detail.value)]"
        >
          <view class="flex items-center gap-2">
            {{ draft.category }} <BabyIcon name="next" :size="15" />
          </view>
        </picker>
      </view>
      <view class="form-row">
        <text>提醒我</text><switch
          :checked="draft.reminder"
          color="#34785c"
          style="transform: scale(0.75); transform-origin: right center"
          @change="draft.reminder = $event.detail.value"
        />
      </view>
      <view v-if="draft.reminder" class="form-row">
        <text>提醒时间</text><picker
          mode="time"
          :value="draft.reminderTime"
          @change="draft.reminderTime = $event.detail.value"
        >
          <view class="flex items-center gap-2">
            {{ draft.reminderTime }} <BabyIcon name="next" :size="15" />
          </view>
        </picker>
      </view>
      <text v-if="draft.reminder" class="muted mt-2 block text-10px leading-5">
        提醒时间已记录，当前版本暂不发送消息通知。
      </text>
    </view>
    <view class="note mb-3 h-48px justify-center">
      <view class="h-54px w-65px">
        <BabyArt name="bear-star" />
      </view><text>每一次认真，都值得鼓励 <text class="text-#df967b">♥</text></text>
    </view>
    <button
      class="button button-primary"
      :disabled="busy || !isAdmin"
      @click="save"
    >
      {{ busy ? "正在保存…" : "保存任务" }}
    </button>
    <button
      v-if="editing && isAdmin"
      class="text-link mx-auto mt-3 justify-center !flex"
      @click="archive"
    >
      停用任务
    </button>
  </BabyPage>
</template>

<style scoped lang="scss">
.baby-page .icon-choice {
  display: flex;
  width: 42px;
  height: 46px;
  align-items: center;
  justify-content: center;
  border: 1.5px solid transparent;
  border-radius: 12px;
  background: #f5f4ed;
  font-size: 27px;
}
.baby-page .icon-choice.selected {
  border-color: #34785c;
  background: #eaf3eb;
}
.stepper {
  display: flex;
  overflow: hidden;
  align-items: center;
  border: 1px solid #e4e5dc;
  border-radius: 10px;
}
.stepper button {
  display: flex;
  width: 35px;
  height: 34px;
  align-items: center;
  justify-content: center;
  background: #f5f4ed;
  font-size: 21px;
}
.stepper input {
  width: 52px;
  text-align: center;
  font-size: 19px;
  font-weight: 600;
}
.baby-page .weekday {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f2eb;
  font-size: 12px;
}
.baby-page .weekday.selected {
  background: #34785c;
  color: #fff;
}
</style>
