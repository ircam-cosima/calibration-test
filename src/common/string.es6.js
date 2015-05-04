'use strict';

let string = {};

// code from Marco de Wit http://stackoverflow.com/a/18514751
string.Levenshtein = class {
  /**
   * This is the constructor, used to cache the strings. @see
   * {@linkcode string.Levenshtein~distance} method to actually
   * compute the distance.
   *
   * @constructs string.Levenshtein
   */
  constructor() {
    this.cache = [];
  }

  /**
   * Levenshtein distance of 2 strings.
   *
   * 0 is the minimum distance, meaning that query === result.key
   *
   * @function string.Levenshtein~distance
   * @param {String} s1
   * @param {String} s2
   * @returns {Number} distance
   */
  distance(s1, s2) {
    if (s1 === s2) {
      return 0;
    } else {
      const s1Length = s1.length;
      const s2Length = s2.length;
      if (s1Length && s2Length) {
        let i1 = 0;
        let i2 = 0;
        let a, b, c, c2;
        let row = this.cache;
        while (i1 < s1Length) {
          row[i1] = ++i1;
        }
        while (i2 < s2Length) {
          c2 = s2.charCodeAt(i2);
          a = i2;
          ++i2;
          b = i2;
          for (i1 = 0; i1 < s1Length; ++i1) {
            c = a + (s1.charCodeAt(i1) === c2 ? 0 : 1);
            a = row[i1];
            b = b < a ? (b < c ? b + 1 : c) : (a < c ? a + 1 : c);
            row[i1] = b;
          }
        }
        return b;
      } else {
        return s1Length + s2Length;
      }
    }
  }

  /**
   * Find the key in a object, which is the closest to the query,
   * according to their Levenshtein distance.
   *
   * @see {@linkcode string.Levenshtein~distance}
   *
   * @function string.Levenshtein~closestKey
   * @param {Object} object
   * @param {String} query
   * @returns {Object} result
   * @returns {Object} result.key key closest to query
   * @returns {Object} result.distance corresponding distance of result.key
   */
  closestKey(object, query) {
    let key;
    let distance = Infinity;
    for(let k in object) {
      if(object.hasOwnProperty(k) ) {
        const d = this.distance(query, k);
        if(d < distance) {
          distance = d;
          key = k;
        }
        if(distance === 0) {
          break;
        }
      }
    }
    return { key: key,
             distance: distance };
  }
};

module.exports = exports = string;
