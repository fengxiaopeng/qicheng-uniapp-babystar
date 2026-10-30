# 宝宝积分 · Baby Star

用一点点鼓励，记录孩子每一次小小的成长。

基于 uni-app、Vue 3、TypeScript 和 UnoCSS 的微信小程序与 H5 应用。当前为**单机版**：无需登录或后端，数据保存于当前设备。视觉采用奶油白、薄荷绿与森林绿，搭配本地小熊插画。

## 可以体验什么

- 首页：宝宝切换、可用积分、今日任务、连续成长天数、心愿进度。
- 任务：学习/生活/运动/兴趣分类，常驻每日、单次、周末及指定星期任务；新建编辑、次数限制、停用、记分和撤销。
- 奖励：心愿管理与兑换、幸运转盘、上传图片后逐格花积分刮开。
- 兑换记录：兑换即完成，无待领取或发放状态。
- 成长记录：周/月统计、日期与记录人筛选、收支明细、关联冲正。
- 家庭与档案：多个宝宝各自独立的账本、本机家人角色、家长任务与奖励管理、操作署名、JSON 备份导出。

首次启动带有「朵朵」的演示数据，可以直接操作。家人添加和角色切换只发生在本机；跨设备邀请、真实登录、云同步、消息通知与备份恢复将在后续联网版接入。

## 本地开发

需要 Node.js >=20（验证版本24）和 pnpm 10.10.0。

```bash
pnpm install --frozen-lockfile --ignore-scripts --registry=https://registry.npmjs.org
pnpm init-baseFiles
pnpm dev             # H5 开发
```

微信小程序：

```bash
SKIP_OPEN_DEVTOOLS=true pnpm dev:mp
```

使用微信开发者工具导入 `dist/dev/mp-weixin`。生产构建使用 `pnpm build:h5` / `SKIP_OPEN_DEVTOOLS=true pnpm build:mp`。

H5 的 GitHub Pages 工作流在推送 `master` 后触发，自动使用 Pages 的站点子路径及 hash 路由。首次配置与部署说明见 [发布流程](hermes/release.md)。不要同时运行不同平台的构建进程，以免竞争写入生成配置。

## 代码从哪里读起

```text
src/pages/                        各业务页面
src/features/baby/
  domain/types.ts                 数据实体、命令与异步仓储契约
  domain/rules.ts                  积分、任务日期、卡片与转盘规则
  domain/commands.ts               纯业务事务，统一检查与更新
  domain/seed.ts                   首次使用的演示数据
  data/local-repository.ts         本地存储适配器与数据边界
  data/migrate.ts                  旧快照无损迁移
  data/local-image.ts              图片处理与持久化适配
  application/use-baby.ts          组合式状态及唯一数据源装配入口
  components/                     页面骨架、弹层、任务行等公共组件
src/style/baby.scss               设计变量与基础控件
src/static/baby/                  原创 SVG 插画
```

页面不直接读写存储或独立维护余额。所有写操作经过统一命令、校验、持久化和回执；余额从账本派生，历史记录保留原名称、分值与操作署名。

**后续 API 接入从替换 `BabyRepository` 实现开始**，HTTP 请求按现有工程规范放在 `src/api/`。权限、幂等、扣分、订单和随机结果必须由服务端最终确认，不信任本机角色或余额。完整目录、业务约束、存储说明与接入步骤见 [单机版开发指南](hermes/baby-offline.md)。

## 验证

```bash
pnpm test:run
pnpm type-check
pnpm lint
SKIP_OPEN_DEVTOOLS=true pnpm build:mp
pnpm build:h5
```

业务测试覆盖记分与撤销、幂等、上限、每日/单次/周末任务、立即兑换、转盘、图片刮卡与版本迁移、权限、多宝宝隔离、并发写入和存储异常。仓库原有第三方组件类型问题与模板示例的 Lint 问题应和新增业务的验证结果区分，具体以检查输出为准。

工程规范见 [Hermes](hermes/README.md)。项目基于 [unibest](https://github.com/unibest-tech/unibest) 模板构建，保留其 uni-app 开发与构建能力。License: MIT。
