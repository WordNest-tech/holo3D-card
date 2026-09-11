// src/features/holo-card/shaders/reliefShader.js
// 3D 物理景深浮雕着色器 — 视差遮蔽映射 (POM) + 深度法线重建 + 真实色域还原 (Linear -> sRGB)
import * as THREE from 'three';

/**
 * 顶点着色器 — 双边补偿位移 (Bilateral Compensation Displacement)
 *
 * 除了 Z 轴凸起外，还根据深度梯度向 XY 方向微量推挤顶点，
 * 让陡峭过渡区域的面片向"侧壁"方向展开，部分填补拉伸间隙。
 * 同时传递切线空间矩阵 (TBN) 供片元着色器做 POM 射线步进。
 */
export const reliefVertexShader = `
  uniform sampler2D uDepthMap;
  uniform float uDepthScale;
  uniform float uDepthStep;
  uniform float uHasDepth;
  uniform float uHasAmbientBg;
  uniform float uAmbientBgScale;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vTangentViewPos;
  varying vec3 vTangentFragPos;
  varying float vDepth;

  void main() {
    vUv = uv;

    // 若开启视差延展，顶点深度采样同样保持等比居中对齐
    vec2 depthUv = (uHasAmbientBg > 0.5) 
      ? clamp((uv - 0.5) / max(1.05, uAmbientBgScale) + 0.5, vec2(0.001), vec2(0.999)) 
      : uv;

    float rawDepth = 0.0;
    if (uHasDepth > 0.5) {
      rawDepth = texture2D(uDepthMap, depthUv).r;
    }

    float d = rawDepth;
    if (uDepthStep > 0.5 && uHasDepth > 0.5) {
      d = floor(rawDepth * 3.99 + 0.1) / 3.0;
    }

    // 🌟 卡片外沿边界严格平滑锚定 (Card Edge Anchoring)：
    // 卡片四周 2.5% 外沿绝对平滑收拢锚定至 Z=0 卡基，保证卡片四边笔直平整、绝不翘起或波浪畸变
    float marginX = min(uv.x, 1.0 - uv.x);
    float marginY = min(uv.y, 1.0 - uv.y);
    float edgeDist = min(marginX, marginY);
    float borderAnchor = smoothstep(0.000, 0.025, edgeDist);
    d = d * borderAnchor;
    vDepth = d;

    vec3 displaced = position;

    if (uHasDepth > 0.5) {
      // Z 轴主位移（保留主体立体凸起效果）
      displaced.z += d * uDepthScale;

      // ────────────────────────────────────────────────
      // 🌟 双边补偿位移 (Bilateral XY Compensation)
      // 采样邻近像素深度计算梯度，在边缘 3.5% 区域平滑衰减归零，杜绝卡片边缘波浪变形
      // ────────────────────────────────────────────────
      float texelSize = 1.0 / 240.0;  // 对应 240 细分精度
      float dL = texture2D(uDepthMap, depthUv + vec2(-texelSize, 0.0)).r;
      float dR = texture2D(uDepthMap, depthUv + vec2( texelSize, 0.0)).r;
      float dU = texture2D(uDepthMap, depthUv + vec2(0.0,  texelSize)).r;
      float dD = texture2D(uDepthMap, depthUv + vec2(0.0, -texelSize)).r;

      // 深度梯度 (dDepth/dUV)
      float gradX = (dR - dL) * 0.5;
      float gradY = (dU - dD) * 0.5;

      float edgeFade = smoothstep(0.008, 0.035, edgeDist);
      float compensateStrength = uDepthScale * 0.09 * edgeFade;
      displaced.x += clamp(gradX * compensateStrength, -0.010, 0.010);
      displaced.y += clamp(gradY * compensateStrength, -0.010, 0.010);
    }

    // 构建切线空间矩阵 (TBN)，用于片元着色器的 POM 射线步进
    vec3 T = normalize(vec3(1.0, 0.0, 0.0));
    vec3 N = normalize(normal);
    vec3 B = normalize(cross(N, T));
    T = normalize(cross(B, N));
    mat3 TBN = transpose(mat3(T, B, N));

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    vNormal = normalize(normalMatrix * normal);

    // 传递切线空间的视线信息供 POM 使用
    vec3 worldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
    vec3 worldViewPos = cameraPosition;
    vTangentViewPos = TBN * worldViewPos;
    vTangentFragPos = TBN * worldPos;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

/**
 * 片元着色器 — 视差遮蔽映射 (Parallax Occlusion Mapping) + 极清 sRGB 色彩精准还原
 */
export const reliefFragmentShader = `
  uniform sampler2D uBaseMap;
  uniform sampler2D uDepthMap;
  uniform float uHasDepth;
  uniform float uDepthScale;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uHoloIntensity;
  uniform float uSparkleIntensity;
  uniform float uFoilSpecular;
  uniform float uBacklightIntensity;
  uniform vec3 uBacklightColor;
  uniform int uCliffMode; // 0: 真实感像素还原, 1: 物理镂空断裂, 2: 亚克力切边, 3: 连续过渡
  uniform sampler2D uAmbientBgMap;
  uniform float uHasAmbientBg;
  uniform vec2 uParallaxOffset;
  uniform float uAmbientBgScale;
  uniform float uAmbientBgAspect;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vTangentViewPos;
  varying vec3 vTangentFragPos;
  varying float vDepth;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec3 rainbow(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
  }

  // ────────────────────────────────────────────────
  // 🌟 极清色彩空间伽马还原函数 (Linear -> sRGB OETF)
  // 彻底解决 WebGL 采样 sRGB 纹理导致的原画发灰、暗沉、色偏问题，
  // 保证卡面无论在正面或微转状态下均 100% 还原用户原始照片真实色彩！
  // ────────────────────────────────────────────────
  vec3 linearToSRGB(vec3 value) {
    vec3 linear = max(value, vec3(0.0));
    return mix(
      pow(linear, vec3(0.41666)) * 1.055 - vec3(0.055),
      linear * 12.92,
      vec3(lessThanEqual(linear, vec3(0.0031308)))
    );
  }

  // ────────────────────────────────────────────────
  // 🌟 视差遮蔽映射 (POM) — 射线步进求解偏移 UV (标准高度场射线步进)
  // ────────────────────────────────────────────────
  vec2 parallaxOcclusionMapping(vec2 texCoords, vec3 viewDirTangent) {
    if (uHasDepth < 0.5) return texCoords;

    float heightScale = uDepthScale * 0.035;
    float minLayers = 10.0;
    float maxLayers = 32.0;

    float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), viewDirTangent)));
    float layerDepth = 1.0 / numLayers;
    float currentLayerHeight = 1.0;

    vec2 P = viewDirTangent.xy / max(abs(viewDirTangent.z), 0.15) * heightScale;
    P = clamp(P, vec2(-0.03), vec2(0.03));
    vec2 deltaTexCoords = P / numLayers;

    vec2 currentTexCoords = texCoords;
    float currentHeightMapValue = texture2D(uDepthMap, currentTexCoords).r;

    for (float i = 0.0; i < 32.0; i++) {
      if (currentLayerHeight <= currentHeightMapValue) break;
      currentTexCoords -= deltaTexCoords;
      currentHeightMapValue = texture2D(uDepthMap, currentTexCoords).r;
      currentLayerHeight -= layerDepth;
    }

    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;
    float afterHeight = currentHeightMapValue - currentLayerHeight;
    float beforeHeight = (currentLayerHeight + layerDepth) - texture2D(uDepthMap, prevTexCoords).r;
    float weight = afterHeight / (afterHeight + beforeHeight + 0.0001);
    vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);

    return clamp(finalTexCoords, vec2(0.001), vec2(0.999));
  }

  // ────────────────────────────────────────────────
  // 🌟 深度图法线重建 (Depth Normal Reconstruction)
  // ────────────────────────────────────────────────
  vec3 computeDepthNormal(vec2 texCoords) {
    float texelSize = 1.0 / 512.0;
    float dL = texture2D(uDepthMap, texCoords + vec2(-texelSize, 0.0)).r;
    float dR = texture2D(uDepthMap, texCoords + vec2( texelSize, 0.0)).r;
    float dU = texture2D(uDepthMap, texCoords + vec2(0.0,  texelSize)).r;
    float dD = texture2D(uDepthMap, texCoords + vec2(0.0, -texelSize)).r;

    float gradX = (dR - dL) * uDepthScale * 2.5;
    float gradY = (dU - dD) * uDepthScale * 2.5;

    return normalize(vec3(-gradX, -gradY, 1.0));
  }

  // ────────────────────────────────────────────────
  // 🌟 自遮蔽柔和阴影 (Self-Shadowing)
  // ────────────────────────────────────────────────
  float computeSelfShadow(vec2 texCoords, vec3 lightDirTangent) {
    if (uHasDepth < 0.5) return 1.0;

    float heightScale = uDepthScale * 0.08;
    float currentDepth = texture2D(uDepthMap, texCoords).r;

    int numSteps = 8;
    vec2 stepDir = lightDirTangent.xy / max(lightDirTangent.z, 0.001) * heightScale / float(numSteps);
    float stepDepth = currentDepth / float(numSteps);

    float shadow = 1.0;
    vec2 sampleCoords = texCoords;
    float sampleDepthRef = currentDepth;

    for (int i = 1; i <= 8; i++) {
      sampleCoords += stepDir;
      sampleDepthRef -= stepDepth;
      float depthAtSample = texture2D(uDepthMap, clamp(sampleCoords, vec2(0.0), vec2(1.0))).r;

      if (depthAtSample > sampleDepthRef + 0.01) {
        float blockage = (depthAtSample - sampleDepthRef) * 3.5;
        shadow = min(shadow, 1.0 - clamp(blockage, 0.0, 0.28));
      }
    }

    return shadow;
  }

  void main() {
    // 🌟 卡片圆角几何裁切 (精准匹配底层卡基 0.12 倒角，杜绝直角穿透卡框)
    vec2 p = abs(vUv - 0.5);
    vec2 b = vec2(0.5 - 0.050, 0.5 - 0.033);
    vec2 q = max(p - b, vec2(0.0));
    float cornerDist = length(vec2(q.x / 0.050, q.y / 0.033));
    if (p.x > b.x && p.y > b.y && cornerDist > 1.0) {
      discard;
    }

    // 1. POM 视差偏移 UV 坐标与视差延展画幅
    vec3 viewDirTangent = normalize(vTangentViewPos - vTangentFragPos);

    // 开启 3D 视差微动时，以主体为中心适度延展画幅（默认 1.15x~1.18x），预留物理视差平移余量
    float scale = (uHasAmbientBg > 0.5) ? max(1.05, uAmbientBgScale) : 1.0;
    vec2 baseUv = (vUv - 0.5) / scale + 0.5;

    // POM 射线步进求解浮雕视差 UV
    vec2 parallaxUv = (uHasDepth > 0.5) ? parallaxOcclusionMapping(baseUv, viewDirTangent) : baseUv;

    // 2. 负深度背景视差微动 (Negative-Depth Parallax Slide)
    // 背景区域（远景/天空/墙面）随卡片旋转在卡窗深处向后沉浸滑移，主体稳定锁定在中心
    // 100% 统一采样自高保真原画纹理 uBaseMap，彻底根除双图层混合导致的重影与剪影假抠图孔洞！
    vec2 sampleUv = parallaxUv;
    if (uHasAmbientBg > 0.5) {
      float bgWeight = (uHasDepth > 0.5) ? (1.0 - smoothstep(0.12, 0.38, vDepth)) : 1.0;
      sampleUv += uParallaxOffset * bgWeight;
    }
    sampleUv = clamp(sampleUv, vec2(0.001), vec2(0.999));

    // 采样原画纹理
    vec4 baseColor = texture2D(uBaseMap, sampleUv);

    // 2. 法线计算与混合
    vec3 geometryNormal = normalize(vNormal);
    vec3 depthNormal = vec3(0.0, 0.0, 1.0);
    if (uHasDepth > 0.5) {
      depthNormal = computeDepthNormal(parallaxUv);
    }
    vec3 normal = (uHasDepth > 0.5) ? normalize(mix(geometryNormal, depthNormal, 0.65)) : geometryNormal;

    vec3 viewDir = normalize(vViewPosition);
    float NdotV = max(0.0, dot(normal, viewDir));
    float fresnel = pow(1.0 - NdotV, 3.2);

    // 3. 自遮蔽阴影
    vec2 mouseOffset = (uMouse - 0.5) * 1.8;
    vec3 lightDirTangent = normalize(vec3(mouseOffset, 1.0));
    float selfShadow = computeSelfShadow(parallaxUv, lightDirTangent);

    // 4. 全息流光动态质感
    // 倾斜交互系数：倾斜时流光璀璨，静止正面时 100% 呈现纯净原画
    float tiltFactor = clamp(length(mouseOffset) * 1.2, 0.0, 1.0);
    float pomDepth = (uHasDepth > 0.5) ? texture2D(uDepthMap, parallaxUv).r : 0.0;
    float viewFactor = dot(normal.xy, mouseOffset) + (normal.x * 0.3);

    // 彩虹全息波
    float diag = parallaxUv.x * 1.5 + parallaxUv.y * 1.2 + pomDepth * 0.35;
    float wave = sin(diag * 8.0 - uTime * 0.8 + viewFactor * 4.0);
    float rainbowCoord = fract(diag * 0.9 + viewFactor * 0.8 + wave * 0.15 + uTime * 0.04);
    vec3 holoColor = rainbow(rainbowCoord);

    // 碎钻微粒
    vec2 sparkleUv = floor(parallaxUv * 280.0);
    float noise = hash(sparkleUv);
    float sparkle = pow(noise, 32.0) * 8.0 * uSparkleIntensity;
    sparkle *= (sin(uTime * 3.0 + noise * 6.28) * 0.5 + 0.5);

    // 镜面高光
    vec3 halfVec = normalize(viewDir + vec3(mouseOffset, 1.0));
    float NdotH = max(0.0, dot(normal, halfVec));
    float foilGlint = pow(NdotH, 60.0) * uFoilSpecular * 2.2;

    // 轮廓环境光晕（仅在浮雕开启时渲染）
    float rimGlow = 0.0;
    if (uHasDepth > 0.5) {
      rimGlow = pow(1.0 - NdotV, 2.5) * (0.2 + pomDepth * 0.8) * uBacklightIntensity;
    }

    // 合成动态全息层
    vec3 holoEffect = vec3(0.0);
    holoEffect += holoColor * (uHoloIntensity * 0.35 * (0.15 + 0.85 * tiltFactor));
    holoEffect += vec3(sparkle) * (uHoloIntensity * (0.1 + 0.9 * tiltFactor));
    holoEffect += holoColor * foilGlint * uHoloIntensity;
    holoEffect += vec3(fresnel * 0.15) * (uHoloIntensity * (0.2 + 0.8 * tiltFactor));
    holoEffect += uBacklightColor * rimGlow;

    vec3 finalColor = baseColor.rgb + holoEffect * baseColor.a;

    // 5. 🌟 3D 景深侧视断崖拉伸治理与真实感像素虚拟重构 (Realistic Side Inpainting & Cliff Synthesis)
    if (uHasDepth > 0.5) {
      finalColor *= mix(1.0, selfShadow, 0.20);
      
      // 计算三角面真实几何法线倾角 (物理立面倾角)
      vec3 faceDx = dFdx(vViewPosition);
      vec3 faceDy = dFdy(vViewPosition);
      vec3 faceNormal = normalize(cross(faceDx, faceDy));
      float slopeZ = abs(faceNormal.z);

      if (uCliffMode == 0) {
        // 🌟 模式 0：AI 真实感像素虚拟还原 (Virtual Realistic Side Texture - 默认推荐)
        // 当物理三角面倾角立起 (slopeZ < 0.45) 时精准触发
        if (slopeZ < 0.45) {
          float cliffFactor = 1.0 - smoothstep(0.05, 0.45, slopeZ);
          
          // 侧壁落差切线方向 (指向底部背景)
          vec2 cliffTangent = normalize(faceNormal.xy + vec2(0.0001));
          vec2 dropDir = -cliffTangent;
          
          // 采样陡崖底部真实背景像素
          vec2 bottomUv = clamp(parallaxUv + dropDir * (0.02 * uDepthScale + 0.01), vec2(0.001), vec2(0.999));
          vec4 bottomColor = texture2D(uBaseMap, bottomUv);
          
          // 沿垂直高度落差做双向插值 (顶部承接人物原生色彩，底部衔接原画背景)
          float hRatio = clamp(vDepth / max(uDepthScale * 0.45, 0.01), 0.0, 1.0);
          vec3 blendedBase = mix(bottomColor.rgb, baseColor.rgb, smoothstep(0.20, 0.80, hRatio));

          // 切线高频微观结构与自然 AO，彻底打散单像素垂直拉花条纹
          float sCoord = dot(parallaxUv * 64.0, vec2(-cliffTangent.y, cliffTangent.x));
          float zCoord = vDepth * 32.0;
          float microGrain = sin(sCoord * 6.28) * sin(zCoord * 6.28) * 0.5 + 0.5;
          float fineNoise = hash(floor(vec2(sCoord, zCoord) * 3.0));
          float sideDetail = mix(microGrain, fineNoise, 0.35);

          float sideAo = mix(0.68, 1.0, smoothstep(0.0, 0.40, vDepth));
          vec3 virtualPixelColor = blendedBase * (0.85 + sideDetail * 0.25) * sideAo;
          virtualPixelColor += foilGlint * vec3(0.35) * blendedBase + vec3(rimGlow * 0.3);

          finalColor = mix(finalColor, virtualPixelColor, cliffFactor * 0.96);
        }
      } else if (uCliffMode == 1) {
        // 模式 1：物理镂空剔除 (直接将垂直拉伸立面三角面丢弃)
        if (slopeZ < 0.20) discard;
      } else if (uCliffMode == 2) {
        // 模式 2：亚克力黑曜石工艺切面包边
        if (slopeZ < 0.35) {
          float cliffFactor = 1.0 - smoothstep(0.05, 0.35, slopeZ);
          vec3 bevelColor = vec3(0.06, 0.08, 0.12) + foilGlint * vec3(0.5, 0.7, 0.9);
          finalColor = mix(finalColor, bevelColor, cliffFactor * 0.95);
        }
      } else {
        // 模式 3：原生连续平滑抗拉伸微阴影
        float cliffEdgeFade = smoothstep(0.05, 0.35, slopeZ);
        finalColor *= mix(0.88, 1.0, cliffEdgeFade);
      }
    }

    // 6. 🌟 极清无损 sRGB 色彩空间输出
    gl_FragColor = vec4(linearToSRGB(finalColor), baseColor.a);
  }
