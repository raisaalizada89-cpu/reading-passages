import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { CefrLevel } from '../types/literature';

interface IllustratedFrameProps {
  src: string;
  alt: string;
  level: CefrLevel;
  title: string;
  className?: string;
}

const FALLBACK_GRADIENTS: Record<CefrLevel, string> = {
  B1: 'from-emerald-100 via-teal-50 to-amber-100 text-emerald-900',
  B2: 'from-sky-100 via-cyan-50 to-indigo-100 text-sky-900',
  C1: 'from-amber-100 via-orange-50 to-rose-100 text-amber-900',
  C2: 'from-violet-100 via-purple-50 to-indigo-100 text-violet-900',
};

export const IllustratedFrame: React.FC<IllustratedFrameProps> = ({
  src,
  alt,
  level,
  title,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br ${FALLBACK_GRADIENTS[level]} ${className}`}
        role="img"
        aria-label={alt}
      >
        <BookOpen className="w-9 h-9 mb-2 opacity-70" />
        <p className="font-literary font-semibold text-base line-clamp-2">{title}</p>
        <span className="mt-1 text-xs opacity-75">{level} Literary Edition</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
};
