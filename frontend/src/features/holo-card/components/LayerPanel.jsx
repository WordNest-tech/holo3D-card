// src/features/holo-card/components/LayerPanel.jsx
// 图层面板组件 — 图层列表、拖拽排序、添加图层、算法分割整合
import React, { useState, useCallback, useRef } from 'react';
import { Layers, Plus, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import LayerItem from './LayerItem';
import SegmentationSelector from './SegmentationSelector';
import SegmentationService from '../segmentation/SegmentationService';

export default function LayerPanel({
  layers,
  activeLayerId,
  onSetActiveLayer,
  onAddLayer,
  onRemoveLayer,
  onClearLayers,
  onDuplicateLayer,
  onUpdateLayer,
  onReorderLayers,
  onToggleVisibility,
  onToggleLock,
  onSplitLayer
}) {
  const [expandedLayerId, setExpandedLayerId] = useState(null);
  const [showSegSelector, setShowSegSelector] = useState(false);
  const [segTargetLayerId, setSegTargetLayerId] = useState(null);
  const [isSegProcessing, setIsSegProcessing] = useState(false);
  const [segProcessingAlgo, setSegProcessingAlgo] = useState(null);

  // 拖拽排序状态
  const dragIndexRef = useRef(null);

  const fileInputRef = useRef(null);

  // 展开/收起图层详情
  const handleToggleExpand = useCallback((id) => {
    setExpandedLayerId((prev) => (prev === id ? null : id));
  }, []);

  // 添加图层（触发文件选择）
  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  // 文件选择回调
  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    e.target.value = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await onAddLayer(file, file.name.replace(/\.[^/.]+$/, ''));
        toast.success(`已添加图层: ${file.name}`);
      } catch (err) {
        toast.error(`添加失败: ${err.message}`);
      }
    }
  };

  // 触发分割弹窗
  const handleSegmentRequest = (layerId) => {
    setSegTargetLayerId(layerId);
    setShowSegSelector(true);
  };

  // 执行分割
  const handleSelectAlgorithm = async (algorithmId) => {
    if (!segTargetLayerId) return;

    const targetLayer = layers.find((l) => l.id === segTargetLayerId);
    if (!targetLayer || !targetLayer.contentUrl) {
      toast.error('图层数据异常');
      return;
    }

    setIsSegProcessing(true);
    setSegProcessingAlgo(algorithmId);
    const toastId = toast.loading('正在执行 AI 图像分割...');

    try {
      // 加载图片
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = targetLayer.contentUrl;
      });

      // 执行分割
      const svc = SegmentationService.getInstance();
      const result = await svc.segment(algorithmId, img);

      if (result.masks && result.masks.length > 0) {
        // 使用第一个遮罩分割为前景/背景
        const maskDataUrl = result.masks[0].maskDataUrl;
        onSplitLayer(segTargetLayerId, algorithmId, maskDataUrl, result.depthMap || null);
        toast.success(`图层已分割为前景与背景！(${svc.getAlgorithmInfo(algorithmId)?.name})`, { id: toastId });
      } else if (result.depthMap) {
        // 仅深度图模式 — 更新图层的 segmentation 信息
        onSplitLayer(segTargetLayerId, algorithmId, result.depthMap, result.depthMap);
        toast.success('深度分割完成，已生成前景与背景图层！', { id: toastId });
      } else {
        toast.error('分割未返回有效遮罩数据', { id: toastId });
      }

      setShowSegSelector(false);
    } catch (err) {
      console.error('[LayerPanel] segmentation error:', err);
      toast.error(`分割失败: ${err.message || '请重试'}`, { id: toastId });
    } finally {
      setIsSegProcessing(false);
      setSegProcessingAlgo(null);
    }
  };

  // ---- 拖拽排序 ----
  const handleDragStart = (e, index) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      onReorderLayers(fromIndex, toIndex);
    }
    dragIndexRef.current = null;
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
  };

  return (
    <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2.5">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>图层面板</span>
          {layers.length > 0 && (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
              {layers.length} 层
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {layers.length > 0 && (
            <button
              onClick={() => {
                if (onClearLayers) {
                  onClearLayers();
                  toast.success('已清空所有悬浮图层，还原纯净 3D 卡面');
                }
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 hover:text-rose-200 border border-zinc-700 transition-colors cursor-pointer"
              title="一键清空全部图层"
            >
              <Trash2 className="w-3 h-3" />
              <span>清空</span>
            </button>
          )}
          <button
            onClick={handleAddClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>添加图层</span>
          </button>
        </div>
        {/* 隐藏文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.svg"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* 图层列表 */}
      {layers.length === 0 ? (
        <div className="py-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8 text-[var(--text-muted)] opacity-30" />
            <p className="text-[11px] text-[var(--text-muted)]">
              暂无图层，点击上方按钮添加图片
            </p>
            <p className="text-[9px] text-[var(--text-muted)] opacity-60">
              支持 PNG / JPG / WebP / SVG · 可多选批量添加
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-0.5">
          {layers.map((layer, index) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              isActive={activeLayerId === layer.id}
              isExpanded={expandedLayerId === layer.id}
              onSelect={onSetActiveLayer}
              onToggleExpand={handleToggleExpand}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onUpdate={onUpdateLayer}
              onDuplicate={onDuplicateLayer}
              onRemove={onRemoveLayer}
              onSegment={handleSegmentRequest}
              dragIndex={index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {/* 分割算法选择弹窗 */}
      <SegmentationSelector
        isOpen={showSegSelector}
        onClose={() => {
          if (!isSegProcessing) {
            setShowSegSelector(false);
            setSegTargetLayerId(null);
          }
        }}
        onSelectAlgorithm={handleSelectAlgorithm}
        isProcessing={isSegProcessing}
        processingAlgorithm={segProcessingAlgo}
        layerName={layers.find((l) => l.id === segTargetLayerId)?.name || ''}
      />
    </div>
  );
}
