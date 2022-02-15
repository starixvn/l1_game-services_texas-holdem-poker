import SettleGameConsumer from '../../../src/consumers/settle-game-consumer';
import { SettleGameRoundConsumer } from 'sc-game-base/src/core/event-consumers';
import { gameNotifications } from 'sc-base-database';
import { ranks } from '../../../src/helpers/constants';
import { compareCombination } from '../../../src/helpers/result-helper';

jest.mock('sc-base-database');
jest.mock('../../../src/helpers/result-helper');

describe('Settle game test', () => {
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

  it('inherit SettleGameRoundConsumer', () => {
    // Act
    const consumer = new SettleGameConsumer({});

    // Assert
    expect(consumer instanceof SettleGameRoundConsumer);
  });

  describe('settleRound', () => {
    const playerName = 'a';
    const communityCards = [{ rank: 9 }, { rank: 7 }, { rank: 6 }, { rank: 3 }, { rank: 2 }];
    const betTracks = {
      dealer: [{ rank: 1 }, { rank: 0 }],
      player: [{ rank: 1 }, { rank: 0 }],
      communityCards,
      combinationResult: { dealer: { id: 1 } },
      roundId: 1,
      uid: 1,
    };
    const gameData = { ingame: { [playerName]: { betTracks } } };
    const definition = { id: 42 };

    describe('when isAutoSettle false', () => {
      it('should run correctly when isFold true', async () => {
        // Arrange
        const round = { odds: {}, save: jest.fn() };
        const roundsRepository = {
          findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(round) }),
        };
        const consumer = new SettleGameConsumer({ definition, gameData, roundsRepository });
        consumer.settleBets = jest.fn();
        betTracks.communityCards = [];
        const result = { dealer: betTracks.dealer, communityCards: betTracks.communityCards };
        const finish = { roundId: betTracks.roundId, odds: round.odds, time: new Date(123456) };

        // Act
        await consumer.settleRound(playerName, true);

        // Assert
        expect(round.settlementResult).toBeUndefined();
        expect(round.result).toStrictEqual(result);
        expect(round.time).toEqual(new Date(123456));
        expect(round.ended).toBeTrue();
        expect(round.save).toHaveBeenCalled();
        expect(consumer.settleBets).toHaveBeenCalledWith(
          { ...finish, playerName, playerUID: betTracks.uid },
          true,
        );
        expect(gameNotifications.deleteOne).toHaveBeenCalledWith({
          uid: betTracks.uid,
          gameId: definition.id,
        });
      });

      it('should run correctly when isFold false', async () => {
        // Arrange
        const round = { odds: {}, save: jest.fn() };
        const roundsRepository = {
          findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(round) }),
        };
        const consumer = new SettleGameConsumer({ definition, gameData, roundsRepository });
        consumer.settleBets = jest.fn();
        betTracks.communityCards = communityCards;
        const result = { dealer: betTracks.dealer, communityCards: betTracks.communityCards };
        const finish = { roundId: betTracks.roundId, odds: round.odds, time: new Date(123456) };

        // Act
        await consumer.settleRound(playerName);

        // Assert
        expect(round.settlementResult).toStrictEqual(betTracks.combinationResult.dealer);
        expect(round.result).toStrictEqual(result);
        expect(round.time).toEqual(new Date(123456));
        expect(round.ended).toBeTrue();
        expect(round.save).toHaveBeenCalled();
        expect(consumer.settleBets).toHaveBeenCalledWith(
          { ...finish, playerName, playerUID: betTracks.uid },
          false,
        );
        expect(gameNotifications.deleteOne).toHaveBeenCalledWith({
          uid: betTracks.uid,
          gameId: definition.id,
        });
      });
    });

    describe('when isAutoSettle true', () => {
      it('it should run correctly when communityCards is empty array', async () => {
        // Arrange
        const round = { odds: {}, save: jest.fn() };
        const roundsRepository = {
          findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(round) }),
        };
        const consumer = new SettleGameConsumer({ definition, gameData, roundsRepository });
        consumer.settleBets = jest.fn();
        betTracks.communityCards = [];
        const result = { dealer: betTracks.dealer, communityCards: betTracks.communityCards };
        const finish = { roundId: betTracks.roundId, odds: round.odds, time: new Date(123456) };

        // Act
        await consumer.settleRound(playerName, false, true);

        // Assert
        expect(round.settlementResult).toBeUndefined();
        expect(round.result).toStrictEqual(result);
        expect(round.time).toEqual(new Date(123456));
        expect(round.ended).toBeTrue();
        expect(round.save).toHaveBeenCalled();
        expect(consumer.settleBets).toHaveBeenCalledWith(
          { ...finish, playerName, playerUID: betTracks.uid },
          true,
        );
        expect(gameNotifications.deleteOne).toHaveBeenCalledWith({
          uid: betTracks.uid,
          gameId: definition.id,
        });
      });
    });
  });

  describe('settleBets', () => {
    it('should run correctly when bet undefined', async () => {
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

    it('should run correctly when bet has value and has odds', async () => {
      // Arrange
      const betTracks = { bets: { ante: 10, aa: 10 }, combinationResult: { player: { id: 1 } }, md5, resultKey };
      const gameData = { ingame: { a: { betTracks } }, gameConfigs: {}};
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

    it('should run correctly when bet has value and not odd', async () => {
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

  describe('calculateBetResult', () => {
    it('should return expected when fold', () => {
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

    it('should return expected when player win', () => {
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

    it('should return expected when player tie', () => {
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

    it('should return expected when player lose', () => {
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

  describe('settleHandPlayerWin', () => {
    describe('when hand ranking greater than straight', () => {
      it('should run correctly when odds has value', () => {
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

      it('should run correctly when odds empty', () => {
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
    it('should run correctly when have odds', () => {
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

    it('should run correctly when odds empty', () => {
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
