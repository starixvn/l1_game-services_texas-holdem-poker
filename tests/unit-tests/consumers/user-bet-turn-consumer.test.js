import BasePlaceBetConsumer from '../../../src/consumers/base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../../../src/consumers/base-action-after-dealing-consumer';
import UserBetTurnConsumer from '../../../src/consumers/user-bet-turn-consumer';
import { actions } from '../../../src/helpers/constants';
import { Table } from 'sc-game-base';

describe('UserBetTurnConsumer test', () => {
  const gameData = new Table.TableGameData();
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

  const definition = { id: 1 };
  const player = {
    UID: "123",
    profile: {
      name: "nhanvat01",
      minBet: 1,
      maxBet: 2000,
    },
    session: {
      currencyGroupId: "1",
      currency: "US",
    },
  };
  beforeEach(() => {
    BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria = jest
      .fn()
      .mockReturnValue([]);
  });

  it('should inherit BaseActionAfterDealingConsumer', () => {
    // Act
    const consumer = new UserBetTurnConsumer();

    // Assert
    expect(consumer instanceof BaseActionAfterDealingConsumer);
  });

  describe('composeActionValidationCriteria', () => {
    let actual = null;
    const bets = { ante: 10 };

    describe('when betTracks empty and action is betTurn', () => {
      beforeEach(async () => {
        // Arrange
        gameData.ingame = {};
        const consumer = new UserBetTurnConsumer(definition, gameData);
        const payload = { action: actions.betTurn };

        // Act
        actual = await consumer.composeActionValidationCriteria(player, payload);
      });

      it('should call super composeActionValidationCriteria with correct params.', async () => {
        // Assert
        expect(
          BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
        ).toHaveBeenCalledWith(player, 0, 100);
      });

      it('should return empty result.', async () => {
        // Assert
        expect(actual).toStrictEqual([]);
      });
    });

    describe('when action is betTurn and ante has value', () => {
      beforeEach(async () => {
        // Arrange
        gameData.ingame = { [player.profile.name]: { betTracks: { bets } } };
        const consumer = new UserBetTurnConsumer(definition, gameData);
        const payload = { action: actions.betTurn };

        // Act
        actual = await consumer.composeActionValidationCriteria(player, payload);
      });

      it('should call super composeActionValidationCriteria with correct params.', async () => {
        // Assert
        expect(
          BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
        ).toHaveBeenCalledWith(player, bets.ante, 100);
      });

      it('should return empty result.', async () => {
        // Assert
        expect(actual).toStrictEqual([]);
      });
    });

    describe('when action is checkTurn and ante has value', () => {
      beforeEach(async () => {
        // Arrange
        gameData.ingame = { [player.profile.name]: { betTracks: { bets } } };
        const consumer = new UserBetTurnConsumer(definition, gameData);
        const payload = { action: actions.checkTurn };

        // Act
        actual = await consumer.composeActionValidationCriteria(player, payload);
      });

      it('should call super composeActionValidationCriteria with correct params.', async () => {
        // Assert
        expect(
          BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
        ).toHaveBeenCalledWith(player, 0, 100);
      });

      it('should return empty result.', async () => {
        // Assert
        expect(actual).toStrictEqual([]);
      });
    });
  });

  describe('composeBettingTimeValidationCriteria', () => {
    it('should return correct result.', async () => {
      // Arrange
      const consumer = new UserBetTurnConsumer();
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
    beforeAll(() => {
      BasePlaceBetConsumer.prototype.consume = jest.fn();
    });

    describe('when action is betTurn and betTracks empty', () => {
      it('should call super consume with correct params.', async () => {
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
    });

    describe('when action is betTurn and bet ante has value', () => {
      it('should run correctly.', async () => {
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
    });

    describe('when action is checkTurn and bet ante has value', () => {
      it('should call super comsume with correct params.', async () => {
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
});
