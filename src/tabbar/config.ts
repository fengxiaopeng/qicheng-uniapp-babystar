import type { TabBar } from '@uni-helper/vite-plugin-uni-pages'
import type { CustomTabBarItem, NativeTabBarItem } from './types'

export const TABBAR_STRATEGY_MAP = { NO_TABBAR: 0, NATIVE_TABBAR: 1, CUSTOM_TABBAR: 2 }
export const selectedTabbarStrategy = TABBAR_STRATEGY_MAP.CUSTOM_TABBAR

/** Single source of truth for the four product tabs. All are available offline. */
export const customTabbarList: CustomTabBarItem[] = [
  { text: '首页', pagePath: 'pages/index/index', iconType: 'unocss', icon: 'i-carbon-home' },
  { text: '任务', pagePath: 'pages/tasks/index', iconType: 'unocss', icon: 'i-carbon-task' },
  { text: '奖励', pagePath: 'pages/rewards/index', iconType: 'unocss', icon: 'i-carbon-gift' },
  { text: '我的', pagePath: 'pages/me/me', iconType: 'unocss', icon: 'i-carbon-user-avatar' },
]
export const nativeTabbarList: NativeTabBarItem[] = customTabbarList.map(item => ({
  pagePath: item.pagePath,
  text: item.text,
  iconPath: 'static/tabbar/home.png',
  selectedIconPath: 'static/tabbar/homeHL.png',
}))
export const tabbarCacheEnable = [1, 2].includes(selectedTabbarStrategy)
export const customTabbarEnable = selectedTabbarStrategy === TABBAR_STRATEGY_MAP.CUSTOM_TABBAR
export const needHideNativeTabbar = customTabbarEnable
export const tabbarList = customTabbarEnable ? customTabbarList : nativeTabbarList
export const tabBar: TabBar = {
  custom: true,
  color: '#8b918b',
  selectedColor: '#34785c',
  backgroundColor: '#fffefa',
  borderStyle: 'white',
  list: customTabbarList.map(({ text, pagePath }) => ({ text, pagePath })) as TabBar['list'],
}
