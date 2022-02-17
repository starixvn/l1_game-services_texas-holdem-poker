import { combination } from '../../../src/helpers/combination-helper';
import CardCombination from '../../../src/helpers/card-combination';
import { getCombinationResult, compareCombination, generateResult } from '../../../src/helpers/result-helper';

jest.mock('../../../src/helpers/poker-rule.js');
jest.mock('../../../src/helpers/combination-helper');

describe('ResultHelper', () => {
  describe('generateResult', () => {
    it('should return correct cards', () => {
      // Arrange
      const communityCards = [{ rank: 1 }, { rank: 2 }, { rank: 3 }];
      const deck = [{ rank: 4 }, { rank: 5 }, { rank: 5 }, { rank: 7 }, { rank: 10 }, { rank: 10 }];
      const expected = [...communityCards, deck[0], deck[1]];

      // Act
      const actual = generateResult(communityCards, deck);

      // Assert
      expect(deck.length).toBe(4);
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('getCombinationResult', () => {
    describe('when cards undefine', () => {
      it('should throw error', () => {
        // Arrange
        const fn = () => {
          getCombinationResult();
        };

        // Assert
        expect(fn).toThrow(Error);
      });
    });

    it('should return id = 2', () => {
      // Arrange
      const cards = [{ rank: 1 }, { rank: 3 }, { rank: 5 }, { rank: 10 }, { rank: 1 }];
      combination.mockReturnValue([cards, cards]);
      CardCombination.prototype.getResult = jest
        .fn()
        .mockReturnValueOnce({ id: 1 })
        .mockReturnValueOnce({ id: 2 });
      const expected = { id: 2 };

      // Act
      const actual = getCombinationResult(cards);

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('compareCombination', () => {
    describe('when different id', () => {
      it('should return 2', () => {
        // Arrange
        const expected = 2;

        // Act
        const actual = compareCombination({ id: 1 }, { id: 3 });

        // Assert
        expect(actual).toBe(expected);
      });
    });

    describe('when equal id', () => {
      describe('when different combinationCards', () => {
        it('should return 1', () => {
          // Arrange
          const a = { id: 1, combinationCards: [{ rank: 1 }], cards: [] };
          const b = { id: 1, combinationCards: [{ rank: 2 }], cards: [] };
          const expected = 1;

          // Act
          const actual = compareCombination(a, b);

          // Assert
          expect(actual).toBe(expected);
        });
      });

      describe('when equal combinationCards different cards', () => {
        it('should return -1', () => {
          // Arrange
          const a = {
            id: 1,
            combinationCards: [{ rank: 1 }, { rank: 1 }],
            cards: [{ rank: 1 }, { rank: 1 }, { rank: 0 }, { rank: 2 }],
          };
          const b = {
            id: 1,
            combinationCards: [{ rank: 1 }, { rank: 1 }],
            cards: [{ rank: 1 }, { rank: 1 }, { rank: 0 }, { rank: 1 }],
          };
          const expected = -1;

          // Act
          const actual = compareCombination(a, b);

          // Assert
          expect(actual).toBe(expected);
        });

      });

      describe('when equal', () => {
        it('should return 0', () => {
          // Arrange
          const a = { id: 1, combinationCards: [{ rank: 0 }], cards: [{ rank: 0 }, { rank: 2 }] };

          // Act
          const actual = compareCombination(a, a);

          // Assert
          expect(actual).toBe(0);
        });
      });
    });
  });
});
