// server/controllers/holoSceneController.js
// 3D HoloCard Studio: AI Scene Decomposition & Generative Outpainting
const axios = require('axios');

/**
 * 校验与规范化图片载荷
 */
function normalizeImagePayload(rawImage) {
  if (!rawImage || typeof rawImage !== 'string') {
    throw new Error('未提供有效的图片数据 (imageUrl / base64)');
  }
  if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
    return { type: 'url', url: rawImage };
  }
  if (rawImage.startsWith('data:image/')) {
    return { type: 'base64', url: rawImage };
  }
  return { type: 'base64', url: `data:image/jpeg;base64,${rawImage}` };
}

/**
 * 通用场景理解与多主体 3D 物理空间分层解析
 * POST /api/ai/holo-card/analyze-scene
 */
exports.analyzeHoloScene = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const normalized = normalizeImagePayload(imageUrl);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: '服务器尚未配置 DEEPSEEK_API_KEY 环境变量，请在后端环境中配置。'
      });
    }

    const systemPrompt = `你是一位世界顶级的 3D 立体视觉与全息摄影构图专家。
你的任务是通用化分析用户上传的任何图像，将其解构为一个具备真实物理纵深的 3D 多图层场景。

请遵循以下核心原则：
1. 绝对不要过拟合：根据输入画面的真实构图进行客观解析，画面中是什么就提取什么。
2. 识别出 1 到 4 个最显著且适合独立悬浮在卡面上方形成 3D 视差的主体对象（如角色、建筑、前景道具、浮空特效等）。
3. 为每个主体对象标注精细的归一化边界框 bbox [ymin, xmin, ymax, xmax]，取值范围为 0 到 1000 之间的整数。
4. 为每个主体分配合理的 3D 物理悬浮景深高度 depthZ（取值范围 0.05 到 0.65，数字越大越突出悬浮）。
5. 推荐适合该图层在全息卡牌上的材质模型 materialStyle（可选: "normal", "gold_foil", "rainbow_holo", "silver_chrome", "neon_glow"）。

必须严格返回 JSON 格式：
{
  "sceneType": "portrait | landscape | anime | architecture | still_life | fantasy | poster | other",
  "theme": "场景简要中文描述（15字以内）",
  "backgroundExtension": "对背景往四周广角延伸环境的画面想象描述",
  "layers": [
    {
      "id": "layer_1",
      "name": "主体简洁中文名称",
      "type": "character | building | prop | text | effect | other",
      "bbox": [ymin, xmin, ymax, xmax],
      "depthZ": 0.35,
      "materialStyle": "normal | gold_foil | rainbow_holo | silver_chrome | neon_glow",
      "reason": "景深与材质选择理由"
    }
  ]
}`;

    const userContent = [
      {
        type: 'text',
        text: '请解析这张图片，识别出画面内所有核心主体对象，按 3D 视差景深进行分层规划，并输出标准 JSON。'
      },
      {
        type: 'image_url',
        image_url: {
          url: normalized.url,
          detail: 'high'
        }
      }
    ];

    const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/v1\/?$/, '');

    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: 'deepseek-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
        temperature: 0.2
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 45000
      }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('DeepSeek 未返回有效内容');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch (parseErr) {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析返回的 JSON 结构: ' + parseErr.message);
      }
    }

    return res.json({
      success: true,
      data: parsedData,
      usage: response.data.usage
    });
  } catch (error) {
    const errorDetail = error.response?.data?.error?.message || error.response?.data?.message || error.message;
    console.error('[HoloSceneAnalysis] DeepSeek Flash 分析失败:', errorDetail);
    return res.status(500).json({
      success: false,
      message: 'AI 场景多主体解析失败: ' + errorDetail
    });
  }
};

/**
 * 基于 Gemini 视觉扩散模型进行 16:9 场景全景生成式扩图 (AI Generative Outpainting)
 * POST /api/ai/holo-card/expand-background
 */
