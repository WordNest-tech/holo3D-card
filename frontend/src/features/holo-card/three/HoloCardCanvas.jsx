// src/features/holo-card/three/HoloCardCanvas.jsx
import React, { useEffect, useRef } from 'react';
import { MousePointer, RotateCw, SunMedium } from 'lucide-react';
import { HoloSceneManager } from './HoloSceneManager';

export default function HoloCardCanvas({ onEngineReady, options = {} }) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new HoloSceneManager(containerRef.current, options);
    engineRef.current = engine;
    if (onEngineReady) {
      onEngineReady(engine);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="w-full h-full relative touch-none select-none overflow-hidden">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 底部交互指引浮动条 */}
      {/* <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--bg-card)]/80 backdrop-blur-md border border-[var(--border-subtle)] shadow-lg text-[10px] sm:text-[11px] text-[var(--text-muted)] flex items-center gap-2 sm:gap-3 pointer-events-none max-w-[92%] justify-center">
        <span className="flex items-center gap-1">
          <MousePointer className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
          拖动倾斜观察 3D 浮雕凹凸与字体立体
        </span>
        <span className="text-[var(--border-subtle)]">•</span>
        <span className="flex items-center gap-1">
          <RotateCw className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
          双击翻转双面
        </span>
        <span className="text-[var(--border-subtle)]">•</span>
        <span className="flex items-center gap-1">
          <SunMedium className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
          全息物理流光
        </span>
      </div> */}
    </div>
  );
}
