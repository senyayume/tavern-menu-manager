// ==酒馆菜单管理器 v1.5.0==
// 两大模块：魔法面板（左下弹出快捷操作）+ 菜单精简（隐藏/排序/扩展管理）
// 共享核心：Store（持久化层）+ Runtime（工具函数）+ MENU_REGISTRY（唯一配置源）
// 两控制器隔离：通过 Runtime 桥接协作，不互相穿透内部实现
// ★ 面板宽度、缩放、自适应一键调整，尺寸自动保存 ★

var Store = (function() {
  try { var ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext && SillyTavern.getContext()) || null; var ctx_ok = ctx && ctx.extension_settings ? ctx : null; } catch(e) { var ctx_ok = null; }
  var ls = (function() { try { return window.frameElement ? window.parent.localStorage : window.localStorage; } catch(e) { return null; } })();
  var _mp = {
    get: function(k) { try { return ctx_ok ? JSON.parse(JSON.stringify(ctx_ok.extension_settings[k])) : JSON.parse(ls.getItem(k) || 'null'); } catch(e) { return null; } },
    set: function(k, v) { try { if (ctx_ok) { ctx_ok.extension_settings[k] = v; ctx_ok.saveSettingsDebounced(); } else { ls.setItem(k, JSON.stringify(v)); } } catch(e) { console.debug("[Store] set failed", e); } }
  };
  var _mc = {
    getAll: function() { try { return JSON.parse(ls.getItem('menu_cleaner_settings') || '{}'); } catch(e) { return null; } },
    setAll: function(o) { try { ls.setItem('menu_cleaner_settings', JSON.stringify(o)); } catch(e) { try { console.debug('[Store] setAll failed', e); } catch(_) {} } },
    getHiddenSelectors: function() {
      try {
        var hs = JSON.parse(ls.getItem('menu_cleaner_settings') || '{}').hiddenSelectors || {};
        var keys = Object.keys(hs).filter(function(k) { return hs[k]; });
        var r = keys.slice();
        for (var i = 0; i < keys.length; i++) { if (keys[i][0] === '#') r.push(keys[i].substring(1)); }
        return r;
      } catch(e) { return []; }
    }
  };
  return { mp: _mp, mc: _mc };
})();


