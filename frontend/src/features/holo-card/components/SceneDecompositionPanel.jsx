// src/features/holo-card/components/SceneDecompositionPanel.jsx
// 3D 全息卡牌：卡内 3D 视差全景扩图控制面板（纯净工程化设计，严格卡片窗口内聚）
import React, { useState, useRef } from 'react';
import {
  Maximize2,
  RefreshCw,
  Sliders,
  Upload,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Box
} from 'lucide-react';
import toast from 'react-hot-toast';
import aiApi from '../../../api/aiApi';
import { generateExtendedBackground, createPanoramicTextureFromUrl } from '../textures/backgroundExtension';

export default function SceneDecompositionPanel({
  hasImage,
  uploadedImageUrl,
  uploadedImageObj,
  filterParams = null,
  onToggleAmbientBackground,
  ambientBgConfig = { enabled: false, scale: 1.18, blur: 0 },
  onAmbientConfigChange,
  onOutpaintSuccess,
  onOutpaintReset,
  onGenerateRelief
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [aiBackgroundUrl, setAiBackgroundUrl] = useState(null);
  const [customPromptHint, setCustomPromptHint] = useState('');
  const customBgInputRef = useRef(null);

  // 1. 生成式 AI 全景场景延展 (Gemini) 为卡内 3D 视差注入富余画幅（原画主体完美居中）
  const handleGeminiOutpainting = async () => {
    if (!hasImage || !uploadedImageUrl) {
      toast.error('请先上传一张卡片原画');
      return;
    }
    setIsGeneratingBackground(true);
    const toastId = toast.loading('Gemini 正在分析原图背景并无缝延展场景...');
    try {
      const res = await aiApi.expandHoloBackground(uploadedImageUrl, customPromptHint.trim() || undefined);
      // 兼容后端返回字段 backgroundUrl / expandedImageUrl
      const newBgUrl = res?.data?.backgroundUrl || res?.data?.expandedImageUrl;
      if (!newBgUrl) {
        throw new Error(res?.message || 'Gemini 未返回有效的图片数据');
      }

      setAiBackgroundUrl(newBgUrl);

      // 🌟 关键通知：将 AI 扩图同步给主 Studio，设为后续 3D 浮雕与字体识别的第一源
      onOutpaintSuccess?.(newBgUrl);

      // 原画主体永远 100% 居中在主卡面上，扩图结果装配为视差背景缓冲（同步用户精修调色与美颜）
      const texObj = await createPanoramicTextureFromUrl(newBgUrl, filterParams);
      const nextConfig = { ...ambientBgConfig, enabled: true };
      onAmbientConfigChange?.(nextConfig);
      onToggleAmbientBackground?.({
        enabled: true,
        texture: texObj.tex,
        scale: nextConfig.scale || 1.18,
        blur: 0
      });

      toast.success('AI 全景扩图完成！已同步设为 3D 浮雕与字体识别源', { id: toastId });
    } catch (err) {
      console.error('Gemini 扩图失败:', err);
      toast.error(`全景扩图失败: ${err.message || '网络或 API 异常'}`, { id: toastId });
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  // 2. 用户自主上传全景大背景图
  const handleCustomBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bgUrl = evt.target.result;
        setAiBackgroundUrl(bgUrl);
        // 同步设为 3D 浮雕源
        onOutpaintSuccess?.(bgUrl);
        const texObj = await createPanoramicTextureFromUrl(bgUrl, filterParams);
        const nextConfig = { ...ambientBgConfig, enabled: true };
        onAmbientConfigChange?.(nextConfig);
        onToggleAmbientBackground?.({
          enabled: true,
          texture: texObj.tex,
          scale: nextConfig.scale || 1.18,
          blur: 0
        });
        toast.success('已装载自定义全景背景，并同步设为 3D 浮雕与字体识别源！');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('加载自定义背景失败');
    }
    if (customBgInputRef.current) customBgInputRef.current.value = '';
  };

  // 3. 恢复为原画边缘算法扩图或关闭
  const handleResetToDefaultBg = () => {
    setAiBackgroundUrl(null);
    onOutpaintReset?.();
    if (uploadedImageObj && ambientBgConfig.enabled) {
      const ext = generateExtendedBackground(uploadedImageObj, ambientBgConfig.scale || 1.18, 0, filterParams);
      onToggleAmbientBackground?.({
        enabled: true,
        texture: ext.tex,
        scale: ambientBgConfig.scale || 1.18,
        blur: 0
      });
      toast.success('已恢复为原图作为主源');
    }
  };

  // 4. 开启 / 关闭卡内 3D 视差
  const handleToggleAmbient = (enabled) => {
    if (!uploadedImageObj && !uploadedImageUrl && enabled) {
      toast.error('请先上传图片以开启卡内 3D 视差');
      return;
    }

    const nextConfig = { ...ambientBgConfig, enabled };
    onAmbientConfigChange?.(nextConfig);

    if (enabled) {
      if (aiBackgroundUrl) {
        createPanoramicTextureFromUrl(aiBackgroundUrl, filterParams).then((texObj) => {
          onToggleAmbientBackground?.({
            enabled: true,
            texture: texObj.tex,
            scale: nextConfig.scale || 1.18,
            blur: 0
          });
        }).catch(() => {
          toast.error('加载全景背景失败');
        });
      } else if (uploadedImageObj) {
        const ext = generateExtendedBackground(uploadedImageObj, nextConfig.scale || 1.18, 0, filterParams);
        onToggleAmbientBackground?.({
          enabled: true,
          texture: ext.tex,
          scale: nextConfig.scale || 1.18,
          blur: 0
        });
      }
      toast.success('已开启卡内 3D 视差！旋转卡片即可查看背景微动');
    } else {
      onToggleAmbientBackground?.({
        enabled: false,
        texture: null,
        scale: nextConfig.scale || 1.18,
        blur: 0
      });
    }
  };

  const handleAmbientScaleChange = (scale) => {
    const nextConfig = { ...ambientBgConfig, scale };
    onAmbientConfigChange?.(nextConfig);
    if (ambientBgConfig.enabled) {
      if (aiBackgroundUrl) {
        createPanoramicTextureFromUrl(aiBackgroundUrl, filterParams).then((texObj) => {
          onToggleAmbientBackground?.({
            enabled: true,
            texture: texObj.tex,
            scale,
            blur: 0
          });
        });
      } else if (uploadedImageObj) {
        const ext = generateExtendedBackground(uploadedImageObj, scale, 0, filterParams);
        onToggleAmbientBackground?.({
          enabled: true,
          texture: ext.tex,
          scale,
          blur: 0
        });
      }
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-md rounded-2xl border border-[var(--border-subtle)] p-3.5 sm:p-4 transition-all shadow-sm">
      {/* 头部折叠栏（纯净工业风，无 AI 装饰标签） */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsCollapsed((prev) => !prev)}
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Maximize2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
                卡内 3D 视差与全景扩图
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              旋转卡片微动视差 · 扩图储备四周像素
            </p>
          </div>
        </div>

        <button
          type="button"
          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg"
          aria-label="展开或收起"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-3.5 space-y-3">
          {/* 功能定义与视差机制说明 */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
            <p className="leading-normal">
              • <b>卡内 3D 视差窗口</b>：扩图后生成的画面严格局限在卡片窗口内部，绝不溢出到卡片外部。<br />
              • <b>旋转互动微动</b>：移动或旋转卡片时，背景自动产生 3D 空间平移微动，与向前凸起的 3D 浮雕雕塑形成深邃视差！
            </p>
          </div>

          {/* 开关与控制条 */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)]/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>开启卡内 3D 视差微动</span>
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ambientBgConfig.enabled}
                  onChange={(e) => handleToggleAmbient(e.target.checked)}
                  disabled={!hasImage}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {/* 扩图储备按钮组（纯色实底按钮，绝无渐变色） */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleGeminiOutpainting}
                disabled={!hasImage || isGeneratingBackground}
                className={`py-2 px-2.5 rounded-lg text-[11px] font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                  !hasImage || isGeneratingBackground
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                }`}
                title="调用 Gemini AI 生成 16:9 全景画面，为卡内 3D 视差储备四周平移像素"
              >
                {isGeneratingBackground ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>正在扩图...</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>AI 全景扩图 (Gemini)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => customBgInputRef.current?.click()}
                disabled={!hasImage}
                className="py-2 px-2.5 rounded-lg text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                title="自主上传 16:9 或全景图片作为视差背景储备"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                <span>上传全景图</span>
              </button>

              <input
                type="file"
                ref={customBgInputRef}
                accept="image/*"
                onChange={handleCustomBgUpload}
                className="hidden"
              />
            </div>

            {/* 场景智能延展提示词 (可选) */}
            <div className="pt-0.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>场景智能扩图引导 (可选)</span>
                <span className="text-[9px] text-cyan-400/80 font-mono">原图场景智能锁定</span>
              </div>
              <input
                type="text"
                value={customPromptHint}
                onChange={(e) => setCustomPromptHint(e.target.value)}
                placeholder="默认自动延展原图背景 (如樱花树、自然光影)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                disabled={!hasImage || isGeneratingBackground}
              />
            </div>

            {/* 当前全景视差背景状态 */}
            {aiBackgroundUrl && (
              <div className="space-y-2 pt-1">
                <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center space-x-1.5 text-cyan-300 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span className="truncate text-[10px]">已装载 AI 扩图（已设为 3D 浮雕与字体计算源）</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToDefaultBg}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[10px] shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>恢复原图</span>
                  </button>
                </div>

                {onGenerateRelief && (
                  <button
                    type="button"
                    onClick={() => onGenerateRelief(aiBackgroundUrl)}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>以此扩图立即计算 3D 浮雕与字体识别</span>
                  </button>
                )}
              </div>
            )}

            {/* 视差画幅平移幅度滑块 */}
            {ambientBgConfig.enabled && (
              <div className="pt-2 space-y-1.5 border-t border-[var(--border-subtle)]/50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-secondary)]">视差画幅储备倍率</span>
                  <span className="font-mono text-cyan-400 font-medium">
                    {ambientBgConfig.scale?.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1.08"
                  max="1.50"
                  step="0.01"
                  value={ambientBgConfig.scale || 1.18}
                  onChange={(e) => handleAmbientScaleChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
