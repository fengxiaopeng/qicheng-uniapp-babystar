<script setup lang="ts">
import { computed, ref } from 'vue'
import { navigate, useBaby } from '@/features/baby/application/use-baby'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import TaskRow from '@/features/baby/components/TaskRow.vue'
import { TASK_CATEGORIES } from '@/features/baby/domain/rules'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '任务设置' },
})
const { tasks, isAdmin } = useBaby()
const category = ref('全部')
const list = computed(() =>
  tasks.value.filter(
    t => category.value === '全部' || t.category === category.value,
  ),
)
</script>

<template>
  <BabyPage title="任务设置" back>
    <view v-if="!isAdmin" class="note">
      仅管理员可以设置任务，请先切换管理员。
    </view>
    <template v-else>
      <view class="note mb-4">
        <BabyIcon name="clock" :size="20" /><text>
          设置一次，自动执行。每日任务长期保留，单次任务完成即结束，周末任务只在周六、周日出现。
        </text>
      </view>
      <view class="mb-4 flex flex-wrap gap-2">
        <button
          v-for="item in ['全部', ...TASK_CATEGORIES]"
          :key="item"
          class="tag !px-3 !py-2"
          :class="{ '!bg-#34785c !text-white': category === item }"
          @click="category = item"
        >
          {{ item }}
        </button>
      </view>
      <view v-if="list.length" class="card">
        <TaskRow v-for="task in list" :key="task.id" :task="task" manage />
      </view>
      <view v-else class="empty-state">
        <text class="text-30px">🌱</text><text class="mt-3">还没有这类任务，添加一个小目标吧。</text>
      </view>
      <button
        class="button button-primary mt-4"
        @click="navigate('/pages/tasks/edit')"
      >
        <BabyIcon name="plus" :size="20" />新建任务
      </button>
    </template>
  </BabyPage>
</template>
