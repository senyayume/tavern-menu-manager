## [1.4.5] - 2026-06-11

### Fixed

- **排序失效：reorder 数组累计过期选择器**：多次自动扫描后发现缓存变化，`settings.reorder[]` 中的旧选择器未被清理，导致排序视图出现无法响应拖拽的死条目。`refreshDiscoveryCache` 末尾新增修剪步骤：只保留仍存在于硬编码项或当前发现缓存中的选择器。
- **`closePopup` 未清理触摸拖拽残影**：touchstart 创建的 ghost 不带 `.menu-cleaner-ghost` 类，关闭弹窗时未被移除，随使用时间在 DOM 中积累。现一并清理 `.menu-cleaner-reorder-item.dragging` 残留。
- **弹窗内元素缺少 `touch-action: none`**：移动端浏览器在 `.menu-cleaner-reorder-item` 上触发了页面滚动而非拖拽。CSS 已补上。

---
## [1.4.4] - 2026-06-11

### Fixed

- **扩展菜单出现重复"快速回复"条目**：`#qr_container` 包装器自身有了 `.inline-drawer-header` 后被自检路径作为独立条目加入，与硬编码的 `#qr--settings` 重复。新增 `_hasHardcodedChild` 检查：当 `extension_container` 容器包含硬编码子项时，跳过自检，交由子扫描路径处理。

---
## [1.4.3] - 2026-06-11

### Fixed

- **手机端拖拽无法在同一列内上下移动**：`touchend` 中当 `elementFromPoint` 返回拖拽元素自身或空时（窄屏常见），按 Y 坐标距离找最近元素作插入点。
- **手机端拖拽产生残影**：`pointerdown`/`pointermove`/`pointerup` 三处新增 `if (e.pointerType === 'touch') return;` 跳过触摸事件，避免与 `touchstart`/`touchmove`/`touchend` 处理器争抢 DOM state 及创建重复 ghost；`cleanupDrag` 新增防御性移除所有 `.menu-cleaner-ghost`。
- **手机端拖拽缺少视觉反馈**：`touchmove` 添加与 `touchend` 相同的 Y 坐标降级逻辑，拖动过程中正确显示蓝色左边框指示插入位置。

---
## [1.4.2] - 2025-06-10

### Fixed

- **排序持久化 — 增强第2弹**：`doReorder` 改用完整 `settings.reorder[]` 数组操作，不再通过 `getReorderItems()`（含 hiddenSelectors 过滤）写回，因此已隐藏的扩展条目选择器不会从排序列表中丢失。
- **跨栏列信息持久化**：发现缓存（`discoveryCache`）中的 `column` 值在 `refreshDiscoveryCache()` 每次执行前后得到双向保护（函数内 `_savedCols`），并在 `applyNativeReorder()` 执行后根据实际 DOM 位置同步更新。
- **脚本自身元素不被排除**：`init()` 改为先注入设置 UI 再扫描发现缓存，避免 `#menu-cleaner-settings` 在扫描时因 DOM 不存在被移除列信息。同时将其加入 `extensionsSettings` 的 `exclude` 列表，不再在隐藏/排序视图中出现。
- **稳定自动 ID**：无原生 ID 的扩展元素不再分配每次刷新变化的 `menu-cleaner-auto-N`，改为基于标签的 `mc-中文标签-N` 稳定 ID（首次分配后有冲突时递增后缀，刷新后不变）。

### Changed

- **初始化时序优化**：`injectSettingsEntry()` 移至 `refreshDiscoveryCache()` 之前，确保脚本自身 UI 元素在缓存扫描时已存在。
- **`captureInitialSnapshot()` 同步稳定 ID**：快照与发现缓存使用相同 ID 分配策略，`resetAllReorders()` 等操作不再因 ID 不一致丢失条目。

### Removed

- **清理零风险死代码**：删除 `injectMenuEntry()` 空函数（+1 处调用）、`updatePopupView()` 空函数（+2 处调用）、空 try/catch 块，净减 ~20 行。

---
## [1.4.1] - 2025-06-08

### Fixed

