import { Core, Table } from 'sc-game-base';
import BasePlaceBetConsumer from '../../../src/consumers/base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../../../src/consumers/base-action-after-dealing-consumer';
import { actions } from '../../../src/helpers/constants';

describe('BaseActionAfterDealingConsumer', () => {
  const definition = new Core.GameDefinition({ id: 1, name: 'texas-holdem-poker' });
  const gameData = new Table.TableGameData();
  const publisher = {};
  const logService = { logWarning: jest.fn() };
  const player = {
    UID: "123",
    profile: {
      name: "a",
      minBet: 1,
      maxBet: 2000,
    },
    session: {
      currencyGroupId: "1",
      currency: "US",
    },
  };

  beforeEach(() => {
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
  });

  it('should inherit BasePlaceBetConsumer', () => {
    // Act
    const consumer = new BaseActionAfterDealingConsumer(
      definition,
      gameData,
      publisher,
      logService,
    );

    // Assert
    expect(consumer instanceof BasePlaceBetConsumer);
  });

  describe('composeActionValidationCriteria', () => {
    const configs = {
      maxBetChoices: { callBet: 100 },
      maxBet: 1000,
    };

    describe('Validate max bet per choice', () => {
      const testCases = [
        {
          amount: 0,
          isValidMaxBetChoice: false
        },
        {
          amount: 500,
          isValidMaxBetChoice: true
        },
      ];

      it.each(testCases)('should return expected result.', async ({ amount, isValidMaxBetChoice }) => {
        // Arrange
        gameData.ingame = {}
        const consumer = new BaseActionAfterDealingConsumer(definition, gameData, publisher, logService);
        const expected = [
          {
            failure: isValidMaxBetChoice,
            notice: {
              errorCode: "SB1910",
              maxBet: "100"
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

        // Act
        const actual = await consumer.composeActionValidationCriteria(
          player,
          amount,
          configs.maxBetChoices.callBet,
        );

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });

    describe('when bet amount greater than maxBet per round', () => {
      it('should return invalid max bet.', async () => {
        // Arrange
        gameData.ingame = { [player.profile.name]: { betTracks: { bets: { ante: 1000 } } } };
        const consumer = new BaseActionAfterDealingConsumer(definition, gameData, publisher, logService);
        const expected = [
          {
            failure: false,
            notice: {
              errorCode: "SB1910",
              maxBet: "100"
            },
          },
          {
            failure: true,
            notice: {
              errorCode: "SB1911",
              maxBet: "1,000",
            },
          },
        ];

        // Act
        const actual = await consumer.composeActionValidationCriteria(
          player,
          100,
          configs.maxBetChoices.callBet,
        );

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe('composeBettingTimeValidationCriteria', () => {
    beforeEach(() => {
      BasePlaceBetConsumer.prototype.composeBettingTimeValidationCriteria = jest
        .fn()
        .mockReturnValue([]);
    });

    describe('when ingame is empty', () => {
      it('should return errorCode SB1935.', async () => {
        // Arrange
        gameData.ingame = {};
        const consumer = new BaseActionAfterDealingConsumer(
          definition,
          gameData,
          publisher,
          logService,
        );
        const expected = [
          {
            failure: true,
            notice: { "errorCode": "SB1935" },
          },
        ];

        // Act
        const actual = await consumer.composeBettingTimeValidationCriteria(player);

        // Assert
        expect(consumer.logService.logWarning).toHaveBeenCalledWith(
          `player ${player.profile.name} ingame undefined`,
        );
        expect(actual).toStrictEqual(expected);
      });
    });

    describe('when user ingame', () => {
      const testCases = [
        {
          action: actions.call,
          expected: [
            { failure: false, notice: { "errorCode": "SB1935" }, },
            { failure: false, notice: { "errorCode": "SB1935" }, },
            { failure: false, notice: { "errorCode": "SB1935" }, },
          ],
        },
        {
          action: actions.fold,
          expected: [
            { failure: false, notice: { "errorCode": "SB1935" }, },
            { failure: false, notice: { "errorCode": "SB1935" }, },
            { failure: false, notice: { "errorCode": "SB1935" }, },
          ],
        },
        {
          action: actions.betTurn,
          expected: [
            { failure: false, notice: { "errorCode": "SB1935" }, },
            { failure: false, notice: { "errorCode": "SB1935" }, },
            { failure: true, notice: { "errorCode": "SB1935" }, },
          ],
        },
        {
          action: actions.betRiver,
          expected: [
            { failure: false, notice: { "errorCode": "SB1935" }, },
            { failure: false, notice: { "errorCode": "SB1935" }, },
            { failure: true, notice: { "errorCode": "SB1935" }, },
          ],
        },
      ];
      it.each(testCases)('should return expected.', async ({ action, expected }) => {
        // Arrange
        const data = {
          ingame: { [player.profile.name]: { betTracks: { roundId: 1, communityCards: [] } } },
        };
        const consumer = new BaseActionAfterDealingConsumer(
          definition,
          data,
          publisher,
          logService,
        );

        // Act
        const actual = await consumer.composeBettingTimeValidationCriteria(player, action);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });
  });
});
