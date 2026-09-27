/**
 * Automatically compresses and optimizes images client-side before uploading.
 * 
 * Smartphones frequently capture 8MB - 25MB photos (3000x4000+ pixels).
 * This utility:
 * - Passes through images <= 2MB without modification.
 * - Resizes images > 2MB down to max dimension 1920px (preserving aspect ratio).
 * - Encodes to clean JPEG at 0.82 quality, reducing file size to ~400KB - 800KB.
 * - Executes in ~100-200ms right in the browser, dramatically speeding up uploads.
 * 
 * @param {File} file - Original file from input
 * @param {number} maxDimension - Max width/height (default 1920)
 * @param {number} quality - JPEG compression quality 0.0 - 1.0 (default 0.82)
 * @returns {Promise<File>} - Optimized File object (or original on fallback)
 */
export async function compressImageIfNeeded(file, maxDimension = 1920, quality = 0.82) {
  if (!file) return file;

  // Only compress images, and only if file size exceeds 2MB (2 * 1024 * 1024 bytes)
  if (!file.type || !file.type.startsWith('image/') || file.size <= 2 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      console.warn('[ImageCompressor] FileReader failed, using original file.');
      resolve(file);
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        console.warn('[ImageCompressor] Image element load failed, using original file.');
        resolve(file);
      };

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            resolve(file);
            return;
          }

          // Scale down dimensions if either width or height exceeds maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // Draw the resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG blob with specified quality
          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                // If compression didn't reduce size or failed, use original
                resolve(file);
                return;
              }

              // Create new File with clean filename and image/jpeg MIME type
              const baseName = (file.name || 'photo').replace(/\.[^/.]+$/, '');
              const compressedFile = new File([blob], `${baseName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              console.log(
                `[ImageCompressor] Optimized photo from ${(file.size / (1024 * 1024)).toFixed(2)}MB to ${(compressedFile.size / 1024).toFixed(0)}KB (${width}x${height})`
              );

              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          console.warn('[ImageCompressor] Canvas processing error:', err);
          resolve(file);
        }
      };

      img.src = event.target?.result;
    };

    reader.readAsDataURL(file);
  });
}
