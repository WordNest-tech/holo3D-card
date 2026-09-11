// src/features/holo-card/components/LayerItem.jsx
// 单图层行组件 — 名称、显隐、锁定、深度滑块、材质选择、分割按钮
import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, GripVertical, Scissors, ChevronDown, ChevronUp } from 'lucide-react';

const MATERIAL_OPTIONS = [
  { key: 'normal', label: '原色' },
  { key: 'gold_foil', label: '烫金' },
  { key: 'rainbow_holo', label: '全息' },
  { key: 'silver_chrome', label: '烫银' },
  { key: 'neon_glow', label: '霓虹' }
];

export default function LayerItem({
  layer,
  isActive,
  isExpanded,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onUpdate,
  onDuplicate,
  onRemove,
  onSegment,
  // 拖拽相关
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  dragIndex
}) {
  return (
    <div
      className={`rounded-lg border transition-all ${
        isActive
          ? 'border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/20'
          : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-cyan-500/20'
      }`}
      draggable
      onDragStart={(e) => onDragStart?.(e, dragIndex)}
      onDragOver={(e) => onDragOver?.(e, dragIndex)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop?.(e, dragIndex)}
    >
      {/* 图层头部行 */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer"
        onClick={() => onSelect(layer.id)}
      >
        {/* 拖拽手柄 */}
        <GripVertical className="w-3 h-3 text-[var(--text-muted)] shrink-0 cursor-grab active:cursor-grabbing" />

        {/* 缩略图 */}
        {layer.contentUrl && (
          <div className="w-6 h-6 rounded overflow-hidden border border-[var(--border-subtle)] shrink-0 bg-[var(--bg-secondary)]">
            <img
              src={layer.contentUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* 图层名称 */}
        <span className={`flex-1 text-[11px] font-medium truncate ${
          isActive ? 'text-cyan-400' : 'text-[var(--text-primary)]'
        } ${!layer.visible ? 'opacity-40' : ''}`}>
          {layer.name}
        </span>

        {/* 分割标记 */}
        {layer.segmentation && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono shrink-0">
            {layer.segmentation.isForeground ? '前景' : '背景'}
          </span>
        )}

        {/* Z 轴深度标签 */}
        <span className="text-[9px] font-mono text-[var(--text-muted)] shrink-0">
          Z:{layer.depth >= 0 ? '+' : ''}{layer.depth.toFixed(2)}
        </span>

        {/* 显隐切换 */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
          className="p-0.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
          title={layer.visible ? '隐藏' : '显示'}
        >
          {layer.visible
            ? <Eye className="w-3 h-3" />
            : <EyeOff className="w-3 h-3 opacity-40" />
          }
        </button>

        {/* 锁定切换 */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
          className="p-0.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
          title={layer.locked ? '解锁' : '锁定'}
        >
          {layer.locked
            ? <Lock className="w-3 h-3 text-amber-400" />
            : <Unlock className="w-3 h-3 opacity-40" />
          }
        </button>

        {/* 展开/收起详情 */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(layer.id); }}
          className="p-0.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
        >
          {isExpanded
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />
          }
        </button>
      </div>

      {/* 展开详情面板 */}
      {isExpanded && (
        <div className="px-2.5 pb-2 pt-0.5 border-t border-[var(--border-subtle)] space-y-2 text-[10px]">
          {/* Z 轴深度滑块 */}
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[var(--text-muted)]">前后景深 (Z 轴)</span>
              <span className="font-mono text-cyan-400 font-bold">
                {layer.depth >= 0 ? '+' : ''}{layer.depth.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-0.20"
              max="1.00"
              step="0.01"
              value={layer.depth}
              onChange={(e) => onUpdate(layer.id, { depth: parseFloat(e.target.value) })}
              disabled={layer.locked}
              className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[8px] text-[var(--text-muted)] font-mono">
              <span>-0.20 (深嵌)</span>
              <span>+0.15 (中景)</span>
              <span>+1.00 (极致破框)</span>
            </div>
          </div>

          {/* 不透明度 */}
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[var(--text-muted)]">不透明度</span>
              <span className="font-mono text-cyan-400">{Math.round(layer.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={layer.opacity}
              onChange={(e) => onUpdate(layer.id, { opacity: parseFloat(e.target.value) })}
              disabled={layer.locked}
              className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* 材质风格 */}
          <div>
            <span className="text-[var(--text-muted)] block mb-1">材质风格</span>
            <div className="grid grid-cols-5 gap-1">
              {MATERIAL_OPTIONS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => onUpdate(layer.id, { materialStyle: m.key })}
                  disabled={layer.locked}
                  className={`py-0.5 rounded text-[9px] font-medium border transition-all cursor-pointer ${
                    layer.materialStyle === m.key
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                      : 'bg-[var(--bg-secondary)] border-transparent text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 操作按钮行 */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
            {/* 图层分割 */}
            {!layer.segmentation && (
              <button
                onClick={() => onSegment(layer.id)}
                disabled={layer.locked}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[9px] font-medium bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 transition-colors cursor-pointer"
              >
                <Scissors className="w-3 h-3" />
                <span>图层分割</span>
              </button>
            )}

            {/* 复制 */}
            <button
              onClick={() => onDuplicate(layer.id)}
              className="flex items-center gap-1 py-1 px-2 rounded text-[9px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
            >
              <Copy className="w-2.5 h-2.5" />
              <span>复制</span>
            </button>

            {/* 删除 */}
            <button
              onClick={() => onRemove(layer.id)}
              disabled={layer.locked}
              className="flex items-center gap-1 py-1 px-2 rounded text-[9px] bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>删除</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
