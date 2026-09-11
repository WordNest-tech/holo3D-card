// src/App.jsx - 3D HoloCard Studio Standalone Application
import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import * as THREE from 'three';

// 核心功能模块导入
import { useHoloCardState } from './features/holo-card/hooks/useHoloCardState';
import { useAiReliefPipeline } from './features/holo-card/hooks/useAiReliefPipeline';
import { useLayerManager } from './features/holo-card/hooks/useLayerManager';
import { fitImageToCanvas, createAlignedTexture } from './features/holo-card/textures/imageFitting';
import { generateFrameTexture } from './features/holo-card/textures/frameTexture';
import HoloCardCanvas from './features/holo-card/three/HoloCardCanvas';
import HoloTopBar from './features/holo-card/components/HoloTopBar';
import UsageGuideBanner from './features/holo-card/components/UsageGuideBanner';
import FileUploadPanel from './features/holo-card/components/FileUploadPanel';
import TypographyPanel from './features/holo-card/components/TypographyPanel';
import FrameCustomizer from './features/holo-card/components/FrameCustomizer';
import MaterialSliders from './features/holo-card/components/MaterialSliders';
import CardActionButtons from './features/holo-card/components/CardActionButtons';
import LayerPanel from './features/holo-card/components/LayerPanel';
import ImageAdjustPanel, { DEFAULT_PARAMS as DEFAULT_FILTER_PARAMS } from './features/holo-card/components/ImageAdjustPanel';
import SceneDecompositionPanel from './features/holo-card/components/SceneDecompositionPanel';
import { applyFilterPipeline } from './features/holo-card/textures/imageFilters';
import { applyDepthBevelFilter } from './features/holo-card/textures/depthBevelFilter';
import { generateExtendedBackground } from './features/holo-card/textures/backgroundExtension';