- **头部按钮图标跟随缩放**：5 个操作按钮（编辑/排序/缩放/自适应/设置）的图标字号改为 `calc(14px * var(--content-scale,1))`，同步 Aa 缩放滑块。

---
## [1.4.0] - 2025-06-08

### Added

- **显示密度选择器**（大/中/小/图标/小图标）：点击 Aa 展开缩放栏，可选 5 种按钮密度，手机触控更顺手，选择后自动保存。
- **可独立开关魔法面板和精简器**：扩展菜单设置中增加"启用魔法面板"和"启用精简器"勾选框。魔法面板关闭后精简器入口不受影响（魔棒/扩展菜单/斜杠命令均可打开）。
- **弹窗头部"设置"→"手动重扫"**：点击即执行全量重新扫描，不再切换设置面板。

### Fixed

- **`setupAutoRescan()` 旧 Observer 残留**：热重载时旧 MutationObserver 未 disconnect → 新 observer 启动前先循环断开旧的。
- **`setupKeyboard()` 重复绑定**：脚本热重载后 `keydown`/`resize` 监听器叠加 → 加入 `win.__mcKeyboardBound` 守卫。
- **分栏切换按钮函数名错误**：事件中引用不存在的 `setColumnMode()` → 改为 `applyColumnMode()`。

### Changed

- **设置内容整合到重排序页面**：恢复原始排序、清除插件数据、扩展菜单分栏（双栏/单栏）、重扫描消息 toast 全部移入重排序页面底部，设置面板整页删除。
- **工具栏按钮换行修复**：`flex-wrap:wrap` 配合 `justify-content:space-between`，窄屏时 5 个操作按钮整组换行到标题下方。

### Removed

- **设置面板**（`toggleSettingsPanel` / `renderSettingsView` / `showSettingsPanel` 变量）：整页删除，净减 ~60 行代码。

---
## [1.3.0] - 2025-06-07

### Added

- **面板列数选择器**：点击 Aa 展开缩放栏，可选择 1-4 列（支持 1丨2丨3丨4），手机用户可选 1 或 2 列，选择后自动保存。
- **面板标题窄屏适配**：`flex-wrap:wrap` + `justify-content:space-between`，窄屏时 5 个操作按钮整组换行到标题下方，不再挤散标题。

### Fixed

- **`#regex_container` 子扫描产生重复条目**：`extension_container` 子扫描会深入硬编码容器内部，将每个抽屉都发现出来 → 产生"正则"+"聊天档案"等重复。修复：子扫描前检查容器 id 是否匹配硬编码条目，匹配时跳过子扫描。
- **旧版遗留缓存清理**：启动时自动删除旧版已积累的硬编码容器内部 auto-ID 缓存条目。
- **`console.debug` 异常安全**：8 处 `catch(e) { console.debug(...) }` 加上  try 包裹，防止 `console` 不存在时二次异常。

### Changed

- **缩放栏重构**：启用 `flex-wrap:wrap`，容纳新增列数选择器。

---
## [1.2.2] - 2025-06-06

### Fixed

- **`btn.id` 未转义导致属性注入风险**：`render()` 中 `data-btn-id="${btn.id}"` 未使用 `Runtime.escHtml` 转义 → 加入 `Runtime.escHtml(btn.id)`，消除 XSS 风险。
- **`waitForButton()` 无限轮询**：按钮永远不存在时每 500ms 重试一次永不停止 → 加入 retries 上限（60 次 ≈ 30 秒），超时输出警告并停止。
- **`injectSettingsEntry()` 无限重试**：`#extensions_settings` 不存在时同样无限轮询 → 加入 retries 上限（60 次），超时停止并警告。
- **Escape 键关闭扩展面板只改变量不关 UI**：按 Esc 后 `extPanelVisible=false` 但面板 DOM 仍可见 → 追加 `returnElementsToNative()` + `panel.style.display='none'`，保持状态一致。
- **`registerSlashCmd()` 热重载重复注册**：脚本重新加载时再次调用 `registerSlashCmd()`，会重复插入 module script → 加入 `win.__mcSlashRegistered` 守卫，仅注册一次。
- **`ensureMenuBindings()` 对不存在的按钮也计入重试**：`.every()` 遇到不存在的 `buttonId` 返回 `false` 导致继续重试 30 秒 → 改为只检查已在 DOM 中的按钮。

