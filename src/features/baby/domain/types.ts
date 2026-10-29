/** Domain contracts are independent of Vue, storage and HTTP. Amounts are integer points. */
export type TaskIcon = 'book' | 'brush' | 'ball' | 'plant' | 'art' | 'blocks'
export type Category = '学习成长' | '生活习惯' | '运动健康'
export type MemberRole = 'admin' | 'recorder'

export interface Child {
  id: string
  name: string
  birthday: string
  avatar: string
}

export interface Member {
  id: string
  name: string
  avatar: string
  role: MemberRole
}

export interface Task {
  id: string
  childId: string
  name: string
  description: string
  icon: TaskIcon
  points: number
  category: Category
  frequency: 'daily' | 'weekly' | 'custom'
  /** JS weekdays: Sunday=0. Weekly selects one or more days too. */
  weekdays: number[]
  dailyLimit: number
  reminder: boolean
  reminderTime: string
  archived: boolean
}

export interface Reward {
  id: string
  childId: string
  name: string
  points: number
  art: 'icecream' | 'park' | 'movie' | 'blocks'
}

export interface LedgerEntry {
  id: string
  childId: string
  memberId: string
  memberName: string
  title: string
  points: number
  createdAt: string
  kind:
    | 'opening'
    | 'task'
    | 'redeem'
    | 'spin'
    | 'refund'
    | 'reversal'
    | 'collection'
  taskId?: string
  taskIcon?: TaskIcon
  orderId?: string
  reversesId?: string
  note?: string
}

export interface RewardOrder {
  id: string
  childId: string
  name: string
  source: 'wish' | 'wheel' | 'collection'
  points: number
  status: 'pending' | 'received' | 'cancelled'
  createdAt: string
  memberName: string
}

export interface CardGrant {
  id: string
  childId: string
  icon: TaskIcon
  ledgerId: string
  consumedBy?: string
}

export interface WheelPrize {
  id: string
  name: string
  icon: string
  weight: number
  win: boolean
}

export interface Receipt {
  commandId: string
  message: string
  entryId?: string
  prizeIndex?: number
}

export interface BabyState {
  version: 1
  activeChildId: string
  activeMemberId: string
  children: Child[]
  members: Member[]
  tasks: Task[]
  rewards: Reward[]
  ledger: LedgerEntry[]
  orders: RewardOrder[]
  cards: CardGrant[]
  receipts: Receipt[]
}

export type BabyCommand = { id: string } & (
  | { type: 'completeTask', taskId: string }
  | { type: 'saveTask', task: Task }
  | { type: 'archiveTask', taskId: string }
  | { type: 'reverse', entryId: string, reason: string }
  | { type: 'redeem', rewardId: string }
  | { type: 'spin' }
  | { type: 'redeemCollection' }
  | { type: 'receiveOrder', orderId: string }
  | { type: 'cancelOrder', orderId: string, reason: string }
  | { type: 'selectChild', childId: string }
  | { type: 'saveChild', child: Child }
  | { type: 'selectMember', memberId: string }
  | { type: 'saveMember', member: Member }
  | { type: 'removeMember', memberId: string }
  | { type: 'saveReward', reward: Reward }
)

/** A remote implementation must resolve only after server-side atomic validation. */
export interface BabyRepository {
  load: () => Promise<BabyState>
  execute: (
    command: BabyCommand,
  ) => Promise<{ state: BabyState, receipt: Receipt }>
}
