// src/features/holo-card/three/createCardGeometry.js
import * as THREE from 'three';

export const CARD_W = 2.4;
export const CARD_H = 3.6;
export const CARD_DEPTH = 0.016;
export const FRONT_SURFACE_Z = 0.012;

/**
 * 创建圆角倒角卡牌挤出几何体
 */
export function createCardGeometry(options = {}) {
  const w = options.cardW || CARD_W;
  const h = options.cardH || CARD_H;
  const depth = options.cardDepth || CARD_DEPTH;
  const radius = options.radius || 0.12;

  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + h - radius);
  shape.quadraticCurveTo(x, y + h, x + radius, y + h);
  shape.lineTo(x + w - radius, y + h);
  shape.quadraticCurveTo(x + w, y + h, x + w, y + h - radius);
  shape.lineTo(x + w, y + radius);
  shape.quadraticCurveTo(x + w, y, x + w - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);

  const baseGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: options.bevelSize || 0.003,
    bevelThickness: options.bevelThickness || 0.003
  });
  baseGeometry.center();
  return baseGeometry;
}
