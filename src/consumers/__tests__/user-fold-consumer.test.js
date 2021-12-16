import { Core, Table } from 'sc-game-base';
import BasePlaceBetConsumer from '../base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../base-action-after-dealing-consumer';
import UserFoldConsumer from '../user-fold-consumer';
import { actions } from '../../helpers/constants';

describe('UserFoldConsumer test', () => {
  const definition = new Core.GameDefinition({ id: 1, name: 'texas-holdem-poker' });
  const gameData = new Table.TableGameData();
  const publisher = {};
  const logService = { logWarning: jest.fn() };

  it('inherit BaseActionAfterDealingConsumer', () => {
    // Act
    const consumer = new UserFoldConsumer(definition, gameData, publisher, logService);

    // Assert
    expect(consumer instanceof BaseActionAfterDealingConsumer);
  });

  describe('composeActionValidationCriteria', () => {
    it('should return empty array', async () => {
      // Arrange
      const consumer = new UserFoldConsumer(definition, gameData, publisher, logService);
      const player = { UID: 1 };

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, {});

      // Assert
      expect(actual).toBeArrayOfSize(0);
    });
  });

  describe('composeBettingTimeValidationCriteria', () => {
    it('should return expected', async () => {
      // Arrange
      const consumer = new UserFoldConsumer(definition, gameData, publisher, logService);
      const player = { UID: 1 };
      const expected = [
        {
          failure: true,
          notice: 'cannotProcessBet',
        },
      ];
      BaseActionAfterDealingConsumer.prototype.composeBettingTimeValidationCriteria = jest
        .fn(player, actions.fold)
        .mockReturnValue(expected);

      // Act
      const actual = await consumer.composeBettingTimeValidationCriteria(player, {});

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('consume', () => {
    beforeAll(() => {
      BasePlaceBetConsumer.prototype.consume = jest.fn();
    });
    it('should run correctly', async () => {
      // Arrange
      const consumer = new UserFoldConsumer(definition, gameData, publisher, logService);
      const player = { UID: 1 };

      // Act
      await consumer.consume(player, {});

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(
        player,
        {},
        {
          action: actions.fold,
        },
      );
    });
  });
});