// ── Shared Runtime Utilities ──
var Runtime = {
  getRootDocument: function() {
    if (window.parent && window.parent.document) {
      try {
        if (window.parent.document.getElementById('extensionsMenuButton') || window.parent.document.getElementById('options_button')) return window.parent.document;
      } catch(e) { console.debug("[Runtime] parent doc access failed", e); }
    }
    return document;
  },
  escHtml: function(str) {
    if (typeof str !== 'string') str = String(str || '');
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/`/g,'&#96;');
  },
  getMcHiddenIds: function() { return Store.mc.getHiddenSelectors(); },
  // ── Shared built-in menu items (used by both controllers) ──
  BUILTIN_OPTIONS_ITEMS: [
    { selector: '#option_toggle_AN',        label: '作者注释', icon: 'fa-solid fa-feather' },
    { selector: '#option_toggle_CFG',       label: 'CFG缩放', icon: 'fa-solid fa-sliders' },
    { selector: '#option_toggle_logprobs',  label: '词符概率', icon: 'fa-solid fa-chart-simple' },
    { selector: '#option_new_bookmark',     label: '保存检查点', icon: 'fa-solid fa-bookmark' },
    { selector: '#option_convert_to_group', label: '转换为群聊', icon: 'fa-solid fa-user-group' },
    { selector: '#option_start_new_chat',   label: '开始新聊天', icon: 'fa-solid fa-comment-medical' },
    { selector: '#option_close_chat',       label: '关闭聊天', icon: 'fa-solid fa-comment-slash' },
    { selector: '#option_select_chat',      label: '管理聊天文件', icon: 'fa-solid fa-folder-open' },
    { selector: '#option_delete_mes',       label: '删除消息', icon: 'fa-solid fa-trash' },
    { selector: '#option_regenerate',       label: '重新生成', icon: 'fa-solid fa-rotate-right' },
    { selector: '#option_impersonate',      label: 'AI帮答', icon: 'fa-solid fa-masks-theater' },
    { selector: '#option_continue',         label: '继续', icon: 'fa-solid fa-forward' }
  ],
  // ── MenuCleaner popup control (registered by MC at init, called by MP) ──
  openMenuCleanerPopup: null,
  isMenuCleanerPopupOpen: null,
  // ── MagicPanel DOM identifiers MenuCleaner must not hide ──
  MP_VISIBLE_SELECTORS: [
    '#hide-helper-wand-button',
    '#menu-cleaner-wand-container',
    '.magic-panel-wrapper',
    '.magic-panel-btn'
  ]
};

// ── Labels to exclude from both Magic Panel and Menu Cleaner ──
// These buttons are injected by TauriTavern/SillyTavern and serve no
// function when triggered from the panel (only close the panel).
const EXCLUDED_LABELS = ['切换全屏'];

// ── Unified Menu Registry (single source of truth for both controllers) ──
const MENU_REGISTRY = [
  {
    id: 'options',
    buttonId: 'options_button',
    items: Runtime.BUILTIN_OPTIONS_ITEMS,
    mp: {
      menuId: 'options',
      allowHidden: true,
      defaultIcon: 'fa-solid fa-wand-magic-sparkles',
      selectors: '.interactable'
    },
    mc: {
      name: '左下菜单',
      discovery: { containers: ['#options'], itemMatch: '.interactable', labelIn: 'span' }
    }
  },
  {
    id: 'extensionsMenu',
    buttonId: 'extensionsMenuButton',
    items: [
      { selector: '#manageAttachments',       label: '打开数据库' },
      { selector: '#attachFile',              label: '附加文件' },
      { selector: '#sd_gen',                  label: '生成图片' },
      { selector: '#send_picture',            label: 'Generate Caption' },
      { selector: '#ttsExtensionNarrateAll',  label: 'Narrate All Chat' },
      { selector: '#token_counter',           label: '词符计数器' },
      { selector: '#translate_chat',          label: '翻译聊天' },
      { selector: '#translate_input_message', label: '翻译输入' }
    ],
    mp: {
      menuId: 'extensionsMenu',
      defaultIcon: 'fa-solid fa-puzzle-piece',
      selectors: '.list-group-item, #data_bank_wand_container > *, .extension_container > *',
      skipChildIds: ['extensions-search-container', 'data_bank_wand_container'],
      skipChildClasses: ['extension_container', 'list-group-item']
    },
    mc: {
      name: '魔棒',
      discovery: {
        containers: ['#extensionsMenu'],
        itemMatch: '.list-group-item',
        labelIn: 'span',
        alsoMatchChildren: true
      }
    }
  },
  {
    id: 'extensionsSettings',
    buttonId: 'extensions-settings-button',
    items: [
      { selector: '#assets_container',         label: '下载扩展和资源菜单' },
      { selector: '#expressions_container',    label: '角色表情' },
      { selector: '#sd_container',             label: '图像生成' },
      { selector: '#tts_container',            label: 'TTS' },
      { selector: '#qr--settings',             label: '快速回复' },
      { selector: '#translation_container',    label: '聊天翻译' },
      { selector: '#caption_container',        label: '图像描述' },
      { selector: '#summarize_container',      label: '总结' },
      { selector: '#regex_container',          label: '正则' },
      { selector: '#vectors_container',        label: '向量存储' }
    ],
    mc: {
      name: '扩展菜单',
      discovery: {
        containers: ['#extensions_settings', '#extensions_settings2'],
        hasHeader: '.inline-drawer-header',
        labelInHeader: 'b, [data-i18n]',
        exclude: ['#qr_container', '#agent_system_container', '#tauritavern_version_container', '#menu-cleaner-settings']
      }
    }
  },
  {
    id: 'topSettings',
    items: [
      { selector: '#ai-config-button',          label: '预设' },
      { selector: '#sys-settings-button',       label: '插头' },
      { selector: '#advanced-formatting-button',label: 'AI回复格式化' },
      { selector: '#WI-SP-button',              label: '世界书' },
      { selector: '#user-settings-button',      label: '用户设置' },
      { selector: '#backgrounds-button',        label: '背景' },
      { selector: '#extensions-settings-button',label: '扩展' },
      { selector: '#persona-management-button', label: 'USER设置' },
      { selector: '#rightNavHolder',            label: '角色卡' }
    ],
    mc: { name: '顶部导航栏' }
  },
  {
    id: 'presetSettings',
    buttonId: 'ai-config-button',
    items: [
      { selector: '#range_block_openai > div:nth-child(1), #range_block_openai > div:nth-child(2), #range_block_openai > div:nth-child(3), #range_block_openai > div:nth-child(4)', label: '上下文长度及备选回复' },
      { selector: '#range_block_openai > div:nth-child(11), #range_block_openai > div:nth-child(12), #range_block_openai > div:nth-child(13), #range_block_openai > div:nth-child(14), #range_block_openai > div:nth-child(15), #range_block_openai > div:nth-child(16), #range_block_openai > div:nth-child(17), #range_block_openai > div:nth-child(18)', label: '可调参数' },
      { selector: '#range_block_openai > div.inline-drawer.m-t-1.wide100p, #range_block_openai > div:nth-child(20), #range_block_openai > div:nth-child(21), #openai_settings > div:nth-child(1) > div:nth-child(1), #openai_settings > div:nth-child(1) > div.inline-drawer.wide100p.flexFlowColumn.marginBot10', label: '提示词格式相关' },
      { selector: '#openai_settings > div:nth-child(3), #openai_settings > div:nth-child(4), #openai_settings > div:nth-child(5), #openai_settings > div:nth-child(6), #openai_settings > div:nth-child(7), #openai_settings > div:nth-child(8), #openai_settings > div:nth-child(9), #openai_settings > div:nth-child(10), #openai_settings > div:nth-child(11), #openai_settings > div:nth-child(12), #openai_settings > div:nth-child(13), #openai_settings > div.range-block.m-t-1', label: '复选框和下拉菜单' },
      { selector: '#openai_settings > div.range-block.m-b-1', label: '预设条目' }
    ],
    mc: { name: '预设菜单' }
  }
];
(function() {
  'use strict';

  // ── 双模持久化：ST 原生扩展 → extension_settings；酒馆助手 → localStorage ──

  // 面板水平位置微调（单位：像素），当前值已对齐按钮，一般无需修改
  const PANEL_OFFSET_X = 0;

  // ★★★ 面板宽度（单位：像素），改这里即可，手机端同样生效 ★★★
  const PANEL_WIDTH = 320;   // 默认 320，改大面板变宽，改小变窄

  const STORAGE_HIDDEN = 'magic_panel_hidden_buttons';
  const STORAGE_CONTENT_SCALE = 'magic_content_scale';
  const STORAGE_COLUMNS = 'magic_panel_columns';
  const STORAGE_DENSITY = 'magic_panel_density';


  function getHiddenButtons() { try { return Store.mp.get(STORAGE_HIDDEN) || []; } catch(e) { return []; } }
  function saveHiddenButtons(list) { try { Store.mp.set(STORAGE_HIDDEN, list); } catch(e) { try { console.debug('[MP] saveHiddenButtons failed', e); } catch(_) {} } }

  // MenuCleaner cross-module: read hidden selectors from menu_cleaner_settings
  const panelCSS = `
    .magic-panel-wrapper {
      position:fixed; top:0; left:0; width:100%; height:100%;
      z-index:100000; pointer-events:none;
      opacity:0; transition:opacity 0.15s;
    }
    .magic-panel-wrapper.active {
      pointer-events:auto;
      opacity:1;
    }
    .magic-panel {
      position:absolute;
      background:var(--mc-bg,var(--SmartThemeBlurTintColor,#1a1a2e));
      border:1px solid var(--mc-border-color,var(--SmartThemeBorderColor,#333));
      border-radius:12px;
      /* 宽度使用自定义变量，可在代码顶部 PANEL_WIDTH 调整 */
      width: var(--panel-width, 320px);
      max-width:90vw;
      max-height:65vh;
      display:flex; flex-direction:column; overflow:hidden;
      box-shadow:var(--mc-shadow,0 8px 32px rgba(0,0,0,0.5));
      transform:scale(0.95);
      transition:transform 0.15s;
    }
    .magic-panel-wrapper.active .magic-panel {
      transform:scale(1);
    }
    .magic-panel-header {
      display:flex; flex-wrap:wrap; align-items:center; gap:6px 8px; justify-content:space-between;
      padding:10px 14px; border-bottom:1px solid var(--mc-border-color,var(--SmartThemeBorderColor));
    }
    .magic-panel-title {
      font-size: calc(14px * var(--content-scale, 1));
      color:var(--mc-text,var(--SmartThemeBodyColor,#e0e0e0)); white-space:nowrap; flex-shrink:0;
    }
    .magic-panel-actions {
      display:flex; align-items:center; gap:4px; flex-shrink:0;
    }
    .magic-panel-edit-btn {
      cursor:pointer; color:var(--mc-text-muted,var(--SmartThemeBodyColor,#e0e0e0)); font-size:calc(14px * var(--content-scale,1));
    }
    .magic-panel-edit-btn.editing { color:#f39c12; }
    .magic-panel-settings-btn {
      cursor:pointer; color:var(--mc-text-muted,var(--SmartThemeBodyColor,#e0e0e0)); font-size:calc(14px * var(--content-scale,1));
    }

    .magic-panel-body {
      flex:1; overflow-y:auto; padding:12px;
    }
    .magic-panel-resize-handle {
      position:absolute; bottom:0; right:0;
      width:16px; height:16px;
      cursor:se-resize; opacity:0.3;
      border-right:3px solid var(--mc-text-muted,var(--SmartThemeBodyColor,#ccc));
      border-bottom:3px solid var(--mc-text-muted,var(--SmartThemeBodyColor,#ccc));
      border-radius:0 0 4px 0; z-index:2;
    }
    .magic-panel-resize-handle:hover { opacity:0.7; }
    .magic-panel-btn {
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;
      padding:12px 6px; border-radius:8px;
      border:1px solid var(--mc-border-color,var(--SmartThemeBorderColor));
      cursor:pointer; min-height:64px; position:relative;
      background:var(--mc-hover-bg,rgba(255,255,255,0.03)); color:var(--mc-text,var(--SmartThemeBodyColor,#ccc));
    }
    .magic-panel-grid, .magic-panel-more-grid.expanded {
      display:grid; grid-template-columns:repeat(var(--panel-cols,3),1fr); gap:8px;
    }

    .magic-panel-btn:hover {
      background:var(--mc-hover-bg-strong,rgba(255,255,255,0.08));
      border-color:var(--mc-accent,var(--SmartThemeQuoteColor,#5bc0de));
    }
    .magic-panel-btn.selected {
      border-color:var(--mc-accent,#f39c12); background:rgba(var(--mc-accent-rgb,243,156,18),0.15);
    }
    .magic-panel-btn .edit-check {
      display:none; position:absolute; top:4px; right:4px;
      width:16px; height:16px; background:#f39c12; color:#fff;
      border-radius:50%; font-size:10px; text-align:center; line-height:16px;
    }
    .magic-panel-btn.selected .edit-check { display:block; }
    .magic-panel-btn i {
      font-size: calc(18px * var(--content-scale, 1));
    }
    .magic-panel-btn .btn-label {
      font-size: calc(11px * var(--content-scale, 1));
      line-height:1.2;
      overflow:hidden; text-overflow:ellipsis;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
    }
    .magic-panel-more-section {
      margin-top:12px; border-top:1px solid var(--SmartThemeBorderColor); padding-top:8px;
    }
    .magic-panel-more-toggle {
      cursor:pointer; display:flex; align-items:center; gap:6px; color:var(--mc-text-muted,#888);
    }
    .magic-panel-more-toggle:hover { color:var(--SmartThemeQuoteColor); }
    .magic-panel-more-grid { display:none; margin-top:8px; }
    .magic-panel-more-grid.expanded {
      display:grid; grid-template-columns:repeat(3,1fr); gap:8px;
    }
    .magic-panel-scale-bar {
      display:none; flex-wrap:wrap; align-items:center; gap:6px 8px;
      padding:6px 14px; border-bottom:1px solid var(--mc-border-color,var(--SmartThemeBorderColor));
      background:var(--mc-hover-bg,rgba(255,255,255,0.02));
    }
    .magic-panel-scale-bar.active { display:flex; }
    .magic-panel-scale-bar .scale-label { font-size:13px; color:var(--SmartThemeBodyColor,#ccc); cursor:pointer; }
    .magic-panel-scale-bar .magic-panel-scale-slider {
      flex:1; height:4px; cursor:pointer; accent-color:var(--SmartThemeQuoteColor,#5bc0de); min-width:60px;
    }
    .magic-panel-scale-bar .scale-value {
      font-size:11px; color:var(--SmartThemeBodyColor,#888); min-width:32px; text-align:right;
    }
    .magic-panel-scale-bar .scale-divider {
      width:1px; height:16px; background:rgba(255,255,255,0.1); flex-shrink:0;
    }
    .magic-panel-scale-bar .magic-panel-cols {
      display:flex; align-items:center; gap:2px; font-size:12px; flex-shrink:0;
    }
    .magic-panel-scale-bar .magic-panel-cols span {
      cursor:pointer; padding:2px 5px; border-radius:4px; color:var(--SmartThemeBodyColor,#888); line-height:1; min-width:16px; text-align:center;
    }
    .magic-panel-scale-bar .magic-panel-cols span.active { background:rgba(255,255,255,0.1); color:var(--SmartThemeBodyColor,#e0e0e0); font-weight:600; }
    .magic-panel-scale-bar .magic-panel-cols span:hover { color:var(--SmartThemeBodyColor,#e0e0e0); }
    .magic-panel-scale-bar .magic-panel-density {
      display:flex; align-items:center; gap:2px; font-size:12px; flex-shrink:0;
    }
    .magic-panel-scale-bar .magic-panel-density span {
      cursor:pointer; padding:2px 5px; border-radius:4px; color:var(--SmartThemeBodyColor,#888); line-height:1;
    }
    .magic-panel-scale-bar .magic-panel-density span.active { background:rgba(255,255,255,0.1); color:var(--SmartThemeBodyColor,#e0e0e0); font-weight:600; }
    .magic-panel-scale-bar .magic-panel-density span:hover { color:var(--SmartThemeBodyColor,#e0e0e0); }
    .magic-panel-save-bar {
      display:none; padding:10px; text-align:center;
      border-top:1px solid var(--SmartThemeBorderColor);
    }
    .magic-panel-save-bar.active { display:block; }
    .magic-panel-save-btn {
      padding:8px 24px; border-radius:6px; border:none;
      background:var(--SmartThemeQuoteColor,#5bc0de); color:#fff;
      font-size:13px; cursor:pointer;
    }
    .magic-panel-fit-btn, .magic-panel-scale-btn {
      cursor:pointer; color:var(--SmartThemeBodyColor,#e0e0e0); font-size:calc(14px * var(--content-scale,1));
    }
    .magic-panel-fit-btn:hover, .magic-panel-scale-btn:hover { color:var(--SmartThemeQuoteColor,#5bc0de); }
    .magic-panel-sort-btn {
      cursor:pointer; color:var(--SmartThemeBodyColor,#e0e0e0); font-size:calc(14px * var(--content-scale,1));
    }
    .magic-panel-sort-btn.active { color:var(--SmartThemeQuoteColor,#5bc0de); }
    .magic-panel-btn .drag-handle { display:none; cursor:grab; color:var(--SmartThemeBodyColor,#ccc); position:absolute; left:4px; top:50%; transform:translateY(-50%); font-size:13px; user-select:none; }
    .magic-panel.is-sorting .magic-panel-grid, .magic-panel.is-sorting .magic-panel-more-grid.expanded { gap:4px; }
    .magic-panel.is-sorting .magic-panel-btn .drag-handle { display:inline-block; }
    .magic-panel.is-sorting .magic-panel-btn .edit-check { display:none; }
    .magic-panel.is-sorting .magic-panel-btn:hover { transform:none; }
    .magic-panel-btn.sort-dragging { opacity:0.6; z-index:99; }
    .magic-panel-btn.sort-target { border:2px dashed var(--SmartThemeQuoteColor,#5bc0de) !important; }
    /* ── Density modes ── */
    .magic-panel.density-large .magic-panel-btn { min-height:64px; padding:12px 6px; gap:6px; }
    .magic-panel.density-large .btn-label { font-size:calc(13px * var(--content-scale,1)); }
    .magic-panel.density-medium .magic-panel-btn { min-height:52px; padding:8px 4px; gap:4px; }
    .magic-panel.density-medium .btn-label { font-size:calc(10px * var(--content-scale,1)); }
    .magic-panel.density-medium .magic-panel-btn i { font-size:calc(16px * var(--content-scale,1)); }
    .magic-panel.density-small .magic-panel-btn { min-height:44px; padding:6px 4px; gap:3px; }
    .magic-panel.density-small .btn-label { font-size:calc(9px * var(--content-scale,1)); }
    .magic-panel.density-small .magic-panel-btn i { font-size:calc(14px * var(--content-scale,1)); }
    .magic-panel.density-icon .magic-panel-btn { min-height:48px; padding:6px 4px; gap:2px; }
    .magic-panel.density-icon .btn-label { display:none; }
    .magic-panel.density-icon .magic-panel-btn i { font-size:calc(20px * var(--content-scale,1)); }
    .magic-panel.density-small-icon .magic-panel-btn { min-height:40px; padding:4px 4px; gap:2px; }
    .magic-panel.density-small-icon .btn-label { display:none; }
    .magic-panel.density-small-icon .magic-panel-btn i { font-size:calc(18px * var(--content-scale,1)); }
    .magic-panel.is-sorting .magic-panel-btn { cursor:grab; position:relative; padding-left:22px; }
    @media (max-width:600px) {
      /* 手机端同样使用变量，不再写死宽度 */
      .magic-panel { width: var(--panel-width, 280px); }
      .magic-panel-grid,.magic-panel-more-grid.expanded { grid-template-columns:repeat(var(--panel-cols,2),1fr); }
    }
  `;

  const MENU_CONFIGS = MENU_REGISTRY.filter(function(g) { return g.mp; }).map(function(g) {
  var c = { key: g.id, buttonId: g.buttonId, menuId: g.mp.menuId, defaultIcon: g.mp.defaultIcon, selectors: g.mp.selectors };
  if (g.mp.allowHidden) c.allowHidden = true;
  if (g.mp.skipChildIds) c.skipChildIds = g.mp.skipChildIds;
  if (g.mp.skipChildClasses) c.skipChildClasses = g.mp.skipChildClasses;
  if (g.items) c.items = g.items.map(function(it) { return { selector: it.selector, label: it.label, icon: it.icon || g.mp.defaultIcon }; });
  return c;
});

  class MagicPanel {
    constructor() {
      this.isEditing = false;
      this.editSelection = new Set();
      this.isSorting = false;
      this.sortDragId = null;
      this.rootDoc = Runtime.getRootDocument();
      this.activeMenu = MENU_CONFIGS[0];
      this.bindRetries = 0;
      this.injectStyles();
      this.createPanel();
      this.bindEvents();
      this.bindColumnClicks();
      this.bindDensityClicks();
      this.initScale();
      this.blockOriginalMenus();
      this.ensureMenuBindings();

      // 应用面板宽度（手机端和电脑端统一生效）
      // Apply panel width - respect mobile media query (280px for narrow screens)
      const win = this.rootDoc.defaultView || window;
      const isMobile = win.innerWidth <= 600;
      const panelWidth = isMobile ? Math.min(PANEL_WIDTH, 280) : PANEL_WIDTH;
      this.panel.style.setProperty('--panel-width', panelWidth + 'px');
    }

    injectStyles() {
      if (this.rootDoc.getElementById('magic-panel-styles')) return;
      const style = this.rootDoc.createElement('style');
      style.id = 'magic-panel-styles';
      style.textContent = panelCSS;
      this.rootDoc.head.appendChild(style);
    }

    createPanel() {
      // Remove stale panel to pick up template changes on re-init
      var oldWrap = this.rootDoc.querySelector('.magic-panel-wrapper');
      if (oldWrap) oldWrap.remove();
      {
        const html = `
          <div class="magic-panel-wrapper" role="dialog" aria-label="酒馆菜单管理器">
            <div class="magic-panel">
              <div class="magic-panel-header">
                <span class="magic-panel-title">酒馆菜单管理器</span>
                <div class="magic-panel-actions">
                  <span class="magic-panel-edit-btn" role="button" aria-label="编辑模式"><i class="fa-solid fa-pen"></i></span>
                  <span class="magic-panel-sort-btn" role="button" aria-label="排序"><i class="fa-solid fa-arrow-up-short-wide"></i></span>
                  <span class="magic-panel-scale-btn" role="button" aria-label="缩放"><i class="fa-solid fa-text-height"></i></span>
                  <span class="magic-panel-fit-btn" role="button" aria-label="自适应大小"><i class="fa-solid fa-expand"></i></span>
                  <span class="magic-panel-settings-btn" role="button" aria-label="设置"><i class="fa-solid fa-cog"></i></span>
                </div>
              </div>
              <div class="magic-panel-scale-bar">
                <span class="scale-label">Aa</span>
                <input type="range" class="magic-panel-scale-slider" min="60" max="150" value="100" step="5">
                <span class="scale-value">100%</span>
                <span class="scale-divider"></span>
                <span class="magic-panel-cols" id="panelCols"><span data-cols="1">1</span><span data-cols="2">2</span><span data-cols="3" class="active">3</span><span data-cols="4">4</span></span>
                <span class="scale-divider"></span>
                <span class="magic-panel-density" id="panelDensity"><span data-density="large">大</span><span data-density="medium">中</span><span data-density="small">小</span><span data-density="icon">图标</span><span data-density="small-icon">小图标</span></span>
              </div>
              <div class="magic-panel-body"><div data-content="tavern"></div></div>
              <div class="magic-panel-resize-handle"></div>
              <div class="magic-panel-save-bar"><button class="magic-panel-save-btn">保存</button></div>
            </div>
          </div>`;
        this.rootDoc.body.insertAdjacentHTML('beforeend', html);
      }
      this.wrapper = this.rootDoc.querySelector('.magic-panel-wrapper');
      this.panel = this.wrapper.querySelector('.magic-panel');
      this.editBtn = this.panel.querySelector('.magic-panel-edit-btn');
      this.sortBtn = this.panel.querySelector('.magic-panel-sort-btn');
      this.settingsBtn = this.panel.querySelector('.magic-panel-settings-btn');
      this.colsEls = this.panel.querySelectorAll('.magic-panel-cols span');
      this.initColumns();
      this.densityEls = this.panel.querySelectorAll('.magic-panel-density span');
      this.initDensity();
      this.saveBar = this.panel.querySelector('.magic-panel-save-bar');
      this.saveBtn = this.panel.querySelector('.magic-panel-save-btn');
      this.content = this.panel.querySelector('[data-content="tavern"]');
    }

    bindEvents() {
      this.wrapper.addEventListener('click', (e) => {
        if (e.target === this.wrapper) this.close();
      });
      this.rootDoc.addEventListener('click', (e) => {
        if (!this.wrapper.classList.contains('active')) return;
        if (this.panel.contains(e.target) || MENU_CONFIGS.some(config => e.target.closest && e.target.closest('#' + config.buttonId))) return;
        this.close();
      }, true);
      this.rootDoc.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.wrapper.classList.contains('active')) {
          // Check via Runtime bridge (MC registers at init)
          if (Runtime.isMenuCleanerPopupOpen && Runtime.isMenuCleanerPopupOpen()) return;
          this.close();
        }
      });
      this.sortBtn.addEventListener('click', () => {
        if (this.isEditing) return;
        if (this.isSorting) {
          this.saveSortOrder();
        } else {
          this.isSorting = true;
          this.sortDragId = null;
          this.panel.classList.add('is-sorting');
          this.sortBtn.classList.add('active');
        }
      });
      this.editBtn.addEventListener('click', () => {
        if (this.isSorting) this.exitSortMode();
        this.isEditing = !this.isEditing;
        this.editBtn.classList.toggle('editing', this.isEditing);
        this.saveBar.classList.toggle('active', this.isEditing);
        if (this.isEditing) this.editSelection = new Set(getHiddenButtons());
        this.render();
      });
      this.saveBtn.addEventListener('click', () => {
        saveHiddenButtons(Array.from(this.editSelection));
        this.isEditing = false;
        this.editBtn.classList.remove('editing');
        this.saveBar.classList.remove('active');
        this.render();
      });
      this.settingsBtn.addEventListener('click', () => {
        // Open MenuCleaner's popup via Runtime bridge (MC registers at init)
        if (Runtime.openMenuCleanerPopup) { Runtime.openMenuCleanerPopup(); return; }
      });
      this.scaleBtn = this.panel.querySelector('.magic-panel-scale-btn');
      this.scaleBar = this.panel.querySelector('.magic-panel-scale-bar');
      this.scaleSlider = this.panel.querySelector('.magic-panel-scale-slider');
      this.scaleSliderVal = this.panel.querySelector('.scale-value');
      this.scaleBtn.addEventListener('click', () => {
        this.scaleBar.classList.toggle('active');
      });
      this.scaleSlider.addEventListener('input', () => {
        const pct = parseInt(this.scaleSlider.value);
        const scale = pct / 100;
        this.panel.style.setProperty('--content-scale', scale);
        this.scaleSliderVal.textContent = pct + '%';
        Store.mp.set(STORAGE_CONTENT_SCALE, scale);
      });
      this.fitBtn = this.panel.querySelector('.magic-panel-fit-btn');
      this.fitBtn.addEventListener('click', () => {
        this.fitToContent();
      });
      // Reposition panel on window resize
      this.rootDoc.defaultView.addEventListener('resize', () => {
        if (this.wrapper.classList.contains('active')) {
          const win = this.rootDoc.defaultView || window;
          const isMobile = win.innerWidth <= 600;
          this.panel.style.setProperty('--panel-width', (isMobile ? Math.min(PANEL_WIDTH, 280) : PANEL_WIDTH) + 'px');
          this.position();
        }
      });
    }

    ensureMenuBindings() {
      var allBound = true;
      for (var _ec = 0; _ec < MENU_CONFIGS.length; _ec++) {
        var btn = this.rootDoc.getElementById(MENU_CONFIGS[_ec].buttonId);
        if (btn) {
          if (btn.dataset.magicPanelBound !== '1') allBound = false;
        }
        // Button not in DOM yet — skip, don't count as failure
      }
      if (allBound || this.bindRetries >= 60) return;
      this.bindRetries++;
      setTimeout(() => {
        this.blockOriginalMenus();
        this.ensureMenuBindings();
      }, 500);
    }

    initColumns() {
      var cols = parseInt(Store.mp.get(STORAGE_COLUMNS)) || 3;
      cols = Math.max(1, Math.min(4, cols));
      this.panel.style.setProperty('--panel-cols', cols);
      this.colsEls.forEach(function(el) {
        el.classList.toggle('active', parseInt(el.dataset.cols) === cols);
      });
    }

    bindDensityClicks() {
      var self = this;
      this.densityEls.forEach(function(el) {
        el.addEventListener('click', function() {
          var density = this.dataset.density;
          // Remove all density classes, add selected
          self.panel.classList.remove('density-large', 'density-medium', 'density-small', 'density-icon', 'density-small-icon');
          self.panel.classList.add('density-' + density);
          self.densityEls.forEach(function(e) { e.classList.toggle('active', e === el); });
          try { Store.mp.set(STORAGE_DENSITY, density); } catch(e) { try { console.debug('[MP] save density failed', e); } catch(_) {} }
        });
      });
    }

    initDensity() {
      var density = Store.mp.get(STORAGE_DENSITY) || 'large';
      if (['large','medium','small','icon','small-icon'].indexOf(density) === -1) density = 'large';
      this.panel.classList.add('density-' + density);
      this.densityEls.forEach(function(el) {
        el.classList.toggle('active', el.dataset.density === density);
      });
    }

    bindColumnClicks() {
      var self = this;
      this.colsEls.forEach(function(el) {
        el.addEventListener('click', function() {
          var cols = parseInt(this.dataset.cols);
          self.panel.style.setProperty('--panel-cols', cols);
          self.colsEls.forEach(function(e) { e.classList.toggle('active', e === el); });
          try { Store.mp.set(STORAGE_COLUMNS, cols); } catch(e) { try { console.debug('[MP] save columns failed', e); } catch(_) {} }
          requestAnimationFrame(function() { self.position(); });
        });
      });
    }

    initScale() {
      const saved = parseFloat(Store.mp.get(STORAGE_CONTENT_SCALE) || '1');
      this.panel.style.setProperty('--content-scale', saved);
      // Sync scale bar slider if available
      if (this.scaleSlider && this.scaleSliderVal) {
        this.scaleSlider.value = Math.round(saved * 100);
        this.scaleSliderVal.textContent = Math.round(saved * 100) + '%';
      }
    }
    fitToContent() {
      // Toggle: if already fitted, reset to default width
      if (this._fittedSize) {
        this.panel.style.width = '';
        this.panel.style.height = '';
        this._fittedSize = null;
        Store.mp.set('magic_panel_size_' + this.activeMenu.key, null);
        this.position();
        return;
      }
      const body = this.panel.querySelector('.magic-panel-body');
      if (!body) return;
      // Only count visible buttons: main grid + expanded more-grid
      var grid = body.querySelector('.magic-panel-grid');
      var moreGrid = body.querySelector('.magic-panel-more-grid.expanded');
      var items = [];
      if (grid) items = Array.from(grid.querySelectorAll('.magic-panel-btn'));
      if (moreGrid) items = items.concat(Array.from(moreGrid.querySelectorAll('.magic-panel-btn')));
      if (!items.length) return;
      // Calculate content-bounding dimensions
      var maxW = 0, maxH = 0, gap = 8, padding = 24, headerH = this.panel.querySelector('.magic-panel-header')?.offsetHeight || 40;
      items.forEach(function(b) {
        maxW = Math.max(maxW, b.offsetWidth);
        maxH = Math.max(maxH, b.offsetHeight);
      });
      var cols = 3;
      if (grid) {
        var gs = getComputedStyle(grid).gridTemplateColumns || '';
        cols = Math.max(1, gs.split(' ').length);
      }
      var rows = Math.ceil(items.length / cols);
      var fitW = maxW * cols + gap * (cols - 1) + padding;
      var fitH = headerH + rows * maxH + gap * (rows - 1) + padding;
      // Cap at viewport
      var vw = (this.rootDoc.defaultView || window).innerWidth;
      var vh = (this.rootDoc.defaultView || window).innerHeight;
      fitW = Math.min(fitW, vw - 40);
      fitH = Math.min(fitH, vh - 60);
      this.panel.style.width = fitW + 'px';
      this.panel.style.height = fitH + 'px';
      this._fittedSize = true;
      this.position();
    }

    blockOriginalMenus() {
      MENU_CONFIGS.forEach(config => {
        const btn = this.rootDoc.getElementById(config.buttonId);
        if (!btn || btn.dataset.magicPanelBound === '1') return;
        const newBtn = btn.cloneNode(true);
        newBtn.dataset.magicPanelBound = '1';
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
          e.stopPropagation(); e.preventDefault();
          const sameMenuOpen = this.wrapper.classList.contains('active') && this.activeMenu.key === config.key;
          sameMenuOpen ? this.close() : this.open(config);
        });
        this.hideOriginalMenu(config);
      });
    }

    open(config = this.activeMenu) {
      this.activeMenu = config || MENU_CONFIGS[0];
      this.isEditing = false;
      this.editBtn.classList.remove('editing');
      this.saveBar.classList.remove('active');
      this.render();
      this.wrapper.classList.add('active');
      requestAnimationFrame(() => this.position());
    }

    close() {
      this.wrapper.classList.remove('active');
      this.exitSortMode();
    }

    hideOriginalMenu(config = this.activeMenu) {
      const menu = config && config.menuId ? this.rootDoc.getElementById(config.menuId) : null;
      if (menu) {
        menu.style.opacity = '0';
        menu.style.pointerEvents = 'none';
      }
    }

    revealOriginalMenu(config = this.activeMenu) {
      const menu = config && config.menuId ? this.rootDoc.getElementById(config.menuId) : null;
      if (menu) {
        menu.style.opacity = '1';
        menu.style.pointerEvents = 'auto';
      }
      return menu;
    }

        position() {
      // Always position relative to options_button (左下菜单) as the anchor
      const anchorBtn = this.rootDoc.getElementById('options_button') || this.rootDoc.getElementById(this.activeMenu.buttonId);
      if (!anchorBtn) return;
      const btnRect = anchorBtn.getBoundingClientRect();
      const panelW = this.panel.offsetWidth;
      const panelH = this.panel.offsetHeight;
      const vw = (this.rootDoc.defaultView || window).innerWidth, vh = (this.rootDoc.defaultView || window).innerHeight;

      let left = btnRect.left + PANEL_OFFSET_X;
      let top = btnRect.bottom + 8;

      if (left + panelW > vw - 10) left = vw - panelW - 10;
      if (left < 5) left = 5;
      if (top + panelH > vh - 10) top = btnRect.top - panelH - 8;
      if (top < 5) top = 5;

      this.panel.style.left = left + 'px';
      this.panel.style.top = top + 'px';
    }collectButtons() {
      const config = this.activeMenu || MENU_CONFIGS[0];
      const menu = config.menuId ? this.rootDoc.getElementById(config.menuId) : null;
      const buttons = [];
      const seen = new WeakSet();
      const seenIds = {};  // id-based dedup to prevent duplicate entries
      const seenLabels = {}; // label-based dedup: one label per group
      const clickableSelector = '#hide-helper-wand-button, .list-group-item, .interactable, button, [role="button"]';

      const classText = (node) => {
        if (!node) return '';
        if (typeof node.className === 'string') return node.className;
        return node.getAttribute && node.getAttribute('class') || '';
      };

      const fallbackIcon = (label, id) => {
        const key = (label || '') + ' ' + (id || '');
        if (key.indexOf('隐藏助手') !== -1 || key.indexOf('hide-helper') !== -1) return 'fa-solid fa-ghost';
        if (key.indexOf('酒馆菜单管理器') !== -1 || key.indexOf('menu-cleaner') !== -1) return 'fa-solid fa-broom';
        if (key.indexOf('数据库') !== -1) return 'fa-solid fa-database';
        if (key.indexOf('附加文件') !== -1) return 'fa-solid fa-paperclip';
        if (key.indexOf('生成图片') !== -1) return 'fa-solid fa-paintbrush';
        if (key.indexOf('翻译') !== -1) return 'fa-solid fa-language';
        if (key.indexOf('开始新聊天') !== -1) return 'fa-solid fa-comment-medical';
        if (key.indexOf('关闭聊天') !== -1) return 'fa-solid fa-comment-slash';
        if (key.indexOf('重新生成') !== -1) return 'fa-solid fa-rotate-right';
        if (key.indexOf('继续') !== -1) return 'fa-solid fa-forward';
        return config.defaultIcon || 'fa-solid fa-puzzle-piece';
      };

      const getIconClass = (el, label, id) => {
        const icon = el.querySelector('i[class*="fa-"], [class*="fa-"]');
        const iconClass = classText(icon);
        if (iconClass && iconClass.indexOf('fa-') !== -1) return iconClass;
        const ownClass = classText(el);
        if (ownClass && ownClass.indexOf('fa-') !== -1) return ownClass;
        return fallbackIcon(label, id);
      };

      const extract = (candidate, itemConfig) => {
        if (!candidate) return;
        const el = candidate.matches && candidate.matches(clickableSelector)
          ? candidate
          : candidate.querySelector && candidate.querySelector(clickableSelector) || candidate;
        if (!el || seen.has(el)) return;
        const style = this.rootDoc.defaultView.getComputedStyle(el);
        if (!config.allowHidden && (style.display === 'none' || style.visibility === 'hidden')) return;
        const text = ((el.textContent || '').trim() || itemConfig?.label || '').trim();
        if (!text || EXCLUDED_LABELS.includes(text)) return;
        const id = el.id || candidate.id || itemConfig?.selector || text;
        // Skip items hidden by MenuCleaner (cross-module awareness)
        var mcHidden = Runtime.getMcHiddenIds();
        if (mcHidden.indexOf(id) !== -1) return;
        if (itemConfig && itemConfig.selector && mcHidden.indexOf(itemConfig.selector) !== -1) return;
        // Id-based dedup: only skip if id is from a structured source
        // (element id or config selector). When id falls back to text content,
        // different DOM elements may share the same label — don't dedup those.
        var idIsStructured = !!(el.id || candidate.id || (itemConfig && itemConfig.selector));
        if (idIsStructured) {
          if (seenIds[id]) return;
          seenIds[id] = true;
        }
        if (seenLabels[text]) return;
        seenLabels[text] = true;
        buttons.push({
          label: text,
          iconClass: itemConfig?.icon || getIconClass(el, text, id),
          element: el,
          id: id,
        });
        seen.add(el);
      };

      if (config.items) {
        config.items.forEach(item => {
          this.rootDoc.querySelectorAll(item.selector).forEach(el => extract(el, item));
        });
      }

      if (menu && config.selectors) {
        menu.querySelectorAll(config.selectors).forEach(el => extract(el));
        Array.from(menu.children).forEach(child => {
          if ((config.skipChildIds || []).includes(child.id)) return;
          if ((config.skipChildClasses || []).some(cls => child.classList.contains(cls))) return;
          extract(child);
        });
      }
      // Apply stored reorder from dedicated localStorage key
      try {
        var _orderArr = Store.mp.get('magic_panel_order_' + config.key);
        if (_orderArr && Array.isArray(_orderArr)) {
          if (_orderArr && _orderArr.length > 0) {
            var _orderMap = {};
            for (var _oi = 0; _oi < _orderArr.length; _oi++) _orderMap[_orderArr[_oi]] = _oi;
            buttons.sort(function(a, b) {
              var oa = _orderMap[a.id];
              var ob = _orderMap[b.id];
              if (oa !== undefined && ob !== undefined) return oa - ob;
              if (oa !== undefined) return -1;
              if (ob !== undefined) return 1;
              return 0;
            });
          }
        }
      } catch(_e) { console.warn('[MagicPanel] saveSortOrder failed', _e); }
      return buttons;
    }

    render() {
      const buttons = this.collectButtons();
      const mcHidden = Runtime.getMcHiddenIds();
      const mpHidden = getHiddenButtons();
      // Merge: items hidden by MenuCleaner are excluded entirely;
      // items hidden by MagicPanel edit mode go to "more" section.
      // An item hidden by BOTH is treated as MenuCleaner-hidden (not shown at all).
      const hiddenIds = mpHidden.filter(function(id) { return mcHidden.indexOf(id) === -1; });
      if (buttons.length === 0) {
        this.content.innerHTML = '<div class="magic-panel-empty">没有可用的操作</div>';
        return;
      }
      const main = buttons.filter(b => !hiddenIds.includes(b.id));
      const more = buttons.filter(b => hiddenIds.includes(b.id));
      let html = '<div class="magic-panel-grid">';
      main.forEach(btn => {
        const sel = this.isEditing && this.editSelection.has(btn.id) ? ' selected' : '';
        html += `<div class="magic-panel-btn${sel}" data-btn-id="${Runtime.escHtml(btn.id)}" data-idx="${buttons.indexOf(btn)}">
          <span class="drag-handle">≡</span><span class="edit-check">✓</span><i class="${Runtime.escHtml(btn.iconClass)}"></i><span class="btn-label">${Runtime.escHtml(btn.label)}</span>
        </div>`;
      });
      html += '</div>';
      
      if (more.length > 0 || this.isEditing) {
        html += `<div class="magic-panel-more-section">
          <div class="magic-panel-more-toggle"><i class="fa-solid fa-chevron-right"></i> 更多 (${more.length})</div>
          <div class="magic-panel-more-grid">`;
        more.forEach(btn => {
          const sel = this.isEditing && this.editSelection.has(btn.id) ? ' selected' : '';
          html += `<div class="magic-panel-btn${sel}" data-btn-id="${Runtime.escHtml(btn.id)}" data-idx="${buttons.indexOf(btn)}">
            <span class="drag-handle">≡</span><span class="edit-check">✓</span><i class="${Runtime.escHtml(btn.iconClass)}"></i><span class="btn-label">${Runtime.escHtml(btn.label)}</span>
          </div>`;
        });
        html += '</div></div>';
      }
      this.content.innerHTML = html;

      const toggle = this.content.querySelector('.magic-panel-more-toggle');
      const moreGrid = this.content.querySelector('.magic-panel-more-grid');
      if (toggle) {
        toggle.addEventListener('click', () => {
          toggle.classList.toggle('expanded');
          moreGrid.classList.toggle('expanded');
          requestAnimationFrame(() => this.position());
        });
      }

      this.content.querySelectorAll('.magic-panel-btn').forEach(btnEl => {
        btnEl.addEventListener('click', (e) => {
          if (this.isSorting) return; // sort mode: no clicks
          const btnId = btnEl.dataset.btnId;
          if (this.isEditing) {
            if (this.editSelection.has(btnId)) {
              this.editSelection.delete(btnId);
              btnEl.classList.remove('selected');
            } else {
              this.editSelection.add(btnId);
              btnEl.classList.add('selected');
            }
          } else {
            const idx = parseInt(btnEl.dataset.idx);
            const originalEl = buttons[idx]?.element;
            if (originalEl) {
              const menuConfig = this.activeMenu;
              this.revealOriginalMenu(menuConfig);
              try {
                const parentView = this.rootDoc.defaultView || window;
                const ViewMouseEvent = parentView.MouseEvent || MouseEvent;
                originalEl.dispatchEvent(new ViewMouseEvent('click', { bubbles: true, cancelable: true }));
              } catch (err) {
                try { originalEl.click(); } catch (e2) { /* silently fail */ }
              }
              setTimeout(() => {
                this.hideOriginalMenu(menuConfig);
              }, 300);
              this.close();
            }
          }
        });
      });

      this.initDragHandlers();
      this.initResizeHandler();
      try {
        var _sz = Store.mp.get('magic_panel_size_' + this.activeMenu.key);
        if (_sz && _sz.w) { this.panel.style.width = _sz.w; this.panel.style.height = _sz.h || ''; }
      } catch(e) { console.debug("[MP] restore panel size failed", e); }

      requestAnimationFrame(() => this.position());
    }

    initResizeHandler() {
      var rh = this.panel.querySelector('.magic-panel-resize-handle');
      if (!rh || this.__resizeInited) return;
      this.__resizeInited = true;
      var sw = 0, sh = 0, sx = 0, sy = 0;
      var self = this;
      rh.addEventListener('mousedown', function(e) {
        e.stopPropagation(); e.preventDefault();
        sw = self.panel.offsetWidth; sh = self.panel.offsetHeight;
        sx = e.clientX; sy = e.clientY;
        var onMove = function(ev) {
          self.panel.style.width = Math.max(200, Math.min(600, sw + (ev.clientX - sx))) + 'px';
          self.panel.style.height = Math.max(200, Math.min(800, sh + (ev.clientY - sy))) + 'px';
        };
        var onUp = function() {
          self.rootDoc.removeEventListener('mousemove', onMove);
          self.rootDoc.removeEventListener('mouseup', onUp);
          try { Store.mp.set('magic_panel_size_' + self.activeMenu.key, { w: self.panel.style.width, h: self.panel.style.height }); } catch(e) { console.debug("[MP] resize save1 failed", e); }
        };
        self.rootDoc.addEventListener('mousemove', onMove);
        self.rootDoc.addEventListener('mouseup', onUp);
      });
      rh.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return; e.preventDefault();
        var t = e.touches[0];
        sw = self.panel.offsetWidth; sh = self.panel.offsetHeight;
        sx = t.clientX; sy = t.clientY;
        var onMove = function(ev) {
          var touch = ev.touches[0];
          self.panel.style.width = Math.max(200, Math.min(600, sw + (touch.clientX - sx))) + 'px';
          self.panel.style.height = Math.max(200, Math.min(800, sh + (touch.clientY - sy))) + 'px';
          ev.preventDefault();
        };
        var onEnd = function() {
          self.rootDoc.removeEventListener('touchmove', onMove);
          self.rootDoc.removeEventListener('touchend', onEnd);
          try { Store.mp.set('magic_panel_size_' + self.activeMenu.key, { w: self.panel.style.width, h: self.panel.style.height }); } catch(e) { console.debug("[MP] resize save failed", e); }
        };
        self.rootDoc.addEventListener('touchmove', onMove, { passive: false });
        self.rootDoc.addEventListener('touchend', onEnd);
      }, { passive: false });
    }

    initDragHandlers() {
      if (this.__dragInited) return;
      this.__dragInited = true;
      var _dnd = { el: null, id: null, lastTarget: null };

      var _swapBtns = function(fromEl, toEl) {
        if (!fromEl || !toEl || fromEl === toEl) return;
        var parent = fromEl.parentNode;
        var all = Array.from(parent.querySelectorAll('.magic-panel-btn'));
        var fromIdx = all.indexOf(fromEl);
        var toIdx = all.indexOf(toEl);
        if (fromIdx < 0 || toIdx < 0) return;
        if (fromIdx < toIdx) {
          parent.insertBefore(fromEl, toEl.nextSibling);
        } else {
          parent.insertBefore(fromEl, toEl);
        }
        parent.querySelectorAll('.magic-panel-btn').forEach(function(b, i) { b.dataset.idx = i; });
      };

      this.panel.addEventListener('mousedown', function(e) {
        if (!this.isSorting) return;
        var btn = e.target.closest('.magic-panel-btn');
        if (!btn) return;
        _dnd = { el: btn, id: btn.dataset.btnId, lastTarget: null };
        btn.classList.add('sort-dragging');
        e.preventDefault();
      }.bind(this));

      this.rootDoc.addEventListener('mousemove', function(e) {
        if (!_dnd.el) return;
        var el = this.rootDoc.elementFromPoint(e.clientX, e.clientY);
        var target = el ? el.closest('.magic-panel-btn') : null;
        // Only swap on element boundary crossing, not every pixel
        if (target === _dnd.lastTarget) return;
        _dnd.lastTarget = target;
        // Clear sort-target on all buttons first
        _dnd.el.parentNode.querySelectorAll('.magic-panel-btn.sort-target').forEach(function(b) { b.classList.remove('sort-target'); });
        if (target && target !== _dnd.el && target.parentNode === _dnd.el.parentNode) {
          _swapBtns(_dnd.el, target);
          target.classList.add('sort-target');
        }
      }.bind(this));

      var _endDrag = function() {
        if (!_dnd.el) return;
        _dnd.el.classList.remove('sort-dragging');
        if (_dnd.el.parentNode) {
          _dnd.el.parentNode.querySelectorAll('.magic-panel-btn.sort-target').forEach(function(b) { b.classList.remove('sort-target'); });
        }
        _dnd = { el: null, id: null, lastTarget: null };
      };

      this.rootDoc.addEventListener('mouseup', _endDrag);

      // Touch support
      this.panel.addEventListener('touchstart', function(e) {
        if (!this.isSorting) return;
        var touch = e.touches[0];
        var btn = this.rootDoc.elementFromPoint(touch.clientX, touch.clientY);
        if (btn) btn = btn.closest('.magic-panel-btn');
        if (!btn) return;
        _dnd = { el: btn, id: btn.dataset.btnId, lastTarget: null };
        btn.classList.add('sort-dragging');
        e.preventDefault();
      }.bind(this), { passive: false });

      this.rootDoc.addEventListener('touchmove', function(e) {
        if (!_dnd.el) return;
        var touch = e.touches[0];
        var el = this.rootDoc.elementFromPoint(touch.clientX, touch.clientY);
        var target = el ? el.closest('.magic-panel-btn') : null;
        // Only swap on element boundary crossing, not every pixel
        if (target === _dnd.lastTarget) return;
        _dnd.lastTarget = target;
        // Clear sort-target on all buttons first
        _dnd.el.parentNode.querySelectorAll('.magic-panel-btn.sort-target').forEach(function(b) { b.classList.remove('sort-target'); });
        if (target && target !== _dnd.el && target.parentNode === _dnd.el.parentNode) {
          _swapBtns(_dnd.el, target);
          target.classList.add('sort-target');
        }
        e.preventDefault();
      }.bind(this), { passive: false });

      this.rootDoc.addEventListener('touchend', _endDrag);
    }

    exitSortMode() {
      if (!this.isSorting) return;
      this.isSorting = false;
      this.sortDragId = null;
      this.panel.classList.remove('is-sorting');
      var _sb = this.panel.querySelector('.magic-panel-sort-btn');
      if (_sb) _sb.classList.remove('active');
    }

    saveSortOrder() {
      var _btns = this.content.querySelectorAll('.magic-panel-btn');
      var _order = [];
      for (var _si = 0; _si < _btns.length; _si++) {
        var _bid = _btns[_si].dataset.btnId;
        if (_bid) _order.push(_bid);
      }
      try {
        Store.mp.set('magic_panel_order_' + this.activeMenu.key, _order);
      } catch(_e) { console.warn('[MagicPanel] saveSortOrder failed', _e); }
      // Exit sort mode
      this.exitSortMode();
      var _sortBtn = this.panel.querySelector('.magic-panel-sort-btn');
      if (_sortBtn) _sortBtn.classList.remove('active');
      // Re-render to show normal state
      this.render();
    }
  }

  function waitForButton(retries) {
    if (retries === undefined) retries = 0;
    // If user disabled MagicPanel, skip creation entirely
    try { if (Store.mp.get('magic_panel_mp_enabled') === false) return; } catch(e) {}
    const doc = Runtime.getRootDocument();
    if (MENU_CONFIGS.some(config => doc.getElementById(config.buttonId))) {
      new MagicPanel();
    } else if (retries < 60) {
      setTimeout(function() { waitForButton(retries + 1); }, 500);
    } else {
      console.warn('[MagicPanel] 按钮未找到，放弃等待（60次重试后）');
    }
  }

  if (document.readyState === 'complete') waitForButton();
  else window.addEventListener('load', waitForButton);
})();

/* ===== 酒馆菜单管理器：菜单精简模块 =====
   模块职责：全面的菜单管理——隐藏/显示、拖拽排序、双栏分栏、扩展面板管理。
   与上方的"魔法面板"模块分工：魔法面板负责快捷弹出面板，本模块负责深层配置。
   存储键：menu_cleaner_settings (localStorage)
   魔法面板存储键：magic_panel_hidden_buttons, magic_content_scale — 互不冲突。
   两个模块各自拦截按钮，通过 dataset 标记避免重复绑定。 */
(function () {
  'use strict';

  // 酒馆助手在 iframe 中执行脚本，需要操作父页面的 document
  var doc = window.frameElement ? window.parent.document : document;
  var win = window.frameElement ? window.parent : window;

  let autoIdSeq = 0;
  var _mcLabelCounters = {};
  function _stableAutoId(label, el) {
    var base = label ? 'mc-' + label.replace(/[^a-zA-Z0-9一-鿿]/g, '').substring(0, 20) : 'mc-item';
    if (!base || base === 'mc-') base = 'mc-item';
    if (!doc.getElementById(base)) return base;
    if (_mcLabelCounters[base] === undefined) _mcLabelCounters[base] = 0;
    var _candidate;
    do {
      _candidate = base + '-' + (++_mcLabelCounters[base]);
    } while (doc.getElementById(_candidate));
    return _candidate;
  }
  let activeTab = 'hide';
  let extPanelVisible = false;
  let rescanTimer = null;
  let dragActive = false; // set while user is dragging a reorder item
  let importFileInput = null; // hidden file input for importing settings (hoisted to survive re-renders)
  let suppressObserver = false; // suppress MutationObserver during programmatic DOM moves
  const nativeHomes = new Map();

  // ── Hardcoded native elements ─────────────────────────────────
  const PANEL_GROUPS = MENU_REGISTRY.map(function(g) {
  var c = { id: g.id, name: g.mc.name, items: g.items ? g.items.slice() : [] };
  if (g.buttonId) c.buttonId = '#' + g.buttonId;
  if (g.mc.discovery) c.discovery = g.mc.discovery;
  return c;
});

  // Groups that support reordering
  const REORDER_GROUP_IDS = ['extensionsSettings'];

  const ALWAYS_HIDDEN_SELECTORS = [
    '#rm_api_block > div.flex-container.flexFlowColumn > #openai_api > div.flex-container.flex > #test_api_button',
    '#rm_extensions_block > div > div.alignitemsflexstart.flex-container.wide100p',
    '#rm_extensions_block > div > div.alignitemscenter.flex-container.justifyCenter.wide100p'
  ];

  // ── Settings persistence via localStorage ─────────────────────
  const SCRIPT_VERSION = '1.5.0'; // keep in sync with header

const defaultSettings = {
    enabled: true,
    hiddenSelectors: {},
    discoveryCache: {},  // { groupId: [{selector, label, column?}, ...] }
    reorder: {},          // { groupId: [selector, ...] }
    initialSnapshot: null, // set once on first init, cleared by "清除插件数据"
    rescanToast: false,
    columnMode: 'dual',  // 'single' | 'dual'
    theme: 'default'
  };

  let settings = {};

  // ── Theme presets ──
  const THEMES = (function() {
    var KF = '@keyframes mc-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}@keyframes mc-pulse{0%,100%{opacity:0.6}50%{opacity:1}}@keyframes mc-glow{0%,100%{box-shadow:0 0 8px rgba(V,0.2),0 0 20px rgba(V,0.1)}50%{box-shadow:0 0 12px rgba(V,0.4),0 0 30px rgba(V,0.15)}}';
    function V(t,a){return KF.replace(/V/g,t)+a}
    function p(v){return '.menu-cleaner-popup'+v+'.magic-panel'+v}
    function m(bg,border,shadow,text,muted,accent,accRgb,hoverBg,strongBg){
      return '.magic-panel{background:'+bg+'!important;border-color:'+border+'!important;box-shadow:'+shadow+'!important}'+
        '.magic-panel-header{border-bottom-color:'+border+'!important}'+
        '.magic-panel-title{color:'+text+'!important}'+
        '.magic-panel-btn{background:'+hoverBg+'!important;border-color:'+border+'!important}'+
        '.magic-panel-btn:hover{background:'+strongBg+'!important;border-color:'+accent+'!important}'+
        '.magic-panel-btn.selected{background:rgba('+accRgb+',0.15)!important;border-color:'+accent+'!important}'+
        '.magic-panel-btn .btn-label{color:'+text+'!important}'+
        '.magic-panel-btn i{color:'+text+'!important}'+
        '.magic-panel-edit-btn.editing{color:'+accent+'!important}'+
        '.magic-panel-more-toggle{color:'+muted+'!important}'+
        '.magic-panel-more-toggle:hover{color:'+accent+'!important}'
    }
    return {
      glazed: {
        label: '琉璃',
        css: V('109,213,213',
          // Animated gradient popup
          p('{--mc-bg:linear-gradient(145deg,#0e2838,#16323e,#0e2838)!important;--mc-bg-header:linear-gradient(90deg,#0a1e28,#16323e)!important;--mc-bg-body:linear-gradient(180deg,#122a36,#0e2430)!important;--mc-bg-input:rgba(109,213,213,0.06)!important;--mc-border-color:rgba(42,170,190,0.3)!important;--mc-border-subtle:rgba(42,170,190,0.15)!important;--mc-border-accent:#5dd5d5!important;--mc-text:#c8f0f0!important;--mc-text-muted:#6ab0b0!important;--mc-accent:#5dd5d5!important;--mc-accent-rgb:93,213,213!important;--mc-hover-bg:rgba(93,213,213,0.08)!important;--mc-hover-bg-strong:rgba(93,213,213,0.15)!important;--mc-active-bg:rgba(93,213,213,0.25)!important;--mc-slider-off:#1a4848!important;--mc-slider-on:#1a7880!important;--mc-slider-dot:#5dd5d5!important;--mc-shadow:0 8px 40px rgba(0,0,0,0.7)!important;--mc-glow:0 0 80px rgba(93,213,213,0.08)!important;--mc-font-weight:600!important;background-size:200% 200%!important;animation:mc-shift 10s ease infinite!important}')  + m('#0e2838 linear-gradient(145deg,#0e2838,#16323e,#0e2838)','rgba(42,170,190,0.3)','0 8px 32px rgba(0,0,0,0.7)','#c8f0f0','#6ab0b0','#5dd5d5','93,213,213','rgba(93,213,213,0.08)','rgba(93,213,213,0.15)')+
          // Glass header
          '.menu-cleaner-popup-header{backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important}' +
          // Title glow
          '.menu-cleaner-popup-header h2{text-shadow:0 0 20px rgba(93,213,213,0.3)!important}' +
          // Pulsing active tab
          '.menu-cleaner-tab.active{animation:mc-glow 2s ease-in-out infinite!important}' +
          // Neon drag glow
          '.menu-cleaner-reorder-item.drag-over{border-left-color:#5dd5d5!important;border-left-width:4px!important;box-shadow:0 0 20px rgba(93,213,213,0.15),inset 0 0 20px rgba(93,213,213,0.04)!important}' +
          '.menu-cleaner-reorder-column-section.drag-over-section{outline:2px solid #5dd5d5!important;box-shadow:inset 0 0 30px rgba(93,213,213,0.06)!important}' +
          // Glowing slider
          '.menu-cleaner-toggle input:checked+.menu-cleaner-slider{box-shadow:0 0 12px rgba(93,213,213,0.3)!important}' +
          // Backdrop tint
          '.menu-cleaner-backdrop{background:rgba(8,28,38,0.72)!important;backdrop-filter:blur(3px)!important;-webkit-backdrop-filter:blur(3px)!important}' +
          // Scrollbar glow
          '.menu-cleaner-popup-body::-webkit-scrollbar-thumb:hover{background:#5dd5d5!important;box-shadow:0 0 8px rgba(93,213,213,0.3)!important}' +
          // Animated shimmer on category hover
          '.menu-cleaner-category-header:hover{border-left-color:#5dd5d5!important}'
        )
      },
      warm: {
        label: '暖阳',
        css: V('212,136,58',
          p('{--mc-bg:linear-gradient(145deg,#2a1a0e,#322010,#2a1a0e)!important;--mc-bg-header:linear-gradient(90deg,#1e140e,#2a1e10)!important;--mc-bg-body:linear-gradient(180deg,#261a10,#22160e)!important;--mc-bg-input:rgba(212,136,58,0.06)!important;--mc-border-color:rgba(180,100,40,0.3)!important;--mc-border-subtle:rgba(180,100,40,0.15)!important;--mc-border-accent:#e89840!important;--mc-text:#f0d4b0!important;--mc-text-muted:#b08050!important;--mc-accent:#e89840!important;--mc-accent-rgb:232,152,64!important;--mc-hover-bg:rgba(232,152,64,0.08)!important;--mc-hover-bg-strong:rgba(232,152,64,0.15)!important;--mc-active-bg:rgba(232,152,64,0.25)!important;--mc-slider-off:#5a3018!important;--mc-slider-on:#7a5028!important;--mc-slider-dot:#e89840!important;--mc-shadow:0 8px 40px rgba(0,0,0,0.7)!important;--mc-glow:0 0 80px rgba(232,152,64,0.08)!important;--mc-font-weight:600!important;background-size:200% 200%!important;animation:mc-shift 12s ease infinite!important}')  + m('#2a1a0e linear-gradient(145deg,#2a1a0e,#322010,#2a1a0e)','rgba(180,100,40,0.3)','0 8px 32px rgba(0,0,0,0.7)','#f0d4b0','#b08050','#e89840','232,152,64','rgba(232,152,64,0.08)','rgba(232,152,64,0.15)')+
          '.menu-cleaner-popup-header{backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important}' +
          '.menu-cleaner-popup-header h2{text-shadow:0 0 20px rgba(232,152,64,0.3)!important}' +
          '.menu-cleaner-tab.active{animation:mc-glow 2s ease-in-out infinite!important}' +
          '.menu-cleaner-reorder-item.drag-over{border-left-color:#e89840!important;border-left-width:4px!important;box-shadow:0 0 20px rgba(232,152,64,0.15),inset 0 0 20px rgba(232,152,64,0.04)!important}' +
          '.menu-cleaner-reorder-column-section.drag-over-section{outline:2px solid #e89840!important;box-shadow:inset 0 0 30px rgba(232,152,64,0.06)!important}' +
          '.menu-cleaner-toggle input:checked+.menu-cleaner-slider{box-shadow:0 0 12px rgba(232,152,64,0.3)!important}' +
          '.menu-cleaner-backdrop{background:rgba(35,20,8,0.72)!important;backdrop-filter:blur(3px)!important;-webkit-backdrop-filter:blur(3px)!important}' +
          '.menu-cleaner-popup-body::-webkit-scrollbar-thumb:hover{background:#e89840!important;box-shadow:0 0 8px rgba(232,152,64,0.3)!important}' +
          '.menu-cleaner-category-header:hover{border-left-color:#e89840!important}'
        )
      },
      violet: {
        label: '暗紫',
        css: V('155,109,206',
          p('{--mc-bg:linear-gradient(145deg,#1a1028,#221432,#1a1028)!important;--mc-bg-header:linear-gradient(90deg,#120c1e,#1a1028)!important;--mc-bg-body:linear-gradient(180deg,#181028,#140e22)!important;--mc-bg-input:rgba(155,109,206,0.06)!important;--mc-border-color:rgba(130,80,180,0.3)!important;--mc-border-subtle:rgba(130,80,180,0.15)!important;--mc-border-accent:#b080e8!important;--mc-text:#d8c0f0!important;--mc-text-muted:#9070b0!important;--mc-accent:#b080e8!important;--mc-accent-rgb:176,128,232!important;--mc-hover-bg:rgba(176,128,232,0.08)!important;--mc-hover-bg-strong:rgba(176,128,232,0.15)!important;--mc-active-bg:rgba(176,128,232,0.25)!important;--mc-slider-off:#281c38!important;--mc-slider-on:#483868!important;--mc-slider-dot:#b080e8!important;--mc-shadow:0 8px 40px rgba(0,0,0,0.7)!important;--mc-glow:0 0 80px rgba(176,128,232,0.08)!important;--mc-font-weight:600!important;background-size:200% 200%!important;animation:mc-shift 9s ease infinite!important}')  + m('#1a1028 linear-gradient(145deg,#1a1028,#221432,#1a1028)','rgba(130,80,180,0.3)','0 8px 32px rgba(0,0,0,0.7)','#d8c0f0','#9070b0','#b080e8','176,128,232','rgba(176,128,232,0.08)','rgba(176,128,232,0.15)')+
          '.menu-cleaner-popup-header{backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important}' +
          '.menu-cleaner-popup-header h2{text-shadow:0 0 20px rgba(176,128,232,0.3)!important}' +
          '.menu-cleaner-tab.active{animation:mc-glow 2s ease-in-out infinite!important}' +
          '.menu-cleaner-reorder-item.drag-over{border-left-color:#b080e8!important;border-left-width:4px!important;box-shadow:0 0 20px rgba(176,128,232,0.15),inset 0 0 20px rgba(176,128,232,0.04)!important}' +
          '.menu-cleaner-reorder-column-section.drag-over-section{outline:2px solid #b080e8!important;box-shadow:inset 0 0 30px rgba(176,128,232,0.06)!important}' +
          '.menu-cleaner-toggle input:checked+.menu-cleaner-slider{box-shadow:0 0 12px rgba(176,128,232,0.3)!important}' +
          '.menu-cleaner-backdrop{background:rgba(16,8,30,0.72)!important;backdrop-filter:blur(3px)!important;-webkit-backdrop-filter:blur(3px)!important}' +
          '.menu-cleaner-popup-body::-webkit-scrollbar-thumb:hover{background:#b080e8!important;box-shadow:0 0 8px rgba(176,128,232,0.3)!important}' +
          '.menu-cleaner-category-header:hover{border-left-color:#b080e8!important}'
        )
      },
      aurora: {
        label: '极光',
        css: V('80,212,160',
          p('{--mc-bg:linear-gradient(145deg,#081e16,#0c2a1e,#081e16)!important;--mc-bg-header:linear-gradient(90deg,#061812,#0c281c)!important;--mc-bg-body:linear-gradient(180deg,#0a2218,#081c14)!important;--mc-bg-input:rgba(80,212,160,0.06)!important;--mc-border-color:rgba(60,170,120,0.3)!important;--mc-border-subtle:rgba(60,170,120,0.15)!important;--mc-border-accent:#50d4a0!important;--mc-text:#bcf0d8!important;--mc-text-muted:#60b090!important;--mc-accent:#50d4a0!important;--mc-accent-rgb:80,212,160!important;--mc-hover-bg:rgba(80,212,160,0.08)!important;--mc-hover-bg-strong:rgba(80,212,160,0.15)!important;--mc-active-bg:rgba(80,212,160,0.25)!important;--mc-slider-off:#183a2c!important;--mc-slider-on:#206a50!important;--mc-slider-dot:#50d4a0!important;--mc-shadow:0 8px 40px rgba(0,0,0,0.7)!important;--mc-glow:0 0 80px rgba(80,212,160,0.06)!important;--mc-font-weight:600!important;background-size:200% 200%!important;animation:mc-shift 11s ease infinite!important}')  + m('#081e16 linear-gradient(145deg,#081e16,#0c2a1e,#081e16)','rgba(60,170,120,0.3)','0 8px 32px rgba(0,0,0,0.7)','#bcf0d8','#60b090','#50d4a0','80,212,160','rgba(80,212,160,0.08)','rgba(80,212,160,0.15)')+
          '.menu-cleaner-popup-header{backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important}' +
          '.menu-cleaner-popup-header h2{text-shadow:0 0 20px rgba(80,212,160,0.3)!important}' +
          '.menu-cleaner-tab.active{animation:mc-glow 2s ease-in-out infinite!important}' +
          '.menu-cleaner-reorder-item.drag-over{border-left-color:#50d4a0!important;border-left-width:4px!important;box-shadow:0 0 20px rgba(80,212,160,0.15),inset 0 0 20px rgba(80,212,160,0.04)!important}' +
          '.menu-cleaner-reorder-column-section.drag-over-section{outline:2px solid #50d4a0!important;box-shadow:inset 0 0 30px rgba(80,212,160,0.06)!important}' +
          '.menu-cleaner-toggle input:checked+.menu-cleaner-slider{box-shadow:0 0 12px rgba(80,212,160,0.3)!important}' +
          '.menu-cleaner-backdrop{background:rgba(6,28,18,0.72)!important;backdrop-filter:blur(3px)!important;-webkit-backdrop-filter:blur(3px)!important}' +
          '.menu-cleaner-popup-body::-webkit-scrollbar-thumb:hover{background:#50d4a0!important;box-shadow:0 0 8px rgba(80,212,160,0.3)!important}' +
          '.menu-cleaner-category-header:hover{border-left-color:#50d4a0!important}'
        )
      }
    };
  })();  // Return the theme key if valid, else 'default'
  function validTheme(t) {
    return THEMES[t] ? t : 'default';
  }

  function applyTheme(themeName) {
    var existing = doc.getElementById('mc-theme');
    if (existing) existing.remove();
    var t = validTheme(themeName || settings.theme);
    if (t === 'default' || !THEMES[t]) {
      settings.theme = 'default';
      return;
    }
    var style = doc.createElement('style');
    style.id = 'mc-theme';
    style.textContent = THEMES[t].css;
    (doc.head || doc.body).appendChild(style);
    settings.theme = t;
  }

  function getThemeBtnLabel() {
    var t = validTheme(settings.theme);
    if (t === 'default') return '🎨 主题';
    return '🎨 ' + (THEMES[t] ? THEMES[t].label : '主题');
  }

  function cycleTheme() {
    var keys = ['default'].concat(Object.keys(THEMES));
    var cur = validTheme(settings.theme);
    var idx = keys.indexOf(cur);
    var next = keys[(idx + 1) % keys.length];
    settings.theme = next;
    saveSettings();
    applyTheme(next);
    var btn = doc.getElementById('menu-cleaner-theme-btn');
    if (btn) btn.textContent = getThemeBtnLabel();
  }

  // ── Cached DOM helpers ──
  function getExtPanel() { return doc.getElementById("menu-cleaner-ext-panel"); }
  function getPopup() { return doc.getElementById("menu-cleaner-popup"); }
  function getPopupBody() { return doc.getElementById("menu-cleaner-popup-body"); }
  function getRmBlock() { return doc.getElementById("rm_extensions_block"); }


  function loadSettings() {
    try {
      const saved = Store.mc.getAll();
      if (saved && typeof saved === 'object' && Object.keys(saved).length) {
        settings = Object.assign({}, defaultSettings, saved);
        try { console.debug('[MC] loadSettings reorder:', JSON.stringify(settings.reorder)); } catch(_) {}
      } else {
        settings = Object.assign({}, defaultSettings);
        try { console.debug('[MC] loadSettings: no saved data, using defaults'); } catch(_) {}
      }

      // MagicPanel compatibility: never hide MagicPanel's own UI elements
      // Ensure MP's own UI elements are never hidden by MC
      for (var mv = 0; mv < Runtime.MP_VISIBLE_SELECTORS.length; mv++) {
        if (settings.hiddenSelectors[Runtime.MP_VISIBLE_SELECTORS[mv]] === true) delete settings.hiddenSelectors[Runtime.MP_VISIBLE_SELECTORS[mv]];
      }
      // Clean up stale auto-ID entries from extensionsSettings cache (TT-specific bug:
      // extension_container sub-scan prior to v1.2.2 discovered drawers inside hardcoded
      // containers like #regex_container, creating duplicates like "聊天档案").
      (function _cleanStaleCache() {
        if (!settings.discoveryCache || !settings.discoveryCache['extensionsSettings']) return;
        var _esc = settings.discoveryCache['extensionsSettings'];
        var _hcSels = [];
        for (var _pg = 0; _pg < PANEL_GROUPS.length; _pg++) {
          if (PANEL_GROUPS[_pg].id === 'extensionsSettings') {
            for (var _hi = 0; _hi < PANEL_GROUPS[_pg].items.length; _hi++) {
              _hcSels.push(PANEL_GROUPS[_pg].items[_hi].selector);
            }
            break;
          }
        }
        var _pruned = false;
        for (var _ci = _esc.length - 1; _ci >= 0; _ci--) {
          var _entry = _esc[_ci];
          if (_entry.selector.indexOf('menu-cleaner-auto-') === -1) continue;
          var _el = doc.querySelector(_entry.selector);
          if (!_el) { _esc.splice(_ci, 1); _pruned = true; continue; }
          for (var _hs = 0; _hs < _hcSels.length; _hs++) {
            var _hcEl = doc.querySelector(_hcSels[_hs]);
            if (_hcEl && _hcEl.contains(_el)) {
              _esc.splice(_ci, 1); _pruned = true; break;
            }
          }
        }
        if (_pruned) saveSettings();
      })();

      // Selectors injected by this plugin — don't clean them up even if not yet in DOM
      var SELF_INJECTED = ['#menu-cleaner-settings', '#menu-cleaner-btn'];
      // discoveryCache: delayed cleanup runs after the 3-second re-scan in init().
      // At load time, extensions may not have injected their items yet, so don't prune here.
    } catch (e) {
      console.warn('[酒馆菜单管理器] 读取设置失败，使用默认值', e);
      settings = Object.assign({}, defaultSettings);
    }
  }

  function saveSettings() { Store.mc.setAll(settings); }

  function cleanupDiscoveryCache() {
    var groupIds = Object.keys(settings.discoveryCache);
    var pruned = 0;
    for (var _gi = 0; _gi < groupIds.length; _gi++) {
      var gid = groupIds[_gi];
      var cache = settings.discoveryCache[gid];
      if (!cache || !cache.length) continue;
      var filtered = [];
      for (var _ci = 0; _ci < cache.length; _ci++) {
        var entry = cache[_ci];
        if (doc.querySelector(entry.selector)) {
          filtered.push(entry);
        } else {
          pruned++;
        }
      }
      settings.discoveryCache[gid] = filtered;
    }
    if (pruned > 0) {
      saveSettings();
    }
  }

  function rememberNativeHome(el) {
    if (!el || !el.parentNode || nativeHomes.has(el)) return;
    nativeHomes.set(el, { parent: el.parentNode, nextSibling: el.nextSibling });
  }

  function restoreRememberedNode(el, fallbackParent) {
    if (!el) return;
    var home = nativeHomes.get(el);
    var parent = home && home.parent ? home.parent : fallbackParent;
    if (!parent) return;
    if (home && home.nextSibling && home.nextSibling.parentNode === parent) {
      parent.insertBefore(el, home.nextSibling);
      return;
    }
    parent.appendChild(el);
  }

  // ── CSS injection ─────────────────────────────────────────────
  const STYLE_TEXT = `
/* ── Backdrop ─────────────────────────────────────── */
.menu-cleaner-backdrop {
  display: none;
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: 99999;
  animation: menu-cleaner-fadein 0.2s ease;
  transition: background 0.3s;
}

/* ── Force horizontal text ───────────────────────── */
#menu-cleaner-popup,
#menu-cleaner-popup *,
#menu-cleaner-settings,
#menu-cleaner-settings *,
#menu-cleaner-open-popup,
#menu-cleaner-wand-container,
#menu-cleaner-wand-container *,
.menu-cleaner-popup,
.menu-cleaner-popup *,
.menu-cleaner-backdrop {
  writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
  white-space: normal !important;
}

#menu-cleaner-open-popup,
#menu-cleaner-close,
#menu-cleaner-rescan,
#menu-cleaner-reset-order,
#menu-cleaner-settings-btn {
  white-space: nowrap !important;
  flex-shrink: 0;
}

/* ── Popup ───────────────────────────────────────── */
.menu-cleaner-popup {
  display: none;
  position: fixed;
  width: 560px;
  max-width: 90%;
  max-height: 90vh;
  transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
  /* -- Theme CSS variables (overridable by mc-theme <style>) -- */
  --mc-bg: var(--SmartThemeBlurTintColor, #1a1b22);
  --mc-bg-header: transparent;
  --mc-bg-body: transparent;
  --mc-bg-input: transparent;
  --mc-border-color: var(--SmartThemeBorderColor, #333);
  --mc-border-subtle: rgba(255, 255, 255, 0.06);
  --mc-border-accent: transparent;
  --mc-text: inherit;
  --mc-text-muted: var(--SmartThemeBodyColor, #888);
  --mc-accent: #7c5cff;
  --mc-accent-rgb: 124, 92, 255;
  --mc-hover-bg: rgba(255, 255, 255, 0.04);
  --mc-hover-bg-strong: rgba(255, 255, 255, 0.06);
  --mc-active-bg: rgba(255, 255, 255, 0.1);
  --mc-slider-off: #555;
  --mc-slider-on: #7c5cff;
  --mc-slider-dot: #fff;
  --mc-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  --mc-glow: none;
  --mc-font-weight: 400;

  background: var(--mc-bg);
  border: 1px solid var(--mc-border-color);
  border-top: 2px solid var(--mc-border-accent, var(--mc-border-color));
  border-radius: 14px;
  box-shadow: var(--mc-shadow), var(--mc-glow);
  z-index: 100000;
  flex-direction: column;
  overflow: hidden;
}

.menu-cleaner-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--mc-border-color);
  flex-shrink: 0;
  background: var(--mc-bg-header);
  font-weight: var(--mc-font-weight);
}

.menu-cleaner-popup-header h2 { margin: 0; font-size: 18px; color: var(--mc-text); }

.menu-cleaner-popup-actions { display: flex; gap: 8px; }

.menu-cleaner-popup-body {
  overflow-y: auto;
  padding: 8px 0;
  flex: 1;
}

.menu-cleaner-popup-body::-webkit-scrollbar { width: 6px; }
.menu-cleaner-popup-body::-webkit-scrollbar-track { background: transparent; }
.menu-cleaner-popup-body::-webkit-scrollbar-thumb { background: var(--mc-border-subtle); border-radius: 3px; }
.menu-cleaner-popup-body::-webkit-scrollbar-thumb:hover { background: var(--mc-accent); }

/* ── Category Sections ───────────────────────────── */
.menu-cleaner-category {
  border-bottom: 1px solid var(--mc-border-color);
}

.menu-cleaner-category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  border-left: 3px solid transparent;
  color: var(--mc-text);
}

.menu-cleaner-category-header:hover { border-left-color: var(--mc-accent); background: var(--mc-hover-bg); }
.menu-cleaner-category-header:hover .menu-cleaner-category-arrow { color: var(--mc-accent); }



.menu-cleaner-category-arrow { font-size: 10px; width: 14px; transition: transform 0.15s; }

.menu-cleaner-category-count {
  font-size: 0.8em;
  color: var(--mc-text-muted);
  margin-left: auto;
}

.menu-cleaner-category-body { padding: 0 0 6px 0; }
.menu-cleaner-category-body.collapsed { display: none; }

/* ── Items ───────────────────────────────────────── */
.menu-cleaner-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 18px 6px 36px;
  gap: 12px;
}

.menu-cleaner-item:hover { background: var(--mc-hover-bg); }

.menu-cleaner-item > span:first-child {
  flex: 1;
  font-size: 0.92em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--mc-text);
}

.menu-cleaner-separator {
  opacity: 0.45;
  font-size: 0.78em;
  padding: 6px 18px 2px 36px;
  color: var(--mc-text-muted);
}

.menu-cleaner-item-discovered > span:first-child::before {
  content: "[扩展] ";
  font-size: 0.78em;
  opacity: 0.55;
}

/* ── Toggle Slider ───────────────────────────────── */
.menu-cleaner-toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.menu-cleaner-toggle input { opacity: 0; width: 0; height: 0; }

.menu-cleaner-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--mc-slider-off);
  border-radius: 22px;
  transition: background 0.25s;
}

.menu-cleaner-slider::before {
  content: "";
  position: absolute;
  height: 16px; width: 16px;
  left: 3px; bottom: 3px;
  background: var(--mc-slider-dot);
  border-radius: 50%;
  transition: transform 0.25s;
}

.menu-cleaner-toggle input:checked + .menu-cleaner-slider { background: var(--mc-slider-on); box-shadow: 0 0 8px rgba(var(--mc-accent-rgb), 0.3); }

.menu-cleaner-toggle input:checked + .menu-cleaner-slider::before { transform: translateX(18px); }

/* ── Tab Navigation ──────────────────────────────── */
.menu-cleaner-tabs {
  display: flex;
  border-bottom: 1px solid var(--mc-border-color);
  flex-shrink: 0;
}

.menu-cleaner-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  cursor: pointer;
  font-size: 0.92em;
  color: var(--mc-text-muted);
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s, background 0.15s;
  user-select: none;
}

.menu-cleaner-tab:hover { color: var(--mc-accent); background: var(--mc-hover-bg); }
.menu-cleaner-tab.active { color: var(--mc-accent); border-bottom-color: var(--mc-accent); border-bottom-width: 3px; font-weight: 700; background: rgba(var(--mc-accent-rgb), 0.08); }

/* ── Reorder Items ───────────────────────────────── */
.menu-cleaner-reorder-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 18px 7px 28px;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}

.menu-cleaner-reorder-item:hover { background: var(--mc-hover-bg); }

.menu-cleaner-reorder-item > span:not(.menu-cleaner-drag-handle) {
  flex: 1;
  font-size: 0.92em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--mc-text);
}

.menu-cleaner-reorder-empty {
  padding: 12px 18px 12px 36px;
  font-size: 0.85em;
  color: var(--mc-text-muted);
  opacity: 0.6;
}

/* ── Drag Handle ─────────────────────────────────── */
.menu-cleaner-drag-handle {
  cursor: grab;
  color: var(--mc-text-muted);
  font-size: 1.1em;
  letter-spacing: -2px;
  user-select: none;
  flex-shrink: 0;
  transition: color 0.15s;
}

.menu-cleaner-drag-handle:hover { color: var(--mc-accent); }
.menu-cleaner-drag-handle:active { cursor: grabbing; }

/* ── Drag States ─────────────────────────────────── */
.menu-cleaner-reorder-item.dragging { opacity: 0.5; background: rgba(var(--mc-accent-rgb), 0.12); box-shadow: inset 0 0 16px rgba(var(--mc-accent-rgb), 0.06); }
.menu-cleaner-reorder-item.drag-over {
  border-left-color: var(--mc-accent);
  border-left-width: 4px;
  background: rgba(var(--mc-accent-rgb), 0.08);
  box-shadow: inset 0 0 12px rgba(var(--mc-accent-rgb), 0.04);
}

.menu-cleaner-reorder-column-section.drag-over-section {
  outline: 2px solid var(--mc-accent);
  outline-offset: -1px;
  border-radius: 6px;
  background: rgba(var(--mc-accent-rgb), 0.05);
  box-shadow: inset 0 0 16px rgba(var(--mc-accent-rgb), 0.04);
}

/* ── Settings Panel ──────────────────────────────── */

.menu-cleaner-settings-panel { padding: 12px 18px; }

button.menu-cleaner-settings-btn-full {
  display: block;
  width: 100%;
  padding: 10px 8px;
  border: none;
  border-bottom: 1px solid var(--mc-border-subtle);
  border-radius: 0;
  background: transparent;
  color: var(--mc-text);
  font-size: 0.92em;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

button.menu-cleaner-settings-btn-full:last-child { border-bottom: none; }
button.menu-cleaner-settings-btn-full:hover { background: var(--mc-hover-bg-strong); }
button.menu-cleaner-settings-btn-full:active { background: var(--mc-active-bg); }

.menu-cleaner-colmode-option {
  cursor: pointer;
  border-radius: 4px;
  padding: 10px 12px !important;
  background: var(--mc-hover-bg);
  border: 1px solid transparent;
  color: var(--mc-text);
  transition: background 0.15s, border-color 0.15s;
}
.menu-cleaner-colmode-option:hover { background: var(--mc-hover-bg-strong); }
.menu-cleaner-colmode-active {
  background: rgba(var(--mc-accent-rgb), 0.15) !important;
  border-color: rgba(var(--mc-accent-rgb), 0.4) !important;
  color: var(--mc-accent) !important;
}

.menu-cleaner-settings-divider {
  text-align: center;
  color: var(--mc-text-muted);
  font-size: 0.8em;
  padding: 14px 0 10px 0;
  opacity: 0.7;
}

.menu-cleaner-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.92em;
}

/* ── Dual-Column Reorder ─────────────────────────── */
.menu-cleaner-reorder-column-section { margin-bottom: 6px; }

.menu-cleaner-reorder-column-label {
  font-size: 0.82em;
  color: var(--mc-text-muted);
  padding: 8px 18px 4px 36px;
  opacity: 0.75;
}

/* ── Extensions Panel ────────────────────────────── */
.menu-cleaner-ext-panel {
  display: none;
  height: auto;
  visibility: visible; /* override ST .closedDrawer */
  color: var(--SmartThemeBodyColor, inherit);
  background: var(--SmartThemeBlurTintColor, rgba(18, 20, 28, 0.92));
  border: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: none !important;
  animation: none !important;
}

.menu-cleaner-ext-panel,
.menu-cleaner-ext-panel button,
.menu-cleaner-ext-panel select,
.menu-cleaner-ext-panel textarea,
.menu-cleaner-ext-panel input {
  color: inherit;
}

#menu-cleaner-ext-topbar {
  gap: 8px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.12));
}

#menu-cleaner-ext-topbar h3,
#menu-cleaner-ext-topbar .menu_button,
#menu-cleaner-ext-topbar label,
#menu-cleaner-ext-topbar span,
#menu-cleaner-ext-topbar i {
  color: var(--SmartThemeEmColor, #f5f5f5) !important;
}

#menu-cleaner-ext-panel #menu-cleaner-settings {
  display: none !important;
}

#menu-cleaner-ext-panel #extensions_settings,
#menu-cleaner-ext-panel #extensions_settings2 {
  width: 100%;
}

#menu-cleaner-ext-panel #extensions_settings .inline-drawer-toggle.inline-drawer-header,
#menu-cleaner-ext-panel #extensions_settings2 .inline-drawer-toggle.inline-drawer-header {
  color: #f5f5f5 !important;
  background-image: linear-gradient(348deg, var(--white30a) 2%, var(--grey30a) 10%, var(--black70a) 95%, var(--SmartThemeQuoteColor) 100%);
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  padding: 2px 5px;
  margin-bottom: 5px;
}

#menu-cleaner-ext-panel #extensions_settings .inline-drawer-toggle.inline-drawer-header *,
#menu-cleaner-ext-panel #extensions_settings2 .inline-drawer-toggle.inline-drawer-header * {
  color: inherit !important;
}

#menu-cleaner-ext-panel #extensions_settings .inline-drawer-content,
#menu-cleaner-ext-panel #extensions_settings2 .inline-drawer-content {
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  padding: 10px;
  background-color: var(--SmartThemeBlurTintColor);
}

#menu-cleaner-ext-topbar > label[for="extensions_autoconnect"] {
  display: none !important;
}

.menu-cleaner-ext-col {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 100px;
}

/* Replicate native header styling for elements in our columns */
#menu-cleaner-ext-col1 .inline-drawer-toggle.inline-drawer-header,
#menu-cleaner-ext-col2 .inline-drawer-toggle.inline-drawer-header {
  background-image: linear-gradient(348deg, var(--white30a)2%, var(--grey30a)10%, var(--black70a)95%, var(--SmartThemeQuoteColor)100%);
  margin-bottom: 5px;
  border-radius: 10px;
  padding: 2px 5px;
  border: 1px solid var(--SmartThemeBorderColor);
}

#menu-cleaner-ext-col1 .inline-drawer-toggle.inline-drawer-header:hover,
#menu-cleaner-ext-col2 .inline-drawer-toggle.inline-drawer-header:hover {
  filter: brightness(150%);
}

@media screen and (max-width: 1000px) {
  #menu-cleaner-ext-col1,
  #menu-cleaner-ext-col2 {
    width: 100% !important;
    min-width: 100% !important;
  }
}

/* ── Animations ──────────────────────────────────── */
@keyframes menu-cleaner-fadein {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes menu-cleaner-scalein {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}`;

  function injectStyle() {
    if (doc.getElementById('menu-cleaner-styles')) return;
    const styleEl = doc.createElement('style');
    styleEl.id = 'menu-cleaner-styles';
    styleEl.textContent = STYLE_TEXT;
    doc.head.appendChild(styleEl);
  }

  function applyHides() {
    let styleEl = doc.getElementById('menu-cleaner-hides');
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = 'menu-cleaner-hides';
      doc.head.appendChild(styleEl);
    }

    const rules = [];

    if (settings.enabled) {
      for (const sel of ALWAYS_HIDDEN_SELECTORS) {
        rules.push(sel + ' { display: none !important; }');
      }
    }

    var hiddenSelKeys = Object.keys(settings.hiddenSelectors);
    for (var hk = 0; hk < hiddenSelKeys.length; hk++) {
      if (settings.hiddenSelectors[hiddenSelKeys[hk]]) {
        rules.push(hiddenSelKeys[hk] + ' { display: none !important; }');
      }
    }

    styleEl.textContent = rules.join('\n');
  }

  function clearAllHides() {
    const styleEl = doc.getElementById('menu-cleaner-hides');
    if (styleEl) styleEl.textContent = '';
  }

  // ── Snapshot system ─────────────────────────────────────────────
  function extractHeaderLabel(header) {
    if (!header) return '';
    // 1. Prefer DIRECT child b/[data-i18n] — avoids nested matches in subcontent
    for (var ci = 0; ci < header.children.length; ci++) {
      var ch = header.children[ci];
      if (ch.tagName === 'B' || ch.hasAttribute('data-i18n')) {
        var text = (ch.textContent || '').trim();
        if (text) return text;
      }
    }
    // 2. Fall back to first descendant b/[data-i18n], but only if its text is short enough to be a label
    var nested = header.querySelector('b, [data-i18n]');
    if (nested) {
      var nt = (nested.textContent || '').trim();
      if (nt && nt.length <= 40) return nt;
    }
    // 3. Direct text nodes only — avoid pulling in version strings / taglines from nested elements
    var direct = '';
    for (var ni = 0; ni < header.childNodes.length; ni++) {
      var n = header.childNodes[ni];
      if (n.nodeType === 3) direct += n.textContent;
    }
    direct = direct.trim();
    if (direct) return direct;
    // 4. Last resort: full textContent minus icon text (handles <span>-wrapped labels)
    var icon = header.querySelector('.inline-drawer-icon');
    var iconText = icon ? icon.textContent.trim() : '';
    var full = (header.textContent || '').trim();
    if (iconText && full.slice(-iconText.length) === iconText) {
      full = full.slice(0, -iconText.length).trim();
    }
    if (full) return full;
    return '';
  }

  function captureInitialSnapshot() {
    if (settings.initialSnapshot) return; // already captured

    var snapshot = {};
    for (var g = 0; g < PANEL_GROUPS.length; g++) {
      var group = PANEL_GROUPS[g];
      if (!group.discovery) continue;
      var entries = [];
      var seen = new Set();

      for (var ci = 0; ci < group.discovery.containers.length; ci++) {
        var container = doc.querySelector(group.discovery.containers[ci]);
        if (!container) continue;
        var idx = 0;
        var children = container.children;
        for (var c = 0; c < children.length; c++) {
          var child = children[c];
          if (win.getComputedStyle(child).display === 'none') continue;
          var header = child.querySelector(group.discovery.hasHeader);
          if (!header) continue;
          var label = extractHeaderLabel(header);
          if (!label) continue;
          if (!child.id) { child.id = _stableAutoId(label, child); }

          var selector = '#' + child.id;
          if (seen.has(selector)) continue;
          seen.add(selector);

          entries.push({ selector: selector, label: label, column: ci, index: idx++ });
        }
      }
      // Fallback: include hardcoded group items that may lack .inline-drawer-header
      for (var hi = 0; hi < group.items.length; hi++) {
        var item = group.items[hi];
        if (seen.has(item.selector)) continue;
        var el = doc.querySelector(item.selector);
        if (!el) continue;
        var itemCol = 0;
        for (var cci = 0; cci < group.discovery.containers.length; cci++) {
          var cc = doc.querySelector(group.discovery.containers[cci]);
          if (cc && cc.contains(el)) { itemCol = cci; break; }
        }
        entries.push({ selector: item.selector, label: item.label, column: itemCol, index: entries.length });
      }
      if (entries.length > 0) snapshot[group.id] = entries;
    }

    settings.initialSnapshot = snapshot;
    saveSettings();
  }

  // ── Dynamic discovery ──────────────────────────────────────────
  function discoverItems(group) {
    if (!group.discovery) return [];
    var discovered = [];
    var seen = new Set();
    var excludeSet = new Set(group.discovery.exclude || []);
    var multiContainer = group.discovery.containers.length > 1;

    for (var ci = 0; ci < group.discovery.containers.length; ci++) {
      var container = doc.querySelector(group.discovery.containers[ci]);
      if (!container) continue;
      var columnIndex = multiContainer ? ci : undefined;

      if (group.discovery.itemMatch) {
        var children = container.children;
        for (var c = 0; c < children.length; c++) {
          var child = children[c];
          // Don't skip hidden containers: items inside may still be discoverable
          // (extensions can hide containers with inline style.display='none').
          // Individual items have their own item.style.display check.
          var matchedElements = new Set();
          var items = child.querySelectorAll(group.discovery.itemMatch);
          // Also check if the child itself matches (for containers where items ARE the children, e.g. #options)
          if (items.length === 0 && child.matches && child.matches(group.discovery.itemMatch)) {
            items = [child];
          }
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.style.display === 'none') continue;
            // Extract label before ID assignment (needed for stable ID generation)
            var labelEl = item.querySelector(group.discovery.labelIn);
            var label = labelEl ? labelEl.textContent.trim() : item.textContent.trim();
            if (!label) continue;
            if (!item.id) { item.id = _stableAutoId(label, item); }
            var selector = '#' + item.id;
            if (seen.has(selector) || excludeSet.has(selector)) {
              // Duplicate ID from extension: reassign unique auto-id instead of skipping
              if (item.id && item.id.indexOf('mc-') !== 0) {
                item.id = _stableAutoId(label, item);
                selector = '#' + item.id;
                if (seen.has(selector)) continue;
              } else { continue; }
            }
            seen.add(selector);
            matchedElements.add(item);

            var entry = { selector: selector, label: label };
            if (columnIndex !== undefined) entry.column = columnIndex;
            discovered.push(entry);
          }

          if (group.discovery.alsoMatchChildren) {
            var directChildren = child.children;
            for (var dc = 0; dc < directChildren.length; dc++) {
              var directChild = directChildren[dc];
              if (matchedElements.has(directChild)) continue;
              if (directChild.style.display === 'none') continue;
              var isHardcodedDescendant = false;
              for (var hi = 0; hi < group.items.length; hi++) {
                var hcEl = doc.querySelector(group.items[hi].selector);
                if (hcEl && hcEl.contains(directChild)) { isHardcodedDescendant = true; break; }
              }
              if (isHardcodedDescendant) continue;
              var span = directChild.querySelector('span');
              if (!span) continue;
              var labelText = span.textContent.trim();
              if (!labelText) continue;
              if (!directChild.id) { directChild.id = _stableAutoId(labelText, directChild); }
              var ds = '#' + directChild.id;
              if (seen.has(ds) || excludeSet.has(ds)) {
                if (directChild.id && directChild.id.indexOf('mc-') !== 0) {
                  directChild.id = _stableAutoId(labelText, directChild);
                  ds = '#' + directChild.id;
                  if (seen.has(ds)) continue;
                } else { continue; }
              }
              seen.add(ds);
              var de = { selector: ds, label: labelText };
              if (columnIndex !== undefined) de.column = columnIndex;
              discovered.push(de);
            }
          }
        }
      } else {
        // Mode: match container children that have a specific header element
        var headerChildren = container.children;
        for (var hc = 0; hc < headerChildren.length; hc++) {
          var hcChild = headerChildren[hc];

          // Extension containers (like #qr_container) are wrappers that may contain
          // multiple independent drawer elements. Scan their direct children so that
          // each drawer (e.g. #qr--settings / #qr-assistant-settings) is discovered
          // separately instead of being lumped under the wrapper.
          if (hcChild.classList.contains('extension_container') && !hcChild.classList.contains('inline-drawer')) {
            var _isHc = false;
            var _hasHardcodedChild = false;
            if (hcChild.id) {
              for (var _hc = 0; _hc < group.items.length; _hc++) {
                if ('#' + hcChild.id === group.items[_hc].selector) { _isHc = true; break; }
              }
            }
            // Check if this wrapper contains any hardcoded item (e.g. #qr_container
            // wraps #qr--settings which is already a hardcoded item). If so, skip
            // creating a separate entry for the wrapper itself — let the hardcoded
            // items or the sub-scan handle discovery.
            if (hcChild.id && !_isHc) {
              for (var _hc2 = 0; _hc2 < group.items.length; _hc2++) {
                var _hcEl = doc.querySelector(group.items[_hc2].selector);
                if (_hcEl && hcChild.contains(_hcEl)) { _hasHardcodedChild = true; break; }
              }
            }
            // If the wrapper itself has a usable header AND wraps no hardcoded item,
            // use it directly so that initialSnapshot and discoveryCache agree.
            if (hcChild.id && !_isHc && !_hasHardcodedChild) {
              var _selfHeader = hcChild.querySelector(group.discovery.hasHeader);
              if (_selfHeader) {
                var _selfLabel = extractHeaderLabel(_selfHeader);
                if (_selfLabel) {
                  var _selfSel = '#' + hcChild.id;
                  if (!seen.has(_selfSel)) {
                    seen.add(_selfSel);
                    var _selfEntry = { selector: _selfSel, label: _selfLabel };
                    if (columnIndex !== undefined) _selfEntry.column = columnIndex;
                    discovered.push(_selfEntry);
                  }
                  continue;
                }
              }
            }
            // Fallback: sub-scan children (for containers without own header,
            // like #qr_container which acts as a wrapper around multiple drawers)
            if (!_isHc) {
              for (var wc = 0; wc < hcChild.children.length; wc++) {
                var wrapperChild = hcChild.children[wc];
                if (win.getComputedStyle(wrapperChild).display === 'none') continue;
                var wHeader = wrapperChild.querySelector(group.discovery.hasHeader);
                if (!wHeader) continue;
                var wLabel = extractHeaderLabel(wHeader);
                if (!wLabel) continue;
                if (!wrapperChild.id) { wrapperChild.id = _stableAutoId(wLabel, wrapperChild); }
                var wSelector = '#' + wrapperChild.id;
                if (seen.has(wSelector)) {
                  if (wrapperChild.id && wrapperChild.id.indexOf('mc-') !== 0) {
                    wrapperChild.id = _stableAutoId(wLabel, wrapperChild);
                    wSelector = '#' + wrapperChild.id;
                    if (seen.has(wSelector)) continue;
                  } else { continue; }
                }
                seen.add(wSelector);
                var wEntry = { selector: wSelector, label: wLabel };
                if (columnIndex !== undefined) wEntry.column = columnIndex;
                discovered.push(wEntry);
              }
            }
            continue;
          }

          var header = hcChild.querySelector(group.discovery.hasHeader);
          if (!header) continue;

          var label2 = extractHeaderLabel(header);
          if (!label2) continue;

          if (!hcChild.id) { hcChild.id = _stableAutoId(label2, hcChild); }
          var hcSelector = '#' + hcChild.id;
          if (seen.has(hcSelector)) {
            if (hcChild.id && hcChild.id.indexOf('mc-') !== 0) {
              hcChild.id = _stableAutoId(label2, hcChild);
              hcSelector = '#' + hcChild.id;
              if (seen.has(hcSelector)) continue;
            } else { continue; }
          }
          seen.add(hcSelector);

          var hcEntry = { selector: hcSelector, label: label2 };
          if (columnIndex !== undefined) hcEntry.column = columnIndex;
          discovered.push(hcEntry);
        }
      }
    }
    return discovered;
  }

  function refreshDiscoveryCache(changedOnly) {
    // Preserve user's saved column preferences before physical scan resets them
    var _savedCols = {};
    if (settings.discoveryCache) {
      for (var _sg = 0; _sg < PANEL_GROUPS.length; _sg++) {
        var _gid = PANEL_GROUPS[_sg].id;
        var _cache = settings.discoveryCache[_gid];
        if (!_cache) continue;
        for (var _se = 0; _se < _cache.length; _se++) {
          if (_cache[_se].column !== undefined) {
            if (!_savedCols[_gid]) _savedCols[_gid] = {};
            _savedCols[_gid][_cache[_se].selector] = _cache[_se].column;
          }
        }
      }
    }
    var filterSet = changedOnly ? changedOnly.split(',').reduce(function(s, id) { s[id.trim()] = true; return s; }, Object.create(null)) : null;
    for (var g = 0; g < PANEL_GROUPS.length; g++) {
      var group = PANEL_GROUPS[g];
      if (!group.discovery) continue;
      if (filterSet && !filterSet[group.id]) continue;
      var allDiscovered = discoverItems(group);
      var hardcodedSet = new Set();
      for (var hi = 0; hi < group.items.length; hi++) hardcodedSet.add(group.items[hi].selector);

      // Filter: exclude hardcoded items and their descendants
      var newItems = allDiscovered.filter(function(d) {
        if (EXCLUDED_LABELS.indexOf(d.label) !== -1) return false;
        if (hardcodedSet.has(d.selector)) return false;
        var el = doc.querySelector(d.selector);
        if (el) {
          for (var hsi = 0; hsi < group.items.length; hsi++) {
            var hcEl = doc.querySelector(group.items[hsi].selector);
            if (hcEl && hcEl.contains(el)) return false;
          }
        }
        return true;
      });

      // Preserve column origin from old cache (user's prior cross-column moves win over physical scan)
      var oldCache = settings.discoveryCache[group.id] || [];
      var oldColMap = {};
      for (var oc = 0; oc < oldCache.length; oc++) {
        if (oldCache[oc].column !== undefined) oldColMap[oldCache[oc].selector] = oldCache[oc].column;
      }
      for (var ni = 0; ni < newItems.length; ni++) {
        if (oldColMap[newItems[ni].selector] !== undefined) {
          newItems[ni].column = oldColMap[newItems[ni].selector];
        }
      }

      // Build exclude set for this group (TT-specific noisy elements etc.)
      var excludeSet = new Set((group.discovery.exclude || []));

      // Preserve hardcoded items' column info (created by cross-column moves)
      for (var oi = 0; oi < oldCache.length; oi++) {
        var old = oldCache[oi];
        if (excludeSet.has(old.selector)) continue;
        if (hardcodedSet.has(old.selector) && old.column !== undefined) {
          var found = false;
          for (var fi = 0; fi < newItems.length; fi++) {
            if (newItems[fi].selector === old.selector) { found = true; break; }
          }
          if (!found) {
            newItems.push({ selector: old.selector, label: old.label, column: old.column });
          }
        }
      }

      // Safety net: carry over non-hardcoded entries still in DOM but missed by current scan
      for (var si = 0; si < oldCache.length; si++) {
        var oldEntry = oldCache[si];
        if (excludeSet.has(oldEntry.selector)) continue;
        if (hardcodedSet.has(oldEntry.selector)) continue;
        var alreadyInNew = false;
        for (var nj = 0; nj < newItems.length; nj++) {
          if (newItems[nj].selector === oldEntry.selector) { alreadyInNew = true; break; }
        }
        if (alreadyInNew) continue;
        if (!doc.querySelector(oldEntry.selector)) continue;
        newItems.push({ selector: oldEntry.selector, label: oldEntry.label, column: oldEntry.column });
      }

      // Restore saved columns that physical scan may have overwritten
      if (_savedCols[group.id]) {
        for (var _re = 0; _re < newItems.length; _re++) {
          var _entry = newItems[_re];
          if (_entry.selector in _savedCols[group.id] && _savedCols[group.id][_entry.selector] !== _entry.column) {
            _entry.column = _savedCols[group.id][_entry.selector];
          }
        }
      }
      settings.discoveryCache[group.id] = newItems;

      // Prune stale selectors from reorder array (they accumulate when the discovery
      // cache changes between rescans: old selectors stay in reorder but no longer
      // match any item, making the sort view appear to not respond to drags).
      if (settings.reorder && settings.reorder[group.id]) {
        var _validSelectors = new Set();
        for (var _hsi = 0; _hsi < group.items.length; _hsi++) _validSelectors.add(group.items[_hsi].selector);
        for (var _nii = 0; _nii < newItems.length; _nii++) _validSelectors.add(newItems[_nii].selector);
        var _pruned = settings.reorder[group.id].filter(function(s) { return _validSelectors.has(s); });
        if (_pruned.length !== settings.reorder[group.id].length) {
          settings.reorder[group.id] = _pruned;
          try { console.debug('[MC] pruned stale reorder entries for', group.id); } catch(_) {}
        }
      }
    }
    saveSettings();
    return true;
  }

  // ── Column cache helper ─────────────────────────────────────────
  function setColumnInCache(selector, groupId, columnIndex) {
    if (!settings.discoveryCache[groupId]) settings.discoveryCache[groupId] = [];
    var cached = settings.discoveryCache[groupId];
    var entry = null;
    for (var c = 0; c < cached.length; c++) {
      if (cached[c].selector === selector) { entry = cached[c]; break; }
    }
    if (entry) {
      entry.column = columnIndex;
    } else {
      // Try to source a clean label: hardcoded list first, then header extraction
      var label = '';
      for (var pg = 0; pg < PANEL_GROUPS.length; pg++) {
        if (PANEL_GROUPS[pg].id !== groupId) continue;
        for (var pi = 0; pi < PANEL_GROUPS[pg].items.length; pi++) {
          if (PANEL_GROUPS[pg].items[pi].selector === selector) {
            label = PANEL_GROUPS[pg].items[pi].label;
            break;
          }
        }
        break;
      }
      if (!label) {
        var el = doc.querySelector(selector);
        if (el) {
          var hd = el.querySelector('.inline-drawer-header');
          if (hd) label = extractHeaderLabel(hd);
          if (!label) label = (el.textContent || '').trim().substring(0, 40);
        }
      }
      if (!label) label = selector;
      cached.push({ selector: selector, label: label, column: columnIndex });
    }
  }

  // ── Reorder helpers ─────────────────────────────────────────────
  function getReorderItems(groupId) {
    var group = null;
    for (var g = 0; g < PANEL_GROUPS.length; g++) {
      if (PANEL_GROUPS[g].id === groupId) { group = PANEL_GROUPS[g]; break; }
    }
    if (!group) return [];

    var order = settings.reorder[groupId];
    if (!order || order.length === 0) {
      order = group.items.map(function (i) { return i.selector; });
      var cached0 = settings.discoveryCache[groupId] || [];
      for (var ci = 0; ci < cached0.length; ci++) order.push(cached0[ci].selector);
    }

    var labelMap = {};
    for (var hi = 0; hi < group.items.length; hi++) {
      labelMap[group.items[hi].selector] = group.items[hi].label;
    }
    var cachedLabels = settings.discoveryCache[groupId] || [];
    for (var cl = 0; cl < cachedLabels.length; cl++) {
      labelMap[cachedLabels[cl].selector] = cachedLabels[cl].label;
    }

    // Fallback: resolve unknown labels from DOM
    function getLabelFromDom(sel) {
      try {
        var el = doc.querySelector(sel);
        if (!el) return null;
        var hd = el.querySelector('.inline-drawer-header');
        if (hd) { var t = extractHeaderLabel(hd); if (t) return t; }
        // Try finding any header-like element
        var hd2 = el.querySelector('b, strong, .drawer-title, .title');
        if (hd2) { var t2 = (hd2.textContent || '').trim(); if (t2) return t2; }
      } catch(_) {}
      return null;
    }

    var result = [];
    var seen = new Set();
    var seenLabels = {};
    for (var oi = 0; oi < order.length; oi++) {
      var selector = order[oi];
      if (seen.has(selector)) continue;
      seen.add(selector);
      if (settings.hiddenSelectors[selector]) continue;
      var itemLabel = labelMap[selector] || getLabelFromDom(selector) || selector;
      // Auto-ID entries that share a label with a stable-ID entry are duplicates — skip them
      if ((selector.indexOf('#menu-cleaner-auto-') === 0 || selector.indexOf('#mc-') === 0) && seenLabels[itemLabel]) continue;
      seenLabels[itemLabel] = true;
      result.push({ selector: selector, label: itemLabel });
    }

    for (var hi2 = 0; hi2 < group.items.length; hi2++) {
      var item = group.items[hi2];
      if (!seen.has(item.selector) && !settings.hiddenSelectors[item.selector]) {
        seen.add(item.selector);
        result.push({ selector: item.selector, label: item.label });
      }
    }
    var cachedItems = settings.discoveryCache[groupId] || [];
    for (var ci2 = 0; ci2 < cachedItems.length; ci2++) {
      var ditem = cachedItems[ci2];
      if (!seen.has(ditem.selector) && !settings.hiddenSelectors[ditem.selector]) {
        seen.add(ditem.selector);
        result.push({ selector: ditem.selector, label: ditem.label });
      }
    }

    return result;
  }

  function getColumnIndex(selector, groupId) {
    var cached = settings.discoveryCache[groupId] || [];
    for (var c = 0; c < cached.length; c++) {
      if (cached[c].selector === selector) return cached[c].column || 0;
    }
    return 0;
  }

  // ── Native DOM reorder (for groups not managed by extensions panel) ─
  function findExtensionUnitForSelector(selector, containers) {
    var el = doc.querySelector(selector);
    if (!el) return null;
    for (var ci = 0; ci < containers.length; ci++) {
      var container = containers[ci];
      if (!container || !container.contains(el)) continue;
      var unit = el;
      while (unit.parentNode && unit.parentNode !== container) {
        unit = unit.parentNode;
      }
      if (unit.parentNode === container) return unit;
    }
    return null;
  }

  function applyNativeReorder(groupId) {
    try { var _orderPreview = getReorderItems(groupId); console.debug('[MC] applyNativeReorder', groupId, _orderPreview.length + ' items', JSON.stringify(_orderPreview.map(function(x){return x.selector;}))); } catch(_) {}
    if (groupId === 'extensionsSettings') {
      var nativeCol1 = doc.getElementById('extensions_settings');
      var nativeCol2 = doc.getElementById('extensions_settings2');
      if (!nativeCol1) return;

      var nativeContainers = [nativeCol1, nativeCol2];
      var extItems = getReorderItems(groupId);
      var placedUnits = new Set();
      var orderedCols = [[], []];

      for (var ei = 0; ei < extItems.length; ei++) {
        var extSelector = extItems[ei].selector;
        var extUnit = findExtensionUnitForSelector(extSelector, nativeContainers);
        if (!extUnit || placedUnits.has(extUnit)) continue;
        placedUnits.add(extUnit);
        var extCol = settings.columnMode === 'single' ? 0 : (getColumnIndex(extSelector, groupId) === 1 ? 1 : 0);
        orderedCols[extCol].push(extUnit);
      }

      suppressObserver = true;
      for (var c0 = 0; c0 < orderedCols[0].length; c0++) nativeCol1.appendChild(orderedCols[0][c0]);
      if (nativeCol2) {
        for (var c1 = 0; c1 < orderedCols[1].length; c1++) nativeCol2.appendChild(orderedCols[1][c1]);
        nativeCol2.style.display = settings.columnMode === 'single' ? 'none' : '';
      }
      nativeCol1.style.display = '';
      // Reconcile discoveryCache columns with actual DOM positions
      if (settings.discoveryCache && settings.discoveryCache['extensionsSettings']) {
        var _dc = settings.discoveryCache['extensionsSettings'];
        var _colDirty = false;
        for (var _ui = 0; _ui < _dc.length; _ui++) {
          var _e = _dc[_ui];
          var _el = doc.querySelector(_e.selector);
          if (!_el) continue;
          var _actualCol = (nativeCol2 && nativeCol2.contains(_el)) ? 1 : (nativeCol1.contains(_el) ? 0 : -1);
          if (_actualCol >= 0 && _e.column !== _actualCol) {
            _e.column = _actualCol;
            _colDirty = true;
          }
        }
        if (_colDirty) saveSettings();
      }
      win.setTimeout(function() { suppressObserver = false; }, 0);
      try { win.__mcReorderApplied = true; } catch(_) {}
      return;
    }

    var items = getReorderItems(groupId);
    if (items.length < 2) return;

    var els = [];
    for (var i = 0; i < items.length; i++) {
      var el = doc.querySelector(items[i].selector);
      if (el && (el.offsetParent === null || win.getComputedStyle(el).display === 'none')) {
        var all = doc.querySelectorAll(items[i].selector);
        for (var ai = 0; ai < all.length; ai++) {
          if (all[ai].offsetParent !== null && win.getComputedStyle(all[ai]).display !== 'none') {
            el = all[ai];
            break;
          }
        }
      }
      if (el) els.push(el);
    }
    if (els.length < 2) return;

    var container = els[0].parentNode;
    while (container) {
      var ok = true;
      for (var j = 0; j < els.length; j++) {
        if (!container.contains(els[j])) { ok = false; break; }
      }
      if (ok) break;
      container = container.parentNode;
    }
    if (!container) return;

    var units = [];
    var seen = new Set();
    for (var k = 0; k < els.length; k++) {
      var unit = els[k];
      while (unit.parentNode && unit.parentNode !== container) {
        unit = unit.parentNode;
      }
      if (unit.parentNode === container && !seen.has(unit)) {
        seen.add(unit);
        units.push(unit);
      }
    }

    suppressObserver = true;
    for (var m = 0; m < units.length; m++) {
      container.appendChild(units[m]);
    }
    win.setTimeout(function() { suppressObserver = false; }, 0);
  }

  // ── Extensions panel ────────────────────────────────────────────
  function createExtensionsPanelDOM() {
    if (getExtPanel()) return;

    var html =
      '<div id="menu-cleaner-ext-panel" class="drawer-content menu-cleaner-ext-panel">' +
        '<div class="extensions_block flex-container">' +
          '<div id="menu-cleaner-ext-topbar" class="alignitemscenter flex-container wide100p">' +
            '<h3 class="margin0 flex1">扩展</h3>' +
          '</div>' +
          '<div id="menu-cleaner-ext-col1" class="flex1 wide50p menu-cleaner-ext-col st-cocktail-panel-wrapper"></div>' +
          '<div id="menu-cleaner-ext-col2" class="flex1 wide50p menu-cleaner-ext-col st-cocktail-panel-wrapper"></div>' +
          '<hr class="wide100p margin0">' +
        '</div>' +
      '</div>';

    doc.body.insertAdjacentHTML('beforeend', html);
  }

  function renderExtensionsPanel() {
    var col1 = doc.getElementById('menu-cleaner-ext-col1');
    var col2 = doc.getElementById('menu-cleaner-ext-col2');
    var nativeCol1 = doc.getElementById('extensions_settings');
    var nativeCol2 = doc.getElementById('extensions_settings2');
    if (!col1 || !col2 || !nativeCol1) return;

    suppressObserver = true;
    rememberNativeHome(nativeCol1);
    if (nativeCol2) rememberNativeHome(nativeCol2);

    var topbar = doc.getElementById('menu-cleaner-ext-topbar');
    if (topbar) {
      var nativeDetails = doc.getElementById('extensions_details');
      var nativeThirdParty = doc.getElementById('third_party_extension_button');
      var notifyLabel = doc.querySelector('#rm_extensions_block .checkbox_label.flexNoGap');
      var topbarNodes = [nativeDetails, nativeThirdParty, notifyLabel];
      for (var tn = 0; tn < topbarNodes.length; tn++) {
        var node = topbarNodes[tn];
        if (!node) continue;
        rememberNativeHome(node);
        if (node.parentNode !== topbar) topbar.appendChild(node);
      }
    }

    applyNativeReorder('extensionsSettings');

    col1.innerHTML = '';
    col2.innerHTML = '';
    col1.appendChild(nativeCol1);
    if (nativeCol2) {
      col2.appendChild(nativeCol2);
      col2.style.display = settings.columnMode === 'single' ? 'none' : '';
    } else {
      col2.style.display = 'none';
    }

    syncPanelTheme();
    win.setTimeout(function() { suppressObserver = false; }, 0);
  }

  function syncPanelZIndex() {


    var panel = getExtPanel();
    if (!panel) return;
    // Inherit z-index from the native drawer-content that our panel replaces.
    // Some themes set aggressive z-index values; matching the native drawer
    // ensures our panel never ends up underneath themed elements.
    var sources = [
      doc.querySelector('#extensions-settings-button > .drawer-content'),
      getRmBlock(),
      doc.getElementById('extensions_settings')
    ];
    for (var i = 0; i < sources.length; i++) {
      if (sources[i]) {
        var z = win.getComputedStyle(sources[i]).zIndex;
        if (z && z !== 'auto') { panel.style.zIndex = z; return; }
      }
    }
    panel.style.zIndex = '3000'; // fallback
  }

  function syncPanelTheme() {
    var panel = getExtPanel();
    if (!panel) return;

    var sources = [
      getRmBlock(),
      doc.querySelector('#extensions-settings-button > .drawer-content'),
      doc.getElementById('extensions_settings'),
      doc.body
    ];

    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      if (!source) continue;
      var cs = win.getComputedStyle(source);
      if (!cs) continue;

      if (cs.color) panel.style.color = cs.color;
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
        panel.style.backgroundColor = cs.backgroundColor;
      }
      panel.style.backgroundImage = cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
      if (cs.borderColor && cs.borderColor !== 'rgba(0, 0, 0, 0)') {
        panel.style.borderColor = cs.borderColor;
      }
      if (cs.borderRadius) panel.style.borderRadius = cs.borderRadius;
      if (cs.backdropFilter && cs.backdropFilter !== 'none') {
        panel.style.backdropFilter = cs.backdropFilter;
        panel.style.webkitBackdropFilter = cs.backdropFilter;
      }
      return;
    }
  }

  function syncPanelToggleState() {
    var drawerToggle = doc.querySelector('#extensions-settings-button > .drawer-toggle');
    if (!drawerToggle) return;
    drawerToggle.setAttribute('aria-expanded', extPanelVisible ? 'true' : 'false');
  }

  function toggleExtensionsPanel() {
    extPanelVisible = !extPanelVisible;
    var panel = getExtPanel();
    if (!panel) {
      createExtensionsPanelDOM();
      panel = getExtPanel();
      if (!panel) return;
    }

    if (extPanelVisible) {
      syncPanelZIndex();
      renderExtensionsPanel();
      panel.style.display = 'block';
      panel.style.visibility = 'visible';
      panel.style.height = 'auto';
      panel.classList.remove('closedDrawer');
      panel.setAttribute('aria-hidden', 'false');
      positionExtensionsPanel();
    } else {
      returnElementsToNative();
      panel.style.display = 'none';
      panel.setAttribute('aria-hidden', 'true');
    }

    syncPanelToggleState();
  }

  function isPanelOpen() {
    return extPanelVisible;
  }

  function positionExtensionsPanel() {
    var panel = getExtPanel();
    if (!panel) return;
    panel.style.maxHeight = '80vh';
    panel.style.overflow = 'auto';
  }

  // ── Panel intercept ─────────────────────────────────────────────
  function setupPanelIntercept() {
    var drawerToggle = doc.querySelector('#extensions-settings-button > .drawer-toggle');
    if (!drawerToggle) {
      setTimeout(setupPanelIntercept, 500);
      return;
    }
    if (drawerToggle.dataset.menuCleanerBound === '1') return;
    drawerToggle.dataset.menuCleanerBound = '1';
    drawerToggle.addEventListener('click', function(e) {
      if (!settings.enabled) return;
      // If MagicPanel already bound this button, let it handle the click
      if (drawerToggle.dataset.magicPanelBound === '1') return;
      e.stopImmediatePropagation();
      e.preventDefault();
      toggleExtensionsPanel();
    }, true);
  }

  // ── Return elements to native on disable ────────────────────────
  function returnElementsToNative() {
    var topbar = doc.getElementById('menu-cleaner-ext-topbar');
    if (topbar) {
      var topbarNodes = topbar.querySelectorAll('#extensions_details, #third_party_extension_button, .checkbox_label.flexNoGap');
      for (var ti = 0; ti < topbarNodes.length; ti++) {
        restoreRememberedNode(topbarNodes[ti], getRmBlock());
      }
    }

    var nativeCol1 = doc.getElementById('extensions_settings');
    var nativeCol2 = doc.getElementById('extensions_settings2');
    if (nativeCol1) restoreRememberedNode(nativeCol1, getRmBlock());
    if (nativeCol2) restoreRememberedNode(nativeCol2, getRmBlock());
  }

  // ── UI: Entry in extensionsMenu ─────────────────────────────────
  // ── UI: Settings drawer in extensions_settings ──────────────────
  function injectSettingsEntry(retries) {
    if (retries === undefined) retries = 0;
    var target = doc.querySelector('#extensions_settings');
    if (!target) {
      if (retries < 60) {
        setTimeout(function() { injectSettingsEntry(retries + 1); }, 500);
      } else {
        console.warn('[MenuCleaner] #extensions_settings 未找到，放弃重试');
      }
      return;
    }
    if (doc.getElementById('menu-cleaner-settings')) return;

    var html =
      '<div id="menu-cleaner-settings" class="inline-drawer">' +
        '<div class="inline-drawer-toggle inline-drawer-header">' +
          '<b>酒馆菜单管理器</b>' +
          '<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down interactable"></div>' +
        '</div>' +
        '<div class="inline-drawer-content">' +
          '<div style="padding:8px 0;">' +
            '<label class="checkbox_label">' +
              '<input id="menu-cleaner-enable" type="checkbox"' + (settings.enabled ? ' checked' : '') + '>' +
              '<span>启用精简器（/menucleaner 斜杠命令）</span>' +
            '</label>' +
            '<label class="checkbox_label" style="margin-top:4px;">' +
              '<input id="menu-cleaner-mp-enable" type="checkbox"' + (Store.mp.get('magic_panel_mp_enabled') !== false ? ' checked' : '') + '>' +
              '<span>启用魔法面板</span>' +
            '</label>' +
            '<p style="color:#888;font-size:0.85em;margin:4px 0;">' +
              '点击魔棒菜单中的 <b>酒馆菜单管理器</b> 打开精简器面板，选择要隐藏的原生菜单项。' +
            '</p>' +
            '<button id="menu-cleaner-open-popup" class="menu_button">打开精简器面板</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    target.insertAdjacentHTML('beforeend', html);

    var toggleEl = target.querySelector('#menu-cleaner-settings .inline-drawer-toggle');
    var contentEl = target.querySelector('#menu-cleaner-settings .inline-drawer-content');
    toggleEl && toggleEl.addEventListener('click', function () {
      contentEl && contentEl.classList.toggle('closedDrawer');
    });

    var enableCb = doc.getElementById('menu-cleaner-enable');
    enableCb && enableCb.addEventListener('change', function (e) {
      settings.enabled = e.target.checked;
      saveSettings();
      if (e.target.checked) {
        applyHides();
        applyNativeReorder('extensionsSettings');
      } else {
        clearAllHides();
        var panel = getExtPanel();
        if (panel) panel.style.display = 'none';
        extPanelVisible = false;
        returnElementsToNative();
        syncPanelToggleState();
      }
    });

    var mpEnableCb = doc.getElementById('menu-cleaner-mp-enable');
    mpEnableCb && mpEnableCb.addEventListener('change', function (e) {
      try { Store.mp.set('magic_panel_mp_enabled', e.target.checked); } catch(_) {}
    });

    var openBtn = doc.getElementById('menu-cleaner-open-popup');
    openBtn && openBtn.addEventListener('click', function () { openPopup(); });
  }

  // ── Popup ───────────────────────────────────────────────────────
  function createPopupDOM() {
    if (getPopup()) return;

    var html =
      '<div id="menu-cleaner-backdrop" class="menu-cleaner-backdrop"></div>' +
      '<div id="menu-cleaner-popup" class="menu-cleaner-popup">' +
        '<div class="menu-cleaner-popup-header">' +
          '<h2>酒馆菜单管理器</h2>' +
          '<div class="menu-cleaner-popup-actions">' +
            '<button id="menu-cleaner-theme-btn" class="menu_button">' + getThemeBtnLabel() + '</button>' +
            '<button id="menu-cleaner-rescan-btn" class="menu_button">手动重扫</button>' +
            '<button id="menu-cleaner-close" class="menu_button">✕ 关闭</button>' +
          '</div>' +
        '</div>' +
        '<div class="menu-cleaner-tabs" id="menu-cleaner-tabs">' +
          '<div class="menu-cleaner-tab active" data-tab="hide">隐藏元素</div>' +
          '<div class="menu-cleaner-tab" data-tab="reorder">重排序</div>' +
        '</div>' +
        '<div id="menu-cleaner-popup-body" class="menu-cleaner-popup-body"></div>' +
      '</div>';
    doc.body.insertAdjacentHTML('beforeend', html);

    var closeBtn = doc.getElementById('menu-cleaner-close');
    var backdrop = doc.getElementById('menu-cleaner-backdrop');
    closeBtn && closeBtn.addEventListener('click', closePopup);
    backdrop && backdrop.addEventListener('click', closePopup);
    var themeBtn = doc.getElementById('menu-cleaner-theme-btn');
    themeBtn && themeBtn.addEventListener('click', function() { cycleTheme(); });
    var rescanBtn = doc.getElementById('menu-cleaner-rescan-btn');
    rescanBtn && rescanBtn.addEventListener('click', function() { doRescan(); });

    var tabs = doc.querySelectorAll('.menu-cleaner-tab');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function() { switchTab(this.dataset.tab); });
    }
  }

  function openPopup() {
    createPopupDOM();
    // Refresh discovery cache so newly injected extension buttons are visible
    refreshDiscoveryCache();
    doc.getElementById('menu-cleaner-backdrop').style.display = 'block';
    getPopup().style.display = 'flex';
    refreshPopup();
    positionPopup();
  }

  function closePopup() {
    // Clean up any drag state (Escape during drag)
    dragActive = false;
    var oldDragItems = doc.querySelectorAll('.menu-cleaner-reorder-item.dragging, .menu-cleaner-reorder-item.drag-over, .menu-cleaner-reorder-column-section.drag-over-section');
    for (var _di = 0; _di < oldDragItems.length; _di++) {
      oldDragItems[_di].classList.remove('dragging', 'drag-over');
    }
    oldDragItems = doc.querySelectorAll('.menu-cleaner-reorder-column-section.drag-over-section');
    for (var _di2 = 0; _di2 < oldDragItems.length; _di2++) {
      oldDragItems[_di2].classList.remove('drag-over-section');
    }
    var ghosts = doc.querySelectorAll('.menu-cleaner-ghost, .menu-cleaner-reorder-item.dragging:not([data-group])');
    for (var _g = 0; _g < ghosts.length; _g++) ghosts[_g].remove();
    var backdrop = doc.getElementById('menu-cleaner-backdrop');
    var popup = getPopup();
    if (backdrop) backdrop.style.display = 'none';
    if (popup) popup.style.display = 'none';
    // Refresh extension panel to reflect any reorder changes made in popup
    if (extPanelVisible) renderExtensionsPanel();
    applyNativeReorder('extensionsSettings');
  }



  function switchTab(tabName) {
    activeTab = tabName;
    var tabs = doc.querySelectorAll('.menu-cleaner-tab');
    for (var t = 0; t < tabs.length; t++) {
      if (tabs[t].dataset.tab === tabName) {
        tabs[t].classList.add('active');
      } else {
        tabs[t].classList.remove('active');
      }
    }
    refreshPopup();
  }

  // ── Column mode ──────────────────────────────────────────────────
  function applyColumnMode(mode) {
    if (settings.columnMode === mode) return;
    settings.columnMode = mode;

    // When switching to single, move all extensionsSettings items to left column
    if (mode === 'single') {
      var cache = settings.discoveryCache['extensionsSettings'] || [];
      for (var ci = 0; ci < cache.length; ci++) cache[ci].column = 0;
    }

    saveSettings();

    applyNativeReorder('extensionsSettings');

    if (activeTab === 'reorder') renderReorderView();

  }

  function renderReorderView() {
    var body = getPopupBody();
    if (!body) return;

    var expanded = new Set();
    var catBodies = doc.querySelectorAll('.menu-cleaner-category-body:not(.collapsed)');
    for (var eb = 0; eb < catBodies.length; eb++) {
      expanded.add(catBodies[eb].dataset.group);
    }

    var reorderGroups = [];
    for (var rg = 0; rg < PANEL_GROUPS.length; rg++) {
      if (REORDER_GROUP_IDS.indexOf(PANEL_GROUPS[rg].id) !== -1) {
        reorderGroups.push(PANEL_GROUPS[rg]);
      }
    }
    var html = '';

    for (var g = 0; g < reorderGroups.length; g++) {
      var group = reorderGroups[g];
      var items = getReorderItems(group.id);
      var isExpanded = expanded.has(group.id);
      var isDualCol = group.id === 'extensionsSettings' && settings.columnMode !== 'single';

      html += '<div class="menu-cleaner-category">';
      html += '<div class="menu-cleaner-category-header" data-group="' + Runtime.escHtml(group.id) + '">' +
                '<span class="menu-cleaner-category-arrow">' + (isExpanded ? '▼' : '▶') + '</span>' +
                '<strong>' + Runtime.escHtml(group.name) + '</strong>' +
                '<span class="menu-cleaner-category-count">' + items.length + ' 项</span>' +
              '</div>';
      html += '<div class="menu-cleaner-category-body' + (isExpanded ? '' : ' collapsed') + '" data-group="' + Runtime.escHtml(group.id) + '">';

      if (isDualCol) {
        var flatIndexMap = {};
        for (var fi = 0; fi < items.length; fi++) flatIndexMap[items[fi].selector] = fi;
        var col0Items = items.filter(function(it) { return getColumnIndex(it.selector, group.id) === 0; });
        var col1Items = items.filter(function(it) { return getColumnIndex(it.selector, group.id) === 1; });
        html += renderColumnSection(group, col0Items, 0, '左栏', flatIndexMap);
        html += renderColumnSection(group, col1Items, 1, '右栏', flatIndexMap);
      } else {
        if (items.length === 0) {
          html += '<div class="menu-cleaner-reorder-empty">没有可见元素</div>';
        } else {
          for (var i = 0; i < items.length; i++) {
            html += buildReorderItemHTML(items[i], group.id, i, -1);
          }
        }
      }

      html += '</div></div>';
    }

    // ── Tools section (settings moved here) ──
    html += '<div class="menu-cleaner-settings-panel">';
    html += '<div class="menu-cleaner-settings-divider">—————— 扩展菜单分栏 ——————</div>';
    html += '<div id="menu-cleaner-colmode-dual" class="menu-cleaner-settings-row menu-cleaner-colmode-option' + (settings.columnMode === 'dual' ? ' menu-cleaner-colmode-active' : '') + '"><span>双栏</span></div>';
    html += '<div id="menu-cleaner-colmode-single" class="menu-cleaner-settings-row menu-cleaner-colmode-option' + (settings.columnMode === 'single' ? ' menu-cleaner-colmode-active' : '') + '"><span>单栏</span></div>';
    html += '<div class="menu-cleaner-settings-divider">—————— 工具区 ——————</div>';
    html += '<button id="menu-cleaner-reset-order" class="menu_button menu-cleaner-settings-btn-full">恢复原始排序</button>';
    html += '<button id="menu-cleaner-clear-data" class="menu_button menu-cleaner-settings-btn-full">清除插件数据</button>';
    html += '<button id="menu-cleaner-export-settings" class="menu_button menu-cleaner-settings-btn-full" style="margin-top:4px;">📤 导出设置</button>';
    html += '<button id="menu-cleaner-import-settings" class="menu_button menu-cleaner-settings-btn-full">📥 导入设置</button>';
    html += '<div class="menu-cleaner-settings-divider">—————— 调试用内容 ——————</div>';
    html += '<div class="menu-cleaner-settings-row"><span>重扫描消息toast</span><label class="menu-cleaner-toggle"><input type="checkbox" id="menu-cleaner-rescan-toast"' + (settings.rescanToast ? ' checked' : '') + '><span class="menu-cleaner-slider"></span></label></div>';
    html += '<button id="menu-cleaner-export-diagnostics" class="menu_button menu-cleaner-settings-btn-full" style="margin-top:4px;">导出诊断日志</button>';
    html += '</div>';

    body.innerHTML = html;

    // Bind category collapse
    var headers = doc.querySelectorAll('.menu-cleaner-category-header');
    for (var h = 0; h < headers.length; h++) {
      headers[h].addEventListener('click', function() {
        var groupId = this.dataset.group;
        var catBody = doc.querySelector('.menu-cleaner-category-body[data-group="' + groupId + '"]');
        var arrow = this.querySelector('.menu-cleaner-category-arrow');
        if (catBody) {
          catBody.classList.toggle('collapsed');
          if (arrow) arrow.textContent = catBody.classList.contains('collapsed') ? '▶' : '▼';
          positionPopup();
        }
      });
    }

    // ── Bind tools section events ──
    var resetBtn = doc.getElementById('menu-cleaner-reset-order');
    resetBtn && resetBtn.addEventListener('click', function() { resetAllReorders(); });
    var clearBtn = doc.getElementById('menu-cleaner-clear-data');
    clearBtn && clearBtn.addEventListener('click', function() {
      if (!win.confirm('确定要清除所有插件配置数据吗？此操作不可撤销。')) return;
      settings = Object.assign({}, defaultSettings);
      saveSettings();
      clearAllHides();
      activeTab = 'hide';
      switchTab('hide');
      captureInitialSnapshot();
      refreshDiscoveryCache();
      applyHides();
      applyNativeReorder('extensionsSettings');
      renderExtensionsPanel();
    });
    var toastCb = doc.getElementById('menu-cleaner-rescan-toast');
    toastCb && toastCb.addEventListener('change', function(e) {
      settings.rescanToast = e.target.checked;
      try { saveSettings(); } catch(_) {}
    });
    var colDual = doc.getElementById('menu-cleaner-colmode-dual');
    colDual && colDual.addEventListener('click', function() { applyColumnMode('dual'); });
    var colSingle = doc.getElementById('menu-cleaner-colmode-single');
    colSingle && colSingle.addEventListener('click', function() { applyColumnMode('single'); });

    var exportSettingsBtn = doc.getElementById('menu-cleaner-export-settings');
    exportSettingsBtn && exportSettingsBtn.addEventListener('click', function() {
      var payload = {
        version: SCRIPT_VERSION,
        exportedAt: new Date().toISOString(),
        settings: {
          enabled: settings.enabled,
          hiddenSelectors: settings.hiddenSelectors,
          reorder: settings.reorder,
          discoveryCache: settings.discoveryCache,
          columnMode: settings.columnMode,
          rescanToast: settings.rescanToast,
          theme: validTheme(settings.theme)
        }
      };
      try {
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = doc.createElement('a');
        a.href = url;
        a.download = 'menu-cleaner-settings.json';
        a.click();
        URL.revokeObjectURL(url);
        if (win.toastr) win.toastr.success('设置已导出');
      } catch(e) {
        if (win.toastr) win.toastr.error('导出失败: ' + e.message);
      }
    });

    var importSettingsBtn = doc.getElementById('menu-cleaner-import-settings');
    importSettingsBtn && importSettingsBtn.addEventListener('click', function() {
      if (!importFileInput) {
        importFileInput = doc.createElement('input');
        importFileInput.type = 'file';
        importFileInput.accept = '.json';
        importFileInput.style.display = 'none';
        importFileInput.addEventListener('change', function(ev) {
          var file = ev.target.files && ev.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function(e2) {
            try {
              var data = JSON.parse(e2.target.result);
              if (!data.settings || typeof data.settings !== 'object') throw new Error('无效的导入文件格式');
              var validKeys = { enabled: 'boolean', hiddenSelectors: 'object', reorder: 'object', discoveryCache: 'object', columnMode: 'string', rescanToast: 'boolean', theme: 'string' };
              var validKeyNames = Object.keys(validKeys);
              for (var _ik = 0; _ik < validKeyNames.length; _ik++) {
                var _kn = validKeyNames[_ik];
                if (data.settings[_kn] !== undefined && typeof data.settings[_kn] === validKeys[_kn]) {
                  settings[_kn] = JSON.parse(JSON.stringify(data.settings[_kn]));
                }
              }
              settings.initialSnapshot = null; // will be rebuilt on next reset
              saveSettings();
              settings.theme = validTheme(settings.theme);
              applyTheme(settings.theme);
              var _tb = doc.getElementById('menu-cleaner-theme-btn');
              if (_tb) _tb.textContent = getThemeBtnLabel();
              refreshDiscoveryCache();
              applyHides();
              applyNativeReorder('extensionsSettings');
              refreshPopup();
              if (win.toastr) win.toastr.success('设置已导入');
            } catch(err) {
              if (win.toastr) win.toastr.error('导入失败: ' + err.message);
            }
          };
          reader.readAsText(file);
          importFileInput.value = '';
        });
        doc.body.appendChild(importFileInput);
      }
      importFileInput.click();
    });

    var exportBtn = doc.getElementById('menu-cleaner-export-diagnostics');
    exportBtn && exportBtn.addEventListener('click', function() {
      var lines = [
        '=== 酒馆菜单管理器 诊断日志 ===',
        '版本: v1.4.1',
        '浏览器: ' + (win.navigator.userAgent || 'N/A'),
        '时间: ' + new Date().toISOString(),
        '',
        '--- settings.reorder (extensionsSettings) ---',
        JSON.stringify(settings.reorder['extensionsSettings'] || []),
        '',
        '--- settings.reorder (options) ---',
        JSON.stringify(settings.reorder['options'] || []),
        '',
        '--- settings.reorder (extensionsMenu) ---',
        JSON.stringify(settings.reorder['extensionsMenu'] || []),
        '',
        '--- settings.initialSnapshot (extensionsSettings) ---',
        JSON.stringify((settings.initialSnapshot && settings.initialSnapshot['extensionsSettings']) || []),
        '',
        '--- settings.discoveryCache (extensionsSettings) ---',
        JSON.stringify((settings.discoveryCache && settings.discoveryCache['extensionsSettings']) || []),
        '',
        '--- settings.hiddenSelectors (active keys) ---',
        JSON.stringify(Object.keys(settings.hiddenSelectors || {}).filter(function(k){ return settings.hiddenSelectors[k]; })),
        '',
        '--- other settings ---',
        JSON.stringify({ enabled: settings.enabled, columnMode: settings.columnMode, rescanToast: settings.rescanToast }),
        '',
        '--- localStorage raw ---',
        (function(){ try { return localStorage.getItem('menu_cleaner_settings') || 'EMPTY'; } catch(e) { return 'READ_ERROR: ' + e.message; } })(),
        '',
        '=== 结束 ==='
      ].join('\n');

      // Copy to clipboard
      if (win.navigator && win.navigator.clipboard) {
        try {
          win.navigator.clipboard.writeText(lines).then(function() {
            if (win.toastr) win.toastr.success('诊断日志已复制到剪贴板');
          }).catch(function() { fallback(); });
        } catch(e) { fallback(); }
      } else { fallback(); }
      function fallback() {
        var ta = doc.createElement('textarea');
        ta.value = lines;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        doc.body.appendChild(ta);
        ta.select();
        try { doc.execCommand('copy'); if (win.toastr) win.toastr.success('诊断日志已复制到剪贴板'); } catch(e) { win.alert('请手动复制诊断日志\n\n' + lines); }
        doc.body.removeChild(ta);
      }
    });

    bindReorderDragEvents();
    positionPopup();
  }

  function renderColumnSection(group, items, colIndex, label, flatIndexMap) {
    var h = '<div class="menu-cleaner-reorder-column-section" data-column="' + colIndex + '">';
    h += '<div class="menu-cleaner-reorder-column-label">' + label + ' (' + items.length + ' 项)</div>';
    if (items.length === 0) {
      h += '<div class="menu-cleaner-reorder-empty">没有可见元素</div>';
    } else {
      for (var i = 0; i < items.length; i++) {
        var flatIdx = flatIndexMap ? flatIndexMap[items[i].selector] : i;
        h += buildReorderItemHTML(items[i], group.id, flatIdx, colIndex);
      }
    }
    h += '</div>';
    return h;
  }

  function buildReorderItemHTML(item, groupId, index, colIndex) {
    return '<div class="menu-cleaner-reorder-item" data-selector="' + Runtime.escHtml(item.selector) + '" data-group="' + groupId + '" data-index="' + index + '" data-column="' + colIndex + '">' +
             '<span class="menu-cleaner-drag-handle" title="拖动排序">⋮⋮</span>' +
             '<span title="' + Runtime.escHtml(item.selector) + '">' + Runtime.escHtml(item.label) + '</span>' +
           '</div>';
  }

  // ── Drag events ─────────────────────────────────────────────────
  function bindReorderDragEvents() {
    var draggedItem = null;
    var draggedGroup = null;
    var draggedIndex = -1;
    var touchGhost = null;
    var touchStartX = 0;
    var touchStartY = 0;
    var touchMoved = false;
    var dropTargetColumn = undefined;

    function doReorder(fromIndex, toIndex, groupId) {
      var fromCol = draggedItem ? draggedItem.dataset.column : '-1';
      var toCol = dropTargetColumn;

      if (fromCol !== '-1' && toCol !== undefined && toCol !== '-1' && fromCol !== toCol) {
        // Cross-column move — operate on full reorder[] to preserve hidden items
        var sel = draggedItem.dataset.selector;
        var _vis = getReorderItems(groupId);
        var _targetVis = (toIndex >= 0 && toIndex < _vis.length) ? _vis[toIndex] : null;
        setColumnInCache(sel, groupId, parseInt(toCol));
        var _fullOrd = settings.reorder[groupId] || [];
        var _newOrd = [];
        for (var _ri = 0; _ri < _fullOrd.length; _ri++) {
          if (_fullOrd[_ri] !== sel) _newOrd.push(_fullOrd[_ri]);
        }
        if (_targetVis) {
          var _ia = -1;
          for (var _ri2 = 0; _ri2 < _newOrd.length; _ri2++) {
            if (_newOrd[_ri2] === _targetVis.selector) { _ia = _ri2; break; }
          }
          if (_ia >= 0) { _newOrd.splice(_ia + 1, 0, sel); }
          else { _newOrd.push(sel); }
        } else {
          _newOrd.push(sel);
        }
        settings.reorder[groupId] = _newOrd;
        saveSettings();
        try { console.debug('[MC] doReorder saved (cross-col)', groupId, JSON.stringify(settings.reorder[groupId])); } catch(_) {}
        if (groupId === 'extensionsSettings') {
          applyNativeReorder(groupId);
          if (isPanelOpen()) win.setTimeout(function() { renderExtensionsPanel(); }, 0);
        } else {
          applyNativeReorder(groupId);
        }
        renderReorderView();
        return;
      }

      // Same-column reorder — operate on full reorder[] to preserve hidden items
      var sel = draggedItem.dataset.selector;
      var _v = getReorderItems(groupId);
      if (fromIndex < 0 || fromIndex >= _v.length || toIndex < 0 || toIndex >= _v.length) return;
      var _tgtSel = _v[toIndex].selector;
      var _full = settings.reorder[groupId] || [];
      var _fi = -1, _ti = -1;
      for (var _ix = 0; _ix < _full.length; _ix++) {
        if (_full[_ix] === sel) _fi = _ix;
        if (_full[_ix] === _tgtSel) _ti = _ix;
      }
      if (_fi < 0 || _ti < 0) return;
      var _mv = _full.splice(_fi, 1)[0];
      _full.splice(_ti, 0, _mv);
      settings.reorder[groupId] = _full;
      saveSettings();
      try { console.debug('[MC] doReorder saved (same-col)', groupId, JSON.stringify(settings.reorder[groupId])); } catch(_) {}
      if (isPanelOpen() && groupId === 'extensionsSettings') win.setTimeout(function() { renderExtensionsPanel(); }, 0);
      if (groupId !== 'extensionsSettings') applyNativeReorder(groupId);
      renderReorderView();
    }

    function cleanupDrag() {
      dragActive = false;
      if (draggedItem) draggedItem.classList.remove('dragging');
      var items = doc.querySelectorAll('.menu-cleaner-reorder-item');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('drag-over');
      var dragSections = doc.querySelectorAll('.menu-cleaner-reorder-column-section');
      for (var ds = 0; ds < dragSections.length; ds++) dragSections[ds].classList.remove('drag-over-section');
      if (touchGhost) {
        touchGhost.remove();
        touchGhost = null;
      }
      // Remove any leftover ghost elements (mobile browsers fire both
      // pointerdown + touchstart, creating duplicate ghosts)
      var leftoverGhosts = doc.querySelectorAll('.menu-cleaner-ghost');
      for (var _lg = 0; _lg < leftoverGhosts.length; _lg++) leftoverGhosts[_lg].remove();
      draggedItem = null;
      draggedGroup = null;
      draggedIndex = -1;
      touchMoved = false;
      dropTargetColumn = undefined;
    }

    var reorderItems = doc.querySelectorAll('.menu-cleaner-reorder-item');
    for (var r = 0; r < reorderItems.length; r++) {
      var item = reorderItems[r];

      // ── Desktop pointer drag ─────────────────────────
      item.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) return; // left button only
        e.preventDefault(); // prevent text selection during drag
        dragActive = true;
        draggedItem = this;
        draggedGroup = this.dataset.group;
        draggedIndex = parseInt(this.dataset.index);
        this.classList.add('dragging');
        this.setPointerCapture(e.pointerId);

        touchGhost = this.cloneNode(true);
        touchGhost.className = "menu-cleaner-ghost";
        touchGhost.style.position = "fixed";
        touchGhost.style.zIndex = '100001';
        touchGhost.style.pointerEvents = 'none';
        touchGhost.style.opacity = '0.85';
        touchGhost.style.width = this.offsetWidth + 'px';
        touchGhost.style.left = (e.clientX - this.offsetWidth / 2) + 'px';
        touchGhost.style.top = (e.clientY - 20) + 'px';
        touchGhost.classList.add('dragging');
        doc.body.appendChild(touchGhost);
      });

      item.addEventListener('pointermove', function(e) {
        if (!draggedItem) return;
        if (touchGhost) {
          touchGhost.style.left = (e.clientX - touchGhost.offsetWidth / 2) + 'px';
          touchGhost.style.top = (e.clientY - 20) + 'px';
        }

        if (touchGhost) touchGhost.style.display = 'none';
        var target = doc.elementFromPoint(e.clientX, e.clientY);
        if (touchGhost) touchGhost.style.display = '';

        var targetItem = target ? target.closest('.menu-cleaner-reorder-item') : null;
        var allItems = doc.querySelectorAll('.menu-cleaner-reorder-item');
        for (var ai = 0; ai < allItems.length; ai++) {
          if (allItems[ai] === targetItem && allItems[ai] !== draggedItem && allItems[ai].dataset.group === draggedGroup) {
            allItems[ai].classList.add('drag-over');
          } else {
            allItems[ai].classList.remove('drag-over');
          }
        }
        // Highlight empty column sections
        var allSections = doc.querySelectorAll('.menu-cleaner-reorder-column-section');
        var targetSection = target ? target.closest('.menu-cleaner-reorder-column-section') : null;
        for (var asi = 0; asi < allSections.length; asi++) {
          if (allSections[asi] === targetSection && draggedItem && draggedItem.dataset.column !== allSections[asi].dataset.column) {
            allSections[asi].classList.add('drag-over-section');
          } else {
            allSections[asi].classList.remove('drag-over-section');
          }
        }
      });

      item.addEventListener('pointerup', function(e) {
        if (!draggedItem) return;

        if (touchGhost) touchGhost.style.display = 'none';
        var target = doc.elementFromPoint(e.clientX, e.clientY);
        if (touchGhost) touchGhost.style.display = '';

        var targetItem = target ? target.closest('.menu-cleaner-reorder-item') : null;
        if (targetItem && targetItem !== draggedItem && targetItem.dataset.group === draggedGroup) {
          targetItem.classList.remove('drag-over');
          dropTargetColumn = targetItem.dataset.column;
          doReorder(draggedIndex, parseInt(targetItem.dataset.index), draggedGroup);
        } else {
          // Same-column fallback: elementFromPoint often returns draggedItem itself on narrow layouts.
          // Find the nearest item in the same column by Y position.
          var _col = draggedItem ? draggedItem.dataset.column : null;
          var _allItems = doc.querySelectorAll('.menu-cleaner-reorder-item');
          var _nearest = null, _nearestDist = Infinity;
          for (var _ti = 0; _ti < _allItems.length; _ti++) {
            if (_allItems[_ti] === draggedItem) continue;
            if (_allItems[_ti].dataset.group !== draggedGroup) continue;
            if (_col !== null && _allItems[_ti].dataset.column !== _col) continue;
            var _rc = _allItems[_ti].getBoundingClientRect();
            var _cy = _rc.top + _rc.height / 2;
            var _dist = Math.abs(e.clientY - _cy);
            if (_dist < _nearestDist) { _nearestDist = _dist; _nearest = _allItems[_ti]; }
          }
          if (_nearest && _nearest !== draggedItem) {
            dropTargetColumn = _nearest.dataset.column;
            doReorder(draggedIndex, parseInt(_nearest.dataset.index), draggedGroup);
          } else {
            // Check for cross-column drop into an empty section
            var targetSection = target ? target.closest('.menu-cleaner-reorder-column-section') : null;
            if (targetSection && draggedItem) {
              var targetCol = -1;
              var label = targetSection.querySelector('.menu-cleaner-reorder-column-label');
              if (label) {
                if (label.textContent.indexOf('右栏') !== -1) targetCol = 1;
                else if (label.textContent.indexOf('左栏') !== -1) targetCol = 0;
              }
              if (targetCol >= 0 && draggedItem.dataset.column !== String(targetCol)) {
              var sel = draggedItem.dataset.selector;
              var gid = draggedGroup;
              setColumnInCache(sel, gid, targetCol);
              // Operate on full reorder[] to preserve hidden items
              var _fo = settings.reorder[gid] || [];
              var _no = [];
              for (var _rx = 0; _rx < _fo.length; _rx++) {
                if (_fo[_rx] !== sel) _no.push(_fo[_rx]);
              }
              _no.push(sel);
              settings.reorder[gid] = _no;
              saveSettings();
              try { console.debug('[MC] doReorder saved (empty-section)', gid, JSON.stringify(settings.reorder[gid])); } catch(_) {}
              if (gid === 'extensionsSettings') {
                  applyNativeReorder(gid);
                  if (isPanelOpen()) win.setTimeout(function() { renderExtensionsPanel(); }, 0);
                } else {
                  applyNativeReorder(gid);
                }
                renderReorderView();
            }
          }
        }
      }

        cleanupDrag();
      });

      item.addEventListener('pointercancel', function() { cleanupDrag(); });

      // ── Mobile touch ─────────────────────────────────
      var supportsTouch = 'ontouchstart' in win || (win.navigator && win.navigator.maxTouchPoints > 0);
      if (supportsTouch) {
        item.addEventListener('touchstart', function(e) {
          if (e.touches.length !== 1) return;
          e.preventDefault();
          var touch = e.touches[0];
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
          touchMoved = false;

          draggedItem = this;
          draggedGroup = this.dataset.group;
          draggedIndex = parseInt(this.dataset.index);
          this.classList.add('dragging');

          touchGhost = this.cloneNode(true);
          touchGhost.style.position = 'fixed';
          touchGhost.style.zIndex = '100001';
          touchGhost.style.pointerEvents = 'none';
          touchGhost.style.opacity = '0.85';
          touchGhost.style.width = this.offsetWidth + 'px';
          touchGhost.style.left = (touch.clientX - this.offsetWidth / 2) + 'px';
          touchGhost.style.top = (touch.clientY - 20) + 'px';
          touchGhost.classList.add('dragging');
          doc.body.appendChild(touchGhost);
        });

        item.addEventListener('touchmove', function(e) {
          if (!draggedItem) return;
          e.preventDefault();
          touchMoved = true;
          var touch = e.touches[0];

          if (touchGhost) {
            touchGhost.style.left = (touch.clientX - touchGhost.offsetWidth / 2) + 'px';
            touchGhost.style.top = (touch.clientY - 20) + 'px';
          }

          if (touchGhost) touchGhost.style.display = 'none';
          var target = doc.elementFromPoint(touch.clientX, touch.clientY);
          if (touchGhost) touchGhost.style.display = '';

          var targetItem = target ? target.closest('.menu-cleaner-reorder-item') : null;
          if (!targetItem || targetItem === draggedItem) {
            // Narrow mobile: fallback to nearest item by Y
            var _col = draggedItem ? draggedItem.dataset.column : null;
            var _allItems = doc.querySelectorAll('.menu-cleaner-reorder-item');
            var _nearest = null, _nearestDist = Infinity;
            for (var _ti = 0; _ti < _allItems.length; _ti++) {
              if (_allItems[_ti] === draggedItem) continue;
              if (_allItems[_ti].dataset.group !== draggedGroup) continue;
              if (_col !== null && _allItems[_ti].dataset.column !== _col) continue;
              var _rc = _allItems[_ti].getBoundingClientRect();
              var _cy = _rc.top + _rc.height / 2;
              var _dist = Math.abs(touch.clientY - _cy);
              if (_dist < _nearestDist) { _nearestDist = _dist; _nearest = _allItems[_ti]; }
            }
            targetItem = _nearest;
          }

          var allItems = doc.querySelectorAll('.menu-cleaner-reorder-item');
          for (var ai = 0; ai < allItems.length; ai++) {
            if (allItems[ai] === targetItem && allItems[ai] !== draggedItem && allItems[ai].dataset.group === draggedGroup) {
              allItems[ai].classList.add('drag-over');
            } else {
              allItems[ai].classList.remove('drag-over');
            }
          }
        });

        item.addEventListener('touchend', function(e) {
          if (!draggedItem) return;
          e.preventDefault();

          if (touchMoved) {
            var touch = e.changedTouches[0];
            if (touchGhost) touchGhost.style.display = 'none';
            var target = doc.elementFromPoint(touch.clientX, touch.clientY);
            if (touchGhost) touchGhost.style.display = '';

            var targetItem = target ? target.closest('.menu-cleaner-reorder-item') : null;
            if (targetItem && targetItem !== draggedItem && targetItem.dataset.group === draggedGroup) {
              targetItem.classList.remove('drag-over');
              dropTargetColumn = targetItem.dataset.column;
              doReorder(draggedIndex, parseInt(targetItem.dataset.index), draggedGroup);
            } else {
              // Fallback for narrow mobile: elementFromPoint often returns draggedItem itself.
              // Find the nearest item in the same column by touch Y position.
              var _col = draggedItem ? draggedItem.dataset.column : null;
              var _allItems = doc.querySelectorAll('.menu-cleaner-reorder-item');
              var _nearest = null, _nearestDist = Infinity;
              for (var _ti = 0; _ti < _allItems.length; _ti++) {
                if (_allItems[_ti] === draggedItem) continue;
                if (_allItems[_ti].dataset.group !== draggedGroup) continue;
                if (_col !== null && _allItems[_ti].dataset.column !== _col) continue;
                var _rc = _allItems[_ti].getBoundingClientRect();
                var _cy = _rc.top + _rc.height / 2;
                var _dist = Math.abs(touch.clientY - _cy);
                if (_dist < _nearestDist) { _nearestDist = _dist; _nearest = _allItems[_ti]; }
              }
              if (_nearest && _nearest !== draggedItem) {
                dropTargetColumn = _nearest.dataset.column;
                doReorder(draggedIndex, parseInt(_nearest.dataset.index), draggedGroup);
              }
            }
          }

          cleanupDrag();
        });

        item.addEventListener('touchcancel', function() { cleanupDrag(); });
      }
    }

    // Column-section drop targets for cross-column drag (pointer-based)
    var sections = doc.querySelectorAll('.menu-cleaner-reorder-column-section');
    for (var s = 0; s < sections.length; s++) {
      var section = sections[s];

      section.addEventListener('pointerenter', function() {
        if (draggedItem) this.classList.add('drag-over-section');
      });

      section.addEventListener('pointerleave', function() {
        this.classList.remove('drag-over-section');
      });
    }
  }

  // ── Popup positioning ───────────────────────────────────────────
  function positionPopup() {
    var popup = getPopup();
    if (!popup) return;
    var vh = win.innerHeight;
    var vw = win.innerWidth;
    var margin = 10;

    popup.style.maxHeight = '90vh';
    popup.style.maxWidth = Math.min(560, vw - margin * 2) + 'px';

    popup.style.top = '0';
    popup.style.left = '0';
    popup.style.transform = 'none';

    var popupHeight = popup.offsetHeight;
    var popupWidth = popup.offsetWidth;

    var top = Math.max(margin, (vh - popupHeight) / 2.5);
    var left = Math.max(margin, (vw - popupWidth) / 2);

    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
  }

  // ── Build popup content ─────────────────────────────────────────
  function refreshPopup() {
    if (activeTab === 'reorder') {
      renderReorderView();
      return;
    }
    renderHideView();
  }

  
  function buildHideItemHTML(item, isHidden, isDiscovered) {
    var cls = 'menu-cleaner-item' + (isDiscovered ? ' menu-cleaner-item-discovered' : '');
    return '<div class="' + cls + '" data-selector="' + Runtime.escHtml(item.selector) + '">' +
      '<span title="' + Runtime.escHtml(item.selector) + '">' + Runtime.escHtml(item.label) + '</span>' +
      '<label class="menu-cleaner-toggle">' +
      '<input type="checkbox" class="menu-cleaner-checkbox" data-selector="' + Runtime.escHtml(item.selector) + '"' + (isHidden ? '' : ' checked') + '>' +
      '<span class="menu-cleaner-slider"></span>' +
      '</label>' +
      '</div>';
  }
function renderHideView() {
    var body = getPopupBody();
    if (!body) return;

    // Save expanded category state before rebuilding
    var expandedGroups = {};
    var existingBodies = doc.querySelectorAll('.menu-cleaner-category-body');
    for (var eb = 0; eb < existingBodies.length; eb++) {
      if (!existingBodies[eb].classList.contains('collapsed')) {
        expandedGroups[existingBodies[eb].dataset.group] = true;
      }
    }

    var html = '';

    for (var g = 0; g < PANEL_GROUPS.length; g++) {
      var group = PANEL_GROUPS[g];
      var hcSelectors = new Set();
      for (var hi = 0; hi < group.items.length; hi++) hcSelectors.add(group.items[hi].selector);
      var cached = (settings.discoveryCache[group.id] || []).filter(function(c) { return !hcSelectors.has(c.selector) && EXCLUDED_LABELS.indexOf(c.label) === -1; });
      var totalCount = group.items.length + cached.length;

      html += '<div class="menu-cleaner-category">';
      html += '<div class="menu-cleaner-category-header" data-group="' + Runtime.escHtml(group.id) + '">' +
                '<span class="menu-cleaner-category-arrow">▶</span>' +
                '<strong>' + Runtime.escHtml(group.name) + '</strong>' +
                '<span class="menu-cleaner-category-count">' + totalCount + ' 项</span>' +
              '</div>';
      html += '<div class="menu-cleaner-category-body collapsed" data-group="' + Runtime.escHtml(group.id) + '">';

      for (var i = 0; i < group.items.length; i++) {
        var item = group.items[i];
        var isHidden = settings.hiddenSelectors[item.selector] === true;
        html += buildHideItemHTML(item, isHidden, false);
      }

      if (cached.length > 0) {
        html += '<div class="menu-cleaner-separator">————由插件引入————</div>';
        for (var ci = 0; ci < cached.length; ci++) {
          var citem = cached[ci];
          var cHidden = settings.hiddenSelectors[citem.selector] === true;
          html += buildHideItemHTML(citem, cHidden, true);
        }
      }

      html += '</div></div>';
    }

    body.innerHTML = html;
    // Restore expanded category state
    for (var eg in expandedGroups) {
      var catBody = doc.querySelector('.menu-cleaner-category-body[data-group="' + eg + '"]');
      if (catBody) {
        catBody.classList.remove('collapsed');
        var catArrow = catBody.parentElement.querySelector('.menu-cleaner-category-arrow');
        if (catArrow) catArrow.textContent = '▼';
      }
    }
    bindPopupEvents();
    positionPopup();
  }

  function bindPopupEvents() {
    var headers = doc.querySelectorAll('.menu-cleaner-category-header');
    for (var h = 0; h < headers.length; h++) {
      headers[h].addEventListener('click', function() {
        var groupId = this.dataset.group;
        var body = doc.querySelector('.menu-cleaner-category-body[data-group="' + groupId + '"]');
        var arrow = this.querySelector('.menu-cleaner-category-arrow');
        if (body) {
          body.classList.toggle('collapsed');
          if (arrow) arrow.textContent = body.classList.contains('collapsed') ? '▶' : '▼';
          positionPopup();
        }
      });
    }

    var cbs = doc.querySelectorAll('.menu-cleaner-checkbox');
    for (var c = 0; c < cbs.length; c++) {
      cbs[c].addEventListener('change', function(e) {
        var selector = e.target.dataset.selector;
        if (!selector) return;
        settings.hiddenSelectors[selector] = !e.target.checked;
        saveSettings();
        applyHides();
        applyNativeReorder('extensionsSettings');
      });
    }
  }


  // ── Reset ───────────────────────────────────────────────────────
  function resetAllReorders() {
    var snap = settings.initialSnapshot;
    if (!snap) {
      captureInitialSnapshot();
    }

    for (var g = 0; g < PANEL_GROUPS.length; g++) {
      var group = PANEL_GROUPS[g];
      if (REORDER_GROUP_IDS.indexOf(group.id) === -1) continue;

      if (settings.initialSnapshot && settings.initialSnapshot[group.id]) {
        var snapEntries = settings.initialSnapshot[group.id];
        settings.reorder[group.id] = snapEntries.map(function(s) { return s.selector; });

        var existingCache = settings.discoveryCache[group.id] || [];
        for (var s = 0; s < snapEntries.length; s++) {
          if (snapEntries[s].column !== undefined) {
            var existing = null;
            for (var e = 0; e < existingCache.length; e++) {
              if (existingCache[e].selector === snapEntries[s].selector) { existing = existingCache[e]; break; }
            }
            if (existing) {
              existing.column = snapEntries[s].column;
            } else {
              existingCache.push({ selector: snapEntries[s].selector, label: snapEntries[s].label, column: snapEntries[s].column });
            }
          }
        }
        settings.discoveryCache[group.id] = existingCache;
      } else {
        var defaultOrder = group.items.map(function(i) { return i.selector; });
        var cached = settings.discoveryCache[group.id] || [];
        for (var c = 0; c < cached.length; c++) defaultOrder.push(cached[c].selector);
        settings.reorder[group.id] = defaultOrder;
      }
    }

    saveSettings();

    activeTab = 'reorder';
    var tabs = doc.querySelectorAll('.menu-cleaner-tab');
    for (var t = 0; t < tabs.length; t++) {
      if (tabs[t].dataset.tab === 'reorder') {
        tabs[t].classList.add('active');
      } else {
        tabs[t].classList.remove('active');
      }
    }
    renderReorderView();

    applyNativeReorder('extensionsSettings');
  }

  // ── Rescan ───────────────────────────────────────────────────────
  function doRescan() {
    if (rescanTimer) { clearTimeout(rescanTimer); rescanTimer = null; }

    suppressObserver = true;
    var changed = refreshDiscoveryCache('extensionsSettings,options,extensionsMenu');
    if (changed) {
      applyNativeReorder('extensionsSettings');
      if (!dragActive) refreshPopup();
    }
    win.setTimeout(function() { suppressObserver = false; }, 50);

    if (settings.rescanToast) {
      var count = 0;
      var dcKeys = Object.keys(settings.discoveryCache);
      for (var dk = 0; dk < dcKeys.length; dk++) {
        count += settings.discoveryCache[dcKeys[dk]].length;
      }
      if (win.toastr) win.toastr.info('已重新扫描，发现 ' + count + ' 个扩展元素');
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────
  function setupKeyboard() {
    if (win.__mcKeyboardBound) return;
    win.__mcKeyboardBound = true;
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var popup = getPopup();
        if (popup && popup.style.display !== 'none') {
          closePopup();
          return;
        }
        if (extPanelVisible) {
          var _panel = getExtPanel();
          if (_panel) {
            returnElementsToNative();
            _panel.style.display = 'none';
            _panel.setAttribute('aria-hidden', 'true');
          }
          extPanelVisible = false;
        }
      }
    });

    win.addEventListener('resize', function () {
      var popup = getPopup();
      if (popup && popup.style.display !== 'none') {
        positionPopup();
      }
      if (extPanelVisible) {
        syncPanelTheme();
        positionExtensionsPanel();
      }
    });
  }

  // ── Slash commands ────────────────────────────────────────────
  function registerSlashCmd() {
    if (win.__mcSlashRegistered) return;
    win.__mcSlashRegistered = true;
    try {
      var script = doc.createElement('script');
      script.type = 'module';
      script.textContent =
        "import { registerSlashCommand } from '/scripts/slash-commands.js';\n" +
        // /menucleaner — open the panel
        "registerSlashCommand('menucleaner', function () {\n" +
        "  var popup = document.getElementById('menu-cleaner-popup');\n" +
        "  var backdrop = document.getElementById('menu-cleaner-backdrop');\n" +
        "  if (popup && backdrop) {\n" +
        "    backdrop.style.display = 'block';\n" +
        "    popup.style.display = 'flex';\n" +
        "  } else {\n" +
        "    var btn = document.getElementById('menu-cleaner-btn');\n" +
        "    if (btn && btn.offsetParent) { btn.click(); return ''; }\n" +
        "    var settingsBtn = document.getElementById('menu-cleaner-open-popup');\n" +
        "    if (settingsBtn) { settingsBtn.click(); }\n" +
        "  }\n" +
        "  return '';\n" +
        "}, [], '打开酒馆菜单管理器操作面板');\n" +
        // /menucleanerdisable — disable the extension
        "registerSlashCommand('menucleanerdisable', function () {\n" +
        "  try {\n" +
        "    if (window.__mcDisable) { window.__mcDisable(); }\n" +
        "    else { console.error('[MenuCleaner] __mcDisable not available'); }\n" +
        "    // Remove injected style elements\n" +
        "    var ids = ['menu-cleaner-styles', 'menu-cleaner-hides'];\n" +
        "    ids.forEach(function(id) { var el = document.getElementById(id); if (el) el.remove(); });\n" +
        "    // Hide our panel\n" +
        "    var panel = document.getElementById('menu-cleaner-ext-panel');\n" +
        "    if (panel) panel.style.display = 'none';\n" +
        "    var backdrop = document.getElementById('menu-cleaner-backdrop');\n" +
        "    if (backdrop) backdrop.style.display = 'none';\n" +
        "    // Restore native block visibility\n" +
        "    var nativeBlock = document.getElementById('rm_extensions_block');\n" +
        "    if (nativeBlock) nativeBlock.style.display = '';\n" +
        "    alert('酒馆菜单管理器已禁用，请刷新页面。');\n" +
        "  } catch(e) { alert('禁用失败: ' + e.message); }\n" +
        "  return '';\n" +
        "}, [], '禁用酒馆菜单管理器');\n";
      doc.head.appendChild(script);
      console.debug('[MenuCleaner] 已注册 /menucleaner 和 /menucleanerdisable 命令');
    } catch (e) {
      console.debug('[MenuCleaner] 斜杠命令注册失败', e);
    }
  }

  // ── Auto-rescan ──────────────────────────────────────────────
  function scheduleAutoRescan() {
    if (rescanTimer) clearTimeout(rescanTimer);
    rescanTimer = setTimeout(function () {
      doRescan();
      rescanTimer = null;
    }, 800);
  }

  function setupAutoRescan() {
    // Disconnect old observers before creating new ones (hot reload safety)
    if (win.__mcObservers) {
      for (var _do = 0; _do < win.__mcObservers.length; _do++) {
        try { win.__mcObservers[_do].disconnect(); } catch(_) {}
      }
    }
    // MutationObserver: watch for new elements
    var mcObservers = [];
    win.__mcObservers = mcObservers; // exposed for disconnect on disable
    // Flag: set when reorder has been applied after init — used by observer for passive retry
    win.__mcReorderApplied = false;
    var observeContainers = function () {
      var targets = ['#extensions_settings', '#extensions_settings2'];
      for (var t = 0; t < targets.length; t++) {
        (function(sel) {
          var el = doc.querySelector(sel);
          if (!el) return;
          var observer = new win.MutationObserver(function (mutations) {
            if (suppressObserver) return;
            for (var m = 0; m < mutations.length; m++) {
              if (mutations[m].addedNodes.length > 0) {
                // If reorder hasn't been applied yet, apply it eagerly
                if (!win.__mcReorderApplied) {
                  try { if (settings.enabled) { applyNativeReorder('extensionsSettings'); win.__mcReorderApplied = true; console.debug('[MC] observer: passive reorder applied'); } } catch(_) {}
                }
                scheduleAutoRescan();
                return;
              }
            }
          });
          observer.observe(el, { childList: true, subtree: false });
          mcObservers.push(observer);
        })(targets[t]);
      }
    };

    var retries = 0;
    var tryObserve = function () {
      if (doc.querySelector('#extensions_settings')) {
        observeContainers();
      } else if (retries < 20) {
        retries++;
        setTimeout(tryObserve, 500);
      }
    };
    setTimeout(tryObserve, 1000);
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    try { console.debug('[MC] init start'); } catch(_) {}
    loadSettings();
    applyTheme(settings.theme);
    injectStyle();
    try { console.debug('[MC] init step1 captureInitialSnapshot'); } catch(_) {}

    // Step 1: Capture initial snapshot (only on first run)
    captureInitialSnapshot();
    try { console.debug('[MC] init step2 injectSettingsEntry'); } catch(_) {}

    // Step 2: Inject UI elements (must be before cache refresh, otherwise our own
    // injected elements like #menu-cleaner-settings get pruned from the cache)
    injectSettingsEntry();
    try { console.debug('[MC] init step3 refreshDiscoveryCache'); } catch(_) {}

    // Step 3: Scan to build discovery cache
    refreshDiscoveryCache();
    try { console.debug('[MC] init step4 applyHides+applyNativeReorder'); } catch(_) {}

    // Step 4: Create our extensions panel and intercept the native button
    if (settings.enabled) {
      applyHides();
      applyNativeReorder('extensionsSettings');
    }
    try { console.debug('[MC] init step5 setupKeyboard/registerSlashCmd/setupAutoRescan'); } catch(_) {}

    // Step 5: Setup other systems
    setupKeyboard();
    registerSlashCmd();
    setupAutoRescan();
    try { console.debug('[MC] init done, scheduling delayed rescan in 3s'); } catch(_) {}

    // Delayed re-scan catches extensions that inject buttons after init
    setTimeout(function () {
      try { console.debug('[MC] delayed rescan starting'); } catch(_) {}
      refreshDiscoveryCache();
      if (settings.enabled) applyNativeReorder('extensionsSettings');
      try { console.debug('[MC] delayed rescan done, reorder:', JSON.stringify(settings.reorder['extensionsSettings'])); } catch(_) {}
      // Clean up stale discoveryCache entries not in DOM
      cleanupDiscoveryCache();
      try { console.debug('[MC] delayed rescan cleanup done'); } catch(_) {}
    }, 3000);
  
  Runtime.openMenuCleanerPopup = openPopup;
  Runtime.isMenuCleanerPopupOpen = function() { var p = doc.getElementById('menu-cleaner-popup'); return p && p.style.display !== 'none'; };
  try { console.debug('[MC] init complete'); } catch(_) {}
}

  // Start when DOM is ready (parent page's DOM)
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  try { win.__mcDisable = function() { var s = Store.mc.getAll() || {}; s.enabled = false; Store.mc.setAll(s); }; } catch(e) { try { console.debug('[MC] __mcDisable setup failed', e); } catch(_) {} }
})();
