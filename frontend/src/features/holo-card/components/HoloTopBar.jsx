// src/features/holo-card/components/HoloTopBar.jsx
import React from 'react';
import { Layers, HelpCircle, Info, Download, Sparkles, Github } from 'lucide-react';

export default function HoloTopBar({
  isAuthenticated = true,
  onToggleUsageGuide,
  onDownload
}) {
  return (
    <div className="h-13 px-4 sm:px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/85 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold flex items-center gap-1.5 leading-none">
              3D 全息流光卡牌工坊
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                HoloCard Studio
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* 顶部操作与连接状态 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleUsageGuide}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:border-cyan-500/40 text-[11px] text-[var(--text-secondary)] hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3 h-3 text-cyan-400" />
          <span className="hidden xs:inline">功能说明</span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>WebGL / 3D 渲染引擎 (就绪)</span>
        </div>

        <button
          onClick={onDownload}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-cyan-500/50 text-[11px] font-medium transition-all cursor-pointer"
          title="保存卡片高清图片"
        >
          <Download className="w-3 h-3 text-cyan-400" />
          <span>保存卡片</span>
        </button>
      </div>
    </div>
  );
}
