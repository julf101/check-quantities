import React, { useEffect, useState } from 'react';
import { imageUrl } from '../utils.js';

// code+width -> object URL, or null when TNF has no photo for this code
const cache = new Map();

async function load(code, width) {
  const key = `${code}@${width}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(imageUrl(code, width))
        .then(async (res) => {
          // TNF's CDN answers 200 with a grey placeholder and flags it in this header
          if (!res.ok || res.headers.get('x-cld-error')) return null;
          return URL.createObjectURL(await res.blob());
        })
        .catch(() => null)
    );
  }
  return cache.get(key);
}

export default function ProductImage({ code, width = 300, alt, className = '' }) {
  const [src, setSrc] = useState(undefined); // undefined = loading, null = none

  useEffect(() => {
    let live = true;
    setSrc(undefined);
    if (code) load(code, width).then((s) => live && setSrc(s));
    return () => { live = false; };
  }, [code, width]);

  if (src) return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex items-center justify-center bg-gray-200 text-gray-400 ${src === undefined ? 'animate-pulse' : ''} ${className}`}
    >
      {src === null && <span className="text-xs">Pas d'image</span>}
    </div>
  );
}
