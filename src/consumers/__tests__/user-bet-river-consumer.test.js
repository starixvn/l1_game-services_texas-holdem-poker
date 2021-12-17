import BasePlaceBetConsumer from '../base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../base-action-after-dealing-consumer';
import UserBetRiverConsumer from '../user-bet-river-consumer';
import { actions } from '../../helpers/constants';
import { Table } from 'sc-game-base';

describe('UserBetRiverConsumer test', () => {
  const gameData = new Table.TableGameData();

  beforeEach(() => {
    BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria = jest
    .fn()
    .mockReturnValue([]);
  });

  it('inherit BaseActionAfterDealingConsumer', () => {
    // Act
    const consumer = new UserBetRiverConsumer();

    // Assert
    expect(consumer instanceof BaseActionAfterDealingConsumer);
  });

  describe('composeActionValidationCriteria', () => {
    const definition = { id: 1 };

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
        maxBetPerChoices: { riverBet: 100 }
      },
    ];
    it('should run expected when betTracks empty and action is betRiver', async () => {
      // Arrange
      gameData.ingame = {};
      const consumer = new UserBetRiverConsumer(definition, gameData);
      const payload = { action: actions.betRiver };

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, 0, 100);
      expect(actual).toStrictEqual([]);
    });

    it('should run expected when action is betRiver and ante has value', async () => {
      // Arrange
      const bets = { ante: 10 };
      gameData.ingame = { [player.profile.name]: { betTracks: { bets } } };
      const consumer = new UserBetRiverConsumer(definition, gameData);
      const payload = { action: actions.betRiver };

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, bets.ante, 100);
      expect(actual).toStrictEqual([]);
    });

    it('should run expected when action is checkRiver and ante has value', async () => {
      // Arrange
      const bets = { ante: 10 };
      gameData.ingame = { [player.profile.name]: { betTracks: { bets } } };
      const consumer = new UserBetRiverConsumer(definition, gameData);
      const payload = { action: actions.checkRiver };

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, 0, 100);
      expect(actual).toStrictEqual([]);
    });
  });

  describe('composeBettingTimeValidationCriteria', () => {
    it('should run correctly', async () => {
      // Arrange
      const consumer = new UserBetRiverConsumer();
      const player = { UID: 1 };
      const expected = [
        {
          failure: false,
          notice: 'cannotProcessBet',
        },
      ];
      BaseActionAfterDealingConsumer.prototype.composeBettingTimeValidationCriteria = jest
        .fn(player, actions.betRiver)
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
    it('should run correctly when action is betRiver and betTracks empty', async () => {
      // Arrange
      const consumer = new UserBetRiverConsumer();
      consumer.gameData = { ingame: {} };
      const payload = { action: actions.betRiver };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.betRiver,
        amount: 0,
      });
    });

    it('should run correctly when action is betRiver and bet ante has value', async () => {
      // Arrange
      const consumer = new UserBetRiverConsumer();
      const bets = { ante: 10 };
      consumer.gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
      const payload = { action: actions.betRiver };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.betRiver,
        amount: bets.ante,
      });
    });

    it('should run correctly when action is checkRiver and bet ante has value', async () => {
      // Arrange
      const consumer = new UserBetRiverConsumer();
      const bets = { ante: 10 };
      consumer.gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
      const payload = { action: actions.checkRiver };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.betRiver,
        amount: 0,
      });
    });
  });
});
