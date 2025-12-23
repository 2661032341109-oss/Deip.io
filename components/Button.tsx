

import React from 'react';
import { soundManager } from '../engine/SoundManager';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  glow?: boolean;
  tooltip?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  glow = false, 
  className = '', 
  tooltip,
  onMouseEnter,
  onClick,
  ...props 
}) => {
  const baseStyles = "px-6 py-3 font-sans font-bold uppercase tracking-wider transition-all duration-200 clip-path-polygon disabled:opacity-50 disabled:cursor-not-allowed group relative";
  
  let variantStyles = "";
  
  switch (variant) {
    case 'primary':
      variantStyles = "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/40 hover:text-white hover:border-cyan-400";
      // Removed glow shadow logic
      break;
    case 'secondary':
      variantStyles = "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white";
      break;
    case 'danger':
      variantStyles = "bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/40 hover:text-white";
      break;
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      soundManager.playUiHover();
      if (onMouseEnter) onMouseEnter(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      soundManager.initialize(); // Ensure Audio Context is unlocked
      soundManager.playUiClick();
      if (onClick) onClick(e);
  };

  return (
    <button 
        className={`${baseStyles} ${variantStyles} ${className}`} 
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      {tooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/20 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-mono tracking-wide">
              {tooltip}
          </div>
      )}
    </button>
  );
};