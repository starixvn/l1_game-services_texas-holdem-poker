import { Core, Table } from 'sc-game-base';
import BasePlaceBetConsumer from '../../../src/consumers/base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../../../src/consumers/base-action-after-dealing-consumer';
import UserFoldConsumer from '../../../src/consumers/user-fold-consumer';
import { actions } from '../../../src/helpers/constants';

describe('UserFoldConsumer', () => {
  const definition = new Core.GameDefinition({ id: 1, name: 'texas-holdem-poker' });
  const gameData = new Table.TableGameData();
  const publisher = {};
  const logService = { logWarning: jest.fn() };
  const player = { UID: 1 };

  let consumer = null;
  beforeEach(() => {
    consumer = new UserFoldConsumer(definition, gameData, publisher, logService);
  });

  it('should inherit BaseActionAfterDealingConsumer', () => {
    // Assert
    expect(consumer instanceof BaseActionAfterDealingConsumer);
  });

  describe('composeActionValidationCriteria', () => {
    it('should return empty array', async () => {
      // Act
      const actual = await consumer.composeActionValidationCriteria(player, {});

      // Assert
      expect(actual).toBeArrayOfSize(0);
    });
  });

  describe('composeBettingTimeValidationCriteria', () => {
    it('should return super result', async () => {
      // Arrange
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
    it('should return super result', async () => {
       // Arrange
       BasePlaceBetConsumer.prototype.consume = jest.fn();

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
