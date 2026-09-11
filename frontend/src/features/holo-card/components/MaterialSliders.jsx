// src/features/holo-card/components/MaterialSliders.jsx
import React from 'react';
import { Sliders, SunMedium, ChevronDown, ChevronUp } from 'lucide-react';

const BACKLIGHT_COLORS = [
  { name: '科技青', color: '#00f2fe' },
  { name: '皎月银', color: '#e2e8f0' },
  { name: '暖阳金', color: '#ffd700' },
  { name: '极光紫', color: '#c084fc' }
];

export default function MaterialSliders({
  showSliders,
  depthBacklight,
  backlightColor,
  holoIntensity,
  sparkleIntensity,
  specularFoil,
  onToggleSliders,
  onDepthBacklightChange,
  onBacklightColorChange,
  onHoloIntensityChange,
  onSparkleIntensityChange,
  onSpecularFoilChange
}) {
  return (
    <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden">
      <button
        onClick={onToggleSliders}
        className="w-full px-3 py-2 flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
      >
        <span className="font-bold flex items-center gap-1.5">
          <Sliders className="w-3 h-3 text-cyan-400" />
          全息流光与景深参数微调
        </span>
        {showSliders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showSliders && (
        <div className="p-3 pt-0 border-t border-[var(--border-subtle)] space-y-2.5 text-xs">
          {/* 3D 景深立体空间环境背光 */}
          <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-cyan-500/25 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-cyan-400 flex items-center gap-1">
                <SunMedium className="w-3 h-3 text-cyan-400" />
                3D 景深立体环境背光
              </span>
              <span className="font-mono text-cyan-400">{Math.round(depthBacklight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              value={depthBacklight}
              onChange={e => onDepthBacklightChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex items-center justify-between text-[10px] pt-1">
              <span className="text-[var(--text-muted)]">背光氛围色彩</span>
              <div className="flex gap-1.5">
                {BACKLIGHT_COLORS.map(bgc => (
                  <button
                    key={bgc.name}
                    onClick={() => onBacklightColorChange(bgc.color)}
                    className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                      backlightColor === bgc.color ? 'scale-125 border-white shadow-sm ring-1 ring-cyan-400' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: bgc.color }}
                    title={bgc.name}
                  />
                ))}
              </div>
            </div>
            <p className="text-[9px] text-[var(--text-muted)] leading-tight">
              💡 投射轮廓反差环境光，使深色/暗调背景下的浮雕边缘层次格外鲜明。
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-0.5 text-[var(--text-muted)] text-[11px]">
              <span>全息流光强度</span>
              <span className="font-mono text-cyan-400">{holoIntensity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.05"
              value={holoIntensity}
              onChange={e => onHoloIntensityChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between mb-0.5 text-[var(--text-muted)] text-[11px]">
              <span>碎钻微粒光斑</span>
              <span className="font-mono text-cyan-400">{sparkleIntensity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.05"
              value={sparkleIntensity}
              onChange={e => onSparkleIntensityChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between mb-0.5 text-[var(--text-muted)] text-[11px]">
              <span>烫金高光反光</span>
              <span className="font-mono text-cyan-400">{specularFoil.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.05"
              value={specularFoil}
              onChange={e => onSpecularFoilChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}
