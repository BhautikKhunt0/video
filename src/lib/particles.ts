const cache = new Map<string, [number, number][]>();

/** Sample filled pixels of a text string on an offscreen canvas -> particle targets. */
export function sampleText(text: string, w: number, h: number, font: string, step: number): [number, number][] {
  const key = `${text}|${w}|${h}|${font}|${step}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  const pts: [number, number][] = [];
  if (!ctx) return pts;
  ctx.fillStyle = '#fff';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  const d = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (d[(y * w + x) * 4 + 3] > 128) pts.push([x - w / 2, y - h / 2]);
    }
  }
  cache.set(key, pts);
  return pts;
}
