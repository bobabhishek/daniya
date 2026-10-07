export const MAX_RECEIPT_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;

export const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
]);

export function validateReceiptUpload(file) {
  if (!file) {
    return {
      valid: false,
      error: 'Please upload your UPI payment screenshot to proceed.'
    };
  }

  const mimeType = typeof file.type === 'string' ? file.type.toLowerCase() : '';

  if (!mimeType.startsWith('image/') || !ALLOWED_RECEIPT_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: 'Please select a valid image file (PNG, JPG, JPEG, or WebP).'
    };
  }

  if (file.size > MAX_RECEIPT_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds 15 MB. Please upload a compressed screenshot.'
    };
  }

  return {
    valid: true,
    error: ''
  };
}
