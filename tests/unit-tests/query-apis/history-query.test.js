import HistoryQuery from '../../../src/query-apis/history-query';
import { compareCombination } from '../../../src/helpers/result-helper';

jest.mock('../../../src/helpers/result-helper');

describe('HistoryQuery', () => {
  const query = new HistoryQuery();
  describe('convertBet', () => {
    it('should return expected', () => {
      // Arrange
      const bet = {
        time: new Date(123),
        isFold: true,
        bet: 100,
        betwin: 0,
        result: { id: 1, cards: [] },
        other: 'a',
      };
      const expected = {
        time: bet.time,
        playerHandId: bet.result.id,
        isFold: bet.isFold,
        stake: bet.bet,
        betWin: bet.betwin,
      };

      // Act
      const actual = query.convertBet(bet);

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('convertTicketDetail', () => {
    describe('when isFold false round is ended', () => {
      it('should return expected', () => {
        // Arrange
        const bet = {
          isFold: false,
          bet: 30,
          betWin: 0,
          result: { id: 2, cards: [{ rank: 1 }, { rank: 1 }] },
          settlementResult: { ante: 0, call: 0, turn: 0, river: 0 },
          cards: [{ rank: 1 }],
          ante: 10,
          anteOdds: 2,
          callOdds: 2,
          turnOdds: 2,
          riverOdds: 2,
          call: 10,
          turn: 10,
          river: 10,
          other: 'a',
          time: new Date(123),
          callTime: new Date(123),
          riverTime: new Date(123),
          turnTime: new Date(123),
        };

        const round = {
          ended: true,
          result: { dealer: [{ rank: 2 }], communityCards: [{ rank: 1 }] },
          settlementResult: { id: 1, cards: [{ rank: 2 }, { rank: 1 }] },
          isSwappedOrHold: true,
          other: 'b',
        };

        const player = {
          cards: bet.cards,
          combination: bet.result.cards,
          handId: bet.result.id,
        };
        const dealer = {
          cards: round.result.dealer,
          combination: round.settlementResult.cards,
          handId: round.settlementResult.id
        };
        const bets = [{
          betChoice: "ante",
          time: bet.time,
          odds: bet.anteOdds,
          stake: bet.ante,
          win: bet.settlementResult.ante
        },
        {
          betChoice: "call",
          time: bet.callTime,
          odds: bet.callOdds,
          stake: bet.call,
          win: bet.settlementResult.call
        },
        {
          betChoice: "turn",
          time: bet.turnTime,
          odds: bet.turnOdds,
          stake: bet.turn,
          win: bet.settlementResult.turn
        },
        {
          betChoice: "river",
          time: bet.riverTime,
          odds: bet.riverOdds,
          stake: bet.river,
          win: bet.settlementResult.river
        }];

        const expected = {
          player,
          dealer,
          communityCards: round.result.communityCards,
          bets,
          isFold: bet.isFold,
          isSwappedOrHold: true,
          isPlayerWin: 0
        };

        compareCombination.mockReturnValue(0);

        // Act
        const actual = query.convertTicketDetail(bet, round);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });

    describe('when isFold true', () => {
      it('should return expected', () => {
        // Arrange
        const bet = {
          isFold: true,
          bet: 100,
          betWin: 0,
          result: { id: 2, cards: [{ rank: 1 }, { rank: 1 }] },
          settlementResult: { ante: 0, call: 0, turn: 0, river: 0 },
          cards: [{ rank: 1 }],
          ante: 10,
          call: 0,
          turn: 10,
          river: 10,
          other: 'a',
          anteOdds: 2,
          time: new Date(123),
        };
        const round = {
          result: { dealer: [{ rank: 2 }], communityCards: [{ rank: 1 }] },
          other: 'b',
          isSwappedOrHold: true
        };
        const player = {
          cards: bet.cards,
          combination: bet.result.cards,
          handId: bet.result.id,
        };
        const bets = [{
          betChoice: "ante",
          time: bet.time,
          odds: bet.anteOdds,
          stake: bet.ante,
          win: bet.settlementResult.ante
        }];

        const expected = {
          player,
          dealer: {},
          communityCards: round.result.communityCards,
          bets,
          isFold: bet.isFold,
          isPlayerWin: -1,
          isSwappedOrHold: true
        };

        // Act
        const actual = query.convertTicketDetail(bet, round);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe('queryHistory', () => {
    const player = { UID: 1 };
    const page = 1;
    const pageSize = 8;

    describe('when player undefined', () => {
      it('should return empty object', async () => {
        // Act
        const actual = await query.queryHistory(undefined, 1, 8);

        // Assert
        expect(actual).toStrictEqual({});
      });
    });

    describe('when bets length equal 0', () => {
      it('should return expected', async () => {
        // Arrange
        query.betsRepository = {
          countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(0) }),
          find: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue([]) }),
          }),
        };
        const expected = { history: { betLogs: [], page, pageSize, total: 0 } };

        // Act
        const actual = await query.queryHistory(player, page, pageSize);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });

    describe('when bets length greater than 0', () => {
      it('should return expected', async () => {
        const bet = { phien: 1, bet: 10 };
        const round = { id: 1, settlementResult: { id: 2  } };
        query.betsRepository = {
          countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(1) }),
          find: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue([bet]) }),
          }),
        };
        query.roundQuery = { getOne: jest.fn(bet.phien, { _id: false }).mockReturnValue(round) };
        query.convertBet = jest.fn().mockReturnValue({ stake: bet.bet });
        compareCombination.mockReturnValue(0);
        const expected = {
          history: {
            betLogs: [
              {
                stake: bet.bet,
                roundId: round.id,
                dealerHandId: round.settlementResult.id,
                isPlayerWin: 0
              },
            ],
            page,
            pageSize,
            total: 1,
          },
        };

        // Act
        const actual = await query.queryHistory(player, page, pageSize);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe('queryTicketDetail', () => {
    const player = { UID: 1 };
    const roundId = 1;

    describe('when player undefined', () => {
      it('should return empty object', async () => {
        // Act
        const actual = await query.queryTicketDetail(undefined, roundId);

        // Assert
        expect(actual).toStrictEqual({});
      });
    });

    describe('when can not find bet', () => {
      it('should return empty object', async () => {
        // Arrange
        query.betsRepository = {
          findOne: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(null) }),
          }),
        };

        // Act
        const actual = await query.queryTicketDetail(player, roundId);

        // Assert
        expect(actual).toStrictEqual({});
      });
    });

    describe('when bet has value', () => {
      it('should return expected', async () => {
        // Arrange
        const bet = { phien: roundId };
        query.betsRepository = {
          findOne: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(bet) }),
          }),
        };
        query.roundQuery = { getOne: jest.fn().mockReturnValue({ id: roundId }) };
        query.convertTicketDetail = jest.fn(bet, { id: roundId }).mockReturnValue({});
        const expected = { ticketDetail: {} };

        // Act
        const actual = await query.queryTicketDetail(player, roundId);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });
  });
});
