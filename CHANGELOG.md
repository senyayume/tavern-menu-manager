## [1.2.1] - 2025-06-06

### Fixed

- **重复「关闭聊天」按钮**：魔法面板左下菜单中出现两个「关闭聊天」，假的只能关面板 → 增加 label 去重（`seenLabels`），同组同名按钮只保留 config 定义的那一个。
- **「切换全屏」按钮屏蔽**：TauriTavern 注入的「切换全屏」按钮在面板和精简器中均无意义 → 通过 `EXCLUDED_LABELS` 在收集/发现/渲染三处过滤。
- **扩展面板排序自动乱**：`loadSettings` 裁剪 + `refreshDiscoveryCache` 追加双重破坏用户排序 → 删除这两处自动排序修改，排序仅由用户拖拽写入。

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
