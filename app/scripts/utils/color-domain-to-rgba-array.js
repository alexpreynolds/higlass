import { scaleLinear } from 'd3-scale';
import { range } from 'd3-array';
import { rgb } from 'd3-color';

/**
 * Convert a color domain to a 255 element array of [r,g,b,a]
 * values (all from 0 to 255). The last color (255) will always be
 * transparent
 */
const colorDomainToRgbaArray = (
  colorRange,
  noTransparent = false,
  valueScaleType = 'linear'
) => {
  // we should always have at least two values in the color range
  const domain =
    valueScaleType === 'linear'
      ? colorRange.map((x, i) => i * (255 / (colorRange.length - 1)))
      : null;

  // console.warn(`color-domain-to-rgba-array.js > colorDomainToRgbaArray > ${JSON.stringify(domain)}`);

  const d3Scale =
    valueScaleType === 'linear'
      ? scaleLinear()
          .domain(domain)
          .range(colorRange)
      : null;

  const fromX = noTransparent ? 255 : 254;

  const rgbaArray =
    valueScaleType === 'linear'
      ? range(fromX, -1, -1)
          .map(d3Scale)
          .map(x => {
            const r = rgb(x);
            return [r.r, r.g, r.b, r.opacity * 255];
          })
      : range(colorRange.length - 1, -1, -1).map(x => {
          const r = rgb(colorRange[x]);
          return [r.r, r.g, r.b, r.opacity * 255];
        });

  // add a transparent color at the end for missing values and, more
  // importantly, non-existing values such as the empty upper right or lower
  // left triangle of tiles on the diagonal. (linear or log scale only)
  if (
    rgbaArray.length < 256 &&
    (valueScaleType === 'linear' || valueScaleType === 'log')
  )
    rgbaArray.push([255, 255, 255, 0]);

  return rgbaArray;
};

export default colorDomainToRgbaArray;
