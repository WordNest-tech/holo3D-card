// src/features/holo-card/shaders/layerMaskShader.js
import * as THREE from 'three';

/**
 * 材质风格枚举映射表 (Material Styles)
 * 0: 普通无特殊材质 (Normal)
 * 1: 典藏烫金 (Gold Foil)
 * 2: 彩虹全息流光 (Rainbow Holo)
 * 3: 冷冽镀银/铬银 (Silver Chrome)
 * 4: 霓虹呼吸辉光 (Neon Glow)
 */
export const MATERIAL_STYLE_MAP = {
  normal: 0,
  gold_foil: 1,
  rainbow_holo: 2,
  silver_chrome: 3,
  neon_glow: 4
};

/**
 * 图层混合模式映射表 (Blend Modes)
 * 0: 正常混合 (Normal)
 * 1: 滤色提亮 (Screen)
 * 2: 正片叠底 (Multiply)
 * 3: 线性减淡/自发光叠加 (Additive)
 */
export const BLEND_MODE_MAP = {
  normal: 0,
  screen: 1,
  multiply: 2,
  additive: 3
};

/**
 * 图层遮罩基础顶点着色器 (Layer Vertex Shader)
 * 计算并传递 UV 坐标、视图空间法线及视线向量
 */
export const layerVertexShader = `
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

/**
 * 图层遮罩与材质效果片元着色器 (Layer Fragment Shader)
 * 支持独立 Alpha 遮罩裁剪、全息流光材质渲染、高光反射与混合模式
 */
export const layerFragmentShader = `
  uniform sampler2D uLayerMap;
  uniform sampler2D uMaskMap;
  uniform float uHasMask;
  uniform float uOpacity;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform int uMaterialStyle;
  uniform float uSpecular;
  uniform int uBlendMode;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // 极清色彩空间伽马还原函数 (Linear -> sRGB OETF)
  vec3 linearToSRGB(vec3 value) {
    vec3 linear = max(value, vec3(0.0));
    return mix(
      pow(linear, vec3(0.41666)) * 1.055 - vec3(0.055),
      linear * 12.92,
      vec3(lessThanEqual(linear, vec3(0.0031308)))
    );
  }

  // 余弦全息彩虹色散发生器
  vec3 rainbow(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    // 1. 采样图层原始纹理
    vec4 baseColor = texture2D(uLayerMap, vUv);
    float alpha = baseColor.a;

    // 2. 若激活了遮罩纹理，则将 Alpha 通道与遮罩图的红色通道相乘
    if (uHasMask > 0.5) {
      float maskVal = texture2D(uMaskMap, vUv).r;
      alpha *= maskVal;
    }

    // 3. 透明度极低时提前裁剪片元，避免无效着色与深度写入冲突
    if (alpha < 0.02) discard;

    // 4. 计算光照与高光向量
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // 鼠标偏移交互向量与半角高光向量 (Blinn-Phong)
    vec2 mouseOffset = (uMouse - 0.5) * 1.8;
    vec3 halfVec = normalize(viewDir + vec3(mouseOffset, 1.0));
    float NdotH = max(0.0, dot(normal, halfVec));

    // 镜面高光耀斑强度，结合 uSpecular 控制
    float glint = pow(NdotH, 35.0) * uSpecular * 2.0;

    // 5. 应用不同材质风格效果
    vec3 finalColor = baseColor.rgb;

    if (uMaterialStyle == 0) {
      // normal (0): 原色材质，叠加热点高光
      finalColor = baseColor.rgb + vec3(glint * 0.5);
    } else if (uMaterialStyle == 1) {
      // gold_foil (1): 典藏烫金，混合纯正金色并叠加金色镜面闪斑
      vec3 gold = vec3(1.0, 0.82, 0.28);
      finalColor = mix(baseColor.rgb, gold, 0.55) + glint * gold * 2.0;
    } else if (uMaterialStyle == 2) {
      // rainbow_holo (2): 彩虹全息，动态全息色散波纹与反光
      float diag = vUv.x * 2.0 + vUv.y * 1.5;
      float wave = sin(diag * 6.0 - uTime * 0.8 + mouseOffset.x * 1.5);
      float rainbowCoord = fract(diag * 0.8 + wave * 0.12 + uTime * 0.1);
      vec3 holo = rainbow(rainbowCoord);
      finalColor = mix(baseColor.rgb, holo * 1.25, 0.55) + glint * holo * 1.5;
    } else if (uMaterialStyle == 3) {
      // silver_chrome (3): 冷冽镀银/铬银，混合钛银冷色并叠加银白光斑
      vec3 silver = vec3(0.92, 0.95, 1.0);
      finalColor = mix(baseColor.rgb, silver, 0.55) + glint * silver * 2.2;
    } else if (uMaterialStyle == 4) {
      // neon_glow (4): 霓虹辉光，基于亮度的自发光与周期性呼吸脉冲
      float luminance = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
      float pulse = 0.85 + 0.35 * sin(uTime * 3.5);
      vec3 glow = baseColor.rgb * (1.0 + (luminance + 0.2) * 1.6 * pulse);
      finalColor = glow + glint * baseColor.rgb * 1.2;
    }

    // 6. 图层混合模式修饰 (Blend Mode Adjustment)
    if (uBlendMode == 1) {
      // screen (1): 滤色提亮效果
      finalColor = 1.0 - (1.0 - finalColor) * (1.0 - finalColor * 0.45);
    } else if (uBlendMode == 2) {
      // multiply (2): 正片叠底，加深暗部与对比度
      finalColor = mix(finalColor, finalColor * finalColor, 0.55);
    } else if (uBlendMode == 3) {
      // additive (3): 叠加发光增强
      finalColor *= 1.25;
    }

    // 7. 应用全局图层不透明度并进行极清 sRGB 还原输出
    float finalAlpha = alpha * clamp(uOpacity, 0.0, 1.0);
    gl_FragColor = vec4(linearToSRGB(finalColor), finalAlpha);
  }
