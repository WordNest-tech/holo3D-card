// src/features/holo-card/textures/depthBevelFilter.js
// 3D 浮雕边缘向内圆润倒角算法 (Edge Inset Fillet & Coin Relief Beveling)
// 通过 O(N) 极速两遍距离场变换，将 90 度垂直断崖重塑为饱满圆润的徽章级曲面，彻底消灭侧面拉伸！

import { CANVAS_W, CANVAS_H } from './imageFitting';

/**
 * 对深度图执行边缘向内圆润倒角运算
 * @param {HTMLImageElement|HTMLCanvasElement} depthSource - 原始深度图
 * @param {number} bevelRadius - 倒角半径 (像素, 建议 8~28px, 0 为关闭)
 * @param {number} cliffThreshold - 断崖落差判定阈值 (0.0~1.0, 默认 0.15)
 * @param {Object} drawParams - 与原画对齐的绘制参数
 * @returns {HTMLCanvasElement} 生成的圆润倒角深度图 Canvas
 */
export function applyDepthBevelFilter(
  depthSource,
  bevelRadius = 14,
  cliffThreshold = 0.15,
  drawParams = null
) {
  const canvasW = drawParams?.canvasW || CANVAS_W;
  const canvasH = drawParams?.canvasH || CANVAS_H;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // 1. 绘制基底（默认纯黑底）
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const { drawX = 0, drawY = 0, drawW = canvasW, drawH = canvasH } = drawParams || {};
  ctx.drawImage(depthSource, drawX, drawY, drawW, drawH);

  // 若倒角半径为 0，直接返回未修改的原图
  if (bevelRadius <= 0) {
    return canvas;
  }

  // 2. 提取灰度深度矩阵
  const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
  const data = imgData.data;
  const totalPixels = canvasW * canvasH;

  const D = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    D[i] = data[i * 4] / 255.0;
  }

  // 3. 识别断崖高落差边缘 (Cliff Edge Detection)
  // 记录属于高侧边缘的像素，并获取其对应的低侧底板深度 D_bg
  const isCliff = new Uint8Array(totalPixels);
  const bgDepth = new Float32Array(totalPixels);

  const thresh = Math.max(0.05, cliffThreshold);

  for (let y = 1; y < canvasH - 1; y++) {
    const row = y * canvasW;
    for (let x = 1; x < canvasW - 1; x++) {
      const idx = row + x;
      const curD = D[idx];

      let maxDrop = 0;
      let minNeighborD = curD;

      // 检查四周 4-邻域
      const up = idx - canvasW;
      const down = idx + canvasW;
      const left = idx - 1;
      const right = idx + 1;

      const dropUp = curD - D[up];
      if (dropUp > maxDrop) { maxDrop = dropUp; minNeighborD = D[up]; }
      const dropDown = curD - D[down];
      if (dropDown > maxDrop) { maxDrop = dropDown; minNeighborD = D[down]; }
      const dropLeft = curD - D[left];
      if (dropLeft > maxDrop) { maxDrop = dropLeft; minNeighborD = D[left]; }
      const dropRight = curD - D[right];
      if (dropRight > maxDrop) { maxDrop = dropRight; minNeighborD = D[right]; }

      // 若落差大于断崖阈值，标记为断崖高边缘点
      if (maxDrop >= thresh) {
        isCliff[idx] = 1;
        bgDepth[idx] = minNeighborD;
      }
    }
  }

  // 4. 极速 O(N) Chamfer 3-4 两遍距离场变换 (Two-Pass Distance Transform)
  // distField 记录高处像素距离最近断崖边缘的像素距离
  const INF = 999999;
  const distField = new Float32Array(totalPixels);
  const nearestBg = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    if (isCliff[i] === 1) {
      distField[i] = 0;
      nearestBg[i] = bgDepth[i];
    } else {
      distField[i] = INF;
      nearestBg[i] = 0;
    }
  }

  const R = Math.max(2, Math.min(Math.round(bevelRadius), 40));
  const D1 = 1.0;     // 正交步长
  const D2 = 1.414;   // 对角步长

  // 第一遍：从左上到右下 (Forward Pass)
  for (let y = 1; y < canvasH - 1; y++) {
    const row = y * canvasW;
    for (let x = 1; x < canvasW - 1; x++) {
      const idx = row + x;
      if (distField[idx] === 0) continue;

      let d = distField[idx];
      let bg = nearestBg[idx];

      const pLeft = idx - 1;
      if (distField[pLeft] + D1 < d && D[idx] >= D[pLeft]) {
        d = distField[pLeft] + D1;
        bg = nearestBg[pLeft];
      }
      const pUp = idx - canvasW;
      if (distField[pUp] + D1 < d && D[idx] >= D[pUp]) {
        d = distField[pUp] + D1;
        bg = nearestBg[pUp];
      }
      const pUpLeft = pUp - 1;
      if (distField[pUpLeft] + D2 < d && D[idx] >= D[pUpLeft]) {
        d = distField[pUpLeft] + D2;
        bg = nearestBg[pUpLeft];
      }
      const pUpRight = pUp + 1;
      if (distField[pUpRight] + D2 < d && D[idx] >= D[pUpRight]) {
        d = distField[pUpRight] + D2;
        bg = nearestBg[pUpRight];
      }

      distField[idx] = d;
      nearestBg[idx] = bg;
    }
  }

  // 第二遍：从右下到左上 (Backward Pass)
  for (let y = canvasH - 2; y >= 1; y--) {
    const row = y * canvasW;
    for (let x = canvasW - 2; x >= 1; x--) {
      const idx = row + x;
      if (distField[idx] === 0) continue;

      let d = distField[idx];
      let bg = nearestBg[idx];

      const pRight = idx + 1;
      if (distField[pRight] + D1 < d && D[idx] >= D[pRight]) {
        d = distField[pRight] + D1;
        bg = nearestBg[pRight];
      }
      const pDown = idx + canvasW;
      if (distField[pDown] + D1 < d && D[idx] >= D[pDown]) {
        d = distField[pDown] + D1;
        bg = nearestBg[pDown];
      }
      const pDownLeft = pDown - 1;
      if (distField[pDownLeft] + D2 < d && D[idx] >= D[pDownLeft]) {
        d = distField[pDownLeft] + D2;
        bg = nearestBg[pDownLeft];
      }
      const pDownRight = pDown + 1;
      if (distField[pDownRight] + D2 < d && D[idx] >= D[pDownRight]) {
        d = distField[pDownRight] + D2;
        bg = nearestBg[pDownRight];
      }

      distField[idx] = d;
      nearestBg[idx] = bg;
    }
  }

  // 5. 应用半圆弧/余弦圆润倒角函数 (Coin Relief Cosine/Circular Fillet)
  // 距离边缘 < R 的高位像素平滑向基底收拢
  const HALF_PI = Math.PI * 0.5;

  for (let i = 0; i < totalPixels; i++) {
    const dEdge = distField[i];
    if (dEdge < R) {
      const origD = D[i];
      const baseD = nearestBg[i];
      if (origD > baseD) {
        const u = dEdge / R; // 0 (断崖最外沿) ~ 1 (内侧高处)
        // 采用复合圆润余弦倒角：平滑起步，饱满微凸过渡
        const filletWeight = Math.sin(u * HALF_PI);
        const newD = baseD + (origD - baseD) * filletWeight;

        const val8 = Math.max(0, Math.min(255, Math.round(newD * 255)));
        const pxIdx = i * 4;
        data[pxIdx] = val8;
        data[pxIdx + 1] = val8;
        data[pxIdx + 2] = val8;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
