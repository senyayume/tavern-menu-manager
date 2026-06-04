# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2025-06-04

### Added

- **魔法面板（Magic Panel）**：点击左下菜单或魔棒按钮弹出快捷操作面板，按钮即点即用。
- **编辑模式**：点击 ✏️ 图标进入编辑，勾选要隐藏的按钮，点保存。
- **排序模式**：点击 ⇅ 图标进入排序，拖拽调整按钮顺序，再次点击 ⇅ 保存。
- **菜单精简器（Menu Cleaner）**：隐藏/显示任意菜单项、双栏/单栏布局切换、扩展面板自动发现。
- **拖拽排序**：自定义 mousedown/touch 拖拽实现，兼容 TauriTavern 与原始 SillyTavern。
- **持久化存储**：排序顺序独立存储 `magic_panel_order_{groupId}`，不与菜单精简器冲突。
- **iframe 兼容**：支持酒馆助手插件环境运行。
- **触屏 + 鼠标双端支持**：手机/桌面均可拖拽操作。
