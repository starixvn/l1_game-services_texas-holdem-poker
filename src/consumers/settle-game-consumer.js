import { Core } from 'sc-game-base';
import { gameNotifications } from 'sc-base-database';
import { ranks } from '../helpers/constants';
import { getCombinationResult, compareCombination } from '../helpers/result-helper';

export default class SettleGameConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
  constructor({
    definition,
    gameData,
    roundResultPublisher,
    userBetResultPublisher,
    endGame,
    roundsRepository,
    betsRepository,
    publisher,
  }) {
    super({
      definition,
      gameData,
      roundResultPublisher,
      userBetResultPublisher,
      endGame,
      roundsRepository,
      betsRepository,
    });

    this.publisher = publisher;
  }

  async settleRound(playerName, isFold = false, isAutoSettle = false) {
    const { betTracks } = this.gameData.ingame[playerName];
    const round = await this.roundsRepository.findOne({ id: betTracks.roundId }).exec();
    let fold = isFold;
    if (isAutoSettle) {
      if (betTracks.communityCards.length >= 3) {
        const step = betTracks.communityCards.length === 3 ? 'call' : 'turn';
        while (betTracks.communityCards.length < 5) {
          betTracks.communityCards.push(betTracks.deck.shift());
        }

        const combinationDealerResult = getCombinationResult(
          betTracks.dealer.concat(betTracks.communityCards),
        );
        betTracks.combinationResult.dealer = combinationDealerResult;

        const combinationPlayerResult = getCombinationResult(
          betTracks.player.concat(betTracks.communityCards),
        );
        betTracks.combinationResult.player = combinationPlayerResult;

        this.publisher.publishToUser(betTracks.uid, {
          autoSettle: {
            communityCards: betTracks.communityCards,
            combinationResult: betTracks.combinationResult,
            dealer: betTracks.dealer,
            totalAmount: Object.values(betTracks.bets).reduce((total, item) => total + item),
            step,
          },
        });
      } else {
        fold = true;
      }
    }
    const result = { dealer: betTracks.dealer, communityCards: betTracks.communityCards };

    if (!fold) {
      round.settlementResult = betTracks.combinationResult.dealer;
    }

    round.result = result;
    round.time = new Date();
    round.ended = true;

    await round.save();

    const finish = {
      roundId: betTracks.roundId,
      odds: round.odds,
      time: new Date(),
    };

    await this.settleBets({ ...finish, playerName, playerUID: betTracks.uid }, fold);
    await gameNotifications.deleteOne({ uid: betTracks.uid, gameId: this.definition.id });
  }

  async settleBets({ roundId, odds, time, playerName, playerUID }, isFold = false) {
    const bet = await this.betsRepository.findOne({ phien: roundId, thanhtoan: false }).exec();
    if (bet) {
      const settleOdds = odds ?? this.gameData.gameConfigs.odds;
      const betResult = this.calculateBetResult(playerName, bet, settleOdds, isFold);

      bet.isFold = isFold;
      bet.betwin = betResult.totalWin;
      bet.thanhtoan = true;
      bet.result = betResult.result;
      bet.settlementResult = betResult.settlementResult;
      bet.endTime = time;

      await bet.save();
      await this.callEndGame(bet, roundId, time, betResult);

      delete this.gameData.ingame[playerName];

      this.publisher.publishToUser(playerUID, {
        finish: {
          settlementResult: betResult.settlementResult,
        },
      });
    }
  }

  calculateBetResult(playerName, bet, odds, isFold) {
    const { betTracks } = this.gameData.ingame[playerName];
    const combinationPlayerResult = betTracks.combinationResult.player;
    const result = {
      totalBetAmount: Object.values(betTracks.bets).reduce((total, item) => total + item),
      totalWin: 0,
      netWin: 0,
      totalLost: 0,
      result: combinationPlayerResult,
      settlementResult: { ante: 0, call: 0, turn: 0, river: 0 },
    };

    if (isFold) {
      result.totalLost += bet.ante;
    } else {
      const combinationDealerResult = betTracks.combinationResult.dealer;

      const compare = compareCombination(combinationPlayerResult, combinationDealerResult);
      if (compare < 0) {
        this.settleHandPlayerWin(playerName, odds, bet, result);
      } else {
        if (compare === 0) {
          // tie
          result.totalWin += bet.ante + bet.call + bet.turn + bet.river;
          result.settlementResult.ante = bet.ante;
          result.settlementResult.call = bet.call;
          result.settlementResult.turn = bet.turn;
          result.settlementResult.river = bet.river;
        } else {
          // lose
          result.totalLost += bet.ante + bet.call + bet.turn + bet.river;
        }
      }
    }

    return result;
  }


  settleHandPlayerWin(playerName, odds, bet, result) {
    const anteOdds = this.normalizeAnteOdds(odds);
    const { betTracks } = this.gameData.ingame[playerName];
    const combinationResult = betTracks.combinationResult.player;
    const betAmount = bet.ante ?? 0;

    if (combinationResult.id >= ranks.straight) {
      const originalOdds = anteOdds[combinationResult.id] || 1;
      const winAmount = betAmount * originalOdds;

      result.totalWin += winAmount;
      result.netWin += winAmount - betAmount;
      result.settlementResult.ante = winAmount;
    } else {
      result.totalWin += betAmount;
      result.settlementResult.ante = betAmount;
    }

    this.settleDetailBetResult(result, odds, bet, 'call');
    this.settleDetailBetResult(result, odds, bet, 'turn');
    this.settleDetailBetResult(result, odds, bet, 'river');
  }

  settleDetailBetResult(result, odds, bet, type) {
    const betAmount = bet[type] ?? 0;
    const originalOdds = odds[type] || 1;
    const winAmount = betAmount * originalOdds;

    result.totalWin += winAmount;
    result.netWin += winAmount - betAmount;
    result.settlementResult[type] = winAmount;
  }

  normalizeAnteOdds(odds) {
    return Object.entries(odds).reduce((result, [key, value]) => {
      const name = key.split('_');
      if (name.length > 1) {
        result[ranks[name[1]]] = value;
      }
      return result;
    }, {});
  }
}