### Changed

- **内置菜单图标整合**：12 个内置菜单项的图标（`icons` 映射表）合并到 `BUILTIN_OPTIONS_ITEMS` 的 `icon` 字段中。`MENU_CONFIGS` 不再查找外部映射表，改为直接读取 `it.icon`（无 icon 字段时 fallback `g.mp.defaultIcon`）。新增菜单项只需一行 `icon` 字段，不再需要维护两处。
- **删除冗余 `applyNativeReorder` 调用**：`init()` 中 Step 6 与 Step 4 紧邻，中间无 DOM 变化，属重复调用 → 删除 Step 6，减少不必要的 DOM 操作。
- **清除死循环骨架代码**：`REORDER_GROUP_IDS` 为单元素数组 `['extensionsSettings']`，所有 `for + if` 循环均排除了唯一的元素 → 循环体实际永不执行，已全部删除。

### Security

- **`escHtml` 增加单引号和反引号转义**：`'` → `&#39;`，`` ` `` → `` &#96; ``，增强防御深度。
- **8 处空 `catch(e) {}` 添加日志**：Store 读写、Runtime 父页面访问、面板尺寸保存等关键路径增加 `console.debug` 输出，便于排查隐蔽错误。

---
## [1.2.1] - 2025-06-06

### Fixed

- **重复「关闭聊天」按钮**：魔法面板左下菜单中出现两个「关闭聊天」，假的只能关面板 → 增加 label 去重（`seenLabels`），同组同名按钮只保留 config 定义的那一个。
- **「切换全屏」按钮屏蔽**：TauriTavern 注入的「切换全屏」按钮在面板和精简器中均无意义 → 通过 `EXCLUDED_LABELS` 在收集/发现/渲染三处过滤。
- **`/menucleanerdisable` 斜杠命令失效**：`registerSlashCmd()` 注入的 `<script type="module">` 在父页面全局作用域运行，引用的 `win` 是 IIFE2 局部变量 → 抛 ReferenceError。修复：注入脚本中改为 `window.__mcDisable`（函数通过 `win.__mcDisable` 正确挂在了父窗口上）。
- **扩展面板排序被打乱 / 扩展跑到左栏**：`loadSettings` 同时裁剪 `discoveryCache`（删掉 DOM 中不存在的条目）和 `reorder`，扩展懒加载时被删 → 列信息丢失 → 重回左栏。现已统一不裁剪，`discoveryCache` 保留列信息，`reorder` 保留排序，扩展不再"跑位"。
- **严重性能问题（酒馆后台卡顿）**：
  - 启动时大量扩展同时注入 → MutationObserver 反复触发 → 800ms 防抖后做全量 DOM 扫描 + 物理重排（`appendChild`）→ 浏览器 layout 持续重算 → 电脑变卡
  - 修复：`doRescan` 只扫描有动态发现的组（`extensionsSettings/options/extensionsMenu`），跳过静态组；扫描结果无变化时跳过 `applyNativeReorder` 避免不必要 DOM 移动
  - 修复：MutationObserver 移除 `#extensionsMenu`（不会动态加载）
  - 修复：移除冗余的 `CHAT_CHANGED` 自动扫描（切换聊天不改扩展面板）
  - 修复：`suppressObserver` 超时从 0ms 延长到 50ms，避免 DOM 操作被分批触发

---
## [1.2.0] - 2025-06-05

### Added

- **统一配置主源 MENU_REGISTRY**：MagicPanel 的 MENU_CONFIGS 和 MenuCleaner 的 PANEL_GROUPS 均派生自同一个注册表，新增菜单项只需改一处。
- **共享数据层（Runtime.BUILTIN_OPTIONS_ITEMS）**：两控制器重复的 12 项左下菜单项合并为共享数组，数据一致。
- **面板自适应按钮**：点击后面板自动缩放到刚好包裹所有按钮，再次点击恢复默认宽度（不持久化）。
- **面板缩放滑块（Aa）**：调节面板内按钮图标和文字大小（60%-150%），自动保存。
- **DOM 查询帮助函数**：getExtPanel/getPopup/getPopupBody/getRmBlock，减少重复字符串。