`;

/**
 * 创建图层着色器默认 Uniforms (Same pattern as createReliefUniforms and createTypographyUniforms)
 * @param {Object} options 自定义配置项
 * @returns {Object} Three.js Uniforms 结构对象
 */
export function createLayerUniforms(options = {}) {
  // 创建默认透明占位纹理 (Layer Map)
  const blankLayerCanvas = document.createElement('canvas');
  blankLayerCanvas.width = 16;
  blankLayerCanvas.height = 16;
  const lCtx = blankLayerCanvas.getContext('2d');
  lCtx.clearRect(0, 0, 16, 16);
  const blankLayerTex = new THREE.CanvasTexture(blankLayerCanvas);

  // 创建默认全白遮罩纹理 (Mask Map: 纯白即默认全通透)
  const blankMaskCanvas = document.createElement('canvas');
  blankMaskCanvas.width = 16;
  blankMaskCanvas.height = 16;
  const mCtx = blankMaskCanvas.getContext('2d');
  mCtx.fillStyle = '#ffffff';
  mCtx.fillRect(0, 0, 16, 16);
  const blankMaskTex = new THREE.CanvasTexture(blankMaskCanvas);

  // 解析材质风格
  let styleVal = 0;
  if (typeof options.materialStyle === 'string') {
    styleVal = MATERIAL_STYLE_MAP[options.materialStyle] ?? 0;
  } else if (typeof options.materialStyle === 'number') {
    styleVal = options.materialStyle;
  } else if (typeof options.uMaterialStyle === 'number') {
    styleVal = options.uMaterialStyle;
  }

  // 解析混合模式
  let blendVal = 0;
  if (typeof options.blendMode === 'string') {
    blendVal = BLEND_MODE_MAP[options.blendMode] ?? 0;
  } else if (typeof options.blendMode === 'number') {
    blendVal = options.blendMode;
  } else if (typeof options.uBlendMode === 'number') {
    blendVal = options.uBlendMode;
  }

  return {
    uLayerMap: { value: options.layerMap || options.uLayerMap || blankLayerTex },
    uMaskMap: { value: options.maskMap || options.uMaskMap || blankMaskTex },
    uHasMask: { value: options.hasMask ? 1.0 : (options.uHasMask ?? 0.0) },
    uOpacity: { value: options.opacity ?? options.uOpacity ?? 1.0 },
    uTime: { value: 0.0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uMaterialStyle: { value: styleVal },
    uSpecular: { value: options.specular ?? options.uSpecular ?? 1.0 },
    uBlendMode: { value: blendVal }
  };
}
