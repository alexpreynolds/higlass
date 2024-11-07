import { tsvParseRows } from 'd3-dsv';
import { tileProxy } from './services';
import { absToChr, chrToAbs, parseChromsizesRows } from './utils';

import { fake as fakePubSub } from './hocs/with-pub-sub';

function ChromosomeInfo(filepath, success, pubSub = fakePubSub) {
  const ret = {};

  ret.absToChr = (absPos) => (ret.chrPositions ? absToChr(absPos, ret) : null);

  ret.chrToAbs = ([chrName, chrPos] = []) =>
    ret.chrPositions ? chrToAbs(chrName, chrPos, ret) : null;

  return tileProxy
    .text(
      filepath,
      (error, chrInfoText) => {
        if (error) {
          console.log('Chromosome info not found at:', filepath);
          if (success) success(null);
        } else {
          const data = tsvParseRows(chrInfoText);
          const chromInfo = parseChromsizesRows(data);

          Object.keys(chromInfo).forEach((key) => {
            ret[key] = chromInfo[key];
          });
          console.log(`ret ${JSON.stringify(ret)}`);
          if (success) success(ret);
        }
      },
      pubSub,
    )
    .then(() => ret);
}

export default ChromosomeInfo;