### Changed

- **存储层统一**：magicStore() 合并为文件作用域 Store 对象（mp + mc 命名空间）。
- **共享能力收口**：getRootDocument/escHtml/getMcHiddenIds 全部迁入 Runtime。
- **跨模块桥接**：MagicPanel 通过 Runtime.openMenuCleanerPopup/isMenuCleanerPopupOpen 与 MenuCleaner 交互，不再直操作 DOM。
- **跨模块常量共享**：MAGIC_COMPAT_VISIBLE_SELECTORS 迁入 Runtime.MP_VISIBLE_SELECTORS。
- **精简器 item 渲染提取**：buildHideItemHTML 替代两个几乎相同的模板块。
- **面板 CSS 垂直居中**：.magic-panel-btn 增加 justify-content:center。
- **面板尺寸按菜单隔离**：每个菜单（左下/魔棒）独立记住拖拽尺寸。

### Removed

- **magicStore() 旧函数**：已完全移除。
- **var _mpStore 兼容别名**：业务代码零引用，已删除。
- **var _escDiv 死变量**：从未被读取，已删除。
- **旧注释占位**：3 条过渡注释已清理。
- **MAGIC_COMPAT_VISIBLE_SELECTORS 硬编码**：已并入 Runtime。

---
# Changelog

## [1.1.3] - 2025-06-05

### Fixed

- **智绘姬（st-chatu8）按钮不显示**：魔法面板和菜单精简器均无法识别「打开文生图设置」按钮
  - 魔法面板： 中  配置新增 ，动态发现左下菜单按钮
  - 菜单精简器： 中  新增 ，自动发现动态元素
  -  增加  兜底判断，适配  直接子元素结构
- **修复 CSS 语法错误**： 的闭花括号错位导致后续 CSS 属性失效

---
## [1.1.2] - 2025-06-04

### Changed

- 精简器重排序只保留 extensionSettings（扩展菜单）— options（左下菜单）和 extensionsMenu（魔棒）的重排序对 Magic Panel 无任何效果，移除冗余 UI 避免用户困惑。

---

## [1.1.1] - 2025-06-04

### Fixed

- **拖拽期间按 Esc 导致 dragActive 永久锁定**：关闭弹窗时重置拖拽状态并清理 CSS 残留，防止自动重扫描功能永久停摆。
- **loadSettings 过早清理扩展按钮配置**：扩展可能尚未注入 DOM 时，不再删除用户已保存的隐藏设置。

---

## [1.1.0] - 2025-06-04

### Added

- **面板尺寸拖拽调整**：面板右下角新增拖拽手柄（↘），可自由调整面板宽度(200-600px)和高度(200-800px)，尺寸自动保存。
- **菜单精简器拖拽防残留**：关闭弹窗时自动清除拖拽产生的幽灵元素，不再需要重启酒馆。

### Fixed

- **拖拽留影**：关闭弹窗时拖拽元素的克隆副本残留在 DOM 中，需重启酒馆才能消失 → 关闭弹窗自动清除。

---

## [1.0.0] - 2025-06-04

### Added

- **魔法面板（Magic Panel）**：点击左下菜单或魔棒按钮弹出快捷操作面板，按钮即点即用。
- **编辑模式**：点击 ✏️ 图标进入编辑，勾选要隐藏的按钮，点保存。
- **排序模式**：点击 ⇅ 图标进入排序，拖拽调整按钮顺序，再次点击 ⇅ 保存。
- **菜单精简器（Menu Cleaner）**：隐藏/显示任意菜单项、双栏/单栏布局切换、扩展面板自动发现。
- **拖拽排序**：自定义 mousedown/touch 拖拽实现，兼容 TauriTavern 与原始 SillyTavern。
- **持久化存储**：排序顺序独立存储 magic_panel_order_{groupId}，不与菜单精简器冲突。
- **iframe 兼容**：支持酒馆助手插件环境运行。
- **触屏 + 鼠标双端支持**：手机/桌面均可拖拽操作。
