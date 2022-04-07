import { Core, Table } from 'sc-game-base';
import BasePlaceBetConsumer from '../../../src/consumers/base-place-bet-consumer';
import UserDealConsumer from '../../../src/consumers/user-deal-consumer';
import { actions } from '../../../src/helpers/constants';

describe('UserDealConsumer', () => {
  const definition = new Core.GameDefinition({ id: 1, name: 'texas-holdem-poker' });
  const gameData = new Table.TableGameData();
  const publisher = {};
  const logService = {};

  it('inherit BasePlaceBetConsumer', () => {
    // Act
    const consumer = new UserDealConsumer(definition, gameData, publisher, logService);

    // Assert
    expect(consumer instanceof BasePlaceBetConsumer);
  });

  describe('composeActionValidationCriteria', () => {
    it('should return expected result.', async () => {
      // Arrange
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
          maxBetPerChoices: { callBet: 100, anteBet: 100, aaBet: 100 }
        },
      ];

      const expected = [
        {
          failure: false,
          notice: {
            errorCode: "SB1910",
            maxBet: "100"
          }
        },
        {
          failure: false,
          notice: {
            errorCode: "SB1909",
            minBet: "10",
          },
        },
        {
          failure: false,
          notice: {
            errorCode: "SB1911",
            maxBet: "1,000",
          },
        },
      ];

      const consumer = new UserDealConsumer(definition, gameData, publisher, logService);

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, { anteBet: 10 });

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('composeBettingTimeValidationCriteria', () => {
    const player = { profile: { name: 'a' }, session: { currency: 'IN', language: 'en' } };
    beforeEach(() => {
      BasePlaceBetConsumer.prototype.composeBettingTimeValidationCriteria = jest
        .fn()
        .mockReturnValue([]);
    });

    describe('when empty ingame', () => {
      it('should return expected result.', async () => {
        // Arrange
        const data = { ingame: {} };
        const consumer = new UserDealConsumer(definition, data, publisher, logService);
        const expected = [
          {
            failure: false,
            notice: {
              errorCode: "SB1935",
            },
          },
          {
            failure: false,
            notice: {
              errorCode: "SB1935",
            },
          },
        ];

        // Act
        const actual = await consumer.composeBettingTimeValidationCriteria(player);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });

    describe('when have ingame', () => {
      it('should return expected result.', async () => {
        // Arrange
        const data = { ingame: { [player.profile.name]: { betTracks: { roundId: 1 } } } };
        const consumer = new UserDealConsumer(definition, data, publisher, logService);
        const expected = [
          {
            failure: true,
            notice: {
              errorCode: "SB1935",
            },
          },
          {
            failure: false,
            notice: {
              errorCode: "SB1935",
            },
          },
        ];

        // Act
        const actual = await consumer.composeBettingTimeValidationCriteria(player);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe('consume', () => {
    it('should call super consume with correct input params.', async () => {
      // Arrange
      BasePlaceBetConsumer.prototype.consume = jest.fn();
      const consumer = new UserDealConsumer(definition, gameData, publisher, logService);
      const player = { UID: 1 };

      // Act
      await consumer.consume(player, {});

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(
        player,
        { anteBet: 0 },
        {
          action: actions.deal,
          amount: 0,
        },
      );
    });
  });
});
