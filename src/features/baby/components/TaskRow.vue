<script setup lang="ts">
import type { Task } from '../domain/types'
import { ref } from 'vue'
import { navigate, newId, useBaby } from '../application/use-baby'
import { TASK_EMOJI } from '../domain/rules'
import BabyIcon from './BabyIcon.vue'

const props = withDefaults(defineProps<{
  task: Task
  manage?: boolean
  scheduled?: boolean
}>(), { scheduled: true })
const { busy, completed, send, isAdmin } = useBaby()
const undoId = ref('')
async function record() {
  const receipt = await send({
    id: newId(),
    type: 'completeTask',
    taskId: props.task.id,
  })
  if (receipt?.entryId)
    undoId.value = receipt.entryId
}
async function undo() {
  if (
    await send({
      id: newId(),
      type: 'reverse',
      entryId: undoId.value,
      reason: '记分后立即撤销',
    })
  ) {
    undoId.value = ''
  }
}
</script>

<template>
  <view class="task-row">
    <view class="task-symbol" :class="task.icon">
      {{ TASK_EMOJI[task.icon] }}
    </view>
    <view
      class="min-w-0 flex-1"
      @click="manage && isAdmin && navigate(`/pages/tasks/edit?id=${task.id}`)"
    >
      <view class="task-name">
        {{ task.name }}
      </view>
      <view class="muted mt-1 text-11px leading-4">
        {{
          manage
            ? `${task.category} · ${task.frequency === "daily" ? "每天" : task.frequency === "weekly" ? "每周" : "自定义日期"} · 每天${task.dailyLimit}次`
            : task.description
        }}
      </view>
    </view>
    <view v-if="manage && isAdmin" class="flex items-center gap-2">
      <text class="points-text text-14px">+{{ task.points }}</text>
      <button
        class="icon-button"
        :aria-label="`编辑${task.name}`"
        @click="navigate(`/pages/tasks/edit?id=${task.id}`)"
      >
        <BabyIcon name="edit" :size="18" />
      </button>
    </view>
    <view v-else class="flex items-center gap-2">
      <text class="points-text whitespace-nowrap text-14px">
        +{{ task.points }}<text class="ml-1 text-10px">积分</text>
      </text>
      <view class="text-center">
        <button
          class="button button-small"
          :class="
            completed(task.id) >= task.dailyLimit
              ? 'button-disabled'
              : 'button-primary'
          "
          :disabled="
            busy || completed(task.id) >= task.dailyLimit || scheduled === false
          "
          :aria-label="`记录${task.name}`"
          @click="record"
        >
          {{
            completed(task.id) >= task.dailyLimit
              ? "已完成"
              : task.dailyLimit > 1
                ? `${completed(task.id)}/${task.dailyLimit} 记一笔`
                : "记一笔"
          }}
        </button>
        <button v-if="undoId" class="undo-link" :disabled="busy" @click="undo">
          撤销这次记分
        </button>
      </view>
    </view>
  </view>
</template>
