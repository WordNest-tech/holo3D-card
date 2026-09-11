// src/features/holo-card/components/UsageGuideBanner.jsx
import React from 'react';

export default function UsageGuideBanner({ onClose }) {
  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] px-4 py-2.5 text-xs text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-3 shrink-0 animate-in fade-in duration-200">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="font-bold text-cyan-400">💡 3D 浮雕与字体识别说明：</span>
        <span><strong>1. 画面字体识别与立体</strong>：智能定位画面中的题字/书法/英文/招牌，形成 3D 凸起或浮空烫金</span>
        <span>•</span>
        <span><strong>2. 边缘拉伸消除</strong>：双边滤波与自适应阴影，彻底抹平物体断层处的拉伸条纹</span>
        <span>•</span>
        <span><strong>3. 角色比例保真</strong>：像素级严格对齐，任意图片绝不拉伸压扁</span>
      </div>
      <button
        onClick={onClose}
        className="text-[var(--text-muted)] hover:text-white text-[11px] cursor-pointer"
      >
        关闭
      </button>
    </div>
  );
}