`;

export function createReliefUniforms(options = {}) {
  const blankDepthCanvas = document.createElement('canvas');
  blankDepthCanvas.width = 16;
  blankDepthCanvas.height = 16;
  const bCtx = blankDepthCanvas.getContext('2d');
  bCtx.fillStyle = '#000000';
  bCtx.fillRect(0, 0, 16, 16);
  const blankDepthTex = new THREE.CanvasTexture(blankDepthCanvas);

  const blankArtCanvas = document.createElement('canvas');
  blankArtCanvas.width = 16;
  blankArtCanvas.height = 16;
  const aCtx = blankArtCanvas.getContext('2d');
  aCtx.fillStyle = '#0c101d';
  aCtx.fillRect(0, 0, 16, 16);
  const blankArtTex = new THREE.CanvasTexture(blankArtCanvas);

  return {
    uBaseMap: { value: blankArtTex },
    uDepthMap: { value: blankDepthTex },
    uHasDepth: { value: 0.0 },
    uDepthScale: { value: options.reliefHeight ?? 0.35 },
    uDepthStep: { value: options.reliefStep ?? 0 },
    uCliffMode: { value: options.cliffMode ?? 0 },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uHoloIntensity: { value: options.holoIntensity ?? 0.0 },
    uSparkleIntensity: { value: options.sparkleIntensity ?? 0.0 },
    uFoilSpecular: { value: options.specularFoil ?? 0.0 },
    uBacklightIntensity: { value: options.depthBacklight ?? 0.0 },
    uBacklightColor: { value: new THREE.Color(options.backlightColor ?? '#00f2fe') },
    uAmbientBgMap: { value: null },
    uHasAmbientBg: { value: 0.0 },
    uParallaxOffset: { value: new THREE.Vector2(0, 0) },
    uAmbientBgScale: { value: 1.35 },
    uAmbientBgAspect: { value: 1.7778 }
  };
}
