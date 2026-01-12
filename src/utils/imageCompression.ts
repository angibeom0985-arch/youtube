/**
 * 이미지 압축 유틸리티
 * localStorage 용량 제한을 고려하여 이미지를 압축합니다.
 */

/**
 * base64 이미지를 압축합니다.
 * @param base64Image - 압축할 base64 이미지
 * @param maxWidth - 최대 너비 (기본값: 800px)
 * @param quality - 압축 품질 0-1 (기본값: 0.7)
 * @returns 압축된 base64 이미지
 */
export async function compressImage(
  base64Image: string,
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Canvas 생성
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      // 비율 유지하면서 크기 조정
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // 이미지 그리기
      ctx.drawImage(img, 0, 0, width, height);
      
      // 압축된 base64로 변환
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = base64Image;
  });
}

/**
 * 여러 이미지를 압축합니다.
 * @param images - 압축할 이미지 배열
 * @param maxWidth - 최대 너비
 * @param quality - 압축 품질
 * @returns 압축된 이미지 배열
 */
export async function compressImages(
  images: string[],
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string[]> {
  const compressed: string[] = [];
  
  for (const image of images) {
    try {
      const compressedImage = await compressImage(image, maxWidth, quality);
      compressed.push(compressedImage);
    } catch (error) {
      console.error('이미지 압축 실패:', error);
      // 압축 실패 시 원본 사용
      compressed.push(image);
    }
  }
  
  return compressed;
}

/**
 * localStorage에 저장 가능한 크기인지 확인합니다.
 * @param data - 확인할 데이터
 * @param maxSizeMB - 최대 크기 (MB, 기본값: 4MB)
 * @returns 저장 가능 여부
 */
export function canStoreInLocalStorage(data: string, maxSizeMB: number = 4): boolean {
  const sizeInBytes = new Blob([data]).size;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return sizeInMB < maxSizeMB;
}
