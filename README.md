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

### v1.1.3 (2025-06-05)

**修复**
- 智绘姬（st-chatu8）「打开文生图设置」按钮在魔法面板和菜单精简器中不显示
  - 魔法面板：options 配置新增  选择器，动态发现左下菜单按钮
  - 菜单精简器：options 配置新增 discovery 规则，自动扫描  元素
  - 修复 CSS  花括号错位

### v1.1.2 (2025-06-04)

**变更**
- 精简器重排序只保留扩展菜单（extensionsSettings），移除了对左下菜单和魔棒的排序界面（这两个组的排序对 Magic Panel 无实际效果，Magic Panel 使用独立的排序系统）

### v1.1.1 (2025-06-04)

**修复**
- 拖拽期间按 Esc 关闭弹窗导致 dragActive 永久锁定，自动重扫描功能停摆 → 关闭弹窗时重置拖拽状态
- loadSettings 过早删除尚未加载的扩展按钮隐藏设置 → 不再清理 DOM 中不存在的隐藏条目

### v1.1.0 (2025-06-04)

**新增**
- 魔法面板右下角新增拖拽手柄（↘），可自由调整面板宽度(200-600px)和高度(200-800px)，尺寸自动保存

**修复**
- 菜单精简器拖拽排序后关闭弹窗，残留的克隆元素不再需要重启酒馆才能消失（关闭弹窗时自动清除）## 📝 版本管理

版本格式遵循 [SemVer](https://semver.org/)。  
更新日志遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

---

## 📄 许可证

MIT
