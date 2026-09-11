// src/features/holo-card/textures/backgroundExtension.js
// 3D 全息卡牌通用视差背景纹理生成器 (Natural Parallax Texture Generator)
// 纯净自然原图/扩图采样，以主体为中心适度放大，利用画面四周天然像素进行深邃 3D 视差微动
// 零镜像反射伪影、零边缘缝隙、零画面模糊！

import * as THREE from 'three';
import { CANVAS_W, CANVAS_H } from './imageFitting';
import { applyFilterPipeline } from './imageFilters';

/**
 * 视差大背景材质生成器
 * 直接将原画以极清保真模式绘制至独立背景 Canvas 纹理，并同步注入用户精修调色与人像美颜
 * 在 3D 着色器中以主体为中心放大（默认 1.18x~1.25x），利用原画四周自然延展的真实像素作为视差平移余量
 * @param {HTMLImageElement|HTMLCanvasElement} sourceImg - 原始图像
 * @param {number} extensionScale - 画幅延展比例 (默认 1.18)
 * @param {number} blurIntensity - 保持 0 纯净保真
 * @param {Object|null} filterParams - 用户精修与人像美颜参数 (磨皮/美白/红润/五官立体/基础调色)
 * @returns {{ canvas: HTMLCanvasElement, tex: THREE.CanvasTexture, width: number, height: number, extensionScale: number }}
 */
export function generateExtendedBackground(
  sourceImg,
  extensionScale = 1.18,
  blurIntensity = 0,
  filterParams = null
) {
  // 适度限制背景 Canvas 最大物理尺寸在 1536px 内，兼顾等比超清保真与毫秒级滤镜极速运算性能
  const maxDim = 1536;
  let w = sourceImg.naturalWidth || sourceImg.width || CANVAS_W;
  let h = sourceImg.naturalHeight || sourceImg.height || CANVAS_H;
  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round(h * (maxDim / w));
      w = maxDim;
    } else {
      w = Math.round(w * (maxDim / h));
      h = maxDim;
    }
  }

  let canvas;
  if (filterParams && Object.keys(filterParams).length > 0) {
    // 🌟 将用户图像精修与人像美颜管线完整同步应用于背景纹理，确保背景与前景主体在光影/色调/美颜上 100% 融合统一
    const drawParams = { canvasW: w, canvasH: h, drawX: 0, drawY: 0, drawW: w, drawH: h };
    canvas = applyFilterPipeline(sourceImg, filterParams, drawParams, 'cover');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImg, 0, 0, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;

  return {
    canvas,
    tex,
    width: canvas.width,
    height: canvas.height,
    extensionScale
  };
}

/**
 * 将外部 URL 或 Base64 图片（如 AI 全景扩图）转化为高质量视差背景 Canvas 纹理
 * 同样以主体为中心放大，利用 AI 延展出的丰富四周环境提供超沉浸 3D 视差，并同步应用精修调色与美颜
 * @param {string} imageUrl 
 * @param {Object|null} filterParams
 * @returns {Promise<{ tex: THREE.CanvasTexture, img: HTMLImageElement, width: number, height: number }>}
 */
export function createPanoramicTextureFromUrl(imageUrl, filterParams = null) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ext = generateExtendedBackground(img, 1.18, 0, filterParams);
      resolve({ tex: ext.tex, img, width: ext.width, height: ext.height });
    };
    img.onerror = (err) => reject(new Error('加载视差大背景图片失败: ' + err.message));
    img.src = imageUrl;
  });
}

