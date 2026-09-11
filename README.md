# 🎴 3D HoloCard Studio

> **A cutting-edge WebGL & Three.js 3D Holographic Trading Card Creator** featuring Parallax Occlusion Mapping (POM), bilateral mesh displacement, multi-layer depth compositing, AI typography foiling, and generative scene outpainting.
> 
> **基于 WebGL 与 Three.js 的次世代 3D 全息流光卡牌工坊**：集成视差遮蔽映射 (POM)、双边滤波顶点置换、多图层景深微动、AI 字体识别悬浮烫金与生成式全景扩图。

---

<div align="center">
  <img src="assets/holo3D.gif" alt="3D HoloCard Studio Demo - Parallax & Relief" width="640" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); margin-bottom: 20px;" />
  <br /><br />
  <img src="assets/holo3D2.gif" alt="3D HoloCard Studio Demo - Full Feature Showcase" width="640" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);" />
</div>

---

## 🌟 Features / 核心特性

- 🔮 **True 3D Relief & Parallax Occlusion (物理立体浮雕与视差遮蔽)**
  - **14-Step GLSL Raymarching**: Real-time POM raymarching in fragment shader with bilinear interpolation and sub-surface chromatic dispersion ($RGB$ refraction separation).
  - **Bilateral Displaced Geometry**: High-density ($128 \times 180$) card plane with bilateral depth filtering that eliminates jagged edges and step tearing.
  - **Edge-Anchored Border Preservation**: Strict boundary clamping ($Z = 0$ at card perimeter) ensuring crisp, straight outer card edges at all camera angles.

- 🪞 **Seamless Card-Internal Parallax (卡内 3D 视差微动)**
  - Unified optical parallax without silhouette cutouts, hole tearing, or ghosting.
  - Camera-linked ambient background buffer with user retouch & beauty filter persistence.

- ✨ **AI Typography Extraction & Hot-Stamped Foil (AI 字体识别与悬浮烫金)**
  - In-scene text detection (via EasyOCR) generating precision vector stroke masks.
  - Custom material shaders: **Gold Foil (烫金)**, **Rainbow Holo (全息彩虹)**, **Silver Chrome (液态银)**, and **Neon Glow (霓虹发光)**.

- 🌌 **Generative Canvas Outpainting (生成式全景扩图)**
  - AI outpainting (Gemini Vision) expanding any input art into a vertical trading card portrait aspect ratio without altering the primary character.

- 📐 **Dynamic Telemetry Card Back (实时遥测动态卡背)**
  - Dual-buffer 60 FPS procedural canvas displaying gyroscopic angles, live sensor coordinates, dynamic cryptographic hash, and card stats.

- 🎨 **Image Filter & Retouch Pipeline (画质精修与调色流水线)**
  - Real-time exposure, contrast, vibrance, warmth, vignette, sharpen, and portrait smoothing.

---

## 🏗️ Architecture / 系统架构

```
                     ┌────────────────────────┐
                     │   User Art / Image     │
                     └───────────┬────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
┌────────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ Gemini Outpainting │ │ Depth Anything V2 │ │ EasyOCR Text Mask │
│ (Ambient Expansion)│ │  (0-255 Depth Map)│ │ (Emboss & Foils)  │
└──────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
           │                     │                     │
           └─────────────────────┼─────────────────────┘
                                 ▼
                     ┌────────────────────────┐
                     │ HoloSceneManager       │
                     │ - Three.js WebGL Scene │
                     │ - Raymarching Shaders  │
                     │ - Double-sided Meshes  │
                     └───────────┬────────────┘
                                 ▼
                     ┌────────────────────────┐
                     │ Interactive 3D Canvas  │
                     │ (Orbit & Gyro Tilt)    │
                     └────────────────────────┘
```

---

## 🚀 Quick Start / 快速上手

### 1. Requirements / 环境要求
- **Node.js**: >= 18.0.0
- **npm** or **pnpm** / **yarn**
- *(Optional)* **Python**: >= 3.10 with PyTorch for local Depth Anything V2 inference

### 2. Install & Run Frontend / 启动前端 (开箱即用，免登录)

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```
前端将在 `http://localhost:5173` 启动，你可以直接拖拽任何图片体验 3D 浮雕、外框定制与流光调色！

### 3. (Optional) Run AI Proxy Server / 启动 AI 后端服务

AI 后端为 Gemini 扩图、DeepSeek 场景多主体解构与 Python 深度估计提供服务：

```bash
# 进入服务端目录
cd server

# 安装依赖
npm install

# 设置环境变量 (Windows PowerShell 示例)
$env:GEMINI_API_KEY="your_gemini_api_key"
$env:DEEPSEEK_API_KEY="your_deepseek_api_key"

# 启动服务
npm run dev
```
后端将在 `http://localhost:3001` 启动。

### 4. (Optional) Setup Python Depth Inference / 配置 Python 本地深度估计引擎

如需在本地运行 Depth Anything V2 与 EasyOCR 浮雕提取：

```bash
cd server/scripts
pip install -r requirements.txt
```

---

## 🎨 Shader & Optics Principles / 光学与着色器原理

### 1. Parallax Occlusion Mapping (POM)
卡面采用 14 步步进光线步进算法计算视线在微表面高度场内的交点：
$$UV_{offset} = UV_0 + \frac{V_{xy}}{V_z} \cdot H(UV) \cdot \text{scale}$$
并通过三次 Hermite 插值消除采样阶梯，确保在掠射角下依旧具备逼真的凹凸物理折射。

### 2. Bilateral Normal Displacement (双边法线置换)
顶点着色器采用中心向外发散的双边梯度采样：
$$\nabla H = \left( \frac{\partial H}{\partial x}, \frac{\partial H}{\partial y} \right)$$
在边缘区域自动引入边界衰减因子 $\text{edgeFade}$，彻底杜绝了传统置换网格边缘出现的波浪形毛刺与撕裂。

---

## 📂 Project Structure / 目录结构

```
tools/holo-card-studio/
├── frontend/                        # React + Vite + Three.js 客户端
│   ├── src/
│   │   ├── api/                     # 轻量 API 通信模块
│   │   ├── features/holo-card/
│   │   │   ├── components/          # 12 个模块化参数面板
│   │   │   ├── hooks/               # 状态机与图层管理 Hook
│   │   │   ├── shaders/             # POM / 流光 / 遮罩 GLSL 着色器
│   │   │   ├── textures/            # 动态卡背 / 边框 / 滤镜生成器
│   │   │   └── three/               # Three.js 场景管理器与几何体
│   │   ├── App.jsx                  # 独立工作台主视图
│   │   └── main.jsx
│   └── vite.config.js
│
├── server/                          # 轻量 Express AI 后端
│   ├── controllers/                 # 场景与深度估计控制器
│   ├── routes/                      # API 路由
│   ├── scripts/                     # Python Depth Anything V2 引擎
│   └── server.js
│
├── LICENSE                          # MIT 授权协议
└── package.json
```

---

## 📄 License / 开源协议

This project is licensed under the [MIT License](LICENSE).
本项目采用 MIT 许可证，欢迎自由使用、修改与衍生。
