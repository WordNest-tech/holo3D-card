// src/features/holo-card/textures/imageFilters.js
// 浏览器前端图像滤镜与人像美颜处理引擎 — 基于 Canvas 2D 像素级操作与 YCbCr 智能肤色分析
import { CANVAS_W, CANVAS_H } from './imageFitting';

export const DEFAULT_PARAMS = {
  // 基础光影调色
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  hueRotate: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  vignette: 0,
  sharpen: 0,
  blur: 0,
  flipH: false,
  flipV: false,
  rotate: 0,

  // 🌟 人像美颜专属参数 (Portrait Beauty)
  beautySmooth: 0,   // 智能磨皮 (0 ~ 100)
  beautyWhiten: 0,   // 肤色美白 / 透亮 (0 ~ 100)
  beautyRosy: 0,     // 气色红润 / 腮红 (0 ~ 100)
  beautyClarity: 0   // 五官立体 / 眼神光 (0 ~ 100)
};

/**
 * 抖音 / TikTok / 手机相机风格人像美颜预设
 */
export const BEAUTY_PRESETS = [
  {
    key: 'beauty_natural',
    label: '原生质感',
    tag: 'iPhone级',
    desc: '保留真实毛孔纹理，微调气色，自然不假面',
    params: { beautySmooth: 32, beautyWhiten: 15, beautyRosy: 12, beautyClarity: 25 }
  },
  {
    key: 'beauty_douyin',
    label: '抖音清透',
    tag: '爆款冷白',
    desc: '通透冷白皮，纯净无暇肤质，五官立体有神',
    params: { beautySmooth: 55, beautyWhiten: 42, beautyRosy: 28, beautyClarity: 35 }
  },
  {
    key: 'beauty_porcelain',
    label: '冷白瓷肌',
    tag: '女团同款',
    desc: '强效减黄提亮，极净瓷白通透，冷调初恋脸',
    params: { beautySmooth: 48, beautyWhiten: 65, beautyRosy: 15, beautyClarity: 28 }
  },
  {
    key: 'beauty_peach',
    label: '元气蜜桃',
    tag: '初恋甜妹',
    desc: '粉嫩水光初恋感，蜜桃血色腮红与红润气色',
    params: { beautySmooth: 45, beautyWhiten: 28, beautyRosy: 52, beautyClarity: 20 }
  },
  {
    key: 'beauty_matte',
    label: '高级哑光',
    tag: '封面杂志',
    desc: '高级哑光雾面质感，眼神光深邃，五官轮廓鲜明',
    params: { beautySmooth: 40, beautyWhiten: 20, beautyRosy: 10, beautyClarity: 50, contrast: 8 }
  }
];

/**
 * 经典风格滤镜预设
 */
export const FILTER_PRESETS = [
  { key: 'none',     label: '原图',   params: {} },
  { key: 'vivid',    label: '鲜艳',   params: { saturation: 35, contrast: 15 } },
  { key: 'warm',     label: '暖调',   params: { temperature: 40, brightness: 5, saturation: 10 } },
  { key: 'cool',     label: '冷调',   params: { temperature: -40, brightness: 5, saturation: 5 } },
  { key: 'vintage',  label: '复古',   params: { saturation: -30, contrast: 15, temperature: 25, vignette: 40 } },
  { key: 'bw',       label: '黑白',   params: { saturation: -100 } },
  { key: 'cinema',   label: '电影',   params: { contrast: 25, shadows: -20, highlights: -10, vignette: 50, temperature: 10 } },
  { key: 'hdr',      label: 'HDR',    params: { contrast: 30, saturation: 20, shadows: 30, highlights: -20 } },
  { key: 'dreamy',   label: '梦幻',   params: { brightness: 10, saturation: -15, blur: 2, contrast: -10 } },
  { key: 'neon',     label: '霓虹',   params: { saturation: 60, contrast: 30, brightness: 10 } }
];

/**
 * 极速 O(1) 滑动窗口双向可分离均值模糊
 * 用于人像智能磨皮分频与五官反差分析
 */
