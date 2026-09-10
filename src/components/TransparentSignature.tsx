import React, { useEffect, useRef, useState } from 'react';

interface TransparentSignatureProps {
  src: string;
  alt: string;
  className?: string;
}

export const TransparentSignature: React.FC<TransparentSignatureProps> = ({ src, alt, className }) => {
  const [processedSrc, setProcessedSrc] = useState<string>(src);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check if pixel is light background (paper/greenish/white)
        const avg = (r + g + b) / 3;
        if (avg > 130 || (g > r && g > b && g > 90)) {
          data[i + 3] = 0; // Transparent
        } else {
          // Make dark ink deep black / dark charcoal
          data[i] = 20;
          data[i + 1] = 20;
          data[i + 2] = 20;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      setProcessedSrc(canvas.toDataURL('image/png'));
    };
  }, [src]);

  return <img src={processedSrc} alt={alt} className={className} />;
};
