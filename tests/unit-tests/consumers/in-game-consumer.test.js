import { Core, Table } from 'sc-game-base';
import InGameConsumer from '../../../src/consumers/in-game-consumer';

jest.mock('sc-base-database');

const realPlayer = {
  UID: 1,
  profile: { name: 'a' },
  session: {
    currencyGroupId: 1,
    currencyCode: 'USD',
    multiplier: 1000,
  },
};

const md5 = '123',
  odds = { choice01: 2 };

const buildConsumer = (gameData) => {
  const roundsRepository = {
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue({ md5 }) }),
  };
  const definition = new Core.GameDefinition({ id: 1, name: 'texasholdempoker' });

  const consumer = new InGameConsumer(definition, gameData, roundsRepository);
  consumer.getBalance = jest.fn();
  consumer.getUserInfo = jest.fn().mockReturnValue({ uid: realPlayer.UID });

  return consumer;
};

const buildPreGameData = () => {
  let preGameData = new Table.TableGameData();
  preGameData.md5 = md5;
  preGameData.resultKey = { rawValue: '456', formatValue: { cards: [], suffix: 'aaa' } };
  preGameData.gameConfigs = {
    enabled: true,
    minbet: 1,
    maxbet: 1000,
    choices_maxbet: {
      choice01: 200,
    },
    odds,
    enableFreeBet: false,
  };

  preGameData.exchangeRates = {
    exId: 1,
    code: {
      USD: 1,
      VND: 0.00004405,
      IDR: 0.07099,
    },
  };

  return preGameData;
};

describe('InGameConsumer', () => {
  it('should inherit BaseInGameConsumer', () => {
    // Arrange
    Core.BaseEventConsumers.InGameConsumer.prototype.buildPayload = jest.fn();

    // Act
    const consumer = buildConsumer(buildPreGameData());

    // Assert
    expect(consumer instanceof Core.BaseEventConsumers.InGameConsumer);
  });

  describe('buildPayload', () => {
    it('should get balance.', async () => {
      // Arrange
      const consumer = buildConsumer(buildPreGameData());

      // Act
      await consumer.buildPayload(realPlayer);

      // Assert
      expect(consumer.getBalance).toHaveBeenCalledWith(realPlayer, true);
    });

    describe('betTracks test cases', () => {
      const betTracksHasValue = {
        roundId: 10,
        bets: { ante: 10 },
        player: [],
        communityCards: [{ rank: 0, suit: 1 }],
        combinationResult: { player: {} },
      };

      const emptyBetTracks = {};
      const gameConfigs = {
        enableFreeBet: false,
        odds,
      };

      const testCases = [
        {
          betTracks: betTracksHasValue,
          expected: {
            gameConfigs,
            ownBets: {
              roundId: betTracksHasValue.roundId,
              bets: betTracksHasValue.bets,
              player: betTracksHasValue.player,
              communityCards: betTracksHasValue.communityCards,
              combinationResult: betTracksHasValue.combinationResult,
              totalAmount: 10,
              hasSwappedOrHold: true,
            },
            user: { uid: realPlayer.UID, rate: 1000 },
            lastRoundId: 10,
            md5: { key: md5 },
            totalBets: {},
          },
        },
        {
          betTracks: emptyBetTracks,
          expected: {
            gameConfigs,
            ownBets: {},
            user: { uid: realPlayer.UID, rate: 1000 },
            lastRoundId: 10,
            md5: {},
            totalBets: {},
          },
        },
        {
          betTracks: {
            roundId: 10,
            bets: { ante: 10 },
            player: [],
            communityCards: [],
            combinationResult: { player: {} },
            canSwap: true,
          },
          expected: {
            gameConfigs,
            ownBets: {
              roundId: betTracksHasValue.roundId,
              bets: betTracksHasValue.bets,
              communityCards: [],
              totalAmount: 10,
              hasSwappedOrHold: false,
            },
            user: { uid: realPlayer.UID, rate: 1000 },
            lastRoundId: 10,
            md5: { key: md5 },
            totalBets: {},
          },
        },
      ];

      it.each(testCases)('should return expected.', async ({ betTracks, expected }) => {
        const gameData = {
          ...buildPreGameData(),
          ingame: {
            [realPlayer.profile.name]: { betTracks },
          },
          roundId: 10,
        };

        const consumer = buildConsumer(gameData);

        // Act
        const actual = await consumer.buildPayload(realPlayer);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });
  });
});
