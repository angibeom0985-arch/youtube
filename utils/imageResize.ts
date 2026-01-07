import { AspectRatio } from "../types";

/**
 * Base64 이미지를 원하는 비율로 크롭/리사이즈
 */
export const resizeImageToAspectRatio = async (
  base64Image: string,
  targetAspectRatio: AspectRatio
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 목표 비율 계산
        let targetWidth: number;
        let targetHeight: number;
        
        switch (targetAspectRatio) {
          case "16:9":
            targetWidth = 1920;
            targetHeight = 1080;
            break;
          case "9:16":
            targetWidth = 1080;
            targetHeight = 1920;
            break;
          case "1:1":
            targetWidth = 1024;
            targetHeight = 1024;
            break;
          default:
            targetWidth = 1920;
            targetHeight = 1080;
        }

        const targetRatio = targetWidth / targetHeight;
        const sourceRatio = img.width / img.height;

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        // 소스 이미지가 목표 비율과 다르면 크롭
        if (Math.abs(sourceRatio - targetRatio) > 0.01) {
          if (sourceRatio > targetRatio) {
            // 소스가 더 넓음 - 좌우를 잘라냄
            sourceWidth = img.height * targetRatio;
            sourceX = (img.width - sourceWidth) / 2;
          } else {
            // 소스가 더 높음 - 상하를 잘라냄
            sourceHeight = img.width / targetRatio;
            sourceY = (img.height - sourceHeight) / 2;
          }
        }

        // 캔버스 크기 설정
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 이미지 그리기 (크롭 + 리사이즈)
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,  // 소스 영역
          0, 0, targetWidth, targetHeight                // 목표 영역
        );

        // Base64로 변환
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
        resolve(resizedBase64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Base64 이미지 로드
      img.src = `data:image/jpeg;base64,${base64Image}`;
    } catch (error) {
      reject(error);
    }
  });
};
