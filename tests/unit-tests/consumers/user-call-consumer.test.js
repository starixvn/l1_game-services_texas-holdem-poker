import BasePlaceBetConsumer from '../../../src/consumers/base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../../../src/consumers/base-action-after-dealing-consumer';
import UserCallConsumer from '../../../src/consumers/user-call-consumer';
import { actions } from '../../../src/helpers/constants';
import { Table } from 'sc-game-base';

describe('UserCallConsumer', () => {
  // Arrange
  const definition = { id: 1 };
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

  it('should inherit BaseActionAfterDealingConsumer', () => {
    // Act
    const consumer = new UserCallConsumer();

    // Assert
    expect(consumer instanceof BaseActionAfterDealingConsumer);
  });

  describe('composeActionValidationCriteria', () => {
    let actual = null;
    beforeEach(() => {
      BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria = jest
        .fn()
        .mockReturnValue([]);
    });

    describe('when betTracks empty and action is call', () => {
      beforeEach(async () => {
        // Arrange
        gameData.ingame = {};
        const consumer = new UserCallConsumer(definition, gameData);
        const payload = { action: actions.call };

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

    describe('when action is doubleCall and ante has value', () => {
      beforeEach(async () => {
        // Arrange
        const bets = { ante: 10 };
        gameData.ingame = { [player.profile.name]: { betTracks: { bets } } };
        const consumer = new UserCallConsumer(definition, gameData);
        const payload = { action: actions.doubleCall };

        // Act
        actual = await consumer.composeActionValidationCriteria(player, payload);
      });

      it('should call super composeActionValidationCriteria with correct params.', async () => {
        // Assert
        expect(
          BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
        ).toHaveBeenCalledWith(player, 20, 100);
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
      const consumer = new UserCallConsumer();
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
    beforeAll(() => {
      BasePlaceBetConsumer.prototype.consume = jest.fn();
    });

    describe('when action is call and betTracks empty', () => {
      it('should call super comsume with correct params.', async () => {
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
    });

    describe('when action is doubleCall and bet ante has value', () => {
      it('should call super comsume with correct params.', async () => {
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
});
