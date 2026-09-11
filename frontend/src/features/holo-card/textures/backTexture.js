// src/features/holo-card/textures/backTexture.js
import * as THREE from 'three';

/**
 * 辅助排版函数：等宽字距微排版
 */
function drawSpaced(ctx, text, startX, startY, spacing, align = 'left') {
  ctx.save();
  const chars = String(text).split('');
  const widths = chars.map(c => ctx.measureText(c).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + (chars.length - 1) * spacing;
  let curX = startX;
  if (align === 'center') curX = startX - totalWidth / 2;
  else if (align === 'right') curX = startX - totalWidth;

  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], curX, startY);
    curX += widths[i] + spacing;
  }
  ctx.restore();
}

/**
 * 绘制十字校准准星
 */
function drawCross(ctx, cx, cy, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - size, cy); ctx.lineTo(cx + size, cy);
  ctx.moveTo(cx, cy - size); ctx.lineTo(cx, cy + size);
  ctx.stroke();
}

/**
 * 绘制卡牌背面静态高精底板 (仅在初始化时绘制一次至离屏 Canvas，极大节省 GPU 负载)
 */
function drawStaticBackdrop(ctx, w, h) {
  // 1. 深邃暗曜底色与径向暗涌微光
  ctx.fillStyle = "#050608";
  ctx.fillRect(0, 0, w, h);

  const radGlow = ctx.createRadialGradient(w / 2, h / 2 - 35, 40, w / 2, h / 2 - 35, 780);
  radGlow.addColorStop(0, "rgba(22, 28, 48, 0.75)");
  radGlow.addColorStop(0.35, "rgba(12, 16, 28, 0.5)");
  radGlow.addColorStop(0.7, "rgba(6, 8, 14, 0.9)");
  radGlow.addColorStop(1, "rgba(3, 4, 6, 1)");
  ctx.fillStyle = radGlow;
  ctx.fillRect(0, 0, w, h);

  // 2. 高精度暗部点阵防伪矩阵
  ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
  for (let x = 60; x <= w - 60; x += 36) {
    for (let y = 60; y <= h - 60; y += 36) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // 3. 四角十字校准准星
  drawCross(ctx, 220, 360, 10, "rgba(0, 242, 254, 0.35)");
  drawCross(ctx, w - 220, 360, 10, "rgba(0, 242, 254, 0.35)");
  drawCross(ctx, 220, h - 360, 10, "rgba(0, 242, 254, 0.35)");
  drawCross(ctx, w - 220, h - 360, 10, "rgba(0, 242, 254, 0.35)");

  // 4. 双层科技外围矩形边线
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(44, 44, w - 88, h - 88);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, 60, w - 120, h - 120);

  // 四角直角重型抱角包边
  const bLen = 32;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(60, 60 + bLen); ctx.lineTo(60, 60); ctx.lineTo(60 + bLen, 60); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - 60 - bLen, 60); ctx.lineTo(w - 60, 60); ctx.lineTo(w - 60, 60 + bLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(60, h - 60 - bLen); ctx.lineTo(60, h - 60); ctx.lineTo(60 + bLen, h - 60); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - 60 - bLen, h - 60); ctx.lineTo(w - 60, h - 60); ctx.lineTo(w - 60, h - 60 - bLen); ctx.stroke();

  // 5. 核心超感几何巨型同心圆与坐标系 (Jesper Landberg 先锋签名设计焦点)
  const cx = w / 2;
  const cy = h / 2 - 35;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 360, cy); ctx.lineTo(cx + 360, cy);
  ctx.moveTo(cx, cy - 360); ctx.lineTo(cx, cy + 360);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.beginPath();
  ctx.arc(cx, cy, 310, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = "rgba(0, 242, 254, 0.35)";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 14]);
  ctx.beginPath();
  ctx.arc(cx, cy, 275, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 215, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 2.5;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
    ctx.beginPath();
    ctx.arc(cx, cy, 215, angle - 0.09, angle + 0.09);
    ctx.stroke();
  }
  ctx.restore();

  // 表盘刻度线
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
    const isMajor = (Math.round((a / (Math.PI / 18))) % 3 === 0);
    const r1 = isMajor ? 180 : 190;
    const r2 = 200;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-90, -90, 180, 180);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 4);
  ctx.strokeStyle = "rgba(0, 242, 254, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(-65, -65, 130, 130);
  ctx.restore();

  const radCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, 75);
  radCore.addColorStop(0, "rgba(0, 242, 254, 0.25)");
  radCore.addColorStop(0.5, "rgba(10, 15, 30, 0.85)");
  radCore.addColorStop(1, "rgba(5, 7, 14, 0.95)");
  ctx.fillStyle = radCore;
  ctx.beginPath();
  ctx.arc(cx, cy, 65, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawCross(ctx, cx, cy, 18, "#ffffff");
  ctx.fillStyle = "#00f2fe";
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 6. 底部精密多列机器条码
  const barY = h - 185;
  const barH = 34;
  const barPattern = [3, 1, 4, 1, 2, 5, 2, 1, 6, 2, 3, 1, 4, 2, 1, 5, 3, 2, 1, 4, 2, 3, 1, 5, 2, 4, 1, 3, 2, 6, 1, 2, 4, 1, 3, 5, 2, 1];
  let totalBW = 0;
  barPattern.forEach(b => totalBW += b * 2.5 + 2.5);
  let curBarX = cx - totalBW / 2;

  for (let i = 0; i < barPattern.length; i++) {
    const bw = barPattern[i] * 2.5;
    if (i % 2 === 0) {
      ctx.fillStyle = (i % 6 === 0) ? "#00f2fe" : "rgba(255, 255, 255, 0.65)";
      ctx.fillRect(curBarX, barY, bw, barH);
    }
    curBarX += bw + 2.5;
  }
}

