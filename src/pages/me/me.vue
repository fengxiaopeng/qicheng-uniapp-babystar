<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ageLabel,
  navigate,
  useBaby,
} from '@/features/baby/application/use-baby'
import BabyArt from '@/features/baby/components/BabyArt.vue'
import BabyIcon from '@/features/baby/components/BabyIcon.vue'
import BabyPage from '@/features/baby/components/BabyPage.vue'
import BabySheet from '@/features/baby/components/BabySheet.vue'
import { isReversed } from '@/features/baby/domain/rules'

definePage({
  style: { navigationStyle: 'custom', navigationBarTitleText: '我的' },
})

const { state, child, member, ledger, orders, points, streak } = useBaby()
const settings = ref(false)
const about = ref(false)
const earned = computed(() =>
  ledger.value
    .filter(
      e => e.kind === 'task' && state.value && !isReversed(state.value, e.id),
    )
    .reduce((sum, e) => sum + e.points, 0),
)
const pending = computed(
  () => orders.value.filter(o => o.status === 'pending').length,
)
async function exportData() {
  if (!state.value)
    return
  const json = JSON.stringify(state.value, null, 2)
  // #ifdef H5
  const url = URL.createObjectURL(
    new Blob([json], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `宝宝积分-家庭备份-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  uni.showToast({ title: '已下载家庭数据备份', icon: 'none' })
  // #endif
  // #ifndef H5
  await uni.setClipboardData({ data: json })
  // #endif
}
</script>

<template>
  <BabyPage title="我的" root>
    <view class="profile-hero">
      <view class="relative z-1">
        <text class="mb-2 block text-10px text-#7e9582 tracking-2px">
          BABY STAR · 成长档案
        </text><text class="text-27px font-bold">{{ child?.name }}的小世界</text><text class="muted mt-2 block text-12px">
          {{
            child ? ageLabel(child.birthday) : ""
          }}，每天都在发现新的自己
        </text><button
          class="text-link mt-3"
          @click="navigate('/pages/children/index')"
        >
          管理宝宝档案 <BabyIcon name="next" :size="14" />
        </button>
      </view>
      <view class="absolute bottom-0 right-0 h-156px w-180px">
        <BabyArt name="bear-star" />
      </view>
    </view>
    <view class="card relative z-1 mx-3 mt--4 flex justify-around !py-5">
      <view class="text-center">
        <text class="block text-25px text-primary font-bold">{{ earned }}</text><text class="muted mt-1 block text-11px">累计获得积分</text>
      </view><view class="w-1px bg-#eef0e7" /><view class="text-center">
        <text class="block text-25px text-primary font-bold">{{ streak }}</text><text class="muted mt-1 block text-11px">连续成长天数</text>
      </view><view class="w-1px bg-#eef0e7" /><view class="text-center">
        <text class="block text-25px text-primary font-bold">
          {{
            orders.filter((o) => o.status === "received").length
          }}
        </text><text class="muted mt-1 block text-11px">实现的小心愿</text>
      </view>
    </view>
    <view class="card mt-5 !py-1">
      <button class="choice-row" @click="navigate('/pages/family/index')">
        <view class="menu-icon">
          <BabyIcon name="family" />
        </view><view class="ml-3 flex-1 text-left">
          <view class="text-14px font-semibold">
            家庭管理
          </view><text class="muted mt-1 block text-10px">
            一家人，一起看见成长
          </text>
        </view><BabyIcon name="next" :size="17" />
      </button>
      <button class="choice-row" @click="navigate('/pages/rewards/history')">
        <view class="menu-icon !bg-#fff1d9 !text-#c09351">
          <BabyIcon name="gift" />
        </view><text class="ml-3 flex-1 text-left text-14px font-semibold">
          我的兑换
        </text><text v-if="pending" class="tag mr-2 !bg-#fff0d9 !text-#b68135">
          {{ pending }} 份待领取
        </text><BabyIcon name="next" :size="17" />
      </button>
      <button
        class="choice-row !border-b-0"
        @click="navigate('/pages/records/index')"
      >
        <view class="menu-icon !bg-#ebf0e1">
          <BabyIcon name="chart" />
        </view><text class="ml-3 flex-1 text-left text-14px font-semibold">
          成长记录
        </text><BabyIcon name="next" :size="17" />
      </button>
    </view>
    <view class="card mt-3 !py-1">
      <button class="choice-row" @click="settings = true">
        <view class="menu-icon !bg-#f1eee5 !text-#858875">
          <BabyIcon name="settings" />
        </view><text class="ml-3 flex-1 text-left text-14px">设置与数据</text><BabyIcon name="next" :size="17" />
      </button><button class="choice-row !border-b-0" @click="about = true">
        <view class="menu-icon !bg-#f4eee2 !text-#b09a74">
          <BabyIcon name="help" />
        </view><text class="ml-3 flex-1 text-left text-14px">关于宝宝积分</text><BabyIcon name="next" :size="17" />
      </button>
    </view>
    <view class="mt-8 text-center">
      <view class="text-18px text-#bac4b3 tracking-4px">
        ✦
      </view><text class="mt-2 block text-12px text-#8c9c88">
        长大这件事，我们慢慢来。
      </text><text class="mt-2 block text-9px text-#b6bdad tracking-2px">
        BABY STAR · WITH LOVE
      </text>
    </view>
    <BabySheet
      :open="settings"
      title="把成长，好好保存"
      @close="settings = false"
    >
      <view class="form-row">
        <text>当前宝宝</text><text>{{ child?.name }}</text>
      </view><view class="form-row">
        <text>可用积分</text><text>{{ points }}</text>
      </view><view class="form-row">
        <text>当前记录人</text><text>{{ member?.name }}</text>
      </view><view class="form-row">
        <text>存储方式</text><text class="text-primary">保存在此设备</text>
      </view><view class="note my-4">
        清理浏览器或小程序数据会移除本机记录。建议定期导出家庭备份，换设备前先保留一份。
      </view><button class="button button-outline" @click="exportData">
        <BabyIcon name="download" :size="18" />导出家庭数据备份
      </button><text class="footnote">
        备份包含全部宝宝、家人和账本，请妥善保存。跨设备同步及备份恢复功能将在后续版本提供。
      </text>
    </BabySheet>
    <BabySheet
      :open="about"
      title="宝宝积分 · 每一份努力都值得"
      @close="about = false"
    >
      <view class="mx-auto h-160px w-220px">
        <BabyArt name="family" />
      </view><text class="block text-14px leading-7">
        我们希望每一次阅读、每一次整理、每一次勇敢尝试，都能被认真看见。积分是一点点鼓励，陪伴才是最珍贵的奖励。
      </text><view class="note mt-4">
        当前版本可以在本机记录与体验，无需登录。家人跨设备共管和消息提醒将在联网版开放。
      </view><text class="footnote">宝宝积分 1.0 · 陪你一起，慢慢长大。</text>
    </BabySheet>
  </BabyPage>
</template>

<style scoped lang="scss">
.profile-hero {
  position: relative;
  min-height: 186px;
  overflow: hidden;
  padding: 23px 18px;
  border-radius: 22px;
  background: #e4eee1;
}
.menu-icon {
  display: flex;
  width: 37px;
  height: 37px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #e3f0e6;
  color: #4a8060;
}
</style>
