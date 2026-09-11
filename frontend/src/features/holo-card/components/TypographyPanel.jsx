// src/features/holo-card/components/TypographyPanel.jsx
import React from 'react';
import { Type, Check } from 'lucide-react';

export default function TypographyPanel({
  hasText,
  textCount,
  enableTextRelief,
  enableTextFloat,
  textDepth,
  textFoilStyle,
  onToggleTextRelief,
  onToggleTextFloat,
  onTextDepthChange,
  onTextFoilStyleChange
}) {
  return (
    <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-amber-500/30 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <Type className="w-3.5 h-3.5 text-amber-400" />
          <span>画面字体识别与 3D 立体系统</span>
        </div>
        {hasText ? (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Check className="w-2.5 h-2.5" /> 已定位 {textCount} 处字体
          </span>
        ) : (
          <span className="text-[9px] text-[var(--text-muted)] font-mono">
            待提取
          </span>
        )}
      </div>

      {hasText ? (
        <div className="space-y-2 text-xs">
          {/* 1. 字体浮雕凸起开关 */}
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">① 字体 3D 浮雕凹凸 (隆起印花)</span>
            </div>
            <button
              onClick={onToggleTextRelief}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                enableTextRelief
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold"
                  : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
              }`}
            >
              {enableTextRelief ? "浮雕开启" : "浮雕关闭"}
            </button>
          </div>

          {/* 2. 独立 3D 悬浮字体层开关与高度 */}
          <div className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-secondary)]">② 独立 3D 悬浮字体层 (视差浮空)</span>
              <button
                onClick={onToggleTextFloat}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  enableTextFloat
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold"
                    : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                }`}
              >
                {enableTextFloat ? "悬浮开启" : "悬浮关闭"}
              </button>
            </div>

            {enableTextFloat && (
              <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[var(--text-muted)]">字体悬浮高度 Z 轴</span>
                  <span className="font-mono text-amber-400 font-bold">+{textDepth.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.50"
                  step="0.01"
                  value={textDepth}
                  onChange={e => onTextDepthChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            )}
          </div>

          {/* 3. 字体专属典藏全息流光 */}
          <div className="space-y-1">
            <span className="text-[10px] text-[var(--text-muted)] block">③ 字体专属典藏反光质感</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { key: 'original', label: '原画墨迹' },
                { key: 'gold', label: '奢华烫金' },
                { key: 'rainbow', label: '幻彩全息' },
                { key: 'silver', label: '冷冽烫银' }
              ].map(st => (
                <button
                  key={st.key}
                  onClick={() => onTextFoilStyleChange(st.key)}
                  className={`py-1 px-1 rounded text-[9px] font-medium border text-center transition-all cursor-pointer ${
                    textFoilStyle === st.key
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-[var(--bg-card)] border-transparent text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          点击上方「生成 3D 物理景深与字体立体」按钮，系统将自动识别画面中的书法/日文/英文/印章，并解锁实体凹凸浮雕与独立悬浮烫金。
        </p>
      )}
    </div>
  );
}
