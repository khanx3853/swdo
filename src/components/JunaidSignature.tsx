import React from 'react';

interface JunaidSignatureProps {
  className?: string;
}

export const JunaidSignature: React.FC<JunaidSignatureProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 320 220"
      className={className || "h-12 w-auto mx-auto relative z-10"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900 dark:text-slate-100">
        {/* Top star/flower mark on upper left */}
        <path d="M 74 38 L 82 22 L 90 38 L 100 24 L 98 42 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
        
        {/* Top horizontal cap over 'Junai' */}
        <path d="M 78 44 L 75 62 Q 95 62 125 60 Q 142 58 148 68" strokeWidth="4.5" />

        {/* Left initial vertical stem of J */}
        <path d="M 75 62 L 74 158" strokeWidth="5" />
        
        {/* Underline baseline cross */}
        <path d="M 38 138 L 260 148" strokeWidth="4.5" />
        
        {/* 'unai' letters cursive flow */}
        {/* u */}
        <path d="M 86 116 L 87 136 C 92 142 102 142 108 134 L 110 118" strokeWidth="4.2" />
        {/* n */}
        <path d="M 110 126 C 114 116 126 115 132 135 L 132 125 C 136 116 148 116 152 134" strokeWidth="4.2" />
        {/* a */}
        <path d="M 152 130 C 148 118 162 114 168 124 C 172 132 168 140 162 140 C 156 140 152 132 156 122" strokeWidth="3.8" />
        {/* i */}
        <path d="M 168 120 L 170 138" strokeWidth="4" />
        {/* dots */}
        <circle cx="138" cy="82" r="2.8" fill="currentColor" stroke="none" />
        <circle cx="185" cy="90" r="2.8" fill="currentColor" stroke="none" />
        
        {/* Tall vertical stem of d/t cross */}
        <path d="M 198 52 L 188 178" strokeWidth="5" />
        
        {/* Right side box and loop flourish */}
        <path d="M 198 90 L 235 90 C 255 90 262 105 258 125 C 252 145 240 155 228 145 C 220 136 222 118 234 118 C 248 118 252 132 250 148 C 248 162 254 182 245 195 C 235 208 208 214 204 212" strokeWidth="4.6" />
        {/* Inner right top loop */}
        <path d="M 235 90 C 248 70 265 65 264 88 C 262 115 250 148 245 158" strokeWidth="4.2" />
      </g>
    </svg>
  );
};

