// server/controllers/holoDepthController.js
// 3D HoloCard Studio: Depth Estimation, Typography Extraction, & Card Generation
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const axios = require('axios');

/**
 * 图像二进制头部校验
 */
function isValidImageBuffer(buffer) {
  if (!buffer || buffer.length < 4) return false;
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // WebP
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return true;
  }
  return false;
}

/**
 * AI 深度图估计与多主体图层分离 (Python Depth Anything V2 + EasyOCR)
 * POST /api/ai/holo-card/depth-layers
 */
exports.extractHoloDepthLayers = async (req, res, next) => {
  let inputPath = null;
  let outputJsonPath = null;

  const safeCleanup = () => {
    try {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch (e) {}
    try {
      if (outputJsonPath && fs.existsSync(outputJsonPath)) fs.unlinkSync(outputJsonPath);
    } catch (e) {}
  };

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: '请上传需要分离主体的有效图片 (imageBase64)' });
    }

    const MAX_BASE64_LENGTH = 20 * 1024 * 1024;
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({ error: '上传图片过大，单张卡面大小不能超过 15MB' });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (!isValidImageBuffer(buffer)) {
      return res.status(400).json({ error: '不支持的图像格式，仅允许上传 PNG、JPEG、WebP 格式图片' });
    }

    const tempId = `depth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    inputPath = path.join(os.tmpdir(), `${tempId}_in.png`);
    outputJsonPath = path.join(os.tmpdir(), `${tempId}_out.json`);

    await fs.promises.writeFile(inputPath, buffer);

    const scriptPath = path.join(__dirname, '../scripts/depth_layers.py');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    const pythonProcess = spawn(pythonCmd, [scriptPath, inputPath, outputJsonPath]);

    let stderrData = '';
    let isResolved = false;

    // 120 秒超时熔断
    const timeoutTimer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.error('[Depth Layers Timeout]: Process timed out after 120 seconds');
        try {
          pythonProcess.kill('SIGKILL');
        } catch (kErr) {}
        safeCleanup();
        if (!res.headersSent) {
          res.status(504).json({ error: 'AI 3D 景深计算超时，请检查 Python 模型环境或使用较小图片' });
        }
      }
    }, 120000);

    pythonProcess.stderr.on('data', (d) => {
      stderrData += d.toString();
    });

    pythonProcess.on('error', (procErr) => {
      clearTimeout(timeoutTimer);
      if (!isResolved) {
        isResolved = true;
        console.error('[Depth Layers Spawn Error]:', procErr);
        safeCleanup();
        if (!res.headersSent) {
          res.status(500).json({
            error: `AI 深度推理服务启动失败 (${procErr.message})。若未安装本地 Python Depth Anything 环境，可配置 Python 或依赖前端 Canvas 模式。`
          });
        }
      }
    });

    pythonProcess.on('close', async (code) => {
      clearTimeout(timeoutTimer);
      if (isResolved) return;
      isResolved = true;

      try {
        if (code !== 0 || !fs.existsSync(outputJsonPath)) {
          console.error('[Depth Layers Process Error]: code', code, stderrData);
          safeCleanup();
          return res.status(500).json({
            error: 'AI 3D 景深多层分离处理失败，请确保已安装 requirements.txt 依赖'
          });
        }

        const jsonStr = await fs.promises.readFile(outputJsonPath, 'utf-8');
        const result = JSON.parse(jsonStr);

        safeCleanup();
        res.json(result);
      } catch (err) {
        safeCleanup();
        next(err);
      }
    });
  } catch (error) {
    safeCleanup();
    console.error('[HoloCard Depth Layers Error]:', error.message);
    next(error);
  }
};

/**
 * 主体抠图接口
 * POST /api/ai/holo-card/matting
 */
exports.extractHoloSubject = async (req, res, next) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: '请上传图片' });
    }

    const fakeRes = {
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      }),
      json: (data) => {
        if (data.foregroundUrl) {
          res.json({
            success: true,
            subjectUrl: data.foregroundUrl,
            midgroundUrl: data.midgroundUrl,
            depthMapUrl: data.depthMapUrl
          });
        } else {
          res.json(data);
        }
      },
      headersSent: false
    };

    await exports.extractHoloDepthLayers(req, fakeRes, next);
  } catch (err) {
    next(err);
  }
};

/**
 * 生成 3D 全息闪光卡结构化元数据与卡面数值
 * POST /api/ai/holo-card/generate
 */
exports.generateHoloCard = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: '请提供卡牌描述内容 (prompt)' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // 若未配置 API Key，返回开箱即用的高科技默认卡牌数据
      return res.json({
        success: true,
        data: {
          title: prompt.slice(0, 8) || "幻境神域·灵曜",
          subtitle: "CELESTIAL HOLOGRAPHIC CHRONICLE",
          badge: "SSR · 传说典藏",
          stats: "POWER 99999 // FOCUS 100%",
          edition: "NO. 001 / 999",
          element: "神圣",
          color1: "#ffd700",
          color2: "#00f0ff",
          icon: "⚡",
          flavor_text: "踏破虚空，流光永耀。",
          visual_concept: "极具立体纵深的金色全息浮雕流光卡牌"
        }
      });
    }

    // 调用 DeepSeek 生成典藏数据
    const systemPrompt = `你是一个顶级 3D 全息收藏卡牌艺术总监与数值架构师。
请根据用户的灵感设计一张极具视觉震撼力与收藏价值的 3D 全息闪光卡。
你必须返回严格的 JSON 格式（不要包含任何 markdown 代码块）：
{
  "title": "卡牌名称(4-8字)",
  "subtitle": "英文全大写副标题",
  "badge": "稀有度徽章(如：SSR · 传说典藏)",
  "stats": "战力或属性(如：ATK 99999 / DEF 88000)",
  "edition": "典藏编号(如：NO. 001 / 999)",
  "element": "元素类型(如：神圣/烈焰/赛博)",
  "color1": "主色调十六进制Hex(如：#ffd700)",
  "color2": "辅色调十六进制Hex(如：#00f0ff)",
  "icon": "一个代表卡牌核心特征的单字或Emoji",
  "flavor_text": "一两句极具压迫感或文学感的卡面典藏寄语",
  "visual_concept": "卡面画面的中文视觉构思"
}`;

    const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/v1\/?$/, '');
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        timeout: 30000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    const cardData = JSON.parse(content);

    return res.json({
      success: true,
      data: cardData
    });
  } catch (error) {
    console.error('[HoloCard Generation Error]:', error.message);
    next(error);
  }
};
