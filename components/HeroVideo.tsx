'use client';
import { useEffect, useRef } from 'react';
/** Muted looping background video that stays still for people who turn off motion. */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) v.current?.pause(); }, []);
  return <video ref={v} className="fhero-video" src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" />;
}
