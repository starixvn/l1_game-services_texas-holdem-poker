import SettleGameConsumer from '../../../src/consumers/settle-game-consumer';
import { SettleGameRoundConsumer } from 'sc-game-base/src/core/event-consumers';
import { gameNotifications } from 'sc-base-database';
import { ranks } from '../../../src/helpers/constants';
import { compareCombination, getCombinationResult } from '../../../src/helpers/result-helper';

jest.mock('sc-base-database');
jest.mock('../../../src/helpers/result-helper');

describe('SettleGameConsumer', () => {
  const mockDate = new Date(123456);
  let spy;
  const resultKey = { rawValue: "456", formatValue: { cards: [], suffix: "aaa" } };
  const md5 = "123";

  beforeAll(() => {
    jest.useFakeTimers();
    spy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  });

  afterAll(() => {
    jest.clearAllMocks();
    spy.mockRestore();
  });

  it('should inherit SettleGameRoundConsumer', () => {
    // Act
    const consumer = new SettleGameConsumer({});

    // Assert
    expect(consumer instanceof SettleGameRoundConsumer);
  });

  describe('settleRound', () => {
    const playerName = 'a';
    const communityCards = [{ rank: 9 }, { rank: 7 }, { rank: 6 }, { rank: 3 }, { rank: 2 }];
    const betTracks = {
      bets: { ante: 10, call: 10, turn: 10 },
      dealer: [{ rank: 1 }, { rank: 0 }],
      player: [{ rank: 1 }, { rank: 0 }],
      communityCards,
      combinationResult: { dealer: { id: 1 } },
      roundId: 1,
      uid: 1,
    };

    const gameData = { ingame: { [playerName]: { betTracks } } };
    const definition = { id: 42 };
    let round = null, roundsRepository = null, consumer = null;
    const publisher = { publishToUser: jest.fn() };

    beforeEach(() => {
      round = {
        result: { dealer: [] },
        odds: {},
        save: jest.fn(),
        communityCardsGenerated: [{ rank: 5 }, { rank: 6 }, { rank: 7 }, { rank: 8 }, { rank: 9 }]
      };

      roundsRepository =  {
        findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(round) }),
      };

      consumer = new SettleGameConsumer({ definition, gameData, roundsRepository, publisher });
      consumer.settleBets = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call roundsRepository findOne', async () => {
      // Act
      await consumer.settleRound(playerName, true);

      // Assert
      expect(roundsRepository.findOne).toHaveBeenCalledWith({ id: betTracks.roundId });
    });

    describe('when isAutoSettle is true', () => {
      describe('and betTracks communityCards length greater than or equal 3.', () => {
        it('should call getCombinationResult twice for dealer/player.', async () => {
          // Arrange
          getCombinationResult.mockReturnValue([{ rank: 9 }, { rank: 9 }]);

          // Act
          await consumer.settleRound(playerName, false, true);

          // Assert
          expect(getCombinationResult).toHaveBeenCalledTimes(2);
        });

        const stepTestCases = [
          {
            communityCardsData: [{ rank: 9 }, { rank: 7 }, { rank: 6 }],
            step: 'call'
          },
          {
            communityCardsData: [{ rank: 9 }, { rank: 7 }, { rank: 6 }, { rank: 3 }],
            step: 'turn'
          }
        ];
        it.each(stepTestCases)('should publish to user.', async ({ communityCardsData, step }) => {
          // Arrange
          betTracks.communityCards = communityCardsData;
          getCombinationResult.mockReturnValue([{ rank: 9 }, { rank: 9 }]);

          // Act
          await consumer.settleRound(playerName, false, true);

          // Assert
          expect(publisher.publishToUser).toHaveBeenCalledWith(betTracks.uid, {
            autoSettle: {
              communityCards: round.communityCardsGenerated,
              combinationResult: betTracks.combinationResult,
              dealer: betTracks.dealer,
              totalAmount: 30,
              step
            }
          });
        });
      });

      describe('and betTracks communityCards is empty array', () => {
        beforeEach(() => {
          betTracks.communityCards = [];
        });

        it('round settlementResult must be undefined', async () => {
          // Act
          await consumer.settleRound(playerName, false, true);

          // Assert
          expect(round.settlementResult).toBeUndefined();
        });
      });
    });

    it('should save round correctly', async () => {
      // Arrange
      betTracks.communityCards = communityCards;
      const result = { dealer: betTracks.dealer, communityCards: betTracks.communityCards };

      // Act
      await consumer.settleRound(playerName);

      // Assert
      expect(round.settlementResult).toStrictEqual(betTracks.combinationResult.dealer);
      expect(round.result).toStrictEqual(result);
      expect(round.time).toEqual(new Date(123456));
      expect(round.ended).toBeTrue();
      expect(round.save).toHaveBeenCalled();
    });

    const foldTestCases = [{ fold: true }, { fold: false }];
    it.each(foldTestCases)('should call settle bet correctly.', async (fold) => {
      // Arrange
      const finish = { roundId: betTracks.roundId, odds: round.odds, time: new Date(123456) };

      // Act
      await consumer.settleRound(playerName, fold);

      // Assert
      expect(consumer.settleBets).toHaveBeenCalledWith(
        { ...finish, playerName, playerUID: betTracks.uid },
        fold,
      );
    });

    it('should call gameNotifications.deleteOne', async () => {
      // Act
      await consumer.settleRound(playerName, true);

      // Assert
      expect(gameNotifications.deleteOne).toHaveBeenCalledWith({
        uid: betTracks.uid,
        gameId: definition.id,
      });
    });
  });

  describe('settleBets', () => {
    describe('when bet undefined', () => {
      it('should run correctly.', async () => {
        // Arrange
        const betsRepository = {
          findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(undefined) }),
        };
        const consumer = new SettleGameConsumer({ betsRepository });
        consumer.calculateBetResult = jest.fn();

        // Act
        await consumer.settleBets({ roundId: 1 });

        // Assert
        expect(betsRepository.findOne).toHaveBeenCalledWith({ phien: 1, thanhtoan: false });
        expect(consumer.calculateBetResult).not.toHaveBeenCalled();
      });
    });

    describe('when bet has value and has odds', () => {
      it('should run correctly.', async () => {
        // Arrange
        const betTracks = { bets: { ante: 10 }, combinationResult: { player: { id: 1 } }, md5, resultKey };
        const gameData = { ingame: { a: { betTracks } }, gameConfigs: {} };
        const bet = { save: jest.fn() };
        const betsRepository = {
          findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(bet) }),
        };
        const publisher = { publishToUser: jest.fn() };
        const consumer = new SettleGameConsumer({ gameData, betsRepository, publisher });
        const betResult = { totalWin: 10, result: { id: 1 }, settlementResult: { ante: 10 } };
        consumer.calculateBetResult = jest.fn().mockReturnValue(betResult);
        consumer.callEndGame = jest.fn();
        const finish = {
          roundId: 1,
          odds: {},
          time: new Date(123456),
          playerName: 'a',
          playerUID: 123,
        };

        // Act
        await consumer.settleBets(finish);

        // Assert
        expect(bet.isFold).toBeFalse();
        expect(bet.betwin).toBe(betResult.totalWin);
        expect(bet.thanhtoan).toBeTrue();
        expect(bet.result).toStrictEqual(betResult.result);
        expect(bet.settlementResult).toStrictEqual(betResult.settlementResult);
        expect(bet.endTime).toEqual(finish.time);
        expect(bet.save).toHaveBeenCalled();
        expect(consumer.callEndGame).toHaveBeenCalledWith(
          bet,
          finish.roundId,
          finish.time,
          betResult,
        );
        expect(consumer.gameData.ingame).toStrictEqual({});
        expect(publisher.publishToUser).toHaveBeenCalledWith(finish.playerUID, {
          finish: { settlementResult: betResult.settlementResult },
          md5: { key: { rawValue: "456", formatValue: { cards: [], suffix: "aaa" } } }
        });
      });
    });

    describe('when bet has value and not odd', () => {
      it('should run correctly.', async () => {
        // Arrange
        const betTracks = { bets: { ante: 10 }, combinationResult: { player: { id: 1 } }, md5, resultKey };
        const gameData = { ingame: { a: { betTracks } }, gameConfigs: { odds: {} } };
        const bet = { save: jest.fn() };
        const betsRepository = {
          findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(bet) }),
        };
        const roundRepo = { md5: "123", };

        process.roundsRepository = {
          findOne: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(roundRepo) }),
          }),
        };

        const publisher = { publishToUser: jest.fn() };
        const consumer = new SettleGameConsumer({ gameData, betsRepository, publisher });
        const betResult = { totalWin: 10, result: { id: 1 }, settlementResult: { ante: 10 } };
        consumer.calculateBetResult = jest.fn().mockReturnValue(betResult);
        consumer.callEndGame = jest.fn();
        const finish = {
          roundId: 1,
          time: new Date(123456),
          playerName: 'a',
          playerUID: 123,
        };

        // Act
        await consumer.settleBets(finish);

        // Assert
        expect(bet.isFold).toBeFalse();
        expect(bet.betwin).toBe(betResult.totalWin);
        expect(bet.thanhtoan).toBeTrue();
        expect(bet.result).toStrictEqual(betResult.result);
        expect(bet.settlementResult).toStrictEqual(betResult.settlementResult);
        expect(bet.endTime).toEqual(finish.time);
        expect(bet.save).toHaveBeenCalled();
        expect(consumer.callEndGame).toHaveBeenCalledWith(
          bet,
          finish.roundId,
          finish.time,
          betResult,
        );
        expect(consumer.gameData.ingame).toStrictEqual({});
        expect(publisher.publishToUser).toHaveBeenCalledWith(finish.playerUID, {
          finish: { settlementResult: betResult.settlementResult },
          md5: { key: { rawValue: "456", formatValue: { cards: [], suffix: "aaa" } } }
        });
      });
    });

    describe('when betTrack resultKey is undefined', () => {
      it('should call roundsRepository', async () => {
        // Arrange
        const betTracks = { bets: { ante: 10 }, combinationResult: { player: { id: 1 } }, resultKey: undefined };
        const gameData = { ingame: { a: { betTracks } }, gameConfigs: { odds: {} } };
        const bet = { save: jest.fn(), cards: [] };
        const betsRepository = {
          findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(bet) }),
        };
        const round = { resultKeyRaw: "[9, Q, 8, 2, A, 7, K, J, 3]b70bb7b9380b7f2ab1b28f", md5: "376820dccd158ebc11505cda4830731c", result: { dealer: [] }, communityCardsGenerated: [] };

        const roundsRepository = {
          findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(round) }),
        };

        const publisher = { publishToUser: jest.fn() };
        const consumer = new SettleGameConsumer({ gameData, betsRepository, publisher, roundsRepository });
        const betResult = { totalWin: 10, result: { id: 1 }, settlementResult: { ante: 10 } };
        consumer.calculateBetResult = jest.fn().mockReturnValue(betResult);
        consumer.callEndGame = jest.fn();
        const finish = {
          roundId: 1,
          time: new Date(123456),
          playerName: 'a',
          playerUID: 123,
        };

        // Act
        await consumer.settleBets(finish);

        // Assert
        expect(publisher.publishToUser).toHaveBeenCalledWith(finish.playerUID, {
          finish: { settlementResult: betResult.settlementResult },
          md5: { key: { rawValue: round.resultKeyRaw, formatValue: { cards: [], suffix: "b70bb7b9380b7f2ab1b28f" } } }
        });
      });
    });
  });

  describe('calculateBetResult', () => {
    describe('when fold', () => {
      it('should return expected.', () => {
        // Arrange
        const betTracks = { bets: { ante: 10 }, combinationResult: { player: { id: 1 } } };
        const gameData = { ingame: { a: { betTracks } } };
        const consumer = new SettleGameConsumer({ gameData });
        const bet = { ante: 10 };
        const expected = {
          totalBetAmount: betTracks.bets.ante,
          totalWin: 0,
          netWin: 0,
          totalLost: betTracks.bets.ante,
          result: betTracks.combinationResult.player,
          settlementResult: { ante: 0, call: 0, turn: 0, river: 0 },
        };

        // Act
        const actual = consumer.calculateBetResult('a', bet, {}, true);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });

    describe('when player win', () => {
      it('should return expected.', () => {
        // Arrange
        const betTracks = {
          bets: { ante: 10, call: 10, turn: 10, river: 10 },
          combinationResult: { player: { id: 2 }, dealer: { id: 1 } },
        };
        const gameData = { ingame: { a: { betTracks } } };
        const consumer = new SettleGameConsumer({ gameData });
        const bet = { ante: 10, call: 10, turn: 10, river: 10 };
        compareCombination.mockReturnValue(-1);
        const expected = {
          totalBetAmount: 40,
          totalWin: 20,
          netWin: 10,
          totalLost: 0,
          result: betTracks.combinationResult.player,
          settlementResult: { ante: 0, call: 0, turn: 0, river: 0 },
        };
        consumer.settleHandPlayerWin = jest.fn((name, odds, _, result) => {
          result.totalWin = 20;
          result.netWin = 10;
        });

        // Act
        const actual = consumer.calculateBetResult('a', bet, {}, false);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });

    describe('when player tie', () => {
      it('should return expected.', () => {
        // Arrange
        const betTracks = {
          bets: { ante: 10, call: 10, turn: 10, river: 10 },
          combinationResult: { player: { id: 2 }, dealer: { id: 1 } },
        };
        const gameData = { ingame: { a: { betTracks } } };
        const consumer = new SettleGameConsumer({ gameData });
        consumer.normalizeOdds = jest.fn().mockReturnValue({});
        const bet = { ante: 10, call: 10, turn: 10, river: 10 };
        compareCombination.mockReturnValue(0);
        const expected = {
          totalBetAmount: 40,
          totalWin: 40,
          netWin: 0,
          totalLost: 0,
          result: betTracks.combinationResult.player,
          settlementResult: { ante: 10, call: 10, turn: 10, river: 10 },
        };

        // Act
        const actual = consumer.calculateBetResult('a', bet, {}, false);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });

    describe('when player lose', () => {
      it('should return expected.', () => {
        // Arrange
        const betTracks = {
          bets: { ante: 10, call: 10, turn: 10, river: 10 },
          combinationResult: { player: { id: 2 }, dealer: { id: 1 } },
        };
        const gameData = { ingame: { a: { betTracks } } };
        const consumer = new SettleGameConsumer({ gameData });
        consumer.normalizeOdds = jest.fn().mockReturnValue({});
        const bet = { ante: 10, call: 10, turn: 10, river: 10 };
        compareCombination.mockReturnValue(1);
        const expected = {
          totalBetAmount: 40,
          totalWin: 0,
          netWin: 0,
          totalLost: 40,
          result: betTracks.combinationResult.player,
          settlementResult: { ante: 0, call: 0, turn: 0, river: 0 },
        };

        // Act
        const actual = consumer.calculateBetResult('a', bet, {}, false);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe('settleHandPlayerWin', () => {
    describe('when hand ranking greater than straight', () => {
      describe('and odds has value', () => {
        it('should run correctly.', () => {
          // Arrange
          const betTracks = { combinationResult: { player: { id: ranks.fourKind } } };
          const gameData = { ingame: { a: { betTracks } } };
          const consumer = new SettleGameConsumer({ gameData });
          consumer.normalizeAnteOdds = jest.fn().mockReturnValue({ [ranks.fourKind]: 2 });
          const result = { totalWin: 0, netWin: 0, settlementResult: { ante: 0 } };
          const bet = { ante: 10 };
          consumer.settleDetailBetResult = jest.fn();

          // Act
          consumer.settleHandPlayerWin('a', {}, bet, result);

          // Assert
          expect(result.totalWin).toBe(20);
          expect(result.netWin).toBe(10);
          expect(result.settlementResult.ante).toBe(20);
          expect(consumer.settleDetailBetResult).toHaveBeenCalledTimes(3);
          expect(consumer.settleDetailBetResult).toHaveBeenCalledWith(result, {}, bet, 'call');
          expect(consumer.settleDetailBetResult).toHaveBeenCalledWith(result, {}, bet, 'turn');
          expect(consumer.settleDetailBetResult).toHaveBeenCalledWith(result, {}, bet, 'river');
        });
      })

      describe('and odds empty', () => {
        it('should run correctly.', () => {
          // Arrange
          const betTracks = { combinationResult: { player: { id: ranks.straight } } };
          const gameData = { ingame: { a: { betTracks } } };
          const consumer = new SettleGameConsumer({ gameData });
          consumer.normalizeAnteOdds = jest.fn().mockReturnValue({});
          const result = { totalWin: 0, netWin: 0, settlementResult: { ante: 0 } };
          const bet = {};
          consumer.settleDetailBetResult = jest.fn();

          // Act
          consumer.settleHandPlayerWin('a', {}, bet, result);

          // Assert
          expect(result.totalWin).toBe(0);
          expect(result.netWin).toBe(0);
          expect(result.settlementResult.ante).toBe(0);
          expect(consumer.settleDetailBetResult).toHaveBeenCalledTimes(3);
          expect(consumer.settleDetailBetResult).toHaveBeenCalledWith(result, {}, bet, 'call');
          expect(consumer.settleDetailBetResult).toHaveBeenCalledWith(result, {}, bet, 'turn');
          expect(consumer.settleDetailBetResult).toHaveBeenCalledWith(result, {}, bet, 'river');
        });
      });

    });

    describe('when hand ranking less than straight', () => {
      it('should run correctly', () => {
        // Arrange
        const betTracks = { combinationResult: { player: { id: ranks.twoPairs } } };
        const gameData = { ingame: { a: { betTracks } } };
        const consumer = new SettleGameConsumer({ gameData });
        consumer.normalizeAnteOdds = jest.fn().mockReturnValue({});
        const result = { totalWin: 0, netWin: 0, settlementResult: { ante: 0 } };
        const bet = { ante: 10 };
        consumer.settleDetailBetResult = jest.fn();

        // Act
        consumer.settleHandPlayerWin('a', {}, bet, result);

        // Assert
        expect(result.totalWin).toBe(10);
        expect(result.settlementResult.ante).toBe(10);
        expect(consumer.settleDetailBetResult).toHaveBeenCalledTimes(3);
        expect(consumer.settleDetailBetResult).toHaveBeenCalledWith(result, {}, bet, 'call');
        expect(consumer.settleDetailBetResult).toHaveBeenCalledWith(result, {}, bet, 'turn');
        expect(consumer.settleDetailBetResult).toHaveBeenCalledWith(result, {}, bet, 'river');
      });
    });
  });

  describe('settleDetailBetResult', () => {
    describe('when action is call', () => {
      it('should return callOdds.', () => {
        // Arrange
        const bet = { call: 10 };
        const odds = { call: 2 };
        const result = { totalWin: 0, netWin: 0, settlementResult: { call: 0 } };
        const consumer = new SettleGameConsumer({});

        // Act
        consumer.settleDetailBetResult(result, odds, bet, 'call');

        // Assert
        expect(result.callOdds).toBe(2);
      });
    });

    describe('when action is turn', () => {
      it('should return turnOdds.', () => {
        // Arrange
        const bet = { turn: 10 };
        const odds = { turn: 2 };
        const result = { totalWin: 0, netWin: 0, settlementResult: { turn: 0 } };
        const consumer = new SettleGameConsumer({});

        // Act
        consumer.settleDetailBetResult(result, odds, bet, 'turn');

        // Assert
        expect(result.turnOdds).toBe(2);
      });
    });

    describe('when action is river', () => {
      it('should return riverOdds.', () => {
        // Arrange
        const bet = { river: 10 };
        const odds = { river: 2 };
        const result = { totalWin: 0, netWin: 0, settlementResult: { river: 0 } };
        const consumer = new SettleGameConsumer({});

        // Act
        consumer.settleDetailBetResult(result, odds, bet, 'river');

        // Assert
        expect(result.riverOdds).toBe(2);
      });
    });
    describe('when have odds', () => {
      it('should run correctly.', () => {
        // Arrange
        const bet = { call: 10 };
        const odds = { call: 2 };
        const result = { totalWin: 0, netWin: 0, settlementResult: { call: 0 } };
        const consumer = new SettleGameConsumer({});

        // Act
        consumer.settleDetailBetResult(result, odds, bet, 'call');

        // Assert
        expect(result.totalWin).toBe(20);
        expect(result.netWin).toBe(10);
        expect(result.settlementResult.call).toBe(20);
      });
    });

    describe('when odds empty', () => {
      it('should run correctly.', () => {
        // Arrange
        const bet = {};
        const result = { totalWin: 0, netWin: 0, settlementResult: { call: 0 } };
        const consumer = new SettleGameConsumer({});

        // Act
        consumer.settleDetailBetResult(result, {}, bet, 'call');

        // Assert
        expect(result.totalWin).toBe(0);
        expect(result.netWin).toBe(0);
        expect(result.settlementResult.call).toBe(0);
      });
    });
  });

  describe('normalizeAnteOdds', () => {
    it('should return expected', () => {
      // Arrange
      const consumer = new SettleGameConsumer({});
      const odds = {
        AnteBet_onePair: 3,
        AnteBet_highCard: 2,
        AnteBet_twoPairs: 4,
        AnteBet_straight: 5,
        call: 10,
        turn: 9,
      };
      const expected = {
        1: 2,
        2: 3,
        3: 4,
        5: 5,
      };

      // Act
      const actual = consumer.normalizeAnteOdds(odds);

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });
});
