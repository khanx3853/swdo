import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = false }) => {
  const sizeClasses = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`${sizeClasses[size]} relative rounded-full overflow-hidden shrink-0 shadow-md bg-white border border-[#064789]/60 flex items-center justify-center p-0.5 hover:scale-105 transition-transform duration-200`}
      >
        <img
          src="/logo.svg"
          alt="Shangla Welfare & Development Org (SWDO)"
          className="w-full h-full object-contain rounded-full"
          referrerPolicy="no-referrer"
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-sm sm:text-base tracking-tight leading-tight text-slate-900 dark:text-white">
            Shangla Welfare &amp; Development Org
          </span>
          <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase">
            SWDO &bull; District Shangla
          </span>
        </div>
      )}
    </div>
  );
};
