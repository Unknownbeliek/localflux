const { shuffle } = require('../core/shuffle.js');

describe('Fisher-Yates Shuffle', () => {
  it('should not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect(result).not.toBe(original);
  });

  it('should return array of identical length and same elements', () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original);
    expect(result.length).toBe(original.length);
    expect([...result].sort()).toEqual([...original].sort());
  });
});
