// src/features/holo-card/hooks/useAiReliefPipeline.js
import { useState } from 'react';
import toast from 'react-hot-toast';
import aiApi from '../../../api/aiApi';

export function useAiReliefPipeline() {
  const [isMatting, setIsMatting] = useState(false);

  const generateAiReliefDepth = async ({
    uploadedImageUrl,
    enableTextRelief,
    onSuccess
  }) => {
    if (!uploadedImageUrl || typeof uploadedImageUrl !== 'string') {
      toast.error('请先上传一张卡面图片');
      return;
    }

    setIsMatting(true);
    const toastId = toast.loading('正在进行 AI 空间深度估计与画面字体识别...');
    try {
      const res = await aiApi.extractHoloDepthLayers(uploadedImageUrl);
      if (res?.success) {
        const depthUrl = res.depthMapUrl || '';
        const depthCleanUrl = res.depthMapCleanUrl || res.depthMapUrl || '';
        const hasText = Boolean(res.hasText && res.textLayerUrl);
        const textCount = res.textCount || 0;
        const textLayerUrl = res.textLayerUrl || '';

        if (onSuccess) {
          onSuccess({
            depthEmbossedUrl: depthUrl,
            depthCleanUrl: depthCleanUrl,
            hasText,
            textCount,
            textLayerUrl
          });
        }

        if (hasText) {
          toast.success(`3D 景深与 ${textCount} 处画面字体识别完成！已开启 3D 凹凸立体与悬浮流光。`, { id: toastId });
        } else {
          toast.success('3D 物理景深浮雕构建成功！', { id: toastId });
        }
      } else {
        throw new Error(res?.error || '深度计算服务未返回有效数据');
      }
    } catch (err) {
      console.error(err);
      toast.error(`3D 计算失败: ${err.message || '请重试'}`, { id: toastId });
    } finally {
      setIsMatting(false);
    }
  };

  return {
    isMatting,
    generateAiReliefDepth
  };
}
