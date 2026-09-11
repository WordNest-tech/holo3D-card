// src/features/holo-card/components/CardActionButtons.jsx
import React from 'react';
import { RotateCcw, Play, Pause, Shield } from 'lucide-react';

export default function CardActionButtons({
  isFlipped,
  isAutoRotate,
  showFrame,
  onFlipCard,
  onToggleAutoRotate,
  onToggleShowFrame
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onFlipCard}
        className="flex-1 py-1.5 px-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-cyan-500/40 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
        <span>{isFlipped ? "翻回正面" : "翻转卡背"}</span>
      </button>

      <button
        onClick={onToggleAutoRotate}
        className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
          isAutoRotate
            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
            : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)]"
        }`}
      >
        {isAutoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        <span>{isAutoRotate ? "暂停" : "自动旋转"}</span>
      </button>

      <button
        onClick={onToggleShowFrame}
        className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
          showFrame
            ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
            : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white"
        }`}
        title="切换金属外框"
      >
        <Shield className="w-3.5 h-3.5" />
        <span>{showFrame ? "外框: 开" : "外框: 关"}</span>
      </button>
    </div>
  );
}
