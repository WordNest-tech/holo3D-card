// src/features/holo-card/textures/initCardTexture.js
import * as THREE from 'three';

/**
 * 生成纯净初始卡面纹理（无硬编码预设人物，等待用户上传）
 */
export function generateInitCardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 1024, 1536);
  grad.addColorStop(0, '#0c101d');
  grad.addColorStop(0.5, '#14192b');
  grad.addColorStop(1, '#0a0c16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1536);

  ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
  ctx.lineWidth = 1.5;
  for (let x = 64; x < 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1536);
    ctx.stroke();
  }
  for (let y = 64; y < 1536; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('请在右侧上传图片装裱', 512, 740);

  ctx.font = '500 22px monospace';
  ctx.fillStyle = 'rgba(0, 242, 254, 0.75)';
  ctx.fillText('3D HOLOGRAPHIC STUDIO', 512, 790);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