/**
 * 格式化运行时长为 MM:SS.S
 */
function formatTime(sec = 0) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(Math.floor(sec % 60)).padStart(2, '0');
  const ms = String(Math.floor((sec % 1) * 10));
  return `${mm}:${ss}.${ms}`;
}

/**
 * 实时动态 HUD 遥测参数层绘制
 */
function drawDynamicTelemetry(ctx, w, h, data = {}) {
  const {
    pitch = 0,             // 俯仰角 (角度)
    yaw = 0,               // 偏航角 (角度 0~360)
    depth = 0.35,          // 浮雕深度
    prxScale = 1.18,       // 视差缩放比
    lightX = 0.5,          // 光照/鼠标 X
    lightY = 0.5,          // 光照/鼠标 Y
    fps = 60,              // 实时帧率
    elapsed = 0            // 运行时长 (秒)
  } = data;

  const cx = w / 2;
  const cy = h / 2 - 35;

  // 动态防伪哈希：基于时间与空间姿态动态跃变
  const hashSeed = Math.floor(Math.abs(Math.sin(elapsed * 0.45 + pitch * 0.05 + yaw * 0.02)) * 0xFFFFFF);
  const dynamicHash = hashSeed.toString(16).toUpperCase().padStart(6, '0');

  const pitchSign = pitch >= 0 ? '+' : '';
  const pitchStr = `${pitchSign}${pitch.toFixed(1)}°`;
  const yawStr = `${yaw.toFixed(1)}°`;
  const depthMm = (depth * 4.2).toFixed(1);
  const depthPercent = Math.round(depth * 100);
  const timeStr = formatTime(elapsed);

  // ==========================================
  // 1. 左上角：空间姿态与陀螺仪遥测 (ATTITUDE SENSOR)
  // ==========================================
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "#00f2fe";
  drawSpaced(ctx, `// ATTITUDE: P:${pitchStr} Y:${yawStr}`, 76, 88, 2, 'left');

  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  drawSpaced(ctx, "SPATIAL ATTITUDE · SENSOR LIVE", 76, 110, 1.5, 'left');

  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(0, 242, 254, 0.65)";
  const radPitch = pitch * Math.PI / 180;
  const radYaw = yaw * Math.PI / 180;
  const vecX = Math.sin(radYaw).toFixed(2);
  const vecY = Math.sin(radPitch).toFixed(2);
  const vecZ = Math.cos(radYaw).toFixed(2);
  drawSpaced(ctx, `VEC [${vecX}, ${vecY}, ${vecZ}] · 60Hz GYRO`, 76, 128, 1.2, 'left');

  // ==========================================
  // 2. 右上角：POM 浮雕深度与全息光学遥测 (OPTICAL DEPTH)
  // ==========================================
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "#00f2fe";
  drawSpaced(ctx, `POM DEPTH // ${depthPercent}% [${depthMm}mm]`, w - 76, 88, 2, 'right');

  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  drawSpaced(ctx, `RAYMARCH 32-L · PRX ${prxScale.toFixed(2)}X`, w - 76, 110, 1.5, 'right');

  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(0, 242, 254, 0.65)";
  drawSpaced(ctx, "ACRYLIC BEVEL · NORMAL DYNAMIC", w - 76, 128, 1.2, 'right');

  // ==========================================
  // 3. 核心准星区：动态陀螺仪方位标尺与空间矩阵
  // ==========================================
  // 核心微调指针：随卡片 YAW / ELAPSED 旋转
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-radYaw);
  ctx.strokeStyle = "#00f2fe";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -52); ctx.lineTo(0, -65);
  ctx.moveTo(0, 52); ctx.lineTo(0, 65);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-65, 0); ctx.lineTo(-52, 0);
  ctx.moveTo(52, 0); ctx.lineTo(65, 0);
  ctx.stroke();
  ctx.restore();

  // 准星下方实时参数徽标
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "rgba(0, 242, 254, 0.85)";
  drawSpaced(ctx, `SYS-ATT [ P:${pitchStr} | Y:${yawStr} | D:${depth.toFixed(2)} ]`, cx, cy + 96, 2, 'center');

  // ==========================================
  // 4. 左下角：实时光照向量与状态验证 (LIGHT & STATUS)
  // ==========================================
  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  drawSpaced(ctx, `LIGHT // [${lightX.toFixed(3)}, ${lightY.toFixed(3)}, 1.000]`, 76, h - 122, 1.5, 'left');

  ctx.font = "bold 15px monospace";
  ctx.fillStyle = "#00f2fe";
  drawSpaced(ctx, "STATUS // TELEMETRY LINKED ●", 76, h - 102, 2, 'left');

  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  drawSpaced(ctx, "PHONG-SPECULAR OPTICAL MATRIX", 76, h - 84, 1.5, 'left');

  // ==========================================
  // 5. 右下角：渲染管线、帧率与运行计时器 (RENDER TELEMETRY)
  // ==========================================
  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  drawSpaced(ctx, "WEBGL PIPELINE // 160×240 MESH", w - 76, h - 122, 1.5, 'right');

  ctx.font = "bold 15px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  drawSpaced(ctx, `PERF // ${Math.round(fps)} FPS · T+${timeStr}`, w - 76, h - 102, 2, 'right');

  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(0, 242, 254, 0.75)";
  drawSpaced(ctx, `CORE // #WN-GL-${dynamicHash.slice(0, 4)}`, w - 76, h - 84, 1.5, 'right');

  // ==========================================
  // 6. 底部条码校验文本：实时动态传感器矩阵
  // ==========================================
  const barY = h - 185;
  const barH = 34;
  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  drawSpaced(ctx, `HC-${dynamicHash} // REAL-TIME SENSOR MATRIX // 2026 HOLOCARD STUDIO`, cx, barY + barH + 20, 2, 'center');
}

