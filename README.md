# 🍺 Tavern Menu Manager 酒馆菜单管理器

为 [SillyTavern](https://github.com/SillyTavern/SillyTavern) / [TauriTavern](https://tauritavern.github.io/) 设计的菜单管理器脚本。

提供**快捷操作面板** + **菜单精简管理**两大功能：面板弹出一键操作，隐藏/显示按钮，拖拽排序，扩展自动发现。

---

## ✨ 功能

### 🪄 魔法面板（Magic Panel）
- 点击 `左下菜单` 或 `魔棒` 按钮弹出快捷操作面板
- 面板内按钮即点即用，无需打开原生菜单
- **编辑模式**：点击 ✏️ 进入，勾选要隐藏的按钮，点「保存」
- **排序模式**：点击 ⇅ 进入，拖拽调整按钮顺序，再次点击 ⇅ 保存

### 🧹 菜单精简（Menu Cleaner）
- 隐藏/显示任意菜单项（开关切换）
- 纯/双栏布局切换
- 扩展面板自动发现：扫描并管理第三方扩展的菜单项
- 拖拽排序 + 重置顺序
- 自动扫描新元素（聊天切换、DOM 变化时）

---

## 📦 安装方式

### 方式一：SillyTavern 原生扩展（推荐）

1. 打开 SillyTavern → **扩展（Extensions）** → **管理（Manage）**
2. 点击 **Install from Git**
3. 粘贴仓库地址：
   ```
   https://github.com/senyayume/tavern-menu-manager
   ```
4. 安装后重启 SillyTavern

### 方式二：酒馆助手插件

1. 下载仓库中的 `酒馆助手脚本-酒馆菜单管理器-优化版.json`
2. 在酒馆助手中导入该文件

### 方式三：手动安装

1. 下载 `menu-manager.user.js`
2. 放入 `SillyTavern/public/scripts/extensions/third-party/tavern-menu-manager/`
3. 创建 `manifest.json`（已提供），重启 SillyTavern

---

## 🎮 使用说明

| 操作 | 方法 |
|------|------|
| 打开面板 | 点击左下菜单按钮或魔棒按钮 |
| 编辑模式 | 点击面板头部 ✏️，勾选要隐藏的按钮，点「保存」 |
| 排序模式 | 点击面板头部 ⇅，按住按钮拖拽调整顺序，再次点击 ⇅ 保存 |
| 设置菜单 | 点击面板头部 ⚙️ 打开菜单精简器设置面板 |
| 关闭面板 | 点击面板外部任意空白区域，或按 Esc |

---

## 💾 存储

| 数据 | localStorage 键 |
|------|----------------|
| 按钮排序顺序 | `magic_panel_order_{groupId}` |
| 隐藏的按钮列表 | `magic_panel_hidden_buttons` |
| 面板缩放比例 | `magic_content_scale` |
| 菜单精简设置 | `menu_cleaner_settings` |

> 排序数据使用独立键存储，不与菜单精简器设置冲突。

---

## 🏗 项目结构

```
tavern-menu-manager/
├── manifest.json              # SillyTavern 扩展声明
├── menu-manager.user.js       # 主脚本
├── 酒馆助手脚本-酒馆菜单管理器-优化版.json  # 酒馆助手兼容
├── CHANGELOG.md               # 更新日志
├── README.md                  # 本文件
└── .gitignore
```

---

## 📋 更新日志

### v1.5.5 (2026-06-20)

**修复**
- Quick Reply 颜色在打开/关闭精简器后被 ST 重渲染重置：新增 Shadow DOM 颜色持久化，保存 `#qr--color` 的 shadowRoot 内颜色，关面板后 50/200/500/1500ms 四级重试恢复

### v1.5.4 (2026-06-18)

**修复**
- syncMagicPanelTheme 快速路径失效：静态标志 `_mc_themeApplied` 替代 `getPropertyValue`，消除重复全量同步 500-2000ms 延时

### v1.5.3 (2026-06-18)

**性能优化**
- 移除主题 CSS 渲染开销：`backdrop-filter: blur`、`mc-shift`/`mc-glow` 无限动画、`background-size: 200%`（共 16 处）
- 8 项 JS 优化：getMcHiddenIds 外提、getComputedStyle 短路、syncTheme rAF 延后、getIconClass 优先自身、cachedMcHidden 复用、btnIdxMap O(1)、perf 诊断日志
- 主题脏检测：CSS 未变 + 面板已有主题时跳过全文同步，重复打开零开销

### v1.5.2 (2026-06-18)

**优化**
- 自动发现缓存改为有变化才保存，减少无变化重扫时的 localStorage 写入、DOM 重排和弹窗刷新
- 默认设置改为每次创建独立对象，避免重置/读取失败时共享嵌套对象
- 魔法面板热重载清理旧实例监听器，避免重复注入后残留 document/window 事件
- 魔法面板排序拖拽缓存当前按钮列表，降低移动过程中的重复 DOM 查询

**发布**
- 同步酒馆助手 JSON 内嵌脚本到 v1.5.2

### v1.5.1 (2026-06-13)

**修复**
- 跨栏拖拽被 Y 距离降级劫持：新增跨列跳过检测
- 导入设置后无效 theme 值被持久化：调换 saveSettings 与 validTheme 顺序

### v1.5.0 (2026-06-13)

**新增**
- 主题系统：4 套配色（琉璃/暖阳/暗紫/极光），🎨 按钮切换
- 魔法面板美化：背景/边框/标题/按钮/图标同步主题
- 导入/导出设置：配置可跨设备迁移
- 拖拽 Y 坐标降级：同栏拖拽更精准
- 流动渐变背景 + 辉光动画

**修复**
- 排序失效：reorder 数组自动修剪过期选择器
- 导入后主题不生效：导入时调用 applyTheme
- CSS 变量兄弟元素无法继承：p() 同时输出两端
- 手机端同栏拖拽、残影清理

### v1.4.5 (2026-06-11)

**修复**
- 排序失效：refreshDiscoveryCache 自动清理 reorder 数组过期选择器
- closePopup 清理触摸拖拽 ghost 残留
- 移动端 touch-action: none 防止滚动

### v1.4.4 (2026-06-11)

**修复**
- 扩展菜单重复"快速回复"条目：#qr_container 包装器有 header 时不再自检，避免与硬编码 #qr--settings 重复

### v1.4.3 (2026-06-11)

**修复**
- 手机端拖拽无法在同一列内上下移动：touchend 按 Y 坐标距离找最近元素
- 手机端拖拽残影：pointerType 过滤 + cleanupDrag 防御清理
- 手机端拖拽视觉反馈：touchmove 添加 Y 坐标降级，正确显示蓝色左边框

### v1.4.2 (2026-06-10)

**修复**
- 排序持久化增强：doReorder 改用完整数组操作，列信息跨刷新保持
- 初始化时序优化：先注入元素再扫缓存，避免自身元素列信息被覆盖
- 稳定自动 ID：基于标签的 mc- 前缀 ID，无原生 ID 的扩展刷新后不变
- captureInitialSnapshot 同步使用稳定 ID

**清理**
- 删除 injectMenuEntry()、updatePopupView() 空函数及空 try/catch

### v1.4.1 (2026-06-08)

**修复**
- 头部 5 个操作按钮图标跟随 Aa 缩放滑块同步放大缩小

### v1.4.0 (2026-06-08)

**新增**
- 显示密度选择器（大/中/小/图标/小图标），Aa 缩放栏内可选，手机触控优化
- 可独立开关魔法面板 / 精简器
- 弹窗头部「设置」→「手动重扫」

**修复**
- `setupAutoRescan()` 热重载旧 Observer 未 disconnect 修复
- `setupKeyboard()` 重复绑定守卫
- 分栏切换按钮函数名修复

**变更**
- 设置内容整合到重排序页面底部，删除设置面板整页
- 工具栏窄屏按钮换行优化

### v1.3.0 (2026-06-07)

**新增**
- 面板列数选择器（Aa 缩放栏内 1丨2丨3丨4），手机可选 1 或 2 列，自动保存
- 面板标题窄屏适配：按钮整组换行，不再挤散标题

**修复**
- 消除 `#regex_container` 等硬编码容器内部抽屉重复条目
- 启动时自动清理旧版遗留缓存
- `console.debug` 异常安全加固

### v1.2.2 (2026-06-06)

**修复**
- `btn.id` 未转义属性注入风险 → `Runtime.escHtml(btn.id)` 转义
- `waitForButton()` 和 `injectSettingsEntry()` 无限轮询 → 60 次 retries 上限
- Escape 键关闭扩展面板只改状态不关 UI → 追加 DOM 隐藏 + returnElementsToNative
- `registerSlashCmd()` 热重载重复注册 → `win.__mcSlashRegistered` 守卫
- `ensureMenuBindings()` 对不存在的按钮也计入重试 → 只检查已在 DOM 中的按钮

**变更**
- 12 个内置菜单图标移入 `BUILTIN_OPTIONS_ITEMS.icon` 字段，删除独立 `icons` 映射表
- 删除 `init()` 中冗余的 `applyNativeReorder` 重复调用（Step 6）
- 清除 `REORDER_GROUP_IDS` 的死 `for+if` 循环

**安全**
- `escHtml` 增加 `'` 和 `` ` `` 转义
- 8 处空 `catch(e) {}` 添加 `console.debug` 日志

### v1.2.1 (2026-06-06)

**修复**
- 魔法面板两个「关闭聊天」重复 → label 去重，只保留有效的那个
- TauriTavern「切换全屏」按钮屏蔽（面板 + 精简器均过滤）
- `/menucleanerdisable` 斜杠命令修复（注入模块脚本中 win → window）
- 扩展面板排序被打乱 / 扩展跑到左栏 → loadSettings 不再裁剪 discoveryCache 和 reorder，列信息不丢失，排序不乱
- **性能优化**：AutoRescan 只扫有动态发现的组，扫描无变化时跳过 DOM 重排；移除冗余 CHAT_CHANGED 扫描和 #extensionsMenu 监听；suppressObserver 超时延长到 50ms

### v1.2.0 (2026-06-05)

**新增**
- MENU_REGISTRY 统一配置主源：MENU_CONFIGS 和 PANEL_GROUPS 自动派生，新增菜单项改一处即可
- 面板自适应按钮（↔）：一键缩放面板到刚好包裹按钮，再次点击恢复默认
- 面板缩放滑块（Aa）：调节按钮图标和文字大小（60%-150%），自动保存

**变更**
- 存储层统一：magicStore() → Store 对象（mp + mc 命名空间）
- 共享能力收口：getRootDocument / escHtml / getMcHiddenIds → Runtime
- 跨模块桥梁 Runtime.openMenuCleanerPopup / .isMenuCleanerPopupOpen / .MP_VISIBLE_SELECTORS
- 面板尺寸按菜单隔离（左下/魔棒各自独立记忆）
- 面板按钮垂直居中优化
- 精简器 item 渲染函数提取（buildHideItemHTML）

**删除**
- magicStore()、_mpStore 别名、_escDiv 死变量、过渡注释

### v1.1.3 (2026-06-05)

**修复**
- 智绘姬（st-chatu8）「打开文生图设置」按钮在魔法面板和菜单精简器中不显示
  - 魔法面板：options 配置新增  选择器，动态发现左下菜单按钮
  - 菜单精简器：options 配置新增 discovery 规则，自动扫描  元素
  - 修复 CSS  花括号错位

### v1.1.2 (2026-06-04)

**变更**
- 精简器重排序只保留扩展菜单（extensionsSettings），移除了对左下菜单和魔棒的排序界面（这两个组的排序对 Magic Panel 无实际效果，Magic Panel 使用独立的排序系统）

### v1.1.1 (2026-06-04)

**修复**
- 拖拽期间按 Esc 关闭弹窗导致 dragActive 永久锁定，自动重扫描功能停摆 → 关闭弹窗时重置拖拽状态
- loadSettings 过早删除尚未加载的扩展按钮隐藏设置 → 不再清理 DOM 中不存在的隐藏条目

### v1.1.0 (2026-06-04)

**新增**
- 魔法面板右下角新增拖拽手柄（↘），可自由调整面板宽度(200-600px)和高度(200-800px)，尺寸自动保存

**修复**
- 菜单精简器拖拽排序后关闭弹窗，残留的克隆元素不再需要重启酒馆才能消失（关闭弹窗时自动清除）

## 📝 版本管理

版本格式遵循 [SemVer](https://semver.org/)。  
更新日志遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

---

## 📄 许可证

MIT
