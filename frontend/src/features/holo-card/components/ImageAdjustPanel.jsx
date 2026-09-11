// src/features/holo-card/components/ImageAdjustPanel.jsx
// 图像调整与人像美颜面板 — 智能磨皮/透亮美白/气色红润/五官立体/抖音TikTok预设/光影精修
import React, { useState, useCallback } from 'react';
import { 
  SlidersHorizontal, ChevronDown, ChevronUp, RotateCw, 
  FlipHorizontal, FlipVertical, Undo2, Sparkles, Wand2, 
  Palette, SunMedium, Heart, Eye, Check, Smile
} from 'lucide-react';
import { BEAUTY_PRESETS, FILTER_PRESETS, DEFAULT_PARAMS } from '../textures/imageFilters';

const COLOR_SLIDERS = [
  { key: 'brightness',  label: '亮度',     min: -100, max: 100, step: 2 },
  { key: 'contrast',    label: '对比度',   min: -100, max: 100, step: 2 },
  { key: 'saturation',  label: '饱和度',   min: -100, max: 100, step: 2 },
  { key: 'exposure',    label: '曝光',     min: -100, max: 100, step: 2 },
  { key: 'temperature', label: '色温',     min: -100, max: 100, step: 2 },
  { key: 'highlights',  label: '高光',     min: -100, max: 100, step: 2 },
  { key: 'shadows',     label: '阴影',     min: -100, max: 100, step: 2 },
  { key: 'vignette',    label: '暗角',     min: 0,    max: 100, step: 2 },
  { key: 'sharpen',     label: '锐化',     min: 0,    max: 100, step: 2 },
  { key: 'blur',        label: '柔焦',     min: 0,    max: 20,  step: 1 },
  { key: 'hueRotate',   label: '色相',     min: -180, max: 180, step: 5 }
];

const BEAUTY_SLIDERS = [
  { 
    key: 'beautySmooth',  
    label: '智能磨皮', 
    sub: '抚平瑕疵，保留毛孔原生纹理',
    icon: Sparkles, 
    color: 'text-pink-400',
    accent: 'accent-pink-400'
  },
  { 
    key: 'beautyWhiten',  
    label: '透亮美白', 
    sub: '通透冷白皮，消除暗沉黄气',
    icon: SunMedium, 
    color: 'text-cyan-300',
    accent: 'accent-cyan-400'
  },
  { 
    key: 'beautyRosy',    
    label: '气色红润', 
    sub: '少女感蜜桃红润与血色腮红',
    icon: Heart, 
    color: 'text-rose-400',
    accent: 'accent-rose-400'
  },
  { 
    key: 'beautyClarity', 
    label: '五官立体', 
    sub: '眼神光高光、睫毛与唇线深邃分明',
    icon: Eye, 
    color: 'text-amber-300',
    accent: 'accent-amber-400'
  }
];

