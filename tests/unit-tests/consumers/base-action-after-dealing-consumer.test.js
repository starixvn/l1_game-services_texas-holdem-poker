import { Core, Table } from 'sc-game-base';
import BasePlaceBetConsumer from '../../../src/consumers/base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../../../src/consumers/base-action-after-dealing-consumer';
import { actions } from '../../../src/helpers/constants';

describe('BaseActionAfterDealingConsumer test', () => {
  const definition = new Core.GameDefinition({ id: 1, name: 'texas-holdem-poker' });
  const gameData = new Table.TableGameData();
  const publisher = {};
  const logService = { logWarning: jest.fn() };
  const playerName = "a";
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
 
  it('inherit BasePlaceBetConsumer', () => {
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
    // const player = { profile: { name: 'a' }, session: { currencyGroupId: "1", currency: 'IN', language: 'en' }};
    it('should return expected when amount 500', async () => {
      // Arrange
      gameData.ingame = {}
      const consumer = new BaseActionAfterDealingConsumer(definition, gameData, publisher, logService);
      const expected = [
        {
          failure: true,
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
        500,
        configs.maxBetChoices.callBet,
      );

      // Assert
      expect(actual).toStrictEqual(expected);
    });

    it('should return expected when amount 0', async () => {
      // Arrange
      gameData.ingame = {}
      const consumer = new BaseActionAfterDealingConsumer(definition, gameData, publisher, logService);
      const expected = [
        {
          failure: false,
          notice:  {
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
        0,
        configs.maxBetChoices.callBet,
      );

      // Assert
      expect(actual).toStrictEqual(expected);
    });

    it('should return expected when bet amount greater than maxBet per round', async () => {
      // Arrange
      gameData.ingame = { [player.profile.name]: { betTracks: { bets: { ante: 1000 } } } };
      const consumer = new BaseActionAfterDealingConsumer(definition, gameData, publisher, logService);
      const expected = [
        {
          failure: false,
          notice:  {
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

  describe('composeBettingTimeValidationCriteria', () => {
    const player = { profile: { name: 'a' }, session: { currency: 'IN', language: 'en' } };
    beforeEach(() => {
      BasePlaceBetConsumer.prototype.composeBettingTimeValidationCriteria = jest
        .fn()
        .mockReturnValue([]);
    });
    it('should return expected when empty ingame', async () => {
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
          notice: {"errorCode": "SB1935"},
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

    describe('when have ingame', () => {
      const testCases = [
        {
          action: actions.call,
          expected: [
            { failure: false, notice: {"errorCode": "SB1935"}, },
            { failure: false, notice: {"errorCode": "SB1935"}, },
            { failure: false, notice: {"errorCode": "SB1935"}, },
          ],
        },
        {
          action: actions.fold,
          expected: [
            { failure: false, notice: {"errorCode": "SB1935"}, },
            { failure: false, notice: {"errorCode": "SB1935"}, },
            { failure: false, notice: {"errorCode": "SB1935"}, },
          ],
        },
        {
          action: actions.betTurn,
          expected: [
            { failure: false, notice: {"errorCode": "SB1935"}, },
            { failure: false, notice: {"errorCode": "SB1935"}, },
            { failure: true, notice: {"errorCode": "SB1935"}, },
          ],
        },
        {
          action: actions.betRiver,
          expected: [
            { failure: false, notice: {"errorCode": "SB1935"}, },
            { failure: false, notice: {"errorCode": "SB1935"}, },
            { failure: true, notice: {"errorCode": "SB1935"}, },
          ],
        },
      ];
      it.each(testCases)('should return expected', async ({ action, expected }) => {
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
