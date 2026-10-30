<script setup lang="ts">
import type { Member } from '@/features/baby/domain/types'
import { reactive, ref } from 'vue'
import { navigate, newId, useBaby } from '@/features/baby/application/use-baby'
import BabyArt from '@/features/baby/components/BabyArt.vue'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import BabySheet from '@/features/baby/components/BabySheet.vue'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '家庭管理' },
})

const { state, child, member, isAdmin, busy, send } = useBaby()
const editing = ref(false)
const permissions = ref(false)
const showActor = ref(false)
const draft = reactive<Member>({
  id: '',
  name: '',
  avatar: '👩🏻',
  role: 'recorder',
})
function edit(person?: Member) {
  if (!isAdmin.value) {
    permissions.value = true
    return
  }
  Object.assign(
    draft,
    person ?? { id: newId('member'), name: '', avatar: '👩🏻', role: 'recorder' },
  )
  editing.value = true
}
async function save() {
  if (await send({ id: newId(), type: 'saveMember', member: { ...draft } }))
    editing.value = false
}
async function select(memberId: string) {
  if (await send({ id: newId(), type: 'selectMember', memberId }, true))
    showActor.value = false
}
async function remove() {
  const answer = await uni.showModal({
    title: `移除${draft.name}？`,
    content: '该成员的历史记录和署名会保留。',
    confirmColor: '#34785c',
  })
  if (
    answer.confirm
    && (await send({ id: newId(), type: 'removeMember', memberId: draft.id }))
  ) {
    editing.value = false
  }
}
</script>

