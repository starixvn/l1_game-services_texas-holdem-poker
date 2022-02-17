import BasePlaceBetConsumer from '../../../src/consumers/base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../../../src/consumers/base-action-after-dealing-consumer';
import UserBetRiverConsumer from '../../../src/consumers/user-bet-river-consumer';
import { actions } from '../../../src/helpers/constants';
import { Table } from 'sc-game-base';

describe('UserBetRiverConsumer', () => {
  const gameData = new Table.TableGameData();

  beforeEach(() => {
    BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria = jest
      .fn()
      .mockReturnValue([]);
  });

  it('should inherit BaseActionAfterDealingConsumer', () => {
    // Act
    const consumer = new UserBetRiverConsumer();

    // Assert
    expect(consumer instanceof BaseActionAfterDealingConsumer);
  });

  describe('composeActionValidationCriteria', () => {
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

    let actual = null;
    const bets = { ante: 10 };

    describe('when betTracks empty and action is betRiver', () => {
      beforeEach(async () => {
        // Arrange
        gameData.ingame = {};
        const consumer = new UserBetRiverConsumer(definition, gameData);
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

    describe('when action is betRiver and ante has value', () => {
      beforeEach(async () => {
        // Arrange
        gameData.ingame = { [player.profile.name]: { betTracks: { bets } } };
        const consumer = new UserBetRiverConsumer(definition, gameData);
        const payload = { action: actions.betRiver };

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

    describe('when action is checkRiver and ante has value', () => {
      beforeEach(async () => {
        // Arrange
        gameData.ingame = { [player.profile.name]: { betTracks: { bets } } };
        const consumer = new UserBetRiverConsumer(definition, gameData);
        const payload = { action: actions.checkRiver };

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

    describe('when action is betRiver and betTracks empty', () => {
      it('should run correctly', async () => {
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
    });

    describe('when action is betRiver/checkRiver bet', () => {
      const testCases = [
        {
          action: actions.betRiver,
          expectedAmount: 10
        },
        {
          action: actions.checkRiver,
          expectedAmount: 0
        }
      ];

      it.each(testCases)('should call super comsume with correct params.', async ({ action, expectedAmount }) => {
        // Arrange
        const consumer = new UserBetRiverConsumer();
        const bets = { ante: 10 };
        consumer.gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
        const payload = { action: action };

        // Act
        await consumer.consume(player, payload);

        // Assert
        expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
          action: actions.betRiver,
          amount: expectedAmount,
        });
      });
    });
  });
});
