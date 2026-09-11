// src/features/holo-card/components/SegmentationSelector.jsx
// 分割算法选择器 — 用户根据图片内容类型选择最适合的 AI 分割模型
import React, { useState } from 'react';
import { User, Layers, Scan, Users, Sparkles, X, Loader2, CheckCircle2 } from 'lucide-react';

const ICON_MAP = {
  User, Layers, Scan, Users
};

const ALGORITHMS = [
  {
    id: 'person',
    name: '人物主体分割',
    description: '适用于人物肖像、角色立绘，自动分离人物与背景',
    icon: 'User',
    tags: ['人物', '肖像', '角色'],
    modelSize: '~4MB',
    speed: '快速',
    recommended: ['人物', '角色', '头像', '自拍']
  },
  {
    id: 'depth',
    name: '通用深度估计',
    description: '适用于任意场景，基于 AI 深度估计分离前景与背景',
    icon: 'Layers',
    tags: ['通用', '建筑', '风景', '道具'],
    modelSize: '~20MB',
    speed: '中等',
    recommended: ['建筑', '风景', '混合场景']
  },
  {
    id: 'salient',
    name: '显著物体检测',
    description: '适用于单一主体（道具、装饰、物品），自动提取画面焦点物体',
    icon: 'Scan',
    tags: ['道具', '装饰', '物品', '单体'],
    modelSize: '~8MB',
    speed: '快速',
    recommended: ['道具', '物品', '装饰', '食物']
  },
  {
    id: 'multi',
    name: '多目标实例分割',
    description: '适用于多个独立物体/角色，分别提取每个实例为独立图层',
    icon: 'Users',
    tags: ['多人', '群像', '多物体'],
    modelSize: '~30MB',
    speed: '较慢',
    recommended: ['多人', '群像', '集合']
  }
];

export default function SegmentationSelector({
  isOpen,
  onClose,
  onSelectAlgorithm,
  isProcessing = false,
  processingAlgorithm = null,
  layerName = ''
}) {
  const [selectedId, setSelectedId] = useState(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedId && onSelectAlgorithm) {
      onSelectAlgorithm(selectedId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-[var(--text-primary)]">
              选择分割算法
            </span>
            {layerName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono">
                {layerName}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 提示文字 */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            请根据图片内容选择最合适的分割模型，系统将自动分离前景与背景并生成独立图层。
          </p>
        </div>

        {/* 算法列表 */}
        <div className="px-4 py-2 space-y-2 max-h-[50vh] overflow-y-auto">
          {ALGORITHMS.map((algo) => {
            const IconComp = ICON_MAP[algo.icon] || Layers;
            const isSelected = selectedId === algo.id;
            const isThisProcessing = isProcessing && processingAlgorithm === algo.id;

            return (
              <button
                key={algo.id}
                onClick={() => !isProcessing && setSelectedId(algo.id)}
                disabled={isProcessing}
                className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-cyan-500/30 hover:bg-cyan-500/5'
                } ${isProcessing && !isThisProcessing ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* 图标 */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-cyan-500/20' : 'bg-[var(--bg-secondary)] group-hover:bg-cyan-500/10'
                  }`}>
                    {isThisProcessing ? (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : (
                      <IconComp className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-[var(--text-muted)]'}`} />
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? 'text-cyan-400' : 'text-[var(--text-primary)]'}`}>
                        {algo.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-[var(--text-muted)]">
                          {algo.modelSize}
                        </span>
                        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                          algo.speed === '快速'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : algo.speed === '中等'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-red-500/15 text-red-400'
                        }`}>
                          {algo.speed}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      {algo.description}
                    </p>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {algo.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-transparent'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 选中标记 */}
                  {isSelected && !isThisProcessing && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 底部按钮 */}
        <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-muted)]">
            {isProcessing ? '正在处理，请稍候...' : '选择算法后点击确认开始分割'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedId || isProcessing}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>分割中...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-3 h-3" />
                  <span>确认分割</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