export default function App() {
  const isAuthenticated = true;
  const engineRef = useRef(null);

  // 1. 全局卡牌聚合状态 Hook
  const {
    showFrame, setShowFrame,
    frameDepth, setFrameDepth,
    showFrameCustomizer, setShowFrameCustomizer,
    frameConfig, setFrameConfig,
    reliefHeight, setReliefHeight,
    reliefStep, setReliefStep,
    reliefBevel, setReliefBevel,
    cliffMode, setCliffMode,
    hasDepthMap, setHasDepthMap,
    hasText, setHasText,
    textCount, setTextCount,
    enableTextRelief, setEnableTextRelief,
    enableTextFloat, setEnableTextFloat,
    textDepth, setTextDepth,
    textFoilStyle, setTextFoilStyle,
    depthBacklight, setDepthBacklight,
    backlightColor, setBacklightColor,
    holoIntensity, setHoloIntensity,
    sparkleIntensity, setSparkleIntensity,
    specularFoil, setSpecularFoil,
    customTitle, setCustomTitle,
    uploadedImageName, setUploadedImageName,
    uploadedImageUrl, setUploadedImageUrl,
    uploadedImageObj, setUploadedImageObj,
    originalImageUrl, setOriginalImageUrl,
    originalImageObj, setOriginalImageObj,
    aiExpandedUrl, setAiExpandedUrl,
    fitMode, setFitMode,
    isFlipped, setIsFlipped,
    isAutoRotate, setIsAutoRotate,
    showSliders, setShowSliders,
    showUsageGuide, setShowUsageGuide,
    drawParamsRef,
    rawDepthMapUrlRef,
    depthCleanUrlRef,
    depthEmbossedUrlRef,
    textLayerUrlRef
  } = useHoloCardState();

  // 2. AI 空间深度与字体多模态识别流水线 Hook
  const { isMatting, generateAiReliefDepth } = useAiReliefPipeline();

  // 3. 动态图层栈管理 Hook
  const {
    layers,
    activeLayerId, setActiveLayerId,
    addLayer, addMultipleLayers, clearAllLayers, removeLayer, duplicateLayer,
    updateLayer, reorderLayers,
    toggleVisibility, toggleLock,
    splitLayerBySegmentation
  } = useLayerManager();

  // 4. 图像调整滤镜参数
  const [filterParams, setFilterParams] = useState({ ...DEFAULT_FILTER_PARAMS });
  const filterTimerRef = useRef(null);

  // 5. 广角延展大背景 (Ambient Stage 3D 视差微动)
  const [ambientBgConfig, setAmbientBgConfig] = useState({
    enabled: false,
    scale: 1.18,
    blur: 0
  });
  const ambientBgSourceImgRef = useRef(null);

  // 统一生成并更新卡内 3D 视差背景纹理
  const updateAmbientBackground = useCallback((params, config = ambientBgConfig, customSource = null) => {
    if (!engineRef.current) return;
    if (!config.enabled) {
      engineRef.current.setAmbientBackground(null, config.scale, false);
      return;
    }

    const source = customSource || ambientBgSourceImgRef.current || uploadedImageObj;
    if (!source) return;

    const ext = generateExtendedBackground(source, config.scale || 1.18, 0, params);
    engineRef.current.setAmbientBackground(ext.tex, config.scale || 1.18, true);
  }, [ambientBgConfig, uploadedImageObj]);

  const handleToggleAmbientBackground = useCallback(({ enabled, texture, scale }) => {
    if (!engineRef.current) return;
    engineRef.current.setAmbientBackground(texture, scale, enabled);
  }, []);

  // 应用滤镜到卡面纹理与视差大背景
  const applyFiltersToTexture = useCallback((params) => {
    if (!engineRef.current || !uploadedImageObj) return;
    const filteredCanvas = applyFilterPipeline(
      uploadedImageObj, params, drawParamsRef.current, fitMode
    );
    const tex = new THREE.CanvasTexture(filteredCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    engineRef.current.setBaseTexture(tex);

    if (ambientBgConfig.enabled) {
      updateAmbientBackground(params, ambientBgConfig);
    }
  }, [uploadedImageObj, fitMode, drawParamsRef, ambientBgConfig, updateAmbientBackground]);

  const handleFilterChange = useCallback((partial) => {
    setFilterParams(prev => {
      const next = { ...prev, ...partial };
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
      filterTimerRef.current = setTimeout(() => applyFiltersToTexture(next), 80);
      return next;
    });
  }, [applyFiltersToTexture]);

  const handleResetFilters = useCallback(() => {
    const defaults = { ...DEFAULT_FILTER_PARAMS };
    setFilterParams(defaults);
    if (uploadedImageObj) {
      applyFiltersToTexture(defaults);
    }
  }, [uploadedImageObj, applyFiltersToTexture]);

  // 深度贴图装配并严格像素级对齐
  const applyDepthMapTexture = useCallback((depthUrl, bevelRadius = reliefBevel) => {
    if (!engineRef.current) return;
    if (!depthUrl) {
      engineRef.current.setDepthTexture(null, false);
      setHasDepthMap(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const beveledCanvas = applyDepthBevelFilter(img, bevelRadius, 0.15, drawParamsRef.current);
      const tex = new THREE.CanvasTexture(beveledCanvas);
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      engineRef.current?.setDepthTexture(tex, true);
      setHasDepthMap(true);
    };
    img.src = depthUrl;
  }, [reliefBevel, drawParamsRef, setHasDepthMap]);

  // 独立悬浮文字层装配并严格像素级对齐
  const applyTextLayerTexture = useCallback((textUrl) => {
    if (!engineRef.current) return;
    if (!textUrl) {
      engineRef.current.setTextTexture(null, false);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const { tex } = createAlignedTexture(img, drawParamsRef.current, false);
      engineRef.current?.setTextTexture(tex, true);
    };
    img.src = textUrl;
  }, [drawParamsRef]);

  // 原画像素级等比装配器
  const applyLoadedImage = useCallback((img, currentFitMode = fitMode, customName = '') => {
    if (!engineRef.current || !img) return;

    const { tex, drawParams } = fitImageToCanvas(img, currentFitMode);
    drawParamsRef.current = drawParams;
    engineRef.current.setBaseTexture(tex);

    if (rawDepthMapUrlRef.current) {
      applyDepthMapTexture(rawDepthMapUrlRef.current);
    }
    if (textLayerUrlRef.current) {
      applyTextLayerTexture(textLayerUrlRef.current);
    }

    const titleToUse = (customName || customTitle || uploadedImageName || "HOLOCARD").replace(/\.[^/.]+$/, '').slice(0, 10);
    engineRef.current.setFrameTexture(generateFrameTexture(frameConfig, titleToUse));
  }, [fitMode, customTitle, uploadedImageName, frameConfig, drawParamsRef, rawDepthMapUrlRef, textLayerUrlRef, applyDepthMapTexture, applyTextLayerTexture]);

  // 用户上传本地图片
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploadedImageName(file.name);
    setFilterParams({ ...DEFAULT_FILTER_PARAMS });
    setAiExpandedUrl(null);
    setOriginalImageUrl('');
    setOriginalImageObj(null);
    ambientBgSourceImgRef.current = null;
    rawDepthMapUrlRef.current = '';
    depthCleanUrlRef.current = '';
    depthEmbossedUrlRef.current = '';
    textLayerUrlRef.current = '';
    setHasDepthMap(false);
    setHasText(false);
    setTextCount(0);

    if (engineRef.current) {
      engineRef.current.setDepthTexture(null, false);
      engineRef.current.setTextTexture(null, false);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setUploadedImageUrl(dataUrl);
      setOriginalImageUrl(dataUrl);
      const img = new Image();
      img.onload = () => {
        setUploadedImageObj(img);
        setOriginalImageObj(img);
        applyLoadedImage(img, fitMode, customTitle || file.name);
        if (ambientBgConfig.enabled) {
          const ext = generateExtendedBackground(img, ambientBgConfig.scale, ambientBgConfig.blur, DEFAULT_FILTER_PARAMS);
          engineRef.current?.setAmbientBackground(ext.tex, ambientBgConfig.scale, true);
        }
        toast.success(`已装裱新卡面：${file.name}`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFitModeChange = (newFit) => {
    setFitMode(newFit);
    if (uploadedImageObj) {
      applyLoadedImage(uploadedImageObj, newFit, customTitle || uploadedImageName);
    }
  };

  // 生成 AI 3D 景深浮雕表面与字体识别
  const handleGenerateReliefDepth = useCallback((overrideImageUrl = null) => {
    const targetUrl = (typeof overrideImageUrl === 'string' && overrideImageUrl.length > 0)
      ? overrideImageUrl
      : (aiExpandedUrl || uploadedImageUrl);
    if (!targetUrl || typeof targetUrl !== 'string') {
      toast.error('请先上传一张卡面图片');
      return;
    }

    if (aiExpandedUrl && targetUrl === aiExpandedUrl && uploadedImageUrl !== aiExpandedUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setUploadedImageUrl(aiExpandedUrl);
        setUploadedImageObj(img);
        applyLoadedImage(img, fitMode, customTitle || uploadedImageName);
      };
      img.src = aiExpandedUrl;
    }

    generateAiReliefDepth({
      uploadedImageUrl: targetUrl,
      enableTextRelief,
      onSuccess: ({ depthEmbossedUrl, depthCleanUrl, hasText: textFound, textCount: count, textLayerUrl }) => {
        if (depthEmbossedUrl) {
          depthEmbossedUrlRef.current = depthEmbossedUrl;
          depthCleanUrlRef.current = depthCleanUrl;
          rawDepthMapUrlRef.current = enableTextRelief ? depthEmbossedUrl : depthCleanUrl;
          applyDepthMapTexture(rawDepthMapUrlRef.current);
          setHasDepthMap(true);
        }

        if (textFound && textLayerUrl) {
          setHasText(true);
          setTextCount(count);
          textLayerUrlRef.current = textLayerUrl;
          applyTextLayerTexture(textLayerUrl);
        } else {
          setHasText(false);
          setTextCount(0);
          textLayerUrlRef.current = '';
          if (engineRef.current) {
            engineRef.current.setTextTexture(null, false);
          }
        }
      }
    });
  }, [aiExpandedUrl, uploadedImageUrl, enableTextRelief, fitMode, customTitle, uploadedImageName, applyLoadedImage, generateAiReliefDepth, applyDepthMapTexture, applyTextLayerTexture, setHasDepthMap, setHasText, setTextCount, setUploadedImageUrl, setUploadedImageObj]);

  const handleOutpaintSuccess = useCallback((expandedUrl) => {
    if (!expandedUrl) return;
    setAiExpandedUrl(expandedUrl);
    if (!originalImageUrl && uploadedImageUrl) {
      setOriginalImageUrl(uploadedImageUrl);
      setOriginalImageObj(uploadedImageObj);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ambientBgSourceImgRef.current = img;
      setUploadedImageUrl(expandedUrl);
      setUploadedImageObj(img);
      applyLoadedImage(img, fitMode, customTitle || uploadedImageName);
      if (ambientBgConfig.enabled) {
        updateAmbientBackground(filterParams, ambientBgConfig, img);
      }
    };
    img.src = expandedUrl;
  }, [originalImageUrl, uploadedImageUrl, uploadedImageObj, fitMode, customTitle, uploadedImageName, applyLoadedImage, setAiExpandedUrl, setOriginalImageUrl, setOriginalImageObj, setUploadedImageUrl, setUploadedImageObj, ambientBgConfig, filterParams, updateAmbientBackground]);

  const handleOutpaintReset = useCallback(() => {
    setAiExpandedUrl(null);
    ambientBgSourceImgRef.current = null;
    if (originalImageUrl && originalImageObj) {
      setUploadedImageUrl(originalImageUrl);
      setUploadedImageObj(originalImageObj);
      applyLoadedImage(originalImageObj, fitMode, customTitle || uploadedImageName);
      if (ambientBgConfig.enabled) {
        updateAmbientBackground(filterParams, ambientBgConfig, originalImageObj);
      }
    }
  }, [originalImageUrl, originalImageObj, fitMode, customTitle, uploadedImageName, applyLoadedImage, setAiExpandedUrl, setUploadedImageUrl, setUploadedImageObj, ambientBgConfig, filterParams, updateAmbientBackground]);

  const handleFlipCard = () => {
    engineRef.current?.flipCard((flipped) => setIsFlipped(flipped));
  };

  const handleDownload = () => {
    try {
      const dataUrl = engineRef.current?.captureScreenshot();
      if (!dataUrl) throw new Error('渲染器暂未就绪');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `HoloCard-3D-${Date.now()}.png`;
      a.click();
      toast.success('3D 卡片高清图像已成功保存！');
    } catch (e) {
      toast.error('保存失败，请稍后重试');
    }
  };

  // 状态同步到 3D 渲染引擎
  useEffect(() => {
    engineRef.current?.setReliefHeight(reliefHeight);
  }, [reliefHeight]);

  useEffect(() => {
    engineRef.current?.setReliefStep(reliefStep);
  }, [reliefStep]);

  useEffect(() => {
    if (rawDepthMapUrlRef.current && hasDepthMap) {
      applyDepthMapTexture(rawDepthMapUrlRef.current, reliefBevel);
    }
  }, [reliefBevel, hasDepthMap, applyDepthMapTexture]);

  useEffect(() => {
    engineRef.current?.setCliffMode(cliffMode);
  }, [cliffMode]);

  useEffect(() => {
    engineRef.current?.setFrameDepth(frameDepth);
  }, [frameDepth]);

  useEffect(() => {
    engineRef.current?.setFrameVisible(showFrame);
  }, [showFrame]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setFrameTexture(generateFrameTexture(frameConfig, customTitle || uploadedImageName));
    }
  }, [frameConfig, customTitle, uploadedImageName]);

  useEffect(() => {
    engineRef.current?.setTextVisible(enableTextFloat);
    engineRef.current?.setTextDepth(textDepth);
  }, [enableTextFloat, textDepth]);

  useEffect(() => {
    engineRef.current?.setTextFoilStyle(textFoilStyle);
  }, [textFoilStyle]);

  useEffect(() => {
    if (depthEmbossedUrlRef.current && depthCleanUrlRef.current) {
      const targetUrl = enableTextRelief ? depthEmbossedUrlRef.current : depthCleanUrlRef.current;
      rawDepthMapUrlRef.current = targetUrl;
      applyDepthMapTexture(targetUrl);
    }
  }, [enableTextRelief, applyDepthMapTexture, depthEmbossedUrlRef, depthCleanUrlRef, rawDepthMapUrlRef]);

  useEffect(() => {
    engineRef.current?.setMaterialParams({
      holoIntensity,
      sparkleIntensity,
      specularFoil,
      depthBacklight,
      backlightColor
    });
  }, [holoIntensity, sparkleIntensity, specularFoil, depthBacklight, backlightColor]);

  useEffect(() => {
    engineRef.current?.setAutoRotate(isAutoRotate);
  }, [isAutoRotate]);

  useEffect(() => {
    engineRef.current?.syncAllLayers(layers);
  }, [layers]);

  return (
    <div className="h-screen max-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col overflow-hidden">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      {/* 顶部轻量状态条 */}
      <HoloTopBar
        isAuthenticated={isAuthenticated}
        onToggleUsageGuide={() => setShowUsageGuide(prev => !prev)}
        onDownload={handleDownload}
      />

      {/* 展开式使用说明 */}
      {showUsageGuide && (
        <UsageGuideBanner onClose={() => setShowUsageGuide(false)} />
      )}

      {/* 主体工作区 */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 左侧：3D Three.js 交互画布 */}
        <div className="flex-1 h-[45vh] lg:h-full relative bg-gradient-to-b from-[var(--bg-primary)] via-[#070913] to-[var(--bg-primary)] flex items-center justify-center touch-none select-none overflow-hidden">
          <HoloCardCanvas
            onEngineReady={(engine) => {
              engineRef.current = engine;
              engine.setFrameTexture(generateFrameTexture(frameConfig, customTitle || uploadedImageName));
            }}
            options={{
              frameDepth,
              textDepth,
              enableTextFloat,
              textFoilStyle,
              showFrame,
              reliefHeight,
              reliefStep,
              holoIntensity,
              sparkleIntensity,
              specularFoil,
              depthBacklight,
              backlightColor,
              isAutoRotate
            }}
          />
        </div>

        {/* 右侧：紧凑型控制侧边栏 */}
        <div className="w-full lg:w-[380px] xl:w-[410px] h-[55vh] lg:h-full border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-xl p-3.5 sm:p-4 overflow-y-auto space-y-3.5 shrink-0">
          {/* 上传图片装裱与 3D 浮雕生成面板 */}
          <FileUploadPanel
            isAuthenticated={isAuthenticated}
            uploadedImageName={uploadedImageName}
            uploadedImageUrl={uploadedImageUrl}
            uploadedImageObj={uploadedImageObj}
            aiExpandedUrl={aiExpandedUrl}
            isMatting={isMatting}
            hasDepthMap={hasDepthMap}
            reliefHeight={reliefHeight}
            reliefStep={reliefStep}
            reliefBevel={reliefBevel}
            cliffMode={cliffMode}
            fitMode={fitMode}
            customTitle={customTitle}
            onFileUpload={handleFileUpload}
            onGenerateRelief={handleGenerateReliefDepth}
            onRequireLogin={() => {}}
            onReliefStepChange={setReliefStep}
            onReliefHeightChange={setReliefHeight}
            onReliefBevelChange={setReliefBevel}
            onCliffModeChange={setCliffMode}
            onFitModeChange={handleFitModeChange}
            onCustomTitleChange={setCustomTitle}
            onUpdateTitle={() => applyLoadedImage(uploadedImageObj, fitMode, customTitle)}
          />

          {/* 图像调整与滤镜面板 */}
          <ImageAdjustPanel
            hasImage={!!uploadedImageObj}
            filterParams={filterParams}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
          />

          {/* AI 卡内 3D 视差全景扩图面板 */}
          <SceneDecompositionPanel
            hasImage={!!uploadedImageObj}
            uploadedImageUrl={uploadedImageUrl}
            uploadedImageObj={uploadedImageObj}
            filterParams={filterParams}
            onToggleAmbientBackground={handleToggleAmbientBackground}
            ambientBgConfig={ambientBgConfig}
            onAmbientConfigChange={setAmbientBgConfig}
            onOutpaintSuccess={handleOutpaintSuccess}
            onOutpaintReset={handleOutpaintReset}
            onGenerateRelief={handleGenerateReliefDepth}
          />

          {/* 画面字体识别与 3D 立体系统 */}
          <TypographyPanel
            hasText={hasText}
            textCount={textCount}
            enableTextRelief={enableTextRelief}
            enableTextFloat={enableTextFloat}
            textDepth={textDepth}
            textFoilStyle={textFoilStyle}
            onToggleTextRelief={() => setEnableTextRelief(v => !v)}
            onToggleTextFloat={() => setEnableTextFloat(v => !v)}
            onTextDepthChange={setTextDepth}
            onTextFoilStyleChange={setTextFoilStyle}
          />

          {/* 视角与动作快捷控制 */}
          <CardActionButtons
            isFlipped={isFlipped}
            isAutoRotate={isAutoRotate}
            showFrame={showFrame}
            onFlipCard={handleFlipCard}
            onToggleAutoRotate={() => setIsAutoRotate(prev => !prev)}
            onToggleShowFrame={() => {
              setShowFrame(prev => {
                const next = !prev;
                if (next) setShowFrameCustomizer(true);
                return next;
              });
            }}
          />

          {/* 外框个性化定制面板 */}
          <FrameCustomizer
            showFrame={showFrame}
            frameDepth={frameDepth}
            frameConfig={frameConfig}
            showFrameCustomizer={showFrameCustomizer}
            onToggleFrameCustomizer={() => setShowFrameCustomizer(prev => !prev)}
            onToggleShowFrame={setShowFrame}
            onFrameDepthChange={setFrameDepth}
            onFrameConfigChange={(partial) => setFrameConfig(c => ({ ...c, ...partial }))}
          />

          {/* 全息流光与 3D 浮雕参数微调 */}
          <MaterialSliders
            showSliders={showSliders}
            depthBacklight={depthBacklight}
            backlightColor={backlightColor}
            holoIntensity={holoIntensity}
            sparkleIntensity={sparkleIntensity}
            specularFoil={specularFoil}
            onToggleSliders={() => setShowSliders(prev => !prev)}
            onDepthBacklightChange={setDepthBacklight}
            onBacklightColorChange={setBacklightColor}
            onHoloIntensityChange={setHoloIntensity}
            onSparkleIntensityChange={setSparkleIntensity}
            onSpecularFoilChange={setSpecularFoil}
          />
        </div>
      </div>
    </div>
  );
}
