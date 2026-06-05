# Changelog

## [1.1.4] - 2025-06-05

### Changed

- **存储层统一**：`magicStore()` 合并为文件作用域的共享 `Store` 对象（`mp` + `mc` 双命名空间），MagicPanel 和 MenuCleaner 共享同一套持久化接口。
  - MagicPanel —— 所有 `_mpStore.get/set` 改为 `Store.mp.get/set`（隐藏按钮、排序、面板尺寸、缩放）
  - MenuCleaner —— `loadSettings` / `saveSettings` 改为 `Store.mc.getAll()` / `Store.mc.setAll()`
  - 跨模块桥接 —— `getMcHiddenIds()` 改为 `Store.mc.getHiddenSelectors()`
  - 斜杠命令 —— 注入代码走 `window.__mcDisable`
  - 保留一行 `var _mpStore = Store.mp;` 方便旧引用排查，业务代码不再直接依赖
- `magicStore()` 旧函数已移除。

---
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
