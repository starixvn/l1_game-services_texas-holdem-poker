import BasePlaceBetConsumer from '../base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../base-action-after-dealing-consumer';
import UserBetTurnConsumer from '../user-bet-turn-consumer';
import { actions } from '../../helpers/constants';
import { Table } from 'sc-game-base';

describe('UserBetTurnConsumer test', () => {
  const gameData = new Table.TableGameData();

  beforeEach(() => {
    BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria = jest
    .fn()
    .mockReturnValue([]);
  });

  it('inherit BaseActionAfterDealingConsumer', () => {
    // Act
    const consumer = new UserBetTurnConsumer();

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
        maxBetPerChoices: { turnBet: 100 }
      },
    ];
   
    it('should run expected when betTracks empty and action is betTurn', async () => {
      // Arrange
      gameData.ingame = {};
      const consumer = new UserBetTurnConsumer(definition, gameData);
      const payload = { action: actions.betTurn };

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, 0, 100);
      expect(actual).toStrictEqual([]);
    });

    it('should run expected when action is betTurn and ante has value', async () => {
      // Arrange
      const bets = { ante: 10 };
      gameData.ingame = { [player.profile.name]: { betTracks: { bets } } };
      const consumer = new UserBetTurnConsumer(definition, gameData);
      const payload = { action: actions.betTurn };

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, bets.ante, 100);
      expect(actual).toStrictEqual([]);
    });

    it('should run expected when action is checkTurn and ante has value', async () => {
      // Arrange
      const bets = { ante: 10 };
      gameData.ingame = { [player.profile.name]: { betTracks: { bets } } };
      const consumer = new UserBetTurnConsumer(definition, gameData);
      const payload = { action: actions.checkTurn };

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
      const consumer = new UserBetTurnConsumer();
      const player = { UID: 1 };
      const expected = [
        {
          failure: false,
          notice: 'cannotProcessBet',
        },
      ];
      BaseActionAfterDealingConsumer.prototype.composeBettingTimeValidationCriteria = jest
        .fn(player, actions.betTurn)
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
    it('should run correctly when action is betTurn and betTracks empty', async () => {
      // Arrange
      const consumer = new UserBetTurnConsumer();
      consumer.gameData = { ingame: {} };
      const payload = { action: actions.betTurn };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.betTurn,
        amount: 0,
      });
    });

    it('should run correctly when action is betTurn and bet ante has value', async () => {
      // Arrange
      const consumer = new UserBetTurnConsumer();
      const bets = { ante: 10 };
      consumer.gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
      const payload = { action: actions.betTurn };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.betTurn,
        amount: bets.ante,
      });
    });

    it('should run correctly when action is checkTurn and bet ante has value', async () => {
      // Arrange
      const consumer = new UserBetTurnConsumer();
      const bets = { ante: 10 };
      consumer.gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
      const payload = { action: actions.checkTurn };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.betTurn,
        amount: 0,
      });
    });
  });
});
