#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Depth Anything Multi-Layer Separation Engine
Uses Depth-Anything-V2-Small to extract:
1. Grayscale 0-255 Depth Map
2. Foreground RGBA (Character / Closest subject)
3. Midground RGBA (Buildings, utility poles, street objects)
"""

import sys
import os
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
import json
import base64
import io
import numpy as np
from PIL import Image, ImageFilter

def process_depth_layers(input_path, output_json_path=None):
    from transformers import pipeline

    # 1. Load source image
    orig_img = Image.open(input_path).convert("RGBA")
    w, h = orig_img.size

    # 2. Run Depth-Anything-V2-Small
    rgb_img = orig_img.convert("RGB")
    pipe = pipeline(task="depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")
    result = pipe(rgb_img)
    depth_raw = result["depth"]

    # Ensure depth map is resized exactly to original dimensions
    depth_img = depth_raw.resize((w, h), Image.Resampling.BILINEAR)
    depth_arr = np.array(depth_img, dtype=np.float32)

    # Normalize depth to 0..255
    min_val, max_val = depth_arr.min(), depth_arr.max()
    if max_val > min_val:
        depth_norm = ((depth_arr - min_val) / (max_val - min_val) * 255.0).astype(np.uint8)
    else:
        depth_norm = depth_arr.astype(np.uint8)

    # 2.1 双边滤波平滑 (Bilateral Smoothing) 消除物体边缘剧烈阶梯拉伸毛刺 (Shear Streaks)
    import cv2
    if max(w, h) > 1024:
        scale_bi = 1024.0 / max(w, h)
        small_norm = cv2.resize(depth_norm, (int(w * scale_bi), int(h * scale_bi)))
        small_smooth = cv2.bilateralFilter(small_norm, d=5, sigmaColor=30, sigmaSpace=30)
        depth_smooth = cv2.resize(small_smooth, (w, h), interpolation=cv2.INTER_LINEAR)
    else:
        depth_smooth = cv2.bilateralFilter(depth_norm, d=7, sigmaColor=35, sigmaSpace=35)

    # 2.2 AI 画面字体识别与 3D 浮雕掩码生成 (AI Typography Detection & 3D Emboss Mask)
    text_mask = np.zeros((h, w), dtype=np.uint8)
    text_blocks = []
    try:
        import easyocr
        reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        cv_bgr = cv2.cvtColor(np.array(rgb_img), cv2.COLOR_RGB2BGR)

        # 针对超大图像自适应缩放以极速提升 CPU 推理速度
        scale_det = 1.0
        if max(w, h) > 1024:
            scale_det = 1024.0 / max(w, h)
            det_bgr = cv2.resize(cv_bgr, (int(w * scale_det), int(h * scale_det)))
        else:
            det_bgr = cv_bgr

        horiz, free = reader.detect(det_bgr)
        inv_scale = 1.0 / scale_det
        
        if horiz and len(horiz[0]) > 0:
            for box in horiz[0]:
                xmin, xmax, ymin, ymax = [int(v * inv_scale) for v in box]
                xmin, xmax = max(0, xmin), min(w, xmax)
                ymin, ymax = max(0, ymin), min(h, ymax)
                if xmax <= xmin or ymax <= ymin: continue
                patch = cv_bgr[ymin:ymax, xmin:xmax]
                if patch.size == 0: continue
                gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
                # 自适应笔画二值化提取
                if np.mean(gray) > 128:
                    _, bin_patch = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
                else:
                    _, bin_patch = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                text_mask[ymin:ymax, xmin:xmax] = cv2.bitwise_or(text_mask[ymin:ymax, xmin:xmax], bin_patch)
                text_blocks.append({"box": [xmin, ymin, xmax - xmin, ymax - ymin]})

        if free and len(free[0]) > 0:
            for pts in free[0]:
                pts = (np.array(pts, dtype=np.float32) * inv_scale).astype(np.int32)
                cv2.fillPoly(text_mask, [pts], 255)
                text_blocks.append({"polygon": pts.tolist()})
    except Exception as text_err:
        print(f"[Text Detection Notice]: {text_err}", file=sys.stderr)

    has_text = len(text_blocks) > 0

    # 生成 3D 浮雕字体深度注入图 (在原深度图上注入文字倒角凸起高度 +55)
    if has_text:
        text_bevel = cv2.GaussianBlur(text_mask, (5, 5), 1.2).astype(np.float32) / 255.0
        depth_embossed = np.clip(depth_smooth.astype(np.float32) + text_bevel * 55.0, 0, 255).astype(np.uint8)
    else:
        depth_embossed = depth_smooth.copy()

    # 提取独立高保真悬浮文字层 (Text RGBA Layer)
    orig_r, orig_g, orig_b, orig_a = orig_img.split()
    if has_text:
        text_mask_pil = Image.fromarray(text_mask, mode="L").filter(ImageFilter.GaussianBlur(radius=0.6))
        text_alpha = Image.fromarray(
            (np.array(orig_a, dtype=np.float32) * np.array(text_mask_pil, dtype=np.float32) / 255.0).astype(np.uint8)
        )
        text_rgba = orig_img.copy()
        text_rgba.putalpha(text_alpha)
    else:
        text_rgba = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    # 3. Dynamic background & subject analysis (Intelligent handling of multi-person, dark backdrop, anime, and street scenes)
    p12 = float(np.percentile(depth_smooth, 12))
    bg_threshold = max(p12, 12.0)

    subject_pixels = depth_smooth[depth_smooth > bg_threshold]
    if len(subject_pixels) > 500:
        mid_threshold = float(np.percentile(subject_pixels, 15))
        fg_threshold = float(np.percentile(subject_pixels, 55))
    else:
        mid_threshold = 30.0
        fg_threshold = 95.0

    if fg_threshold - mid_threshold < 20:
        fg_threshold = min(250.0, mid_threshold + 35.0)

    # 4. Create Foreground Mask (Soft feathered alpha for closest characters / front subjects)
    fg_mask = np.clip((depth_smooth.astype(np.float32) - (fg_threshold - 8.0)) / 16.0 * 255.0, 0, 255).astype(np.uint8)
    fg_mask_img = Image.fromarray(fg_mask, mode="L").filter(ImageFilter.GaussianBlur(radius=1.2))

    fg_rgba = orig_img.copy()
    combined_fg_a = Image.fromarray(
        (np.array(orig_a, dtype=np.float32) * np.array(fg_mask_img, dtype=np.float32) / 255.0).astype(np.uint8)
    )
    fg_rgba.putalpha(combined_fg_a)

    # 5. Create Midground Mask
    mid_mask = np.clip((depth_smooth.astype(np.float32) - (mid_threshold - 8.0)) / 16.0 * 255.0, 0, 255).astype(np.uint8)
    mid_mask_img = Image.fromarray(mid_mask, mode="L").filter(ImageFilter.GaussianBlur(radius=1.5))

    mid_rgba = orig_img.copy()
    combined_mid_a = Image.fromarray(
        (np.array(orig_a, dtype=np.float32) * np.array(mid_mask_img, dtype=np.float32) / 255.0).astype(np.uint8)
    )
    mid_rgba.putalpha(combined_mid_a)

    # 6. Encode outputs to base64 Data URLs
    def to_base64_url(pil_img, fmt="PNG"):
        buf = io.BytesIO()
        pil_img.save(buf, format=fmt, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/{fmt.lower()};base64,{b64}"

    depth_embossed_img = Image.fromarray(depth_embossed, mode="L")
    depth_clean_img = Image.fromarray(depth_smooth, mode="L")
    depth_b64 = to_base64_url(depth_embossed_img, "PNG")
    depth_clean_b64 = to_base64_url(depth_clean_img, "PNG")
    fg_b64 = to_base64_url(fg_rgba, "PNG")
    mid_b64 = to_base64_url(mid_rgba, "PNG")
    text_b64 = to_base64_url(text_rgba, "PNG") if has_text else ""

    output_data = {
        "success": True,
        "width": w,
        "height": h,
        "thresholds": {
            "foreground": int(fg_threshold),
            "midground": int(mid_threshold)
        },
        "depthMapUrl": depth_b64,
        "depthMapCleanUrl": depth_clean_b64,
        "textLayerUrl": text_b64,
        "hasText": has_text,
        "textCount": len(text_blocks),
        "foregroundUrl": fg_b64,
        "midgroundUrl": mid_b64,
        "hasMidground": bool(np.sum(mid_mask > 30) > 100)
    }

    if output_json_path:
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f)
        print("SUCCESS")
    else:
        print(json.dumps(output_data))

    return output_data

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python depth_layers.py <input_image_path> [output_json_path]", file=sys.stderr)
        sys.exit(1)

    in_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        process_depth_layers(in_path, out_path)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