function fastBoxBlur(srcData, width, height, radius = 5) {
  const len = width * height * 4;
  const target = new Uint8ClampedArray(len);
  const temp = new Uint8ClampedArray(len);
  const r = Math.max(1, Math.min(radius, 15));

  // 1. 水平通道滑动求和 (Horizontal Pass)
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    let rSum = 0, gSum = 0, bSum = 0;

    // 初始化左边界累加
    for (let i = -r; i <= r; i++) {
      const px = Math.min(width - 1, Math.max(0, i));
      const idx = rowOffset + px * 4;
      rSum += srcData[idx];
      gSum += srcData[idx + 1];
      bSum += srcData[idx + 2];
    }

    const count = 2 * r + 1;
    for (let x = 0; x < width; x++) {
      const outIdx = rowOffset + x * 4;
      temp[outIdx] = rSum / count;
      temp[outIdx + 1] = gSum / count;
      temp[outIdx + 2] = bSum / count;
      temp[outIdx + 3] = srcData[outIdx + 3];

      // 滑动窗口移进移出
      const leftPx = Math.max(0, x - r);
      const rightPx = Math.min(width - 1, x + r + 1);
      const leftIdx = rowOffset + leftPx * 4;
      const rightIdx = rowOffset + rightPx * 4;

      rSum += srcData[rightIdx] - srcData[leftIdx];
      gSum += srcData[rightIdx + 1] - srcData[leftIdx + 1];
      bSum += srcData[rightIdx + 2] - srcData[leftIdx + 2];
    }
  }

  // 2. 垂直通道滑动求和 (Vertical Pass)
  for (let x = 0; x < width; x++) {
    const colOffset = x * 4;
    let rSum = 0, gSum = 0, bSum = 0;

    for (let i = -r; i <= r; i++) {
      const py = Math.min(height - 1, Math.max(0, i));
      const idx = py * width * 4 + colOffset;
      rSum += temp[idx];
      gSum += temp[idx + 1];
      bSum += temp[idx + 2];
    }

    const count = 2 * r + 1;
    for (let y = 0; y < height; y++) {
      const outIdx = y * width * 4 + colOffset;
      target[outIdx] = rSum / count;
      target[outIdx + 1] = gSum / count;
      target[outIdx + 2] = bSum / count;
      target[outIdx + 3] = temp[outIdx + 3];

      const topPy = Math.max(0, y - r);
      const bottomPy = Math.min(height - 1, y + r + 1);
      const topIdx = topPy * width * 4 + colOffset;
      const bottomIdx = bottomPy * width * 4 + colOffset;

      rSum += temp[bottomIdx] - temp[topIdx];
      gSum += temp[bottomIdx + 1] - temp[topIdx + 1];
      bSum += temp[bottomIdx + 2] - temp[topIdx + 2];
    }
  }

  return target;
}

/**
 * 🌟 人像美颜核心算法管线 (Smart Skin Smoothing & Beauty Engine)
 * 基于智能肤色检测（YCbCr 色度模型），精准区分面部皮肤与五官头发，
 * 仅对皮肤平滑提亮，绝对保持睫毛、瞳孔反光、双眼皮与唇线锐利分明！
 */
