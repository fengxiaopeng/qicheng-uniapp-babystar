<script setup lang="ts">
import { computed, ref } from 'vue'
import { navigate, useBaby } from '@/features/baby/application/use-baby'
import BabyArt from '@/features/baby/components/BabyArt.vue'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import TaskRow from '@/features/baby/components/TaskRow.vue'
import { isScheduled, TASK_CATEGORIES } from '@/features/baby/domain/rules'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '任务' },
})

const { tasks, todayTasks, completed, isAdmin } = useBaby()
const tab = ref('today')
const category = ref('全部')
const manage = ref(false)
const list = computed(() =>
  (tab.value === 'today' ? todayTasks.value : tasks.value).filter(
    t => category.value === '全部' || t.category === category.value,
  ),
)
const done = computed(
  () => todayTasks.value.filter(t => completed(t.id) >= t.dailyLimit).length,
)
</script>

<template>
  <BabyPage title="成长任务" root>
    <view class="task-hero mb-4">
      <view class="relative z-1">
        <text class="text-21px font-bold">把好习惯，变成日常</text>
        <view class="muted mt-2 text-12px">
          不着急，每天进步一点点就很好。
        </view>
        <view class="mt-4 text-12px">
          今日已完成
          <text class="text-23px text-primary font-bold">{{ done }}</text> /
          {{ todayTasks.length }} 个任务
        </view>
      </view>
      <view class="absolute bottom-0 right-0 h-125px w-130px">
        <BabyArt name="bear-wave" />
      </view>
    </view>
    <view class="segmented">
      <button
        class="segment"
        :class="{ active: tab === 'today' }"
        @click="
          tab = 'today';
          manage = false;
        "
      >
        今日任务
      </button>
      <button
        class="segment"
        :class="{ active: tab === 'all' }"
        @click="tab = 'all'"
      >
        全部任务
      </button>
    </view>
    <view class="mb-2 mt-4 flex flex-wrap gap-2">
      <button
        v-for="item in ['全部', ...TASK_CATEGORIES]"
        :key="item"
        class="category-chip"
        :class="{ selected: category === item }"
        @click="category = item"
      >
        {{ item }}
      </button>
    </view>
    <view class="section-heading mb-1 mt-4">
      <text class="section-title">
        {{ tab === "today" ? "今天的小目标" : "所有成长任务" }}
        <text class="muted text-12px font-normal">{{ list.length }}</text>
      </text>
      <button v-if="isAdmin" class="text-link" @click="manage = !manage">
        {{ manage ? "完成管理" : "管理任务" }}
        <BabyIcon name="edit" :size="14" />
      </button>
    </view>
    <view v-if="list.length" class="card">
      <TaskRow
        v-for="task in list"
        :key="task.id"
        :task="task"
        :manage="manage"
        :scheduled="isScheduled(task)"
      />
    </view>
    <view v-else class="empty-state">
      <text class="text-34px">🌱</text><text class="mt-3 font-bold">这里还没有小任务</text><text class="muted mt-2 text-12px">
        试试其他分类，或者添加新的成长目标。
      </text>
    </view>
    <button
      v-if="isAdmin"
      class="button button-primary mt-5"
      @click="navigate('/pages/tasks/edit')"
    >
      <BabyIcon name="plus" :size="20" />新建任务
    </button>
    <text class="footnote">认真做好一件小事，也是一种了不起。</text>
  </BabyPage>
</template>

<style scoped lang="scss">
.task-hero {
  position: relative;
  overflow: hidden;
  padding: 20px 18px;
  border-radius: 20px;
  background: #e5efe3;
}
.baby-page .category-chip {
  padding: 7px 11px;
  border: 1px solid #e6e9de;
  border-radius: 20px;
  background: #fff;
  color: #788277;
  font-size: 11px;
}
.baby-page .category-chip.selected {
  border-color: #b1c7af;
  background: #e9f1e3;
  color: #34785c;
}
</style>
