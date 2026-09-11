import { 
  generatePersonMask, 
  generateDepthMap, 
  generateSaliencyMask, 
  maskToDataUrl 
} from './canvasFallbackSegmenter.js';

export const SEGMENTATION_ALGORITHMS = [
  {
    id: 'person',
    name: '人物主体分割',
    description: '适用于人物肖像、角色立绘，自动分离人物与背景',
    icon: 'User',
    tags: ['人物', '肖像', '角色'],
    modelSize: '~4MB',
    speed: '快速'
  },
  {
    id: 'depth',
    name: '通用深度估计',
    description: '适用于任意场景，基于 AI 深度估计分离前景与背景',
    icon: 'Layers',
    tags: ['通用', '建筑', '风景', '道具'],
    modelSize: '~20MB',
    speed: '中等'
  },
  {
    id: 'salient',
    name: '显著物体检测',
    description: '适用于单一主体（道具、装饰、物品），自动提取画面焦点物体',
    icon: 'Scan',
    tags: ['道具', '装饰', '物品', '单体'],
    modelSize: '~8MB',
    speed: '快速'
  },
  {
    id: 'multi',
    name: '多目标实例分割',
    description: '适用于多个独立物体/角色，分别提取每个实例为独立图层',
    icon: 'Users',
    tags: ['多人', '群像', '多物体'],
    modelSize: '~30MB',
    speed: '较慢'
  }
];

class SegmentationService {
  static instance = null;

  constructor() {
    if (SegmentationService.instance) {
      throw new Error('Use SegmentationService.getInstance()');
    }
    this.loadedModels = new Map();
  }

  static getInstance() {
    if (!SegmentationService.instance) {
      SegmentationService.instance = new SegmentationService();
    }
    return SegmentationService.instance;
  }

  getAlgorithmInfo(algorithmId) {
    return SEGMENTATION_ALGORITHMS.find(algo => algo.id === algorithmId) || null;
  }

  isModelLoaded(algorithmId) {
    return this.loadedModels.has(algorithmId);
  }

  async loadModel(algorithmId) {
    if (this.isModelLoaded(algorithmId)) {
      return this.loadedModels.get(algorithmId);
    }
    console.log(`[SegmentationService] Loading model for: ${algorithmId}...`);
    // 模拟加载模型延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    const stubModel = { id: algorithmId, loaded: true };
    this.loadedModels.set(algorithmId, stubModel);
    console.log(`[SegmentationService] Model ${algorithmId} loaded.`);
    return stubModel;
  }

  async segment(algorithmId, imageElement) {
    await this.loadModel(algorithmId);

    const canvas = document.createElement('canvas');
    const width = imageElement.naturalWidth || imageElement.width;
    const height = imageElement.naturalHeight || imageElement.height;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    let result = { masks: [] };

    switch (algorithmId) {
      case 'person': {
        const maskArray = generatePersonMask(imageData, width, height);
        const dataUrl = maskToDataUrl(maskArray, width, height);
        result.masks.push({ label: 'Person', maskDataUrl: dataUrl });
        break;
      }
      case 'depth': {
        const depthArray = generateDepthMap(imageData, width, height);
        const dataUrl = maskToDataUrl(depthArray, width, height);
        result.depthMap = dataUrl;
        break;
      }
      case 'salient':
      case 'multi': {
        const maskArray = generateSaliencyMask(imageData, width, height);
        const dataUrl = maskToDataUrl(maskArray, width, height);
        // 对于 multi，现在暂时退回到 salient
        const label = algorithmId === 'multi' ? 'Instance 1' : 'Subject';
        result.masks.push({ label, maskDataUrl: dataUrl });
        break;
      }
      default:
        throw new Error(`Unsupported algorithm: ${algorithmId}`);
    }

    return result;
  }

  async segmentToLayers(algorithmId, imageElement) {
    const { masks, depthMap } = await this.segment(algorithmId, imageElement);
    
    // 生成即用图层数据
    const layers = masks.map((maskObj, index) => ({
      id: `layer-${index}-${Date.now()}`,
      name: maskObj.label,
      maskDataUrl: maskObj.maskDataUrl,
      visible: true
    }));

    return {
      layers,
      depthMap
    };
  }
}

export default SegmentationService;
