// src/features/holo-card/hooks/useHoloCardState.js
import { useState, useRef } from 'react';

export function useHoloCardState() {
  // 1. 基础外框与独立可调节前后景深（默认关闭外框）
  const [showFrame, setShowFrame] = useState(false);
  const [frameDepth, setFrameDepth] = useState(0.08); // 0.00 ~ 0.40
  const [showFrameCustomizer, setShowFrameCustomizer] = useState(false);
  const [frameConfig, setFrameConfig] = useState({
    style: 'classic',
    color: '#ffd700',
    accentColor: '#ffcf40',
    title: 'HOLOCARD',
    badge: 'HOLO // ARCHIVE',
    edition: 'NO. 001 // HC-2026',
    subtitle: '3D HOLOGRAPHIC COLLECTOR CARD',
    stats: 'POWER ∞ // CREATIVE 100%',
    bgOpacity: 0.35,
    borderWidth: 14
  });

  // 2. 3D 浮雕凹凸与形态
  const [reliefHeight, setReliefHeight] = useState(0.35); // 0.00 ~ 0.85
  const [reliefStep, setReliefStep] = useState(0); // 0: 连续平滑, 1: 阶梯纸雕
  const [reliefBevel, setReliefBevel] = useState(14); // 0 ~ 30, 边缘向内圆润倒角半径 (默认 14px 饱满徽章)
  const [cliffMode, setCliffMode] = useState(0); // 0: 亚克力切面包边 (消除拉伸), 1: 物理镂空断裂, 2: 连续过渡
  const [hasDepthMap, setHasDepthMap] = useState(false);

  // 3. 画面文字 AI 识别与 3D 悬浮烫金系统
  const [hasText, setHasText] = useState(false);
  const [textCount, setTextCount] = useState(0);
  const [enableTextRelief, setEnableTextRelief] = useState(true);
  const [enableTextFloat, setEnableTextFloat] = useState(true);
  const [textDepth, setTextDepth] = useState(0.22); // 0.02 ~ 0.50
  const [textFoilStyle, setTextFoilStyle] = useState('gold');

  // 4. 环境背光与全息流光（默认均为 0，初始呈现 100% 真实纯净卡面）
  const [depthBacklight, setDepthBacklight] = useState(0.0);
  const [backlightColor, setBacklightColor] = useState('#00f2fe');
  const [holoIntensity, setHoloIntensity] = useState(0.0);
  const [sparkleIntensity, setSparkleIntensity] = useState(0.0);
  const [specularFoil, setSpecularFoil] = useState(0.0);

  // 5. 用户画作与展示状态
  const [customTitle, setCustomTitle] = useState('');
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [uploadedImageObj, setUploadedImageObj] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState('');
  const [originalImageObj, setOriginalImageObj] = useState(null);
  const [aiExpandedUrl, setAiExpandedUrl] = useState(null);
  const [fitMode, setFitMode] = useState('cover'); // 'cover' | 'contain'

  const [isFlipped, setIsFlipped] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [showUsageGuide, setShowUsageGuide] = useState(false);

  // 引用变量（存放 URL 与画幅映射）
  const drawParamsRef = useRef({ drawX: 0, drawY: 0, drawW: 1024, drawH: 1536, fitMode: 'cover' });
  const rawDepthMapUrlRef = useRef('');
  const depthCleanUrlRef = useRef('');
  const depthEmbossedUrlRef = useRef('');
  const textLayerUrlRef = useRef('');

  return {
    // 状态
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
    // 引用
    drawParamsRef,
    rawDepthMapUrlRef,
    depthCleanUrlRef,
    depthEmbossedUrlRef,
    textLayerUrlRef
  };
}
