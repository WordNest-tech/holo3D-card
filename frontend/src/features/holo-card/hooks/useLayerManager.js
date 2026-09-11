// src/features/holo-card/hooks/useLayerManager.js
import { useState, useCallback, useRef } from 'react';

export function useLayerManager() {
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  
  // 用于自动生成默认图层名称的计数器
  const layerCounter = useRef(1);

  // 获取指定图层
  const getLayerById = useCallback((id) => {
    return layers.find((layer) => layer.id === id);
  }, [layers]);

  // 新增图层（支持 File/Blob 对象或 DataURL 字符串，以及预设图层属性）
  const addLayer = useCallback((fileOrDataUrl, name, partialProps = {}) => {
    return new Promise((resolve, reject) => {
      const createWithUrl = (contentUrl) => {
        const id = crypto.randomUUID();
        const layerName = name || `图层 ${layerCounter.current++}`;

        const newLayer = {
          id,
          name: layerName,
          type: 'raster',
          visible: true,
          locked: false,
          opacity: 1.0,
          depth: 0.25,
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          materialStyle: 'normal',
          specular: 0.5,
          blendMode: 'normal',
          contentUrl,
          segmentation: null,
          ...partialProps
        };

        setLayers((prev) => [...prev, newLayer]);
        setActiveLayerId(id);
        resolve(id);
      };

      if (typeof fileOrDataUrl === 'string') {
        createWithUrl(fileOrDataUrl);
      } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => createWithUrl(e.target.result);
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(fileOrDataUrl);
      } else {
        reject(new Error('无效的文件或图片数据'));
      }
    });
  }, []);

  // 批量新增图层（单次 React State 更新，避免频繁重渲染）
  const addMultipleLayers = useCallback((newLayersData) => {
    if (!Array.isArray(newLayersData) || newLayersData.length === 0) return [];

    const created = newLayersData.map((data) => {
      const id = crypto.randomUUID();
      const layerName = data.name || `图层 ${layerCounter.current++}`;
      return {
        id,
        name: layerName,
        type: 'raster',
        visible: true,
        locked: false,
        opacity: 1.0,
        depth: 0.25,
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        materialStyle: 'normal',
        specular: 0.5,
        blendMode: 'normal',
        contentUrl: '',
        segmentation: null,
        ...data
      };
    });

    setLayers((prev) => [...prev, ...created]);
    if (created.length > 0) {
      setActiveLayerId(created[created.length - 1].id);
    }
    return created;
  }, []);

  // 清空所有图层
  const clearAllLayers = useCallback(() => {
    setLayers([]);
    setActiveLayerId(null);
  }, []);

  // 移除图层
  const removeLayer = useCallback((id) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== id));
    setActiveLayerId((prev) => (prev === id ? null : prev));
  }, []);

  // 复制图层
  const duplicateLayer = useCallback((id) => {
    setLayers((prev) => {
      const layerIndex = prev.findIndex((l) => l.id === id);
      if (layerIndex === -1) return prev;
      
      const layerToDuplicate = prev[layerIndex];
      const newId = crypto.randomUUID();
      const newLayer = {
        ...layerToDuplicate,
        id: newId,
        name: `${layerToDuplicate.name} 副本`,
        position: {
          x: layerToDuplicate.position.x + 10,
          y: layerToDuplicate.position.y + 10
        }
      };
      
      const newLayers = [...prev];
      newLayers.splice(layerIndex + 1, 0, newLayer);
      setActiveLayerId(newId);
      return newLayers;
    });
  }, []);

  // 局部更新图层
  const updateLayer = useCallback((id, partialUpdate) => {
    setLayers((prev) => prev.map((layer) => 
      layer.id === id ? { ...layer, ...partialUpdate } : layer
    ));
  }, []);

  // 重新排序图层
  const reorderLayers = useCallback((fromIndex, toIndex) => {
    setLayers((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  // 切换图层可见性
  const toggleVisibility = useCallback((id) => {
    setLayers((prev) => prev.map((layer) =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);

  // 切换图层锁定状态
  const toggleLock = useCallback((id) => {
    setLayers((prev) => prev.map((layer) =>
      layer.id === id ? { ...layer, locked: !layer.locked } : layer
    ));
  }, []);

  // 基于图像分割（抠图）分离图层为前景与背景
  const splitLayerBySegmentation = useCallback((id, algorithm, maskBase64, depthMapBase64) => {
    setLayers((prev) => {
      const layerIndex = prev.findIndex((l) => l.id === id);
      if (layerIndex === -1) return prev;
      
      const original = prev[layerIndex];
      const bgId = crypto.randomUUID();
      const fgId = crypto.randomUUID();
      
      const bgLayer = {
        ...original,
        id: bgId,
        name: `背景-${original.name}`,
        depth: original.depth - 0.10,
        segmentation: { algorithm, maskBase64, depthMapBase64, isForeground: false }
      };
      
      const fgLayer = {
        ...original,
        id: fgId,
        name: `前景-${original.name}`,
        depth: original.depth + 0.10,
        segmentation: { algorithm, maskBase64, depthMapBase64, isForeground: true }
      };
      
      const newLayers = [...prev];
      newLayers.splice(layerIndex, 1, bgLayer, fgLayer);
      
      return newLayers;
    });
    
    setActiveLayerId((currentActive) => {
      // 保持活跃选择状态转移到前景图层（或保留当前选择）
      if (currentActive === id) return null; // 可根据需要在外部重新选择
      return currentActive;
    });
  }, []);

  return {
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    addMultipleLayers,
    clearAllLayers,
    removeLayer,
    duplicateLayer,
    updateLayer,
    reorderLayers,
    toggleVisibility,
    toggleLock,
    getLayerById,
    splitLayerBySegmentation
  };
}