export default function ImageAdjustPanel({
  hasImage,
  filterParams,
  onFilterChange,
  onResetFilters
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('beauty'); // 'beauty' | 'color' | 'filter'
  const [activeBeautyPreset, setActiveBeautyPreset] = useState(null);
  const [activeFilterPreset, setActiveFilterPreset] = useState('none');

  // 单项滑块变更
  const handleSliderChange = useCallback((key, value) => {
    setActiveBeautyPreset(null);
    setActiveFilterPreset('none');
    onFilterChange({ [key]: value });
  }, [onFilterChange]);

  // 人像美颜一键预设应用 (TikTok / 抖音风格)
  const handleBeautyPresetApply = useCallback((preset) => {
    setActiveBeautyPreset(preset.key);
    onFilterChange({
      beautySmooth: preset.params.beautySmooth ?? 0,
      beautyWhiten: preset.params.beautyWhiten ?? 0,
      beautyRosy: preset.params.beautyRosy ?? 0,
      beautyClarity: preset.params.beautyClarity ?? 0,
      ...(preset.params.contrast ? { contrast: preset.params.contrast } : {})
    });
  }, [onFilterChange]);

  // 重置美颜参数
  const handleResetBeauty = useCallback(() => {
    setActiveBeautyPreset(null);
    onFilterChange({
      beautySmooth: 0,
      beautyWhiten: 0,
      beautyRosy: 0,
      beautyClarity: 0
    });
  }, [onFilterChange]);

  // 风格滤镜预设应用
  const handleFilterPresetApply = useCallback((preset) => {
    setActiveFilterPreset(preset.key);
    if (preset.key === 'none') {
      onResetFilters();
    } else {
      onFilterChange({ ...DEFAULT_PARAMS, ...preset.params });
    }
  }, [onFilterChange, onResetFilters]);

  // 翻转与旋转
  const handleFlipH = useCallback(() => {
    onFilterChange({ flipH: !filterParams.flipH });
  }, [filterParams.flipH, onFilterChange]);

  const handleFlipV = useCallback(() => {
    onFilterChange({ flipV: !filterParams.flipV });
  }, [filterParams.flipV, onFilterChange]);

  const handleRotate90 = useCallback(() => {
    onFilterChange({ rotate: ((filterParams.rotate || 0) + 90) % 360 });
  }, [filterParams.rotate, onFilterChange]);

  // 全部重置
  const handleResetAll = useCallback(() => {
    setActiveBeautyPreset(null);
    setActiveFilterPreset('none');
    onResetFilters();
  }, [onResetFilters]);

  // 是否激活美颜效果
  const hasBeautyActive = (filterParams.beautySmooth || 0) > 0 ||
    (filterParams.beautyWhiten || 0) > 0 ||
    (filterParams.beautyRosy || 0) > 0 ||
    (filterParams.beautyClarity || 0) > 0;

  // 是否有任何参数修改
  const hasAnyChange = Object.keys(DEFAULT_PARAMS).some((k) => {
    if (typeof DEFAULT_PARAMS[k] === 'boolean') return filterParams[k] !== DEFAULT_PARAMS[k];
    return (filterParams[k] || 0) !== DEFAULT_PARAMS[k];
  });

  return (
    <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden shadow-sm">
      {/* 头部折叠开关 */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-pink-400" />
          <span className="font-bold text-[var(--text-primary)]">图像精修与人像美颜</span>
          {hasBeautyActive && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/15 text-pink-300 font-mono flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> 美颜中
            </span>
          )}
          {hasAnyChange && !hasBeautyActive && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/15 text-violet-300 font-mono">
              已调色
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isExpanded && (
        <div className="p-3 pt-0 border-t border-[var(--border-subtle)] space-y-3 text-xs">
          {!hasImage ? (
            <p className="text-[10px] text-[var(--text-muted)] py-3 text-center">
              请先上传卡面图片，即可解锁手机相机/抖音级美颜与图像调整
            </p>
          ) : (
            <>
              {/* 分组标签栏 */}
              <div className="flex rounded-lg bg-[var(--bg-secondary)] p-0.5 border border-[var(--border-subtle)]">
                <button
                  onClick={() => setActiveTab('beauty')}
                  className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'beauty'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <Smile className="w-3 h-3" />
                  <span>人像美颜</span>
                </button>
                <button
                  onClick={() => setActiveTab('color')}
                  className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'color'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>光影调色</span>
                </button>
                <button
                  onClick={() => setActiveTab('filter')}
                  className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'filter'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <Palette className="w-3 h-3" />
                  <span>风格滤镜</span>
                </button>
              </div>

              {/* ═══════════ TAB 1: 人像美颜 ═══════════ */}
              {activeTab === 'beauty' && (
                <div className="space-y-3">
                  {/* 一键美颜预设 */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5 text-[10px]">
                      <span className="text-[var(--text-muted)] font-medium">热门美颜预设 (抖音/TikTok/相机感)</span>
                      {hasBeautyActive && (
                        <button
                          onClick={handleResetBeauty}
                          className="text-[9px] text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-0.5 cursor-pointer"
                        >
                          <Undo2 className="w-2.5 h-2.5" /> 还原裸妆
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {BEAUTY_PRESETS.map((preset) => {
                        const isSelected = activeBeautyPreset === preset.key;
                        return (
                          <button
                            key={preset.key}
                            onClick={() => handleBeautyPresetApply(preset)}
                            className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[52px] group ${
                              isSelected
                                ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-sm ring-1 ring-pink-500/30 font-bold'
                                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-pink-500/30'
                            }`}
                            title={preset.desc}
                          >
                            <span className="text-[10px] truncate w-full">{preset.label}</span>
                            <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                              isSelected ? 'bg-pink-500/30 text-pink-200' : 'bg-black/20 text-[var(--text-muted)] group-hover:text-pink-300'
                            }`}>
                              {preset.tag}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 美颜专属精细微调滑块 */}
                  <div className="space-y-2.5 p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-pink-500/20">
                    {BEAUTY_SLIDERS.map((s) => {
                      const Icon = s.icon;
                      const val = filterParams[s.key] || 0;
                      const isModified = val > 0;
                      return (
                        <div key={s.key} className="space-y-0.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="flex items-center gap-1 font-medium text-[var(--text-primary)]">
                              <Icon className={`w-3 h-3 ${s.color}`} />
                              <span>{s.label}</span>
                              <span className="text-[9px] text-[var(--text-muted)] font-normal hidden sm:inline">
                                ({s.sub})
                              </span>
                            </span>
                            <span className={`font-mono font-bold ${isModified ? s.color : 'text-[var(--text-muted)]'}`}>
                              {val}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={val}
                            onChange={(e) => handleSliderChange(s.key, parseFloat(e.target.value))}
                            className={`w-full h-1 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer ${s.accent}`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
                    💡 <strong>智能人像保护算法</strong>：通过 YCbCr 色彩分析仅对面部肤色平滑提亮，睫毛、眼眸、双眼皮与唇线等特征细节 100% 锐利保真。
                  </p>
                </div>
              )}

              {/* ═══════════ TAB 2: 光影调色 ═══════════ */}
              {activeTab === 'color' && (
                <div className="space-y-3">
                  {/* 几何翻转旋转按钮 */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleFlipH}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-[9px] font-medium border transition-all cursor-pointer ${
                        filterParams.flipH
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white'
                      }`}
                    >
                      <FlipHorizontal className="w-3 h-3" />
                      <span>水平镜像</span>
                    </button>
                    <button
                      onClick={handleFlipV}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-[9px] font-medium border transition-all cursor-pointer ${
                        filterParams.flipV
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white'
                      }`}
                    >
                      <FlipVertical className="w-3 h-3" />
                      <span>垂直镜像</span>
                    </button>
                    <button
                      onClick={handleRotate90}
                      className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-[9px] font-medium bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>旋转 {filterParams.rotate || 0}°</span>
                    </button>
                  </div>

                  {/* 基础光影滑块组 */}
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                    {COLOR_SLIDERS.map((s) => {
                      const val = filterParams[s.key] ?? DEFAULT_PARAMS[s.key];
                      const isModified = val !== DEFAULT_PARAMS[s.key];
                      return (
                        <div key={s.key}>
                          <div className="flex justify-between items-center mb-0.5 text-[10px]">
                            <span className={isModified ? 'text-cyan-400 font-medium' : 'text-[var(--text-muted)]'}>
                              {s.label}
                            </span>
                            <span className={`font-mono ${isModified ? 'text-cyan-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                              {val >= 0 && s.min < 0 ? '+' : ''}{val}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            value={val}
                            onChange={(e) => handleSliderChange(s.key, parseFloat(e.target.value))}
                            className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══════════ TAB 3: 风格滤镜 ═══════════ */}
              {activeTab === 'filter' && (
                <div className="space-y-2">
                  <span className="text-[10px] text-[var(--text-muted)] block">经典艺术色彩色调</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {FILTER_PRESETS.map((preset) => {
                      const isSelected = activeFilterPreset === preset.key;
                      return (
                        <button
                          key={preset.key}
                          onClick={() => handleFilterPresetApply(preset)}
                          className={`py-1.5 px-1 rounded text-[9px] font-medium border transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-violet-500/20 text-violet-300 border-violet-500/50 font-bold ring-1 ring-violet-500/30'
                              : 'bg-[var(--bg-secondary)] border-transparent text-[var(--text-muted)] hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 底部重置操作栏 */}
              {hasAnyChange && (
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-[10px]">
                  <span className="text-[var(--text-muted)]">已调整图像参数</span>
                  <button
                    onClick={handleResetAll}
                    className="flex items-center gap-1 py-1 px-2.5 rounded text-[9px] font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <Undo2 className="w-2.5 h-2.5" />
                    <span>重置所有效果</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { DEFAULT_PARAMS };
