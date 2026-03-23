/**
 * imageCompressor.js
 * 
 * Silently shrinks user-uploaded images to < 150KB WebP payloads
 * using HTML5 Canvas before sending them over the network.
 */

export async function compressImageToWebP(file, targetSizeKB = 150) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Downscale large images
        const MAX_DIMENSION = 1280;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.floor((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.floor((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111'; // background for transparent images
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        const targetBytes = targetSizeKB * 1024;

        // Binary search for quality
        const attempt = (q, minQ, maxQ, depth = 0) => {
          canvas.toBlob((blob) => {
            if (depth > 5 || (blob.size <= targetBytes && blob.size > targetBytes * 0.8)) {
              return resolve(blob);
            }
            if (blob.size > targetBytes) {
              if (q <= 0.1) return resolve(blob); // floor
              attempt((q + minQ) / 2, minQ, q, depth + 1);
            } else {
              attempt((maxQ + q) / 2, q, maxQ, depth + 1);
            }
          }, 'image/webp', q);
        };
        
        attempt(quality, 0.1, 1.0);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
