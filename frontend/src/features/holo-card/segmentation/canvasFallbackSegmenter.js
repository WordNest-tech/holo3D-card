/**
 * 图像转灰度
 */
function toGrayscale(imageData, width, height) {
  const grayscale = new Float32Array(width * height);
  const data = imageData.data;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Luminance (亮度)
    grayscale[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return grayscale;
}

/**
 * Sobel边缘检测
 */
export function applySobelEdge(grayscale, width, height) {
  const edges = new Float32Array(width * height);
  const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const kernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let pixelX = 0;
      let pixelY = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx));
          const val = grayscale[idx];
          const kIdx = (ky + 1) * 3 + (kx + 1);
          pixelX += val * kernelX[kIdx];
          pixelY += val * kernelY[kIdx];
        }
      }
      const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
      edges[y * width + x] = magnitude;
    }
  }
  return edges;
}

/**
 * 简单的高斯模糊
 */
export function applyGaussianBlur(data, width, height, radius) {
  const result = new Float32Array(width * height);
  const size = Math.ceil(radius) * 2 + 1;
  const half = Math.floor(size / 2);
  const kernel = new Float32Array(size * size);
  let sum = 0;
  
  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const weight = Math.exp(-(x * x + y * y) / (2 * radius * radius));
      kernel[(y + half) * size + (x + half)] = weight;
      sum += weight;
    }
  }

  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          val += data[py * width + px] * kernel[(ky + half) * size + (kx + half)];
        }
      }
      result[y * width + x] = val;
    }
  }
  return result;
}

/**
 * 生成人物遮罩 (边缘检测 + 中心权重 + 阈值二值化)
 */
export function generatePersonMask(imageData, width, height) {
  const grayscale = toGrayscale(imageData, width, height);
  const edges = applySobelEdge(grayscale, width, height);
  const mask = new Uint8ClampedArray(width * height * 4);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // 距离中心的权重 (中心高，边缘低)
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const centerWeight = 1 - (dist / maxDist);
      
      let val = edges[idx] * centerWeight * 2;
      val = val > 100 ? 255 : (val * 1.5);
      val = Math.min(255, val);

      const outIdx = idx * 4;
      mask[outIdx] = val;     // R
      mask[outIdx + 1] = val; // G
      mask[outIdx + 2] = val; // B
      mask[outIdx + 3] = 255; // A
    }
  }
  
  return mask;
}

/**
 * 生成深度图 (基于亮度和距离中心的权重)
 */
export function generateDepthMap(imageData, width, height) {
  const grayscale = toGrayscale(imageData, width, height);
  const depth = new Uint8ClampedArray(width * height * 4);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      // 距离中心越近越亮，且结合原始亮度
      let dVal = (1 - (dist / maxDist)) * 150 + (grayscale[idx] * 0.5);
      dVal = Math.max(0, Math.min(255, dVal));
      
      const outIdx = idx * 4;
      depth[outIdx] = dVal;
      depth[outIdx + 1] = dVal;
      depth[outIdx + 2] = dVal;
      depth[outIdx + 3] = 255;
    }
  }
  return depth;
}

/**
 * 生成显著性遮罩 (基于与平均颜色的差异)
 */
export function generateSaliencyMask(imageData, width, height) {
  const grayscale = toGrayscale(imageData, width, height);
  let sum = 0;
  for (let i = 0; i < grayscale.length; i++) {
    sum += grayscale[i];
  }
  const mean = sum / grayscale.length;
  
  const mask = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const diff = Math.abs(grayscale[idx] - mean);
      
      let val = diff > 30 ? 255 : 0; // 阈值二值化
      
      const outIdx = idx * 4;
      mask[outIdx] = val;
      mask[outIdx + 1] = val;
      mask[outIdx + 2] = val;
      mask[outIdx + 3] = 255;
    }
  }
  return mask;
}

/**
 * 将 Uint8ClampedArray 遮罩数据转为 PNG Data URL
 */
export function maskToDataUrl(maskArray, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = new ImageData(maskArray, width, height);
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
