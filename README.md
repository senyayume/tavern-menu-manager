# 🍺 Tavern Menu Manager

为 [SillyTavern](https://github.com/SillyTavern/SillyTavern) / TauriTavern 设计的菜单管理器脚本。

## 功能

### 🪄 魔法面板（Magic Panel）
- 点击 `options_button` 或 `extensionsMenuButton` 弹出快捷操作面板
- 面板内按钮即点即用，无需打开原生菜单
- 编辑模式：隐藏/显示不需要的按钮
- **排序模式**：点击 ⇅ 按钮进入，拖拽调整按钮顺序，自动保存

### 🧹 菜单精简（Menu Cleaner）
- 隐藏/显示任意菜单项（开关切换）
- 双栏/单栏布局切换
- 扩展面板发现：自动扫描并管理第三方扩展的菜单项
- 拖拽排序 + 重置顺序
- 自动扫描新元素（聊天切换时）

## 安装

### 作为酒馆助手插件
将 `menu-manager.user.js` 的内容粘贴到酒馆助手插件编辑器中，保存即可。

### 作为 UserScript（需要 Tampermonkey）
1. 复制 `menu-manager.user.js` 内容
2. 在 Tampermonkey 中创建新脚本，粘贴保存

## 存储

| 数据 | localStorage 键 |
|------|----------------|
| 隐藏的按钮列表 | `magic_panel_hidden_buttons` |
| 面板缩放比例 | `magic_content_scale` |
| 按钮排序顺序 | `magic_panel_order_{groupId}` |
| 菜单精简设置 | `menu_cleaner_settings` |

## 用法

- **打开面板**：点击左下菜单按钮 / 魔棒按钮
- **编辑模式**：点击 ✏️ 图标，勾选要隐藏的按钮，点保存
- **排序模式**：点击 ⇅ 图标，拖拽按钮调整顺序，再次点击 ⇅ 保存
- **设置**：点击 ⚙️ 图标打开菜单精简器设置面板

## 许可证

MIT
