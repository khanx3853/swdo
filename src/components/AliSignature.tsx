import React from 'react';

interface AliSignatureProps {
  className?: string;
}

export const AliSignature: React.FC<AliSignatureProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 320 270"
      className={className || "h-12 w-auto mx-auto relative z-10"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900 dark:text-slate-100">
        {/* Outer oval envelope loop */}
        <path
          d="M 115 195 C 80 165 42 118 45 78 C 47 42 75 22 135 24 C 190 26 218 52 212 98 C 206 142 165 190 108 202 C 72 210 28 222 20 242 C 16 250 32 248 60 238 C 120 220 190 214 278 214"
          strokeWidth="4.8"
        />
        {/* Inner Sharp 'N' Core Glyph */}
        <path
          d="M 112 162 L 156 64 L 148 168 L 188 78 L 194 142"
          strokeWidth="5.2"
        />
        {/* Accent tick / dot */}
        <path
          d="M 206 172 L 210 162"
          strokeWidth="4.5"
        />
        {/* Crossing vertical stem strokes */}
        <path
          d="M 172 216 L 168 260"
          strokeWidth="5"
        />
        <path
          d="M 188 212 L 184 258"
          strokeWidth="5"
        />
        {/* Cursive name tail / flourish */}
        <path
          d="M 194 208 C 205 194 216 196 226 210 C 235 198 246 200 256 212 C 264 204 272 208 280 216"
          strokeWidth="4.2"
        />
      </g>
    </svg>
  );
};

