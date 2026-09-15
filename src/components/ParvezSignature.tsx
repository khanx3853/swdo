import React from 'react';

interface ParvezSignatureProps {
  className?: string;
}

export const ParvezSignature: React.FC<ParvezSignatureProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className || "h-12 w-auto mx-auto relative z-10"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900 dark:text-slate-100">
        {/* Initial 'M' on the left with swoop */}
        <path
          d="M 28 142 C 24 135 22 128 25 120 C 28 112 32 115 34 132 C 36 142 38 122 40 110 C 43 98 47 105 48 128 C 49 140 50 155 60 168 C 72 184 96 188 122 180 C 132 176 138 165 140 145"
          strokeWidth="4.2"
        />
        {/* Central tall 'P/B' ascender loop */}
        <path
          d="M 136 150 C 130 120 120 75 122 46 C 124 28 135 24 142 34 C 150 48 152 75 148 105 C 144 132 135 152 130 165 L 148 182"
          strokeWidth="4.6"
        />
        {/* Middle loops / 'B' shape */}
        <path
          d="M 120 138 C 128 116 148 108 155 125 C 160 138 155 152 144 165 C 152 155 168 158 174 175 L 175 192"
          strokeWidth="4.2"
        />
        {/* Dot / accent mark */}
        <path
          d="M 194 82 L 196 85"
          strokeWidth="4.8"
        />
        {/* Long ascending diagonal stroke into high right loop and baseline cross */}
        <path
          d="M 146 168 C 175 145 212 112 245 78 C 258 62 272 20 270 16 C 266 12 254 38 248 70 C 242 105 245 132 260 118"
          strokeWidth="4.4"
        />
        {/* Small lower dash/tick under signature */}
        <path
          d="M 138 206 L 148 198"
          strokeWidth="4.2"
        />
      </g>
    </svg>
  );
};
