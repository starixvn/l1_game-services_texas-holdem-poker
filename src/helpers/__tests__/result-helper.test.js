import { combination } from '../combination-helper';
import CardCombination from '../card-combination';
import { getCombinationResult, compareCombination } from '../result-helper';

jest.mock('../poker-rule.js');
jest.mock('../combination-helper');
describe('result-helper test', () => {
  describe('getCombinationResult', () => {
    it('should throw error when cards undefine', () => {
      // Arrange
      const fn = () => {
        getCombinationResult();
      };

      // Assert
      expect(fn).toThrow(Error);
    });

    it('should return expected', () => {
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

    it('should return expected', () => {
      // Arrange
      const cards = [{ rank: 1 }, { rank: 0 }, { rank: 0 }, { rank: 0 }, { rank: 1 }];
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
    it('should return expected when different id', () => {
      // Arrange
      const expected = 2;

      // Act
      const actual = compareCombination({ id: 1 }, { id: 3 });

      // Assert
      expect(actual).toBe(expected);
    });

    describe('when equal id', () => {
      it('should return expected when different combinationCards', () => {
        // Arrange
        const a = { id: 1, combinationCards: [{ rank: 1 }], cards: [] };
        const b = { id: 1, combinationCards: [{ rank: 2 }], cards: [] };
        const expected = 1;

        // Act
        const actual = compareCombination(a, b);

        // Assert
        expect(actual).toBe(expected);
      });

      it('should return expected when equal combinationCards different cards', () => {
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

      it('should return 0 when equal', () => {
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
