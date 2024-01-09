import { reGenerateDecks, deal, generateDecks } from '../../../src/helpers/deck-helper';

const chanceMock = { pickoneIndex: 0 };

jest.mock('chance', () => {
  return function () {
    const orig = {
      ...jest.requireActual('chance'),
    };

    return {
      shuffle: (arr) => {
        return new orig.Chance().shuffle(arr);
      },
      integer: (min, max) => {
        return new orig.Chance().integer({ min, max });
      },
      pickone: (arr) => arr[chanceMock.pickoneIndex],
      floating: ({ min, max }) => {
        return new orig.Chance().floating({ min, max });
      },
    };
  };
});

describe('DeckHelper', () => {
  const testCases = [
    { randomMode: 1, pickoneIndex: 0 },
    { randomMode: 2, pickoneIndex: 0 },
    { randomMode: 2, pickoneIndex: 1 },
    { randomMode: 3, pickoneIndex: 0 },
    { randomMode: 3, pickoneIndex: 1 },
    { randomMode: 4, pickoneIndex: 0 },
  ];

  describe('generateDecks', () => {
    it.each(testCases)('should return expected', (testCase) => {
      // Arrange
      chanceMock.pickoneIndex = testCase.pickoneIndex;
      const presetCards = [{ rank: 1 }, { rank: 0 }];

      // Act
      const actual = generateDecks(testCase.randomMode, presetCards);

      // Assert
      expect(actual.length).toBe(52);
      expect(actual[0]).toStrictEqual(presetCards[0]);
      expect(actual[1]).toStrictEqual(presetCards[1]);
    });
  });

  describe('reGenerateDecks', () => {
    const randomMode = 1;

    it('should return expected', () => {
      // Arrange
      const usedCards = [{ rank: 1 }, { rank: 0 }, { rank: 3 }, { rank: 0 }];

      // Act
      const actual = reGenerateDecks(randomMode, usedCards);

      // Assert
      expect(actual.length).toBe(48);
    });
  });

  describe('deal', () => {
    it('should run correctly', () => {
      // Arrange
      const deck = [
        { rank: 10 },
        { rank: 11 },
        { rank: 10 },
        { rank: 11 },
        { rank: 1 },
        { rank: 2 },
        { rank: 3 },
      ];
      const data = { dealer: [], player: [], deck: [...deck] };

      // Act
      deal(data);

      // Assert
      expect(data.player.length).toBe(2);
      expect(data.player[0]).toStrictEqual(deck[0]);
      expect(data.player[1]).toStrictEqual(deck[2]);
      expect(data.dealer.length).toBe(2);
      expect(data.dealer[0]).toStrictEqual(deck[1]);
      expect(data.dealer[1]).toStrictEqual(deck[3]);
    });
  });
});
