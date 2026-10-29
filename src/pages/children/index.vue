<script setup lang="ts">
import type { Child } from '@/features/baby/domain/types'
import { reactive, ref } from 'vue'
import { ageLabel, newId, useBaby } from '@/features/baby/application/use-baby'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import BabySheet from '@/features/baby/components/BabySheet.vue'
import { dayKey } from '@/features/baby/domain/rules'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '宝宝档案' },
})

const { state, child, isAdmin, busy, send } = useBaby()
const editing = ref(false)
const draft = reactive<Child>({
  id: '',
  name: '',
  birthday: '2020-01-01',
  avatar: 'bear',
})
function edit(value?: Child) {
  Object.assign(
    draft,
    value ?? {
      id: newId('child'),
      name: '',
      birthday: '2020-01-01',
      avatar: 'bear',
    },
  )
  editing.value = true
}
async function save() {
  if (await send({ id: newId(), type: 'saveChild', child: { ...draft } }))
    editing.value = false
}
async function select(childId: string) {
  await send({ id: newId(), type: 'selectChild', childId }, true)
}
</script>

<template>
  <BabyPage title="宝宝档案" back>
    <view class="note mb-4">
      <BabyIcon name="leaf" :size="20" /><text>
        每一个小小的你，都有独一无二的成长旅程。
      </text>
    </view>
    <view v-for="item in state?.children" :key="item.id" class="card mb-3">
      <view class="flex items-center gap-3">
        <view class="member-avatar !h-55px !w-55px !bg-#fae7c8 !text-36px">
          {{ item.avatar === "bear" ? "🐻" : "🐰" }}
        </view><view class="flex-1">
          <view class="text-18px font-bold">
            {{ item.name }}
            <text v-if="item.id === child?.id" class="tag ml-2">
              当前宝宝
            </text>
          </view><text class="muted mt-2 block text-12px">
            {{ ageLabel(item.birthday) }} · {{ item.birthday }}
          </text>
        </view><button
          v-if="isAdmin"
          class="icon-button"
          :aria-label="`编辑${item.name}档案`"
          @click="edit(item)"
        >
          <BabyIcon name="edit" :size="19" />
        </button>
      </view>
      <button
        v-if="item.id !== child?.id"
        class="button button-soft mt-4 !min-h-36px !text-12px"
        :disabled="busy"
        @click="select(item.id)"
      >
        切换到{{ item.name }}
      </button>
    </view>
    <button v-if="isAdmin" class="button button-outline mt-5" @click="edit()">
      <BabyIcon name="plus" :size="20" />添加宝宝
    </button>
    <text class="footnote">
      切换宝宝后，积分、任务、奖励和记录会一同切换。新档案从零开始，成长由你们一起记录。
    </text>
    <BabySheet :open="editing" title="记录小小的你" @close="editing = false">
      <text class="field-label">宝宝昵称</text><input
        v-model="draft.name"
        class="field-input"
        :maxlength="10"
        placeholder="怎么称呼宝宝呢？"
        aria-label="宝宝昵称"
      ><text class="field-label mt-5">出生日期</text><picker
        mode="date"
        :end="dayKey(new Date())"
        :value="draft.birthday"
        @change="draft.birthday = $event.detail.value"
      >
        <view class="field-input flex items-center justify-between">
          <text>{{ draft.birthday }}</text><BabyIcon name="down" :size="16" />
        </view>
      </picker><text class="field-label mt-5">选择头像</text><view class="mb-5 flex gap-4">
        <button
          v-for="avatar in ['bear', 'rabbit']"
          :key="avatar"
          class="member-avatar !h-55px !w-55px !text-34px"
          :class="{ '!bg-#cee6d2': draft.avatar === avatar }"
          :aria-label="avatar === 'bear' ? '小熊头像' : '小兔头像'"
          @click="draft.avatar = avatar"
        >
          {{ avatar === "bear" ? "🐻" : "🐰" }}
        </button>
      </view><button class="button button-primary" :disabled="busy" @click="save">
        保存宝宝档案
      </button>
    </BabySheet>
  </BabyPage>
</template>
