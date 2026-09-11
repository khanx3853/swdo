/**
 * Generates a standard-compliant UUID v4.
 * Uses window.crypto.randomUUID if available, with a fallback for older environments.
 */
export function generateUUID(): string {
  // Check for browser's randomUUID
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // Fallback for Node.js or older browsers
  // This is a common pattern for RFC4122 v4 UUIDs
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