/**
 * 创建高性能实时遥测卡背管理器
 * 内部维护离屏静态 Base 画布与高频动态参数叠加层，自动节流，确保 60FPS 丝滑不卡顿
 */
export function createBackTextureManager() {
  const w = 1024, h = 1536;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 1. 一次性离屏烘焙静态高精背景
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = w;
  baseCanvas.height = h;
  const baseCtx = baseCanvas.getContext('2d');
  drawStaticBackdrop(baseCtx, w, h);

  // 2. 构造 WebGL CanvasTexture
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  let lastUpdateTime = 0;
  // 节流间隔：66ms (约 15 FPS 仪表刷新率，极度节省 GPU 纹理上传开销且视觉极其丝滑)
  const UPDATE_INTERVAL_MS = 66;

  /**
   * 刷新动态参数
   * @param {Object} telemetry - 实时参数对象
   * @param {boolean} force - 是否强制跳过节流立即刷新
   */
  function update(telemetry = {}, force = false) {
    const now = performance.now();
    if (!force && now - lastUpdateTime < UPDATE_INTERVAL_MS) {
      return;
    }
    lastUpdateTime = now;

    // 绘制预烘焙静态底板
    ctx.drawImage(baseCanvas, 0, 0);

    // 叠绘实时动态参数文本与准星指示器
    drawDynamicTelemetry(ctx, w, h, telemetry);

    texture.needsUpdate = true;
  }

  // 初始绘制一帧
  update({
    pitch: 0,
    yaw: 0,
    depth: 0.35,
    prxScale: 1.18,
    lightX: 0.5,
    lightY: 0.5,
    fps: 60,
    elapsed: 0
  }, true);

  return {
    texture,
    update,
    dispose: () => {
      texture.dispose();
      canvas.width = 1;
      canvas.height = 1;
      baseCanvas.width = 1;
      baseCanvas.height = 1;
    }
  };
}

/**
 * 兼容旧版调用的单次静态生成器
 */
export function generateBackTexture() {
  const manager = createBackTextureManager();
  return manager.texture;
}

