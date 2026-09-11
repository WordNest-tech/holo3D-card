// src/api/aiApi.js - 3D HoloCard Studio API Client
import client from './client';

const aiApi = {
  /**
   * 生成 3D 全息闪光卡结构化元数据
   * @param {string} prompt - 用户灵感描述
   * @param {string|null} provider - 可选指定 DEEPSEEK 或 GEMINI
   */
  generateHoloCard: async (prompt, provider = null) => {
    const response = await client.post('/ai/holo-card/generate', { prompt, provider });
    return response.data;
  },

  /**
   * AI 智能分离 3D 立绘主体（自动抠图）
   * @param {string} imageBase64 - 待处理图片 Base64
   */
  extractHoloSubject: async (imageBase64) => {
    const response = await client.post('/ai/holo-card/matting', { imageBase64 });
    return response.data;
  },

  /**
   * AI 深度图估计与多主体图层分离 (Depth Anything V2)
   * @param {string} imageBase64 - 待处理图片 Base64
   */
  extractHoloDepthLayers: async (imageBase64) => {
    const response = await client.post('/ai/holo-card/depth-layers', { imageBase64 });
    return response.data;
  },

  /**
   * DeepSeek Flash 通用多主体场景与 3D 景深分层解析
   * @param {string} imageUrl - 待解析图片 Base64 或 URL
   */
  analyzeHoloScene: async (imageUrl) => {
    const response = await client.post('/ai/holo-card/analyze-scene', { imageUrl });
    return response.data;
  },

  /**
   * Gemini Image 全景生成式扩图 (AI Generative Outpainting)
   * @param {string} imageUrl - 待扩图图片 Base64 或 URL
   * @param {string} promptHint - 可选风格提示
   */
  expandHoloBackground: async (imageUrl, promptHint = '') => {
    const response = await client.post('/ai/holo-card/expand-background', { imageUrl, promptHint });
    return response.data;
  }
};

export default aiApi;
