// src/features/holo-card/shaders/typographyShader.js
import * as THREE from 'three';

export const FOIL_STYLE_MAP = {
  original: 0,
  rainbow: 1,
  gold: 2,
  silver: 3
};

export const typographyVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const typographyFragmentShader = `
  uniform sampler2D uTextMap;
  uniform float uHasTextMap;
  uniform int uFoilStyle;
  uniform float uTime;
  uniform vec2 uMouse;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  vec3 rainbow(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    if (uHasTextMap < 0.5) discard;
    vec4 textColor = texture2D(uTextMap, vUv);
    if (textColor.a < 0.05) discard;

    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec2 mouseOffset = (uMouse - 0.5) * 1.8;
    vec3 halfVec = normalize(viewDir + vec3(mouseOffset, 1.0));
    float NdotH = max(0.0, dot(normal, halfVec));
    float glint = pow(NdotH, 35.0) * 1.8;

    vec3 finalColor = textColor.rgb;
    if (uFoilStyle == 1) {
      // 彩虹全息流光 (Rainbow Holographic Foil)
      float diag = vUv.x * 2.0 + vUv.y * 1.5;
      vec3 holo = rainbow(fract(diag * 1.2 + uTime * 0.12));
      finalColor = mix(textColor.rgb, holo * 1.3, 0.60) + glint * holo;
    } else if (uFoilStyle == 2) {
      // 典藏烫金 (Metallic Gold Foil)
      vec3 gold = vec3(1.0, 0.82, 0.28);
      finalColor = mix(textColor.rgb, gold, 0.55) + glint * gold * 2.0;
    } else if (uFoilStyle == 3) {
      // 冷冽烫银 (Silver Chrome Foil)
      vec3 silver = vec3(0.92, 0.95, 1.0);
      finalColor = mix(textColor.rgb, silver, 0.55) + glint * silver * 2.2;
    }

    gl_FragColor = vec4(finalColor, textColor.a);
  }
`;

export function createTypographyUniforms(styleKey = 'gold') {
  const blankCanvas = document.createElement('canvas');
  blankCanvas.width = 16;
  blankCanvas.height = 16;
  const ctx = blankCanvas.getContext('2d');
  ctx.clearRect(0, 0, 16, 16);
  const blankTex = new THREE.CanvasTexture(blankCanvas);

  return {
    uTextMap: { value: blankTex },
    uHasTextMap: { value: 0.0 },
    uFoilStyle: { value: FOIL_STYLE_MAP[styleKey] ?? 2 },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) }
  };
}