function applyPortraitBeauty(data, width, height, params) {
  const { beautySmooth = 0, beautyWhiten = 0, beautyRosy = 0, beautyClarity = 0 } = params;
  if (beautySmooth <= 0 && beautyWhiten <= 0 && beautyRosy <= 0 && beautyClarity <= 0) return;

  // 生成低频柔滑通道
  const blurred = fastBoxBlur(data, width, height, 5);
  const totalPixels = width * height;

  for (let p = 0; p < totalPixels; p++) {
    const i = p * 4;
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const br = blurred[i];
    const bg = blurred[i + 1];
    const bb = blurred[i + 2];

    // 1. 智能肤色聚类检测 (YCbCr 空间分析)
    const y  =  0.299 * r + 0.587 * g + 0.114 * b;
    const cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
    const cr =  0.5 * r - 0.4187 * g - 0.0813 * b + 128;

    let skinWeight = 0;
    // 覆盖自然人像的健康肤色色度椭球 (Cb: 75~135, Cr: 128~178)
    if (cb >= 75 && cb <= 135 && cr >= 128 && cr <= 178 && y > 30) {
      const dCb = (cb - 108) / 28;
      const dCr = (cr - 150) / 24;
      const dist = Math.sqrt(dCb * dCb + dCr * dCr);
      if (dist < 1.0) {
        skinWeight = 1.0 - dist;
        skinWeight = skinWeight * skinWeight * (3.0 - 2.0 * skinWeight); // 边缘羽化
      }
    }

    // 2. 🌟 智能磨皮 (Smart Smoothing with Texture Preservation)
    if (beautySmooth > 0 && skinWeight > 0.02) {
      // 计算局部高频反差（识别眼睛轮廓、睫毛、鼻唇边缘）
      const diff = Math.max(Math.abs(r - br), Math.abs(g - bg), Math.abs(b - bb));
      // 边缘保护因子：高反差边缘不模糊，低反差皮肤瑕疵充分抚平
      const edgeGuard = Math.max(0, 1.0 - diff / 40.0);
      const alpha = (beautySmooth / 100) * skinWeight * edgeGuard * 0.88;

      r = r * (1 - alpha) + br * alpha;
      g = g * (1 - alpha) + bg * alpha;
      b = b * (1 - alpha) + bb * alpha;
    }

    // 3. 🌟 肤色透亮美白 (Skin Whitening & De-yellowing)
    if (beautyWhiten > 0 && skinWeight > 0.02) {
      const wFactor = (beautyWhiten / 100) * skinWeight;
      // 肤色中间调通透提亮曲线（不泛白灰白）
      const lumNorm = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const lift = (Math.pow(lumNorm, 0.72) - lumNorm) * 255;

      r += lift * wFactor * 0.75;
      g += lift * wFactor * 0.90;
      b += lift * wFactor * 1.18; // 适度提升蓝通道，洗去暗沉黄气，呈现通透冷白

      // 冷白皮轻微减黄
      b += wFactor * 10;
      g += wFactor * 3;
    }

    // 4. 🌟 气色红润 (Rosy Vitality Blush)
    if (beautyRosy > 0 && skinWeight > 0.02) {
      const rFactor = (beautyRosy / 100) * skinWeight;
      // 少女感初恋微粉血色感
      r += rFactor * 18;
      b += rFactor * 6;
    }

    // 5. 🌟 五官立体 / 眼神光反差强化 (Facial & Eye Clarity)
    if (beautyClarity > 0) {
      // 对非肤色特征区域（眼眸、瞳孔高光、睫毛、唇形）进行微反差增强
      const featureWeight = 1.0 - skinWeight * 0.75;
      const cFactor = (beautyClarity / 100) * featureWeight * 0.50;
      r += (r - br) * cFactor;
      g += (g - bg) * cFactor;
      b += (b - bb) * cFactor;
    }

    data[i]     = clamp8(r);
    data[i + 1] = clamp8(g);
    data[i + 2] = clamp8(b);
  }
}

/**
 * 全量滤镜与美颜管线 — 按顺序应用变换、人像美颜与调色
 * @param {HTMLImageElement} img - 原始图片（不可变）
 * @param {Object} params - 调整参数集
 * @param {Object} drawParams - 绘制参数
 * @param {'cover'|'contain'} fitMode
 * @returns {HTMLCanvasElement} 处理后的 Canvas
 */
