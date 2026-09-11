// src/features/holo-card/textures/imageFitting.js
import * as THREE from 'three';

// 极清渲染基准分辨率 (1536 × 2304, 3.5MP 超清画质，保证视网膜屏与 3D 景深下毛发、五官像素级还原)
export const CANVAS_W = 1536;
export const CANVAS_H = 2304;

/**
 * 等比绘制用户画作，100% 原始比例保真，绝不压扁角色，启用双三次极清超采样
 * @param {HTMLImageElement} img 
 * @param {'cover' | 'contain'} fitMode 
 * @param {number} canvasW 
 * @param {number} canvasH 
 */
export function fitImageToCanvas(img, fitMode = 'cover', canvasW = CANVAS_W, canvasH = CANVAS_H) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  
  // 启用最高质量的图像平滑抗锯齿，杜绝下采样细节丢失与暗部色彩失真
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvasW, canvasH);

  let drawW, drawH, drawX, drawY;
  if (fitMode === 'cover') {
    const scale = Math.max(canvasW / img.width, canvasH / img.height);
    drawW = img.width * scale;
    drawH = img.height * scale;
    drawX = (canvasW - drawW) / 2;
    drawY = (canvasH - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    const grad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, 120, canvasW / 2, canvasH / 2, canvasH / 2);
    grad.addColorStop(0, "#161b2e");
    grad.addColorStop(0.7, "#0c0d16");
    grad.addColorStop(1, "#05060a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const scale = Math.min((canvasW - 120) / img.width, (canvasH - 170) / img.height);
    drawW = img.width * scale;
    drawH = img.height * scale;
    drawX = (canvasW - drawW) / 2;
    drawY = (canvasH - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
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
    drawParams: { drawX, drawY, drawW, drawH, fitMode, canvasW, canvasH }
  };
}

/**
 * 将辅助图层（如景深图、字体层）按照主画作相同的 drawParams 绘制对齐
 * @param {HTMLImageElement} img 
 * @param {Object} drawParams 
 * @param {boolean} isDepth - 深度图默认黑底，文字图默认透明底
 */
export function createAlignedTexture(img, drawParams, isDepth = false) {
  const canvasW = drawParams?.canvasW || CANVAS_W;
  const canvasH = drawParams?.canvasH || CANVAS_H;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (isDepth) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else {
    ctx.clearRect(0, 0, canvasW, canvasH);
  }

  const { drawX = 0, drawY = 0, drawW = canvasW, drawH = canvasH } = drawParams || {};
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return { canvas, tex };
}
