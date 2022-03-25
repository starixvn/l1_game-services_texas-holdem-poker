import { compareCombination } from '../helpers/result-helper';

export default class HistoryQuery {
  constructor(roundQuery, betsRepository) {
    this.roundQuery = roundQuery;
    this.betsRepository = betsRepository;
  }

  convertBet(bet) {
    return {
      time: bet.time,
      playerHandId: bet.result.id,
      isFold: bet.isFold,
      stake: bet.bet,
      betWin: bet.betwin,
    };
  }

  convertTicketDetail(bet, round) {
    const player = {
      cards: bet.cards,
      combination: bet.result.cards,
      handId: bet.result.id,
    };

    const dealer = bet.isFold
      ? {}
      : {
        cards: round.result.dealer,
        combination: round.settlementResult?.cards,
        handId: round.settlementResult?.id,
      };

    let bets = [{
      betChoice: "ante",
      time: bet.time,
      odds: bet.anteOdds ?? 0,
      stake: bet.ante,
      win: bet.settlementResult.ante
    }];

    if (round.ended && !bet.isFold) {
      bets = bets.concat([{
        betChoice: "call",
        time: bet.callTime,
        odds: bet.callOdds ?? 0,
        stake: bet.call,
        win: bet.settlementResult.call
      },
      {
        betChoice: "turn",
        time: bet.turnTime,
        odds: bet.turnOdds ?? 0,
        stake: bet.turn,
        win: bet.settlementResult.turn
      },
      {
        betChoice: "river",
        time: bet.riverTime,
        odds: bet.riverOdds ?? 0,
        stake: bet.river,
        win: bet.settlementResult.river
      }
      ]);
    }

    return {
      player,
      dealer,
      communityCards: round.result.communityCards,
      bets,
      isFold: bet.isFold,
      isSwappedOrHold: round.isSwappedOrHold,
      isPlayerWin: round.settlementResult
        ? compareCombination(round.settlementResult, bet.result)
        : -1,
    };
  }

  async queryHistory(player, page, pageSize) {
    if (page < 1 || !player) {
      return {};
    }

    const filter = { uid: player.UID, thanhtoan: true };
    const numberOfSkippedBets = (page - 1) * pageSize;
    const total = await this.betsRepository.countDocuments(filter).exec();
    const betProjection = {
      _id: false,
      uid: false,
      thanhtoan: false,
      siteId: false,
      memberId: false,
      __v: false,
      __archive: false,
    };
    const bets = await this.betsRepository
      .find(filter, betProjection, {
        sort: { _id: -1 },
        skip: numberOfSkippedBets,
        limit: pageSize,
      })
      .lean()
      .exec();
    let betLogs = [];

    if (bets && bets.length > 0) {
      betLogs = await Promise.all(
        bets.map(async (bet) => {
          const round = await this.roundQuery.getOne(bet.phien, { _id: false });
          return {
            ...this.convertBet(bet),
            roundId: round.id,
            dealerHandId: round.settlementResult?.id,
            isPlayerWin: round.settlementResult
              ? compareCombination(round.settlementResult, bet.result)
              : -1,
          };
        }),
      );
    }
    return { history: { betLogs, page, pageSize, total } };
  }

  async queryTicketDetail(player, roundId) {
    if (roundId < 1 || !player) {
      return {};
    }

    const bet = await this.betsRepository
      .findOne({ uid: player.UID, thanhtoan: true, phien: roundId })
      .lean()
      .exec();
    if (bet) {
      const round = await this.roundQuery.getOne(bet.phien, { _id: false });
      return { ticketDetail: { ...this.convertTicketDetail(bet, round) } };
    } else {
      return {};
    }
  }
}
