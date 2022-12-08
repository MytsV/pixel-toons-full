import { expect } from 'chai';
import { describe, it } from 'mocha';
import { compress } from '../public/scripts/utilities/lzw_compression.js';

describe('LZW Compression algorithms', () => {
  it('Compress data in the form of String', () => {
    //Examples taken from https://www.geeksforgeeks.org/lzw-lempel-ziv-welch-compression-technique/
    const data = ['BABAABAAA', 'WYS*WYGWYS*WYSWYSG'];
    const expected = [
      [66, 65, 256, 257, 65, 260],
      [87, 89, 83, 42, 256, 71, 256, 258, 262, 262, 71]
    ];
    for (const [index, element] of data.entries()) {
      expect(expected[index]).to.deep.equal(compress(element));
    }
  });
});
