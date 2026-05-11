import React, { useState } from 'react';

const LazyImage = ({ src, alt, className = '', style = {}, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ ...style }}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--neon-pink-glow)]/30 border-t-[var(--neon-pink-glow)] rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${!loaded && !error ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
        {...props}
      />
    </div>
  );
};

export default LazyImage;
