// src/features/holo-card/three/HoloSceneManager.js
import * as THREE from 'three';
import { createCardGeometry, CARD_W, CARD_H, FRONT_SURFACE_Z } from './createCardGeometry';
import { reliefVertexShader, reliefFragmentShader, createReliefUniforms } from '../shaders/reliefShader';
import { typographyVertexShader, typographyFragmentShader, createTypographyUniforms, FOIL_STYLE_MAP } from '../shaders/typographyShader';
import { layerVertexShader, layerFragmentShader, createLayerUniforms, MATERIAL_STYLE_MAP, BLEND_MODE_MAP } from '../shaders/layerMaskShader';
import { createBackTextureManager, generateBackTexture } from '../textures/backTexture';
import { generateInitCardTexture } from '../textures/initCardTexture';

/**
 * 纯 JS 驱动的 3D 全息卡牌渲染引擎 (HoloSceneManager)
 * 彻底解耦 React 渲染生命周期，杜绝状态闭包过期与内存泄漏
 */
export class HoloSceneManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    this.isDisposed = false;
    this.isDragging = false;
    this.isFlipped = false;
    this.isAutoRotate = options.isAutoRotate ?? false;
    this.prevMousePos = { x: 0, y: 0 };
    this.targetRotation = { x: 0, y: 0 };
    this.currentRotation = { x: 0, y: 0 };

    this.frameDepth = options.frameDepth ?? 0.08;
    this.textDepth = options.textDepth ?? 0.22;
    this.enableTextFloat = options.enableTextFloat ?? true;
    this.hasText = false;

    this.initScene();
    this.initCardMeshes();
    this.bindEvents();
    this.startAnimation();
  }

  initScene() {
    const container = this.container;
    this.scene = new THREE.Scene();

    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.camera.position.set(0, 0, aspect < 1 ? 6.6 : 5.7);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.replaceChildren(this.renderer.domElement);

    // 灯光系统
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambientLight);

    this.dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    this.dirLight1.position.set(4, 5, 4);
    this.scene.add(this.dirLight1);

    this.dirLight2 = new THREE.DirectionalLight(0x00f2fe, 0.85);
    this.dirLight2.position.set(-4, -2, 2);
    this.scene.add(this.dirLight2);

    this.cardGroup = new THREE.Group();
    this.scene.add(this.cardGroup);

    // 动态图层栈容器 — 所有用户自定义图层的 Mesh 挂载于此
    this.layersGroup = new THREE.Group();
    this.layersGroup.name = 'layersGroup';
    this.cardGroup.add(this.layersGroup);

    // 图层 ID → { mesh, uniforms, layer } 的映射表
    this.layerMeshMap = new Map();
  }

  initCardMeshes() {
    // 1. 实体卡牌边框底座几何体
    const baseGeometry = createCardGeometry();
    const cardEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      metalness: 0.95,
      roughness: 0.25
    });
    this.cardBaseMesh = new THREE.Mesh(baseGeometry, cardEdgeMaterial);
    this.cardGroup.add(this.cardBaseMesh);

    // 2. 3D 浮雕表面网格 (160×240 高精度细分)
    this.reliefUniforms = createReliefUniforms(this.options);
    this.reliefMaterial = new THREE.ShaderMaterial({
      uniforms: this.reliefUniforms,
      vertexShader: reliefVertexShader,
      fragmentShader: reliefFragmentShader,
      toneMapped: false,
      transparent: true,
      side: THREE.FrontSide
    });
    const reliefGeo = new THREE.PlaneGeometry(CARD_W * 0.98, CARD_H * 0.98, 160, 240);
    this.reliefPlane = new THREE.Mesh(reliefGeo, this.reliefMaterial);
    this.reliefPlane.position.z = FRONT_SURFACE_Z + 0.002;
    this.cardGroup.add(this.reliefPlane);

    // 默认纯净引导卡面
    this.reliefUniforms.uBaseMap.value = generateInitCardTexture();

    const planeGeo = new THREE.PlaneGeometry(CARD_W * 0.98, CARD_H * 0.98);

    // 3. 独立 3D 悬浮文字层网格
    this.textUniforms = createTypographyUniforms(this.options.textFoilStyle || 'gold');
    this.textMaterial = new THREE.ShaderMaterial({
      uniforms: this.textUniforms,
      vertexShader: typographyVertexShader,
      fragmentShader: typographyFragmentShader,
      transparent: true,
      toneMapped: false,
      depthWrite: false
    });
    this.textPlane = new THREE.Mesh(planeGeo, this.textMaterial);
    this.textPlane.position.z = 0.030 + this.textDepth;
    this.textPlane.visible = false;
    this.cardGroup.add(this.textPlane);

    // 4. 金属外框图层网格
    this.frameMaterial = new THREE.MeshStandardMaterial({
      map: this.options.frameTexture || null,
      transparent: true,
      metalness: 0.9,
      roughness: 0.2
    });
    this.framePlane = new THREE.Mesh(planeGeo, this.frameMaterial);
    this.framePlane.position.z = FRONT_SURFACE_Z + Math.max(0.005, this.frameDepth);
    this.framePlane.visible = this.options.showFrame ?? false;
    this.cardGroup.add(this.framePlane);

    // 5. 先锋防伪实时动态遥测卡背网格
    this.backManager = createBackTextureManager();
    this.backMaterial = new THREE.MeshBasicMaterial({ map: this.backManager.texture });
    this.backPlane = new THREE.Mesh(planeGeo, this.backMaterial);
    this.backPlane.rotation.y = Math.PI;
    this.backPlane.position.z = -FRONT_SURFACE_Z - 0.001;
    this.cardGroup.add(this.backPlane);

    // 6. 卡片内部全景视差背景支持 (Card-Space Parallax)
    // 严格限制在卡片内部空间，旋转卡片时在卡框窗口内产生深度 3D 视差微动，绝不外溢
    this.ambientBgTexture = null;
  }

  bindEvents() {
    this.onPointerDown = (e) => {
      this.isDragging = true;
      this.prevMousePos = { x: e.clientX || 0, y: e.clientY || 0 };
    };

    this.onPointerMove = (e) => {
      const clientX = e.clientX || 0;
      const clientY = e.clientY || 0;

      const normX = clientX / window.innerWidth;
      const normY = 1.0 - (clientY / window.innerHeight);
      this.updateMouse(normX, normY);

      if (this.isDragging) {
        const deltaX = clientX - this.prevMousePos.x;
        const deltaY = clientY - this.prevMousePos.y;
        this.prevMousePos = { x: clientX, y: clientY };

        this.targetRotation.y += deltaX * 0.008;
        this.targetRotation.x += deltaY * 0.008;
        this.targetRotation.x = Math.max(-0.85, Math.min(0.85, this.targetRotation.x));
      }
    };

    this.onPointerUp = () => {
      this.isDragging = false;
    };

    this.onTouchStart = (e) => {
      if (e.touches && e.touches.length === 1) {
        this.isDragging = true;
        this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    this.onTouchMove = (e) => {
      if (e.touches && e.touches.length === 1) {
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;

        const normX = clientX / window.innerWidth;
        const normY = 1.0 - (clientY / window.innerHeight);
        this.updateMouse(normX, normY);

        if (this.isDragging) {
          if (e.cancelable) e.preventDefault();
          const deltaX = clientX - this.prevMousePos.x;
          const deltaY = clientY - this.prevMousePos.y;
          this.prevMousePos = { x: clientX, y: clientY };

          this.targetRotation.y += deltaX * 0.008;
          this.targetRotation.x += deltaY * 0.008;
          this.targetRotation.x = Math.max(-0.85, Math.min(0.85, this.targetRotation.x));
        }
      }
    };

    this.onTouchEnd = () => {
      this.isDragging = false;
    };

    this.onDblClick = () => {
      this.flipCard();
    };

    this.onResize = () => {
      if (!this.container || this.isDisposed) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w === 0 || h === 0) return;
      this.camera.aspect = w / h;
      this.camera.position.z = this.camera.aspect < 1 ? 6.6 : 5.7;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    const c = this.container;
    c.addEventListener('mousedown', this.onPointerDown);
    c.addEventListener('dblclick', this.onDblClick);
    window.addEventListener('mousemove', this.onPointerMove);
    window.addEventListener('mouseup', this.onPointerUp);

    c.addEventListener('touchstart', this.onTouchStart, { passive: true });
    c.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('resize', this.onResize);
  }

  updateMouse(x, y) {
    if (this.reliefUniforms?.uMouse) {
      this.reliefUniforms.uMouse.value.set(x, y);
    }
    if (this.textUniforms?.uMouse) {
      this.textUniforms.uMouse.value.set(x, y);
    }
    // 同步所有动态图层的鼠标位置
    for (const entry of this.layerMeshMap.values()) {
      if (entry.uniforms?.uMouse) {
        entry.uniforms.uMouse.value.set(x, y);
      }
    }
  }

  startAnimation() {
    const clock = new THREE.Clock();
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let currentFps = 60;

    const loop = () => {
      if (this.isDisposed) return;
      this.animId = requestAnimationFrame(loop);
      const elapsed = clock.getElapsedTime();

      // 实时帧率平滑统计
      frameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 500) {
        currentFps = (frameCount * 1000) / (now - lastFpsTime);
        frameCount = 0;
        lastFpsTime = now;
      }

      if (this.reliefUniforms?.uTime) {
        this.reliefUniforms.uTime.value = elapsed;
      }
      if (this.textUniforms?.uTime) {
        this.textUniforms.uTime.value = elapsed;
      }

      // 同步所有动态图层的 uTime
      for (const entry of this.layerMeshMap.values()) {
        if (entry.uniforms?.uTime) {
          entry.uniforms.uTime.value = elapsed;
        }
      }

      if (this.isAutoRotate) {
        this.targetRotation.y += 0.008;
      }

      this.currentRotation.x = THREE.MathUtils.lerp(this.currentRotation.x, this.targetRotation.x, 0.08);
      this.currentRotation.y = THREE.MathUtils.lerp(this.currentRotation.y, this.targetRotation.y, 0.08);

      this.cardGroup.rotation.x = this.currentRotation.x;
      this.cardGroup.rotation.y = this.currentRotation.y;

      if (this.framePlane) {
        this.framePlane.position.x = 0;
        this.framePlane.position.y = 0;
      }

      if (!this.isDragging && !this.isAutoRotate) {
        this.cardGroup.position.y = Math.sin(elapsed * 1.5) * 0.04;
      }

      // 旋转卡片互动 3D 视差平移微动 (Card-Space Parallax Motion)
      // 随着旋转卡片，背景在卡框窗口内部深邃平移，与突出的 3D 浮雕产生极佳空间微缩视差，且绝不外溢、绝不拉伸边缘
      if (this.reliefUniforms?.uHasAmbientBg?.value > 0.5) {
        const bgScale = this.reliefUniforms.uAmbientBgScale?.value || 1.18;
        const bgAspect = this.reliefUniforms.uAmbientBgAspect?.value || 0.6667;
        const cardAspect = 0.6667;

        let scaleX = bgScale;
        let scaleY = bgScale;
        if (bgAspect >= cardAspect) {
          scaleX = bgScale * (bgAspect / cardAspect);
          scaleY = bgScale;
        } else {
          scaleX = bgScale;
          scaleY = bgScale * (cardAspect / bgAspect);
        }

        // 计算物理安全位移余量 (保证采样 UV 绝不越界至 0 或 1)
        const safeMarginX = Math.max(0.03, 0.5 - 0.5 / scaleX);
        const safeMarginY = Math.max(0.03, 0.5 - 0.5 / scaleY);

        const parallaxFactor = 0.08;
        // 🌟 物理沉浸真视差：背景层严格作为景深后置层 (Z < 0 负深度)
        // 旋转时背景逆向平移，呈现深邃卡内视窗纵深感，彻底杜绝反向视差导致的"凸在前面"
        const rawX = this.currentRotation.y * parallaxFactor;
        const rawY = -this.currentRotation.x * parallaxFactor;

        const clampedX = Math.max(-safeMarginX * 0.90, Math.min(safeMarginX * 0.90, rawX));
        const clampedY = Math.max(-safeMarginY * 0.90, Math.min(safeMarginY * 0.90, rawY));

        this.reliefUniforms.uParallaxOffset.value.set(clampedX, clampedY);
      }

      // 🌟 实时卡背 HUD 动态遥测参数更新 (当卡背面向观察者或正在翻转时高频同步，正面时自动休眠保帧率)
      const facingY = Math.cos(this.currentRotation.y);
      if (this.backManager && (facingY < 0.25 || this.isFlipped)) {
        const pitchDeg = -(this.currentRotation.x * 180 / Math.PI);
        const rawYaw = (this.currentRotation.y * 180 / Math.PI) % 360;
        const yawDeg = rawYaw < 0 ? rawYaw + 360 : rawYaw;
        const depthVal = this.reliefUniforms?.uDepthScale?.value ?? 0.35;
        const prxVal = this.reliefUniforms?.uAmbientBgScale?.value ?? 1.18;
        const lightVec = this.reliefUniforms?.uMouse?.value || { x: 0.5, y: 0.5 };

        this.backManager.update({
          pitch: pitchDeg,
          yaw: yawDeg,
          depth: depthVal,
          prxScale: prxVal,
          lightX: lightVec.x,
          lightY: lightVec.y,
          fps: currentFps,
          elapsed: elapsed
        });
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  // API 控制方法
  setBaseTexture(texture) {
    if (this.reliefUniforms) {
      this.reliefUniforms.uBaseMap.value = texture;
    }
  }

  /**
   * 设置卡片内部全景视差大背景 (Card-Space Parallax Ambient Background)
   * 严格局限在卡片窗口内部，随卡片旋转产生物理视差，绝不泄漏至外部
   * @param {THREE.Texture|null} texture - 背景纹理
   * @param {number} scale - 延展倍率 (例如 1.18)
   * @param {boolean} visible - 是否可见
   */
  setAmbientBackground(texture, scale = 1.18, visible = true) {
    this.ambientBgTexture = (visible && texture) ? texture : null;
    if (this.reliefUniforms) {
      let aspect = 0.6667; // 默认 3D 卡牌比例
      if (texture?.image?.width && texture?.image?.height) {
        aspect = texture.image.width / texture.image.height;
      }
      this.reliefUniforms.uAmbientBgMap.value = (visible && texture) ? texture : null;
      this.reliefUniforms.uHasAmbientBg.value = (visible && texture) ? 1.0 : 0.0;
      this.reliefUniforms.uAmbientBgScale.value = Math.max(1.05, scale);
      this.reliefUniforms.uAmbientBgAspect.value = aspect;
    }
  }

  setDepthTexture(texture, hasDepth = true) {
    if (this.reliefUniforms) {
      this.reliefUniforms.uDepthMap.value = texture;
      this.reliefUniforms.uHasDepth.value = hasDepth ? 1.0 : 0.0;
    }
  }

  setTextTexture(texture, hasText = true) {
    this.hasText = hasText;
    if (this.textUniforms) {
      this.textUniforms.uTextMap.value = texture;
      this.textUniforms.uHasTextMap.value = hasText ? 1.0 : 0.0;
    }
    this.updateTextPlaneVisibility();
  }

  setReliefHeight(height) {
    if (this.reliefUniforms) {
      this.reliefUniforms.uDepthScale.value = height;
    }
  }

  setReliefStep(step) {
    if (this.reliefUniforms) {
      this.reliefUniforms.uDepthStep.value = step;
    }
  }

  setCliffMode(mode) {
    if (this.reliefUniforms) {
      this.reliefUniforms.uCliffMode.value = mode;
    }
  }

  setFrameVisible(visible) {
    if (this.framePlane) {
      this.framePlane.visible = visible;
    }
  }

  setFrameDepth(depth) {
    this.frameDepth = depth;
    if (this.framePlane) {
      this.framePlane.position.z = FRONT_SURFACE_Z + Math.max(0.005, depth);
    }
  }

  setFrameTexture(texture) {
    if (this.frameMaterial) {
      this.frameMaterial.map = texture;
      this.frameMaterial.needsUpdate = true;
    }
  }

  setTextVisible(enableFloat) {
    this.enableTextFloat = enableFloat;
    this.updateTextPlaneVisibility();
  }

  setTextDepth(depth) {
    this.textDepth = depth;
    if (this.textPlane) {
      this.textPlane.position.z = 0.030 + depth;
    }
  }

  setTextFoilStyle(styleKey) {
    if (this.textUniforms) {
      this.textUniforms.uFoilStyle.value = FOIL_STYLE_MAP[styleKey] ?? 2;
    }
  }

  updateTextPlaneVisibility() {
    if (this.textPlane) {
      this.textPlane.visible = Boolean(this.enableTextFloat && this.hasText);
      this.textPlane.position.z = 0.030 + this.textDepth;
    }
  }

  setMaterialParams({ holoIntensity, sparkleIntensity, specularFoil, depthBacklight, backlightColor }) {
    if (!this.reliefUniforms) return;
    if (holoIntensity !== undefined) this.reliefUniforms.uHoloIntensity.value = holoIntensity;
    if (sparkleIntensity !== undefined) this.reliefUniforms.uSparkleIntensity.value = sparkleIntensity;
    if (specularFoil !== undefined) this.reliefUniforms.uFoilSpecular.value = specularFoil;
    if (depthBacklight !== undefined) this.reliefUniforms.uBacklightIntensity.value = depthBacklight;
    if (backlightColor !== undefined) this.reliefUniforms.uBacklightColor.value.set(backlightColor);
  }

  // ============================================================
  // 🌟 动态图层栈管理 API (Dynamic Layer Stack)
  // ============================================================

  /**
   * 为指定图层创建对应的 Three.js Mesh 并挂载到 layersGroup
   * @param {Object} layer - HoloLayer 数据对象
   */
  addLayerMesh(layer) {
    if (!layer || !layer.id || this.layerMeshMap.has(layer.id)) return;

    const planeGeo = new THREE.PlaneGeometry(CARD_W * 0.98, CARD_H * 0.98);
    const uniforms = createLayerUniforms({
      opacity: layer.opacity ?? 1.0,
      materialStyle: layer.materialStyle ?? 'normal',
      specular: layer.specular ?? 0.5,
      blendMode: layer.blendMode ?? 'normal'
    });

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: layerVertexShader,
      fragmentShader: layerFragmentShader,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      side: THREE.FrontSide
    });

    const mesh = new THREE.Mesh(planeGeo, material);
    mesh.name = `layer_${layer.id}`;
    mesh.position.z = FRONT_SURFACE_Z + 0.003 + (layer.depth ?? 0.15);
    mesh.visible = layer.visible !== false;

    // 加载图层纹理
    if (layer.contentUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const tex = new THREE.CanvasTexture(this._fitImageToLayerCanvas(img));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        uniforms.uLayerMap.value = tex;
      };
      img.src = layer.contentUrl;
    }

    // 加载遮罩纹理（如果存在分割数据）
    if (layer.segmentation?.maskBase64) {
      const maskImg = new Image();
      maskImg.crossOrigin = 'anonymous';
      maskImg.onload = () => {
        const maskTex = new THREE.CanvasTexture(this._fitImageToLayerCanvas(maskImg));
        maskTex.generateMipmaps = false;
        maskTex.minFilter = THREE.LinearFilter;
        maskTex.needsUpdate = true;
        uniforms.uMaskMap.value = maskTex;
        uniforms.uHasMask.value = 1.0;

        // 如果是背景层，需要反转遮罩（在着色器中无需修改，只需发送反转后的纹理）
        if (layer.segmentation.isForeground === false) {
          this._invertMaskTexture(maskImg, uniforms);
        }
      };
      maskImg.src = layer.segmentation.maskBase64;
    }

    this.layersGroup.add(mesh);
    this.layerMeshMap.set(layer.id, { mesh, uniforms, layer: { ...layer } });
  }

  /**
   * 移除指定图层的 Mesh
   * @param {string} layerId
   */
  removeLayerMesh(layerId) {
    const entry = this.layerMeshMap.get(layerId);
    if (!entry) return;

    this.layersGroup.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    entry.mesh.material.dispose();

    // 释放纹理
    if (entry.uniforms.uLayerMap.value && entry.uniforms.uLayerMap.value.dispose) {
      entry.uniforms.uLayerMap.value.dispose();
    }
    if (entry.uniforms.uMaskMap.value && entry.uniforms.uMaskMap.value.dispose) {
      entry.uniforms.uMaskMap.value.dispose();
    }

    this.layerMeshMap.delete(layerId);
  }

  /**
   * 更新指定图层的属性（深度、透明度、材质、可见性等）
   * @param {string} layerId
   * @param {Object} updates - 属性增量更新对象
   */
  updateLayerMesh(layerId, updates) {
    const entry = this.layerMeshMap.get(layerId);
    if (!entry) return;

    const { mesh, uniforms } = entry;

    if (updates.depth !== undefined) {
      mesh.position.z = FRONT_SURFACE_Z + 0.003 + updates.depth;
    }
    if (updates.visible !== undefined) {
      mesh.visible = updates.visible;
    }
    if (updates.opacity !== undefined) {
      uniforms.uOpacity.value = updates.opacity;
    }
    if (updates.materialStyle !== undefined) {
      uniforms.uMaterialStyle.value = MATERIAL_STYLE_MAP[updates.materialStyle] ?? 0;
    }
    if (updates.specular !== undefined) {
      uniforms.uSpecular.value = updates.specular;
    }
    if (updates.blendMode !== undefined) {
      uniforms.uBlendMode.value = BLEND_MODE_MAP[updates.blendMode] ?? 0;
    }
    if (updates.position !== undefined) {
      mesh.position.x = (updates.position.x || 0) * CARD_W * 0.01;
      mesh.position.y = (updates.position.y || 0) * CARD_H * 0.01;
    }
    if (updates.scale !== undefined) {
      mesh.scale.set(updates.scale.x || 1, updates.scale.y || 1, 1);
    }
    if (updates.rotation !== undefined) {
      mesh.rotation.z = updates.rotation * (Math.PI / 180);
    }

    // 更新缓存的 layer 数据
    Object.assign(entry.layer, updates);
  }

  /**
   * 全量同步图层数组 — 增删更新一步到位
   * @param {Array} layers - 最新的完整图层数组
   */
  syncAllLayers(layers) {
    if (!layers || !Array.isArray(layers)) return;

    const currentIds = new Set(this.layerMeshMap.keys());
    const newIds = new Set(layers.map((l) => l.id));

    // 1. 移除已删除的图层 Mesh
    for (const existingId of currentIds) {
      if (!newIds.has(existingId)) {
        this.removeLayerMesh(existingId);
      }
    }

    // 2. 新增或更新图层 Mesh
    layers.forEach((layer, index) => {
      if (!currentIds.has(layer.id)) {
        // 新图层 → 创建 Mesh
        this.addLayerMesh(layer);
      } else {
        // 已存在 → 更新属性
        this.updateLayerMesh(layer.id, layer);
      }

      // 确保 renderOrder 按数组顺序递增（越后面的层渲染在越上方）
      const entry = this.layerMeshMap.get(layer.id);
      if (entry) {
        entry.mesh.renderOrder = 100 + index;
      }
    });
  }

  /**
   * 将图片绘制到卡面尺寸 Canvas（cover 模式）
   * @private
   */
  _fitImageToLayerCanvas(img, canvasW = 1536, canvasH = 2304) {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    // 若图片尺寸本身就是目标分辨率（如已排版对齐的透明主体图层），直接无损绘制，保证 1:1 像素级对齐
    if (imgW === canvasW && imgH === canvasH) {
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return canvas;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);

    const scale = Math.max(canvasW / imgW, canvasH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (canvasW - drawW) / 2;
    const drawY = (canvasH - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    return canvas;
  }

  /**
   * 反转遮罩纹理（用于背景层：前景遮罩取反）
   * @private
   */
  _invertMaskTexture(maskImg, uniforms) {
    const canvas = document.createElement('canvas');
    const w = maskImg.naturalWidth || maskImg.width;
    const h = maskImg.naturalHeight || maskImg.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(maskImg, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = 255 - data[i];     // R
      data[i + 1] = 255 - data[i + 1]; // G
      data[i + 2] = 255 - data[i + 2]; // B
      // A 保持不变
    }
    ctx.putImageData(imageData, 0, 0);

    const invertedTex = new THREE.CanvasTexture(canvas);
    invertedTex.generateMipmaps = false;
    invertedTex.minFilter = THREE.LinearFilter;
    invertedTex.needsUpdate = true;
    uniforms.uMaskMap.value = invertedTex;
  }

  flipCard(onFlipStateChange) {
    this.isFlipped = !this.isFlipped;
    this.targetRotation.y += Math.PI;
    if (onFlipStateChange) onFlipStateChange(this.isFlipped);
  }

  setAutoRotate(bool) {
    this.isAutoRotate = bool;
  }

  captureScreenshot(format = 'image/png') {
    if (!this.renderer) return null;
    return this.renderer.domElement.toDataURL(format);
  }

  dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.animId);

    const c = this.container;
    if (c) {
      c.removeEventListener('mousedown', this.onPointerDown);
      c.removeEventListener('dblclick', this.onDblClick);
      c.removeEventListener('touchstart', this.onTouchStart);
      c.removeEventListener('touchmove', this.onTouchMove);
    }
    window.removeEventListener('mousemove', this.onPointerMove);
    window.removeEventListener('mouseup', this.onPointerUp);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('resize', this.onResize);

    if (this.ambientBgMesh) {
      this.ambientBgMesh.geometry?.dispose();
      this.ambientBgMaterial?.dispose();
    }

    if (this.backManager) {
      this.backManager.dispose();
      this.backManager = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}
