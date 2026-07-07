import { AVATAR_MAX_BYTES } from "@/lib/auth/constants";

export async function compressAvatarFile(
  file: File
): Promise<{ base64: string; mime: string }> {
  const image = await loadImage(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("이미지 처리에 실패했습니다.");
  }

  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const offsetX = (size - width) / 2;
  const offsetY = (size - height) / 2;

  ctx.drawImage(image, offsetX, offsetY, width, height);

  let quality = 0.85;
  let mime = "image/webp";
  let dataUrl = canvas.toDataURL(mime, quality);

  while (dataUrl.length > AVATAR_MAX_BYTES * 1.37 && quality > 0.35) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL(mime, quality);
  }

  if (dataUrl.length > AVATAR_MAX_BYTES * 1.37) {
    mime = "image/jpeg";
    quality = 0.8;
    dataUrl = canvas.toDataURL(mime, quality);
    while (dataUrl.length > AVATAR_MAX_BYTES * 1.37 && quality > 0.3) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL(mime, quality);
    }
  }

  const base64 = dataUrl.split(",")[1];
  if (!base64 || base64.length > AVATAR_MAX_BYTES * 1.37) {
    throw new Error("이미지 용량이 너무 큽니다. 다른 사진을 선택해주세요.");
  }

  return { base64, mime };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    image.src = url;
  });
}
