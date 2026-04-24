// 图片水印处理工具

export interface WatermarkOptions {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  opacity?: number;
  position?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';
  padding?: number;
  rotate?: number;
}

// 默认水印配置
const defaultOptions: WatermarkOptions = {
  text: '',
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  color: '#FFFFFF',
  opacity: 0.7,
  position: 'bottomRight',
  padding: 20,
  rotate: 0,
};

// 为图片添加水印并压缩
export const addWatermarkToImage = async (
  file: File,
  options: WatermarkOptions,
  maxWidth: number = 1920,  // 最大宽度
  maxHeight: number = 1920, // 最大高度
  quality: number = 0.8      // JPEG 压缩质量
): Promise<File> => {
  const opts = { ...defaultOptions, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('无法创建 canvas 上下文'));
        return;
      }

      // 计算压缩后的尺寸
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // 设置画布尺寸（压缩后）
      canvas.width = width;
      canvas.height = height;

      // 绘制原图（压缩）
      ctx.drawImage(img, 0, 0, width, height);

      // 设置水印样式
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      ctx.fillStyle = opts.color!;
      ctx.globalAlpha = opts.opacity!;

      // 计算水印位置
      const textMetrics = ctx.measureText(opts.text);
      const textWidth = textMetrics.width;
      const textHeight = opts.fontSize!;

      let x = 0;
      let y = 0;

      switch (opts.position) {
        case 'topLeft':
          x = opts.padding!;
          y = opts.padding! + textHeight;
          break;
        case 'topRight':
          x = width - textWidth - opts.padding!;
          y = opts.padding! + textHeight;
          break;
        case 'bottomLeft':
          x = opts.padding!;
          y = height - opts.padding!;
          break;
        case 'bottomRight':
          x = width - textWidth - opts.padding!;
          y = height - opts.padding!;
          break;
        case 'center':
          x = (width - textWidth) / 2;
          y = (height + textHeight) / 2;
          break;
      }

      // 添加旋转（如果需要）
      if (opts.rotate && opts.rotate !== 0) {
        ctx.save();
        ctx.translate(x + textWidth / 2, y - textHeight / 2);
        ctx.rotate((opts.rotate * Math.PI) / 180);
        ctx.fillText(opts.text, -textWidth / 2, textHeight / 2);
        ctx.restore();
      } else {
        ctx.fillText(opts.text, x, y);
      }

      // 添加时间戳（在文字下方）
      const timestamp = new Date().toLocaleString('zh-CN');
      ctx.font = `${(opts.fontSize! * 0.8)}px ${opts.fontFamily}`;
      const timeMetrics = ctx.measureText(timestamp);
      const timeWidth = timeMetrics.width;

      let timeX = x;
      let timeY = y + textHeight + 5;

      // 调整时间戳位置以适应边界
      if (opts.position === 'topRight' || opts.position === 'bottomRight') {
        timeX = width - timeWidth - opts.padding!;
      }
      if (opts.position === 'topLeft' || opts.position === 'topRight') {
        timeY = y + textHeight + 5;
      }

      ctx.fillText(timestamp, timeX, timeY);

      // 恢复透明度
      ctx.globalAlpha = 1;

      // 转换为文件 - 生成安全文件名（去除中文字符）
      const outputType = 'image/jpeg'; // 统一使用 JPEG 格式压缩
      canvas.toBlob((blob) => {
        if (blob) {
          // 生成安全文件名：保留扩展名，使用随机字符串作为文件名
          const safeFileName = `wm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
          const watermarkedFile = new File([blob], safeFileName, {
            type: outputType,
            lastModified: Date.now(),
          });
          resolve(watermarkedFile);
        } else {
          reject(new Error('无法生成水印图片'));
        }
      }, outputType, quality);
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    reader.readAsDataURL(file);
  });
};

// 批量添加水印
export const addWatermarkToImages = async (
  files: File[],
  options: WatermarkOptions
): Promise<File[]> => {
  const promises = files.map((file) => addWatermarkToImage(file, options));
  return Promise.all(promises);
};

// 生成巡查报告水印文字
export const generateLogWatermark = (
  reportNumber: string,
  userName: string
): string => {
  return `${reportNumber} | ${userName}`;
};

// 生成问题水印文字
export const generateIssueWatermark = (
  location: string,
  date: string
): string => {
  return `${location} | ${date}`;
};

// 预览水印效果
export const previewWatermark = async (
  file: File,
  options: WatermarkOptions
): Promise<string> => {
  const watermarkedFile = await addWatermarkToImage(file, options);
  return URL.createObjectURL(watermarkedFile);
};
