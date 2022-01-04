import BasePlaceBetConsumer from '../../../src/consumers/base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../../../src/consumers/base-action-after-dealing-consumer';
import UserCallConsumer from '../../../src/consumers/user-call-consumer';
import { actions } from '../../../src/helpers/constants';
import { Table } from 'sc-game-base';

describe('UserCallConsumer test', () => {
  const gameData = new Table.TableGameData();
  const playerName = "nhanvat01";
    const player = {
      UID: "123",
      profile: {
        name: playerName,
        minBet: 1,
        maxBet: 2000,
      },
      session: {
        currencyGroupId: "1",
        currency: "US",
      },
    };

    gameData.remainingTime = 20;
    gameData.gameConfigs = {
      enabled: true
    };
    gameData.currencyGroupGames = [
      {
        groupId: 1,
        minBet: 10,
        maxBet: 1000,
        maxBetPerChoices: { callBet: 100 }
      },
    ];

  it('inherit BaseActionAfterDealingConsumer', () => {
    // Act
    const consumer = new UserCallConsumer();

    // Assert
    expect(consumer instanceof BaseActionAfterDealingConsumer);
  });

  describe('composeActionValidationCriteria', () => {
    beforeEach(() => {
      BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria = jest
      .fn()
      .mockReturnValue([]);
    });

    const definition = { id: 1 };

    it('should run expected when betTracks empty and action is call', async () => {
      // Arrange
      gameData.ingame = {} ;
      const consumer = new UserCallConsumer(definition, gameData);
      const payload = { action: actions.call };

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, 0, 100);
      expect(actual).toStrictEqual([]);
    });

    it('should run expected when action is doubleCall and ante has value', async () => {
      // Arrange
      const bets = { ante: 10 };
      gameData.ingame = { [player.profile.name]: { betTracks: { bets } } } ;
      const consumer = new UserCallConsumer(definition, gameData);
      const payload = { action: actions.doubleCall };

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, 20, 100);
      expect(actual).toStrictEqual([]);
    });
  });

  describe('composeBettingTimeValidationCriteria', () => {
    it('should run correctly', async () => {
      // Arrange
      const consumer = new UserCallConsumer();
      const player = { UID: 1 };
      const expected = [
        {
          failure: false,
          notice: 'cannotProcessBet',
        },
      ];
      BaseActionAfterDealingConsumer.prototype.composeBettingTimeValidationCriteria = jest
        .fn(player, actions.call)
        .mockReturnValue(expected);

      // Act
      const actual = await consumer.composeBettingTimeValidationCriteria(player, {});

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('consume', () => {
    const player = { UID: 1, profile: { name: 'a' } };
    beforeAll(() => {
      BasePlaceBetConsumer.prototype.consume = jest.fn();
    });
    it('should run correctly when action is call and betTracks empty', async () => {
      // Arrange
      const consumer = new UserCallConsumer();
      consumer.gameData = { ingame: {} };
      const payload = { action: actions.call };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.call,
        amount: 0,
      });
    });

    it('should run correctly when action is doubleCall and bet ante has value', async () => {
      // Arrange
      const consumer = new UserCallConsumer();
      const bets = { ante: 10 };
      consumer.gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
      const payload = { action: actions.doubleCall };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.call,
        amount: 20,
      });
    });
  });
});
