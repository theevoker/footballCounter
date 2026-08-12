import React, { useState } from 'react';

interface PlayerAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  textClassName?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  src,
  name = '',
  className = 'w-8 h-8 rounded-full',
  textClassName = 'text-xs',
}) => {
  const [imgError, setImgError] = useState(false);

  const cleanSrc = src ? src.trim() : '';

  if (cleanSrc && !imgError) {
    return (
      <img
        src={cleanSrc}
        alt={name || 'Avatar'}
        className={`${className} object-cover shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback placeholder (no demo picture, clean initials / blank avatar)
  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : '?';

  return (
    <div
      className={`${className} bg-slate-800 border border-slate-700/80 text-emerald-400 font-extrabold flex items-center justify-center shrink-0 select-none shadow-inner`}
      title={name}
    >
      <span className={textClassName}>{initial}</span>
    </div>
  );
};
