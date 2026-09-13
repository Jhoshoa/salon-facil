import type { ImageLoaderProps } from 'next/image';

// Next's built-in image optimizer re-encodes every new (width, quality, format) combination
// itself, on a single Node process with no CDN -- the first person to ever open a photo at a
// given size (e.g. the lightbox's full-viewport size, never requested before that click) pays a
// multi-second cold-transform tax, which is exactly the "pantalla negra que tarda" bug this
// fixes. Cloudinary already IS a CDN-backed image transformation service -- asking it directly
// for a size via its own URL transformation syntax lets Cloudinary's edge do the resizing and
// caching, instead of round-tripping the (already-uploaded, already-optimized) image through our
// own VPS a second time. Use this as the `loader` prop on every `next/image` that renders a
// venue photo (Cloudinary URL); static/local assets (marketing photos, icons) should NOT use it
// -- they still go through Next's own optimizer as normal.
export const cloudinaryImageLoader = ({ src, width, quality }: ImageLoaderProps): string => {
  if (!src.includes('res.cloudinary.com') || !src.includes('/upload/')) return src;

  const params = [`f_auto`, `q_${quality ?? 'auto'}`, `w_${width}`, 'c_limit'].join(',');
  return src.replace('/upload/', `/upload/${params}/`);
};

// A tiny (24px), heavily-blurred, lowest-quality variant of the same photo -- used as a
// near-instant placeholder behind the full-size image in the lightbox so opening a photo shows
// a soft preview of itself instead of a blank/black rect while the real size loads.
export const cloudinaryBlurThumbUrl = (src: string): string => {
  if (!src.includes('res.cloudinary.com') || !src.includes('/upload/')) return src;

  return src.replace('/upload/', '/upload/f_auto,q_1,w_24,e_blur:400/');
};
