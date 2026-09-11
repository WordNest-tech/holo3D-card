// src/features/holo-card/textures/frameTexture.js
import * as THREE from 'three';

/**
 * 动态外框与文字材质生成器
 * @param {Object} config - 外框配置
 * @param {string} customCardTitle - 卡牌标题
 */
export function generateFrameTexture(config = {}, customCardTitle = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  const w = 1024, h = 1536;

  ctx.clearRect(0, 0, w, h);

  const style = config.style || 'classic';
  const mainColor = config.color || '#ffd700';
  const accentColor = config.accentColor || '#ffcf40';
  const badge = config.badge !== undefined ? config.badge : 'HOLO // ARCHIVE';
  const edition = config.edition !== undefined ? config.edition : 'NO. 001 // HC-2026';
  const subtitle = config.subtitle !== undefined ? config.subtitle : '3D HOLOGRAPHIC COLLECTOR CARD';
  const stats = config.stats !== undefined ? config.stats : 'POWER ∞ // CREATIVE 100%';
  const bgOpacity = config.bgOpacity !== undefined ? config.bgOpacity : 0.35;
  const borderWidth = config.borderWidth || 14;

  // 用户外框配置中的 title 拥有最高优先级，为空时退化到 customCardTitle 或默认 HOLOCARD
  const cardTitle = (config.title !== undefined && config.title !== '')
    ? config.title
    : (customCardTitle || "HOLOCARD");

  if (style === 'classic') {
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(38, 38, w - 76, h - 76);

    if (bgOpacity > 0.01) {
      ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity})`;
      ctx.fillRect(66, 60, w - 132, 90);
    }
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(66, 60, w - 132, 90);

    ctx.fillStyle = accentColor;
    ctx.font = "bold 34px 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(badge, 90, 120);

    ctx.font = "bold 26px monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = mainColor;
    ctx.fillText(edition, w - 90, 120);

    ctx.textAlign = "left";
    if (bgOpacity > 0.01) {
      ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity * 1.1})`;
      ctx.fillRect(66, h - 220, w - 132, 145);
    }
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(66, h - 220, w - 132, 145);

    const displayTitle = cardTitle.slice(0, 20);
    const titleFontSize = displayTitle.length > 12 ? 32 : 42;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${titleFontSize}px 'Microsoft YaHei', sans-serif`;
    ctx.fillText(displayTitle, 92, h - 160);

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "500 22px monospace";
    ctx.fillText(subtitle, 92, h - 120);

    ctx.fillStyle = accentColor;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "right";
    ctx.fillText(stats, w - 90, h - 120);
  } else if (style === 'hud') {
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    const bLen = 42;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(40, 40 + bLen); ctx.lineTo(40, 40); ctx.lineTo(40 + bLen, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 40 - bLen, 40); ctx.lineTo(w - 40, 40); ctx.lineTo(w - 40, 40 + bLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40, h - 40 - bLen); ctx.lineTo(40, h - 40); ctx.lineTo(40 + bLen, h - 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 40 - bLen, h - 40); ctx.lineTo(w - 40, h - 40); ctx.lineTo(w - 40, h - 40 - bLen); ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "left";
    ctx.fillText(badge ? (badge.startsWith('//') ? badge : `// ${badge}`) : '', 60, 80);

    ctx.textAlign = "right";
    ctx.fillText(edition, w - 60, 80);

    ctx.textAlign = "left";
    const displayTitle = cardTitle.slice(0, 20);
    const titleFontSize = displayTitle.length > 12 ? 28 : 36;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${titleFontSize}px 'Microsoft YaHei', monospace`;
    ctx.fillText(displayTitle, 60, h - 90);

    ctx.font = "500 20px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText(subtitle, 60, h - 60);

    ctx.textAlign = "right";
    ctx.fillStyle = accentColor;
    ctx.font = "bold 22px monospace";
    ctx.fillText(stats, w - 60, h - 60);
  } else if (style === 'minimal') {
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    ctx.fillStyle = accentColor;
    ctx.font = "bold 28px 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(badge, 54, 80);

    ctx.font = "bold 22px monospace";
    ctx.textAlign = "right";
    ctx.fillText(edition, w - 54, 78);

    ctx.textAlign = "left";
    const displayTitle = cardTitle.slice(0, 20);
    const titleFontSize = displayTitle.length > 12 ? 26 : 34;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${titleFontSize}px 'Microsoft YaHei', sans-serif`;
    ctx.fillText(displayTitle, 54, h - 60);

    ctx.textAlign = "right";
    ctx.fillStyle = accentColor;
    ctx.font = "bold 22px monospace";
    ctx.fillText(stats, w - 54, h - 60);
  } else if (style === 'border_only') {
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(26, 26, w - 52, h - 52);
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 44, w - 88, h - 88);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
