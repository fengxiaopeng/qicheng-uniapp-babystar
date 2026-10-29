import type { BabyCommand, BabyState, LedgerEntry, Receipt } from './types'
import {
  availableCards,
  balance,
  CARD_ICONS,
  COLLECTION_REWARD,
  completedCount,
  dayKey,
  isReversed,
  isScheduled,
  WHEEL_COST,
  WHEEL_PRIZES,
  wheelRemaining,
} from './rules'

export class BabyError extends Error {}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new BabyError(message)
}

/** Pure atomic transaction. Any exception discards all changes, including point/card deductions. */
export function executeCommand(
  current: BabyState,
  command: BabyCommand,
  now = new Date(),
  random = Math.random,
) {
  const duplicate = current.receipts.find(r => r.commandId === command.id)
  if (duplicate)
    return { state: current, receipt: duplicate }

  const state: BabyState = JSON.parse(JSON.stringify(current))
  const actor = state.members.find(m => m.id === state.activeMemberId)
  requireValue(actor, '当前记录人不存在，请重新选择')
  const childId = state.activeChildId
  const receipt: Receipt = { commandId: command.id, message: '已保存' }
  const assertAdmin = () =>
    requireValue(actor.role === 'admin', '需要管理员操作，请切换到管理员')
  const addEntry = (
    entry: Pick<LedgerEntry, 'title' | 'points' | 'kind'>
      & Partial<LedgerEntry>,
  ) => {
    const next: LedgerEntry = {
      id: `${command.id}-entry`,
      childId,
      memberId: actor.id,
      memberName: actor.name,
      createdAt: now.toISOString(),
      ...entry,
    }
    state.ledger.push(next)
    receipt.entryId = next.id
    return next
  }

  switch (command.type) {
    case 'completeTask': {
      const task = state.tasks.find(
        t => t.id === command.taskId && t.childId === childId,
      )
      requireValue(task && isScheduled(task, now), '这个任务今天不需要完成')
      requireValue(
        completedCount(state, task.id, now) < task.dailyLimit,
        '今天已经完成啦，明天再来吧',
      )
      const entry = addEntry({
        title: task.name,
        points: task.points,
        kind: 'task',
        taskId: task.id,
        taskIcon: task.icon,
      })
      state.cards.push({
        id: `${command.id}-card`,
        childId,
        icon: task.icon,
        ledgerId: entry.id,
      })
      receipt.message = `太棒了！获得 ${task.points} 积分`
      break
    }
    case 'saveTask': {
      assertAdmin()
      const task = command.task
      requireValue(task.childId === childId, '任务不属于当前宝宝')
      requireValue(
        task.name.trim().length > 0 && task.name.trim().length <= 20,
        '任务名称需要 1–20 个字',
      )
      requireValue(
        Number.isInteger(task.points) && task.points >= 1 && task.points <= 999,
        '奖励积分需要是 1–999 的整数',
      )
      requireValue(
        Number.isInteger(task.dailyLimit)
        && task.dailyLimit >= 1
        && task.dailyLimit <= 20,
        '每天可记录 1–20 次',
      )
      requireValue(
        task.frequency === 'daily'
        || (task.weekdays.length > 0
          && task.weekdays.every(
            d => Number.isInteger(d) && d >= 0 && d <= 6,
          )),
        '请选择重复日期',
      )
      requireValue(CARD_ICONS.includes(task.icon), '请选择任务图标')
      requireValue(
        ['学习成长', '生活习惯', '运动健康'].includes(task.category),
        '请选择任务分类',
      )
      requireValue(
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.reminderTime),
        '提醒时间不正确',
      )
      const index = state.tasks.findIndex(t => t.id === task.id)
      requireValue(
        index < 0 || state.tasks[index].childId === childId,
        '不能编辑其他宝宝的任务',
      )
      const saved = { ...task, name: task.name.trim() }
      if (index < 0)
        state.tasks.push(saved)
      else state.tasks[index] = saved
      receipt.message = '任务保存好了'
      break
    }
    case 'archiveTask': {
      assertAdmin()
      const task = state.tasks.find(
        t => t.id === command.taskId && t.childId === childId,
      )
      requireValue(task, '任务不存在')
      task.archived = true
      receipt.message = '已停用任务，历史记录仍然保留'
      break
    }
    case 'reverse': {
      const original = state.ledger.find(
        e => e.id === command.entryId && e.childId === childId,
      )
      requireValue(original?.kind === 'task', '只能撤销任务记分')
      requireValue(
        actor.role === 'admin' || original.memberId === actor.id,
        '只能撤销自己记录的积分',
      )
      requireValue(!isReversed(state, original.id), '这笔记录已经撤销了')
      requireValue(command.reason.trim(), '请填写撤销原因')
      requireValue(
        balance(state) >= original.points,
        '余额不足，请先处理相关兑换后再撤销',
      )
      const grants = state.cards.filter(c => c.ledgerId === original.id)
      requireValue(
        !grants.some(c => c.consumedBy),
        '该任务获得的卡片已经兑换，无法撤销',
      )
      state.cards = state.cards.filter(c => c.ledgerId !== original.id)
      addEntry({
        title: `撤销：${original.title}`,
        points: -original.points,
        kind: 'reversal',
        reversesId: original.id,
        note: command.reason.trim(),
      })
      receipt.message = '已撤销，积分和任务进度已更新'
      break
    }
    case 'redeem': {
      const reward = state.rewards.find(
        r => r.id === command.rewardId && r.childId === childId,
      )
      requireValue(reward, '奖励不存在')
      requireValue(
        balance(state) >= reward.points,
        '积分还不够，再完成几个小任务吧',
      )
      const id = `${command.id}-order`
      state.orders.push({
        id,
        childId,
        name: reward.name,
        source: 'wish',
        points: reward.points,
        status: 'pending',
        createdAt: now.toISOString(),
        memberName: actor.name,
      })
      addEntry({
        title: `兑换${reward.name}`,
        points: -reward.points,
        kind: 'redeem',
        orderId: id,
      })
      receipt.message = '兑换成功，等待家长发放奖励'
      break
    }
    case 'spin': {
      requireValue(
        balance(state) >= WHEEL_COST,
        '积分不足，需要 10 积分才能转动',
      )
      requireValue(
        wheelRemaining(state, now) > 0,
        '今天的机会用完啦，明天再来',
      )
      const draw = random()
      requireValue(draw >= 0 && draw < 1, '抽奖暂时不可用，请重试')
      let cursor = draw * WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0)
      const index = WHEEL_PRIZES.findIndex((p) => {
        cursor -= p.weight
        return cursor < 0
      })
      const prize = WHEEL_PRIZES[index]
      const orderId = `${command.id}-order`
      addEntry({
        title: `幸运转盘 · ${prize.name}`,
        points: -WHEEL_COST,
        kind: 'spin',
        orderId: prize.win ? orderId : undefined,
      })
      if (prize.win) {
        state.orders.push({
          id: orderId,
          childId,
          name: prize.name,
          source: 'wheel',
          points: WHEEL_COST,
          status: 'pending',
          createdAt: now.toISOString(),
          memberName: actor.name,
        })
      }
      receipt.prizeIndex = index
      receipt.message = prize.win
        ? `恭喜获得「${prize.name}」`
        : '这次是再接再厉，下次好运！'
      break
    }
    case 'redeemCollection': {
      const cards = CARD_ICONS.map(icon => availableCards(state, icon)[0])
      requireValue(cards.every(Boolean), '还没有集齐六种卡片，继续加油吧')
      const orderId = `${command.id}-order`
      cards.forEach((card) => {
        card.consumedBy = orderId
      })
      state.orders.push({
        id: orderId,
        childId,
        name: COLLECTION_REWARD,
        source: 'collection',
        points: 0,
        status: 'pending',
        createdAt: now.toISOString(),
        memberName: actor.name,
      })
      addEntry({
        title: `集卡兑换${COLLECTION_REWARD}`,
        points: 0,
        kind: 'collection',
        orderId,
      })
      receipt.message = '集卡兑换成功，没有扣除积分'
      break
    }
    case 'receiveOrder': {
      assertAdmin()
      const order = state.orders.find(
        o => o.id === command.orderId && o.childId === childId,
      )
      requireValue(order?.status === 'pending', '这份奖励已经处理过了')
      order.status = 'received'
      receipt.message = '奖励已领取，把快乐好好收藏'
      break
    }
    case 'cancelOrder': {
      assertAdmin()
      const order = state.orders.find(
        o => o.id === command.orderId && o.childId === childId,
      )
      requireValue(order?.status === 'pending', '只能取消待领取的奖励')
      requireValue(command.reason.trim(), '请填写取消原因')
      order.status = 'cancelled'
      // A wheel draw is already consumed; cancelling its prize does not refund the draw fee.
      const refund = order.source === 'wish' ? order.points : 0
      if (order.source === 'collection') {
        state.cards.forEach((card) => {
          if (card.consumedBy === order.id)
            delete card.consumedBy
        })
      }
      addEntry({
        title: `取消兑换：${order.name}`,
        points: refund,
        kind: 'refund',
        orderId: order.id,
        note: command.reason.trim(),
      })
      receipt.message = refund
        ? `已取消，退回 ${refund} 积分`
        : order.source === 'collection'
          ? '已取消，退回本次消耗的卡片'
          : '奖品已取消，转盘费用和次数不退回'
      break
    }
    case 'selectChild':
      requireValue(
        state.children.some(c => c.id === command.childId),
        '宝宝不存在',
      )
      state.activeChildId = command.childId
      break
    case 'saveChild': {
      assertAdmin()
      const child = command.child
      requireValue(
        child.name.trim().length > 0 && child.name.trim().length <= 10,
        '昵称需要 1–10 个字',
      )
      requireValue(
        /^\d{4}-\d{2}-\d{2}$/.test(child.birthday)
        && Number.isFinite(new Date(`${child.birthday}T00:00:00`).getTime())
        && dayKey(new Date(`${child.birthday}T00:00:00`)) === child.birthday
        && child.birthday <= dayKey(now),
        '请填写有效的出生日期',
      )
      const index = state.children.findIndex(c => c.id === child.id)
      if (index < 0)
        state.children.push({ ...child, name: child.name.trim() })
      else state.children[index] = { ...child, name: child.name.trim() }
      receipt.message = '宝宝档案已保存'
      break
    }
    case 'selectMember':
      requireValue(
        state.members.some(m => m.id === command.memberId),
        '成员不存在',
      )
      state.activeMemberId = command.memberId
      break
    case 'saveMember': {
      assertAdmin()
      const member = command.member
      requireValue(
        member.name.trim() && member.name.trim().length <= 10,
        '称呼需要 1–10 个字',
      )
      const index = state.members.findIndex(m => m.id === member.id)
      const admins = state.members.filter(m => m.role === 'admin')
      requireValue(
        !(
          index >= 0
          && state.members[index].role === 'admin'
          && admins.length === 1
          && member.role !== 'admin'
        ),
        '家庭至少需要一位管理员',
      )
      if (index < 0)
        state.members.push({ ...member, name: member.name.trim() })
      else state.members[index] = { ...member, name: member.name.trim() }
      break
    }
    case 'removeMember':
      assertAdmin()
      requireValue(command.memberId !== actor.id, '不能移除当前操作人')
      state.members = state.members.filter(m => m.id !== command.memberId)
      receipt.message = '已移除成员，历史署名保持不变'
      break
    case 'saveReward': {
      assertAdmin()
      const reward = command.reward
      requireValue(reward.childId === childId, '奖励不属于当前宝宝')
      requireValue(
        reward.name.trim() && reward.name.trim().length <= 20,
        '奖励名称需要 1–20 个字',
      )
      requireValue(
        Number.isInteger(reward.points)
        && reward.points > 0
        && reward.points <= 99999,
        '积分需要是 1–99999 的整数',
      )
      const index = state.rewards.findIndex(r => r.id === reward.id)
      requireValue(
        index < 0 || state.rewards[index].childId === childId,
        '不能编辑其他宝宝的奖励',
      )
      if (index < 0)
        state.rewards.push({ ...reward, name: reward.name.trim() })
      else state.rewards[index] = { ...reward, name: reward.name.trim() }
      receipt.message = '小心愿已保存'
      break
    }
  }
  state.receipts.push(receipt)
  return { state, receipt }
}
