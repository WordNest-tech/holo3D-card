// src/features/holo-card/components/FrameCustomizer.jsx
import React from 'react';
import { Palette, Sliders, ChevronDown, ChevronUp } from 'lucide-react';

const FRAME_STYLES = [
  { key: 'classic', label: '经典双金属框' },
  { key: 'hud', label: '先锋 HUD 科技框' },
  { key: 'minimal', label: '纤细极简微框' },
  { key: 'border_only', label: '纯净边框(无字)' }
];

const METALLIC_COLORS = [
  { name: '典藏金', color: '#ffd700', accent: '#ffcf40' },
  { name: '冷冽银', color: '#e2e8f0', accent: '#94a3b8' },
  { name: '赛博青', color: '#00f2fe', accent: '#38bdf8' },
  { name: '极夜紫', color: '#c084fc', accent: '#e879f9' },
  { name: '炽烈红', color: '#f43f5e', accent: '#fb7185' },
  { name: '极简白', color: '#ffffff', accent: '#e2e8f0' }
];

const DEPTH_QUICK_BUTTONS = [
  { l: '深嵌', v: 0.00 },
  { l: '微嵌', v: 0.06 },
  { l: '齐平', v: 0.16 },
  { l: '外悬', v: 0.36 }
];

export const DEFAULT_FRAME_CONFIG = {
  title: 'HOLOCARD',
  badge: 'HOLO // ARCHIVE',
  edition: 'NO. 001 // HC-2026',
  subtitle: '3D HOLOGRAPHIC COLLECTOR CARD',
  stats: 'POWER ∞ // CREATIVE 100%'
};

export const DEFAULT_FRAME_DEFAULTS = DEFAULT_FRAME_CONFIG;