export function applyFilterPipeline(img, params = {}, drawParams = null, fitMode = 'cover') {
  const canvasW = drawParams?.canvasW || CANVAS_W;
  const canvasH = drawParams?.canvasH || CANVAS_H;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // 极清抗锯齿渲染
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvasW, canvasH);

  // 1. 翻转与旋转几何变换
  ctx.save();
  const flipH = params.flipH || false;
  const flipV = params.flipV || false;
  const rotateDeg = params.rotate || 0;

  ctx.translate(canvasW / 2, canvasH / 2);
  if (rotateDeg !== 0) ctx.rotate(rotateDeg * Math.PI / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.translate(-canvasW / 2, -canvasH / 2);

  if (drawParams) {
    const { drawX, drawY, drawW, drawH } = drawParams;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    const scale = Math.max(canvasW / img.width, canvasH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (canvasW - dw) / 2, (canvasH - dh) / 2, dw, dh);
  }
  ctx.restore();

  // 2. 读取像素
  const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
  const data = imageData.data;

  // 3. 🌟 执行人像美颜算法（磨皮、美白、红润、五官立体）
  applyPortraitBeauty(data, canvasW, canvasH, params);

  // 4. 基础光影调色
  const brightness = params.brightness ?? 0;
  const contrast   = params.contrast ?? 0;
  const saturation = params.saturation ?? 0;
  const temperature = params.temperature ?? 0;
  const hueRotate  = params.hueRotate ?? 0;
  const exposure   = params.exposure ?? 0;
  const highlights = params.highlights ?? 0;
  const shadows    = params.shadows ?? 0;
  const vignette   = params.vignette ?? 0;

  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const exposureFactor = Math.pow(2.0, exposure / 100);
  const cx = canvasW / 2, cy = canvasH / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 曝光
    if (exposure !== 0) {
      r *= exposureFactor;
      g *= exposureFactor;
      b *= exposureFactor;
    }

    // 亮度
    if (brightness !== 0) {
      const bAdj = brightness * 2.55;
      r += bAdj;
      g += bAdj;
      b += bAdj;
    }

    // 对比度
    if (contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // 高光与阴影
    if (highlights !== 0 || shadows !== 0) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 128 && highlights !== 0) {
        const hFactor = (highlights / 100) * ((lum - 128) / 127) * 40;
        r += hFactor; g += hFactor; b += hFactor;
      }
      if (lum < 128 && shadows !== 0) {
        const sFactor = (shadows / 100) * ((128 - lum) / 128) * 40;
        r += sFactor; g += sFactor; b += sFactor;
      }
    }

    // 饱和度
    if (saturation !== 0) {
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const s = 1 + saturation / 100;
      r = gray + s * (r - gray);
      g = gray + s * (g - gray);
      b = gray + s * (b - gray);
    }

    // 色温冷暖
    if (temperature !== 0) {
      const t = temperature / 100;
      r += t * 20;
      b -= t * 20;
      g += t * 5;
    }

    // 色相旋转
    if (hueRotate !== 0) {
      const [h, s, l] = rgbToHsl(r, g, b);
      const [nr, ng, nb] = hslToRgb(((h * 360 + hueRotate) % 360) / 360, s, l);
      r = nr; g = ng; b = nb;
    }

    // 暗角
    if (vignette > 0) {
      const px = (i / 4) % canvasW;
      const py = Math.floor((i / 4) / canvasW);
      const dist = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
      const vigFactor = 1 - (vignette / 100) * Math.pow(dist / maxDist, 2) * 0.8;
      r *= vigFactor; g *= vigFactor; b *= vigFactor;
    }

    data[i]     = clamp8(r);
    data[i + 1] = clamp8(g);
    data[i + 2] = clamp8(b);
  }

  ctx.putImageData(imageData, 0, 0);

  // 5. 锐化与柔光后处理
  const sharpen = params.sharpen ?? 0;
  const blur = params.blur ?? 0;

  if (sharpen > 0 || blur > 0) {
    const postCanvas = document.createElement('canvas');
    postCanvas.width = canvasW;
    postCanvas.height = canvasH;
    const pCtx = postCanvas.getContext('2d');
    pCtx.imageSmoothingEnabled = true;
    pCtx.imageSmoothingQuality = 'high';

    let filterStr = '';
    if (blur > 0) filterStr += `blur(${blur * 0.5}px) `;
    if (sharpen > 0) filterStr += `contrast(${1 + sharpen * 0.005}) `;

    pCtx.filter = filterStr.trim();
    pCtx.drawImage(canvas, 0, 0);
    ctx.drawImage(postCanvas, 0, 0);
  }

  return canvas;
}

// ---- 色彩工具函数 ----

function clamp8(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1/3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1/3) * 255];
}
