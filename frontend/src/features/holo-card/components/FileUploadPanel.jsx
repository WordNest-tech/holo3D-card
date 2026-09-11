// src/features/holo-card/components/FileUploadPanel.jsx
import React from 'react';
import { Upload, Box, RefreshCw, Lock } from 'lucide-react';

export default function FileUploadPanel({
  isAuthenticated,
  uploadedImageName,
  uploadedImageUrl,
  uploadedImageObj,
  aiExpandedUrl,
  isMatting,
  hasDepthMap,
  reliefHeight,
  reliefStep,
  reliefBevel = 14,
  cliffMode = 0,
  fitMode,
  customTitle,
  onFileUpload,
  onGenerateRelief,
  onRequireLogin,
  onReliefStepChange,
  onReliefHeightChange,
  onReliefBevelChange,
  onCliffModeChange,
  onFitModeChange,
  onCustomTitleChange,
  onUpdateTitle
}) {
  return (
    <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
      <div className="text-xs font-bold text-[var(--text-secondary)] flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          上传本地图片 / 装裱画作
        </span>
        <span className="text-[10px] text-[var(--text-muted)] font-normal">PNG / JPG / WebP</span>
      </div>

      {/* 上传拖放框 */}
      <div className="p-3.5 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 text-center transition-colors relative cursor-pointer group">
        <input
          type="file"
          accept="image/*"
          onChange={onFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
        <div className="flex flex-col items-center gap-1 pointer-events-none">
          <Upload className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-cyan-400">
            {uploadedImageName ? `已载入: ${uploadedImageName}` : "点击或拖拽图片到此处"}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            任意比例自适应，像素级等比对齐绝不挤压
          </span>
        </div>
      </div>

      {/* AI 3D 空间景深浮雕表面生成区 */}
      <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-cyan-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span>3D 物理景深浮雕与字体识别</span>
          </div>
          {aiExpandedUrl ? (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              以 AI 扩图为源
            </span>
          ) : (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              AI 双边抗拉伸表面
            </span>
          )}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          {aiExpandedUrl
            ? "已载入 AI 全景扩图！点击将以扩图完整场景进行空间深度估计与画面字体识别。"
            : "自动提取画面三维空间深度与字体笔画，角色/物体自然起伏，边缘抗拉伸阴影，字体支持专属 3D 悬浮烫金。"}
        </p>
        
        <button
          onClick={!isAuthenticated ? onRequireLogin : () => onGenerateRelief()}
          disabled={isAuthenticated && (isMatting || (!uploadedImageUrl && !aiExpandedUrl))}
          className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            !isAuthenticated
              ? "bg-amber-600 hover:bg-amber-500 text-white"
              : "bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
          }`}
        >
          {!isAuthenticated ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>登录账户以解锁 3D 景深与字体提取</span>
            </>
          ) : isMatting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{aiExpandedUrl ? "正在基于 AI 扩图计算深度与识别字体..." : "正在进行空间深度估计与画面字体识别..."}</span>
            </>
          ) : (
            <>
              <Box className="w-3.5 h-3.5" />
              <span>
                {hasDepthMap 
                  ? (aiExpandedUrl ? "以 AI 扩图重新生成 3D 景深与字体" : "重新生成 3D 景深与字体立体")
                  : (aiExpandedUrl ? "以 AI 扩图生成 3D 物理景深与字体" : "一键生成 3D 物理景深与字体立体")}
              </span>
            </>
          )}
        </button>

        {/* 3D 浮雕形态模式切换 */}
        <div className="pt-1.5 border-t border-[var(--border-subtle)] space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--text-secondary)] font-medium">浮雕形态风格</span>
            <span className="font-mono text-cyan-400 text-[9px]">
              {reliefStep === 0 ? "连续平滑 3D 浮雕" : "阶梯立体纸雕"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onReliefStepChange(0)}
              className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                reliefStep === 0
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-[var(--bg-card)] border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              连续平滑 3D
            </button>
            <button
              onClick={() => onReliefStepChange(1)}
              className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                reliefStep === 1
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-[var(--bg-card)] border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              阶梯立体纸雕
            </button>
          </div>
        </div>

        {/* 3D 浮雕凹凸高度滑块 */}
        <div className="pt-1 space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[var(--text-secondary)]">3D 浮雕凸起高度</span>
            <span className="font-mono text-cyan-400 font-bold">{reliefHeight.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.00"
            max="0.85"
            step="0.02"
            value={reliefHeight}
            onChange={e => onReliefHeightChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[8px] text-[var(--text-muted)] font-mono">
            <span>0.00 (平面)</span>
            <span>0.35 (推荐立体)</span>
            <span>0.85 (强破框悬浮)</span>
          </div>
        </div>

        {/* 🌟 方案 3：边缘向内圆润倒角 (Coin Relief Inset) */}
        <div className="pt-1 space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1">
              <span>边缘圆润倒角 (徽章级)</span>
              {reliefBevel > 0 && (
                <span className="text-[8px] px-1 rounded bg-cyan-500/15 text-cyan-300 font-mono">
                  已圆化
                </span>
              )}
            </span>
            <span className="font-mono text-cyan-400 font-bold">{reliefBevel}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={reliefBevel}
            onChange={e => onReliefBevelChange?.(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[8px] text-[var(--text-muted)] font-mono">
            <span>0px (垂直生硬)</span>
            <span>14px (推荐饱满)</span>
            <span>30px (大曲率圆角)</span>
          </div>
        </div>

        {/* 🌟 侧视断崖工艺（解决侧面拉伸撕扯） */}
        <div className="pt-1.5 border-t border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--text-secondary)] font-medium">侧视断崖工艺 (防拉伸)</span>
            <span className="text-[9px] text-cyan-400 font-mono">
              {cliffMode === 0
                ? '真实感像素还原'
                : cliffMode === 1
                ? '物理镂空'
                : cliffMode === 2
                ? '亚克力切边'
                : '连续平滑'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => onCliffModeChange?.(0)}
              className={`py-1 px-0.5 rounded text-[9px] font-medium border transition-all cursor-pointer text-center ${
                cliffMode === 0
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm'
                  : 'bg-[var(--bg-card)] border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
              title="100% 保持原画色彩，沿垂直 Z 轴虚拟重构高频微纹理，彻底消除拉花色条与黑边"
            >
              真实感还原
            </button>
            <button
              onClick={() => onCliffModeChange?.(1)}
              className={`py-1 px-0.5 rounded text-[9px] font-medium border transition-all cursor-pointer text-center ${
                cliffMode === 1
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm'
                  : 'bg-[var(--bg-card)] border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
              title="剔除垂直拉伸面，人物与背景物理断裂，立体纸雕质感"
            >
              物理镂空
            </button>
            <button
              onClick={() => onCliffModeChange?.(2)}
              className={`py-1 px-0.5 rounded text-[9px] font-medium border transition-all cursor-pointer text-center ${
                cliffMode === 2
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm'
                  : 'bg-[var(--bg-card)] border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
              title="将侧壁替换为激光切割深色亚克力包边"
            >
              亚克力切边
            </button>
            <button
              onClick={() => onCliffModeChange?.(3)}
              className={`py-1 px-0.5 rounded text-[9px] font-medium border transition-all cursor-pointer text-center ${
                cliffMode === 3
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm'
                  : 'bg-[var(--bg-card)] border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
              title="传统网格连续平滑拉伸微阴影过渡"
            >
              连续平滑
            </button>
          </div>
        </div>
      </div>

      {/* 装裱版式选项 */}
      <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[var(--text-muted)] font-medium">装裱版式（像素级保真，绝不压扁角色）</span>
          <span className="text-cyan-400 font-mono">{fitMode === 'cover' ? '铺满' : '完整'}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onFitModeChange('cover')}
            className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-all cursor-pointer ${
              fitMode === 'cover'
                ? 'bg-cyan-500 text-white font-bold shadow-sm'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            全幅铺满 (Cover)
          </button>
          <button
            onClick={() => onFitModeChange('contain')}
            className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-all cursor-pointer ${
              fitMode === 'contain'
                ? 'bg-cyan-500 text-white font-bold shadow-sm'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            完整保留 (Contain)
          </button>
        </div>
      </div>

      {/* 自定义卡牌标题 */}
      <div>
        <label className="text-[11px] text-[var(--text-muted)] block mb-1">自定义卡牌名称（可选）：</label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customTitle}
            onChange={e => onCustomTitleChange(e.target.value)}
            placeholder="例如：雪夜巡想 / 动感破框"
            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:border-cyan-500 outline-none"
          />
          {uploadedImageObj && (
            <button
              onClick={onUpdateTitle}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              更新卡面
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