<template>
  <BabyPage title="家庭管理" back>
    <view class="family-hero">
      <view class="relative z-1">
        <view class="text-23px font-bold">
          {{ child?.name }}的成长小队
        </view><text class="mt-2 block text-12px">
          {{ state?.members.length }} 位家人，一起陪伴成长
        </text>
      </view><view class="absolute bottom-0 right-0 h-142px w-185px">
        <BabyArt name="family" />
      </view>
    </view>
    <view class="card mt-3">
      <view class="section-title mb-2">
        家庭成员
      </view>
      <button
        v-for="person in state?.members"
        :key="person.id"
        class="choice-row"
        @click="edit(person)"
      >
        <view class="member-avatar mr-3 !h-50px !w-50px !text-32px">
          {{ person.avatar }}
        </view><view class="flex-1 text-left">
          <view class="flex items-center gap-2">
            <text class="text-16px font-bold">{{ person.name }}</text><text class="tag">
              {{
                person.role === "admin" ? "管理员" : "可记录"
              }}
            </text>
          </view><text class="muted mt-2 block text-11px">
            {{
              person.role === "admin"
                ? "可管理任务、奖励和家庭"
                : "可记分、兑换和查看记录"
            }}
          </text>
        </view><BabyIcon name="next" :size="19" />
      </button>
      <button v-if="isAdmin" class="button button-outline mt-4" @click="edit()">
        <BabyIcon name="plus" :size="20" />添加家人
      </button>
    </view>
    <view class="card mt-3 !py-1">
      <button class="choice-row" @click="permissions = true">
        <BabyIcon name="settings" :size="22" /><text
          class="ml-3 flex-1 text-left"
        >
          成员权限
        </text><BabyIcon name="next" :size="19" />
      </button><button
        class="choice-row !border-b-0"
        @click="navigate('/pages/records/index?tab=ledger')"
      >
        <BabyIcon name="ledger" :size="22" /><text class="ml-3 flex-1 text-left">
          操作记录
        </text><BabyIcon name="next" :size="19" />
      </button>
    </view>
    <view class="family-note mt-3">
      <view class="h-80px w-100px shrink-0">
        <BabyArt name="bear-star" />
      </view><view>
        <view class="text-14px font-bold">
          一起约定，鼓励更一致
        </view><text class="muted mt-2 block text-11px leading-5">
          任务和奖励一起商量，每笔记录都有来源。
        </text>
      </view>
    </view>
    <button
      class="note mt-4 justify-between text-left !w-full"
      @click="showActor = true"
    >
      <text>当前记录人：{{ member?.avatar }} {{ member?.name }}</text><text class="text-primary">切换 <text>›</text></text>
    </button>
    <text class="footnote">
      当前是本机家庭，家人共享此设备上的记录。跨设备邀请与同步将在联网版开放。
    </text>
    <BabySheet
      :open="editing"
      :title="
        state?.members.some((m) => m.id === draft.id)
          ? '家人资料与权限'
          : '欢迎新家人'
      "
      @close="editing = false"
    >
      <text class="field-label">家人的称呼</text><input
        v-model="draft.name"
        class="field-input"
        :maxlength="10"
        placeholder="比如：外婆"
        aria-label="家人称呼"
      ><text class="field-label mt-5">选择头像</text><view class="mb-5 flex flex-wrap gap-3">
        <button
          v-for="avatar in ['👩🏻', '👨🏻', '👵🏻', '👴🏻', '👩🏻‍🦱', '🧑🏻']"
          :key="avatar"
          class="member-avatar !h-40px !w-40px"
          :class="{ '!bg-#cce5d4': draft.avatar === avatar }"
          :aria-label="`选择${avatar}头像`"
          @click="draft.avatar = avatar"
        >
          {{ avatar }}
        </button>
      </view><text class="field-label">成员权限</text><view class="segmented mb-4">
        <button
          class="segment"
          :class="{ active: draft.role === 'recorder' }"
          @click="draft.role = 'recorder'"
        >
          可记录
        </button><button
          class="segment"
          :class="{ active: draft.role === 'admin' }"
          @click="draft.role = 'admin'"
        >
          管理员
        </button>
      </view><text class="muted mb-5 block text-11px leading-5">
        管理员可以设置任务与奖励、纠正记录和管理家庭。家庭至少保留一位管理员。
      </text><button class="button button-primary" :disabled="busy" @click="save">
        保存家人资料
      </button><button
        v-if="
          state?.members.some((m) => m.id === draft.id)
            && draft.id !== member?.id
        "
        class="text-link mx-auto mt-3 justify-center !flex !text-#ad7f65"
        @click="remove"
      >
        移除这位家人
      </button>
    </BabySheet>
    <BabySheet
      :open="permissions"
      title="一起约定，分工更清楚"
      @close="permissions = false"
    >
      <view class="card !bg-#eaf3e9">
        <view class="font-bold">
          管理员
        </view><text class="mt-2 block text-13px leading-6">
          管理宝宝、任务、奖励和家庭成员；撤销任务积分。
        </text>
      </view><view class="card mt-3 !bg-#f5f1e8">
        <view class="font-bold">
          可记录成员
        </view><text class="mt-2 block text-13px leading-6">
          完成任务记分、发起兑换、参加转盘与集卡、查看成长记录，撤销自己的任务记分。
        </text>
      </view><text class="footnote">
        本机演示支持自由切换记录人，正式登录与身份验证将在联网版接入。
      </text>
    </BabySheet>
    <BabySheet
      :open="showActor"
      title="这次由谁来记录？"
      @close="showActor = false"
    >
      <button
        v-for="person in state?.members"
        :key="person.id"
        class="choice-row"
        @click="select(person.id)"
      >
        <view class="member-avatar mr-3">
          {{ person.avatar }}
        </view><text class="flex-1 text-left font-bold">{{ person.name }}</text><BabyIcon v-if="person.id === member?.id" name="check" />
      </button><text class="footnote">
        记分与兑换会保留当时的记录人，不会随称呼修改而变化。
      </text>
    </BabySheet>
  </BabyPage>
</template>

<style scoped lang="scss">
.family-hero {
  position: relative;
  min-height: 150px;
  overflow: hidden;
  padding: 26px 18px;
  border-radius: 20px;
  background: #e2f0e5;
}
.family-note {
  display: flex;
  overflow: hidden;
  align-items: center;
  gap: 4px;
  border-radius: 18px;
  background: #fff0d9;
}
</style>