exports.expandHoloBackground = async (req, res) => {
  try {
    const { imageUrl, promptHint } = req.body;
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: '请提供需要生成全景大背景的卡片图片 (imageUrl)'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: '服务器尚未配置 GEMINI_API_KEY 环境变量，请在后端环境中配置。'
      });
    }

    const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

    let base64Data = imageUrl;
    let mimeType = 'image/jpeg';
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const baseTask = `[CRITICAL TASK: VERTICAL TRADING CARD IMAGE OUTPAINTING & ENVIRONMENT EXPANSION]
You are an expert AI image outpainting and generative canvas expansion system.
You are given an input image (photograph, portrait, anime art, illustration, or character design).
Your task is to perform OUTPAINTING (generative scene extension) to expand the image into a VERTICAL PORTRAIT aspect ratio (3:4 or 9:16 vertical orientation, matching a collector 3D trading card):

1. PRESERVE THE CENTRAL SUBJECT WITH MAXIMUM FIDELITY:
- You MUST KEEP the primary subject (the person, anime character, face, expression, hair, clothing, and pose) in the center of the vertical composition!
- The person/character is the STAR of the card. NEVER erase, omit, remove, or replace the character!
- Maintain the exact face, expression, hairstyle, color palette, and features of the subject with maximum fidelity.

2. GENERATIVE VERTICAL OUTPAINTING — EXPAND SURROUNDING ENVIRONMENT ALL AROUND:
- Seamlessly expand the cropped boundaries in all directions to complete a full vertical trading card scene:
  * Expand DOWNWARD: Show the rest of the character's clothing, torso, hands, or seating naturally.
  * Expand UPWARD: Show the rest of their hair/head, the ceiling, sky, wall, or room architecture above them.
  * Expand SIDES: Complete the surrounding environment.
- The subject should now be naturally framed in the center of the card, with rich, visible background depth extending all around them!
- Ensure lighting, shadows, colors, artistic style, and depth of field perfectly match the input image.

3. STRICT NEGATIVE CONSTRAINTS:
- DO NOT duplicate the character (NO twin clones, NO extra people in the background).
- DO NOT draw ANY outer card frames, metallic borders, polaroid borders, black letterbox bars, watermarks, or text.
- The output MUST be a clean, edge-to-edge, seamless vertical portrait orientation image.`;

    const prompt = promptHint 
      ? `${baseTask}\nUser specific scenery preference: ${promptHint}.`
      : baseTask;

    console.log(`[HoloExpandBackground] Initiating Gemini image outpainting (mime: ${mimeType})...`);

    const modelsToTry = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image', 'gemini-3-pro-image'];
    let generatedImageDataUrl = null;
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[HoloExpandBackground] Trying model ${model}...`);
        const response = await axios.post(
          `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                    }
                  },
                  {
                    text: prompt
                  }
                ]
              }
            ]
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
          }
        );

        const parts = response.data?.candidates?.[0]?.content?.parts || [];
        for (const p of parts) {
          if (p.inline_data || p.inlineData) {
            const img = p.inline_data || p.inlineData;
            const outMime = img.mime_type || img.mimeType || 'image/png';
            generatedImageDataUrl = `data:${outMime};base64,${img.data}`;
            console.log(`[HoloExpandBackground] Model ${model} successfully generated background`);
            break;
          }
        }

        if (generatedImageDataUrl) break;
      } catch (err) {
        lastError = err;
        const errDetail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
        console.warn(`[HoloExpandBackground] Model ${model} failed:`, errDetail);
      }
    }

    if (!generatedImageDataUrl) {
      throw new Error(lastError?.response?.data?.error?.message || lastError?.message || 'Gemini 扩图模型未能生成有效图像');
    }

    return res.json({
      success: true,
      data: {
        backgroundUrl: generatedImageDataUrl,
        expandedImageUrl: generatedImageDataUrl
      }
    });
  } catch (error) {
    console.error('[HoloExpandBackground] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'AI 全景延展扩图失败: ' + (error.response?.data?.error?.message || error.message)
    });
  }
};