export default function FrameCustomizer({
  showFrame,
  frameDepth,
  frameConfig,
  showFrameCustomizer,
  onToggleFrameCustomizer,
  onToggleShowFrame,
  onFrameDepthChange,
  onFrameConfigChange
}) {
  return (
    <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden">
      <button
        onClick={onToggleFrameCustomizer}
        className="w-full px-3 py-2 flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
      >
        <span className="font-bold flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          外框与铭牌个性化定制
          {showFrame && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono">
              已启用
            </span>
          )}
        </span>
        {showFrameCustomizer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showFrameCustomizer && (
        <div className="p-3 pt-0 border-t border-[var(--border-subtle)] space-y-3 text-xs">
          {/* 独立外框景深调节滑块 */}
          <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-amber-500/20 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--text-secondary)] font-bold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-amber-400" />
                外框前后景深 (支持嵌入雕塑 / 破框)
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {frameDepth <= 0.06 ? `嵌入 ${frameDepth.toFixed(2)}` : `+${frameDepth.toFixed(2)}`}
              </span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.40"
              step="0.01"
              value={frameDepth}
              onChange={e => {
                onFrameDepthChange(parseFloat(e.target.value));
                if (!showFrame) onToggleShowFrame(true);
              }}
              className="w-full h-1 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {DEPTH_QUICK_BUTTONS.map(btn => (
                <button
                  key={btn.l}
                  onClick={() => {
                    onFrameDepthChange(btn.v);
                    if (!showFrame) onToggleShowFrame(true);
                  }}
                  className={`py-0.5 rounded text-[9px] font-mono border transition-all cursor-pointer ${
                    Math.abs(frameDepth - btn.v) < 0.01
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-[var(--bg-card)] border-transparent text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  {btn.l} {btn.v.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-[var(--text-muted)] text-[10px]">
              <span>边框版式风格</span>
              <button
                onClick={() => onToggleShowFrame(!showFrame)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  showFrame
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                }`}
              >
                {showFrame ? "外框已显示" : "外框已隐藏 (点击显示)"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {FRAME_STYLES.map(st => (
                <button
                  key={st.key}
                  onClick={() => {
                    onFrameConfigChange({ style: st.key });
                    if (!showFrame) onToggleShowFrame(true);
                  }}
                  className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                    frameConfig.style === st.key
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-[var(--bg-card)] border-transparent text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-[var(--text-muted)] block mb-1">外框金属色彩</span>
            <div className="flex gap-1.5 flex-wrap">
              {METALLIC_COLORS.map(th => (
                <button
                  key={th.name}
                  onClick={() => {
                    onFrameConfigChange({ color: th.color, accentColor: th.accent });
                    if (!showFrame) onToggleShowFrame(true);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer ${
                    frameConfig.color === th.color
                      ? 'border-amber-400 font-bold bg-amber-500/15'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: th.color }} />
                  <span>{th.name}</span>
                </button>
              ))}
            </div>
          </div>

          {frameConfig.style !== 'border_only' && (
            <div className="space-y-2.5 pt-1 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] font-bold">
                  外框文字定制 (全部可自由填充)
                </span>
                <button
                  type="button"
                  onClick={() => onFrameConfigChange(DEFAULT_FRAME_CONFIG)}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer font-medium"
                  title="恢复为全息卡牌默认文字"
                >
                  一键填入默认典藏信息
                </button>
              </div>

              {/* 1. 卡面主标题 (核心铭牌) */}
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">
                  卡面主标题 / 铭牌 (默认 HOLOCARD)
                </label>
                <input
                  type="text"
                  value={frameConfig.title ?? ''}
                  onChange={e => onFrameConfigChange({ title: e.target.value })}
                  placeholder="例如: HOLOCARD"
                  className="w-full px-2 py-1 text-[11px] rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:border-amber-400 outline-none font-bold text-white tracking-wide"
                />
              </div>

              {/* 2. 左上角标与右上编号 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">左上徽标/等级</label>
                  <input
                    type="text"
                    value={frameConfig.badge ?? ''}
                    onChange={e => onFrameConfigChange({ badge: e.target.value })}
                    placeholder="例如: HOLO // ARCHIVE"
                    className="w-full px-2 py-1 text-[11px] rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:border-amber-400 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">右上编号/限定标识</label>
                  <input
                    type="text"
                    value={frameConfig.edition ?? ''}
                    onChange={e => onFrameConfigChange({ edition: e.target.value })}
                    placeholder="例如: NO. 001 // WN-2026"
                    className="w-full px-2 py-1 text-[11px] rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:border-amber-400 outline-none font-mono"
                  />
                </div>
              </div>

              {/* 3. 英文副标题 */}
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">副标题 / 系列说明</label>
                <input
                  type="text"
                  value={frameConfig.subtitle ?? ''}
                  onChange={e => onFrameConfigChange({ subtitle: e.target.value })}
                  placeholder="例如: AI HOLOGRAPHIC COLLECTOR CARD"
                  className="w-full px-2 py-1 text-[11px] rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:border-amber-400 outline-none font-mono"
                />
              </div>

              {/* 4. 底部属性 / 数值指标 */}
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">底部属性 / 数值指标</label>
                <input
                  type="text"
                  value={frameConfig.stats ?? ''}
                  onChange={e => onFrameConfigChange({ stats: e.target.value })}
                  placeholder="例如: VOCAB ∞ // CREATIVE 100%"
                  className="w-full px-2 py-1 text-[11px] rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:border-amber-400 outline-none font-mono"
                />
              </div>

              {/* 5. 底框不透明度 */}
              <div>
                <div className="flex justify-between mb-0.5 text-[var(--text-muted)] text-[10px]">
                  <span>文字底框不透明度（0%全透无遮挡原画）</span>
                  <span className="font-mono text-amber-400">{Math.round((frameConfig.bgOpacity ?? 0.35) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.75"
                  step="0.05"
                  value={frameConfig.bgOpacity ?? 0.35}
                  onChange={e => onFrameConfigChange({ bgOpacity: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
