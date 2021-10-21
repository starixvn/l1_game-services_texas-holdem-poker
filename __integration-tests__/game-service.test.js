import {
  GameServiceClient,
  eventTypes,
} from '@nex3/game-service-integration/src/utils/game-client';
import { userSession, socketOptions, gameConfig } from './stubs/test-data';
import { actions, ranks } from '../src/helpers/constants';

describe('Texas Holdem Poker Service', () => {
  let gameServiceClient;
  const gameNameEvent = 'TexasHoldemPoker';

  beforeAll(() => {
    // Arrange
    gameServiceClient = new GameServiceClient(socketOptions, userSession);
  });

  afterAll(() => {
    gameServiceClient.close();
  });

  it('should start and allow game client connect to.', (done) => {
    // Assert
    gameServiceClient.on(eventTypes.signedIn, () => {
      done();
    });
  });

  it('should return game configuration (odds, min bet, max bet) when user joins game.', (done) => {
    // Act
    gameServiceClient.emit(eventTypes.inGame);

    // Assert
    gameServiceClient.on(gameNameEvent, (inGameData) => {
      if (inGameData?.gameConfigs) {
        expect(inGameData.gameConfigs.minBet).toBe(10);
        expect(inGameData.gameConfigs.maxBet).toBe(200000);
        expect(inGameData.gameConfigs.maxBetChoices.anteBet).toBe(10000);
        expect(inGameData.gameConfigs.maxBetChoices.callBet).toBe(20000);
        expect(inGameData.gameConfigs.maxBetChoices.turnBet).toBe(10000);
        expect(inGameData.gameConfigs.maxBetChoices.riverBet).toBe(10000);
        expect(inGameData.gameConfigs.odds.AnteBet_highCard).toBe(gameConfig.odds.AnteBet_highCard);
        expect(inGameData.gameConfigs.odds.AnteBet_onePair).toBe(gameConfig.odds.AnteBet_onePair);
        expect(inGameData.gameConfigs.odds.AnteBet_twoPairs).toBe(gameConfig.odds.AnteBet_twoPairs);
        expect(inGameData.gameConfigs.odds.AnteBet_threeKind).toBe(
          gameConfig.odds.AnteBet_threeKind,
        );
        expect(inGameData.gameConfigs.odds.AnteBet_straight).toBe(gameConfig.odds.AnteBet_straight);
        expect(inGameData.gameConfigs.odds.AnteBet_flush).toBe(gameConfig.odds.AnteBet_flush);
        expect(inGameData.gameConfigs.odds.AnteBet_fullHouse).toBe(
          gameConfig.odds.AnteBet_fullHouse,
        );
        expect(inGameData.gameConfigs.odds.AnteBet_fourKind).toBe(gameConfig.odds.AnteBet_fourKind);
        expect(inGameData.gameConfigs.odds.AnteBet_straightFlush).toBe(
          gameConfig.odds.AnteBet_straightFlush,
        );
        expect(inGameData.gameConfigs.odds.AnteBet_royalFlush).toBe(
          gameConfig.odds.AnteBet_royalFlush,
        );
        expect(inGameData.gameConfigs.odds.call).toBe(gameConfig.odds.call);
        expect(inGameData.gameConfigs.odds.turn).toBe(gameConfig.odds.turn);
        expect(inGameData.gameConfigs.odds.river).toBe(gameConfig.odds.river);

        done();
      }
    });
  });

  it('should return user information when user joins game.', (done) => {
    // Act
    gameServiceClient.emit(eventTypes.inGame);

    // Assert
    gameServiceClient.on(gameNameEvent, (inGameData) => {
      if (inGameData?.user && inGameData.ownBets) {
        expect(inGameData.user.UID).toBe(1);
        expect(inGameData.user.avatarId).toBe(1);
        expect(inGameData.user.currency).toBe('UUS');
        expect(inGameData.user.name).toBe('UserTest');

        if (Object.keys(inGameData.ownBets).length === 0) {
          expect(inGameData.user.red).toBe(20000);
        }

        done();
      }
    });
  });

  it('should return last roundId when user joins game.', (done) => {
    // Act
    gameServiceClient.emit(eventTypes.inGame);

    // Assert
    gameServiceClient.on(gameNameEvent, (inGameData) => {
      if (inGameData?.lastRoundId && Object.keys(inGameData.ownBets || {}).length === 0) {
        expect(inGameData.lastRoundId).toBe(2);

        done();
      }
    });
  });

  it('should return round information when user deal', (done) => {
    // Arrange
    const payload = { action: actions.deal, anteBet: 100 };

    // Act
    gameServiceClient.emit(eventTypes.bet, payload);

    // Assert
    gameServiceClient.on(gameNameEvent, (data) => {
      if (data?.deal && data.endBet && data.user) {
        expect(data.endBet).toBe(100);
        expect(data.user.red).toBe(19900);
        expect(data.deal.roundId).toBe(3);
        expect(data.deal.player).toBeArrayOfSize(2);
        expect(data.deal.player).toSatisfyAll((card) => card.rank >= 0 && card.rank <= 12);
        expect(data.deal.player).toSatisfyAll((card) => card.suit >= 0 && card.suit <= 3);
        expect(data.deal.combinationResult?.player?.id).toBeLessThan(ranks.twoPairs);
        expect(data.deal.combinationResult?.player?.cards).toBeArrayOfSize(2);
        expect(data.deal.combinationResult?.player?.combinationCards).toBeArray();
        expect(data.deal.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.rank >= 0 && card.rank <= 12,
        );
        expect(data.deal.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.suit >= 0 && card.suit <= 3,
        );
        expect(data.deal.totalAmount).toBe(100);
        expect(data.deal.choices?.ante).toBe(100);

        done();
      }
    });
  });

  it('should return round information when user call', (done) => {
    // Arrange
    const payload = { action: actions.call };

    // Act
    gameServiceClient.emit(eventTypes.bet, payload);

    // Assert
    gameServiceClient.on(gameNameEvent, (data) => {
      if (data?.call && data.endBet && data.user) {
        expect(data.endBet).toBe(100);
        expect(data.user.red).toBe(19800);
        expect(data.call.communityCards).toBeArrayOfSize(3);
        expect(data.call.communityCards).toSatisfyAll((card) => card.rank >= 0 && card.rank <= 12);
        expect(data.call.communityCards).toSatisfyAll((card) => card.suit >= 0 && card.suit <= 3);
        expect(data.call.combinationResult?.player?.id).toBeGreaterThan(0);
        expect(data.call.combinationResult?.player?.cards).toBeArrayOfSize(5);
        expect(data.call.combinationResult?.player?.combinationCards).toBeArray();
        expect(data.call.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.rank >= 0 && card.rank <= 12,
        );
        expect(data.call.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.suit >= 0 && card.suit <= 3,
        );
        expect(data.call.totalAmount).toBe(200);
        expect(data.call.choices?.ante).toBe(100);
        expect(data.call.choices?.call).toBe(100);

        done();
      }
    });
  });

  it('should return round information when user check turn', (done) => {
    // Arrange
    const payload = { action: actions.checkTurn };

    // Act
    gameServiceClient.emit(eventTypes.bet, payload);

    // Assert
    gameServiceClient.on(gameNameEvent, (data) => {
      if (data?.turn && !data?.user && !data?.endBet) {
        expect(data.turn.communityCards).toBeArrayOfSize(4);
        expect(data.turn.communityCards).toSatisfyAll((card) => card.rank >= 0 && card.rank <= 12);
        expect(data.turn.communityCards).toSatisfyAll((card) => card.suit >= 0 && card.suit <= 3);
        expect(data.turn.combinationResult?.player?.id).toBeGreaterThan(0);
        expect(data.turn.combinationResult?.player?.cards).toBeArrayOfSize(5);
        expect(data.turn.combinationResult?.player?.combinationCards).toBeArray();
        expect(data.turn.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.rank >= 0 && card.rank <= 12,
        );
        expect(data.turn.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.suit >= 0 && card.suit <= 3,
        );
        expect(data.turn.totalAmount).toBe(200);
        expect(data.turn.choices?.ante).toBe(100);
        expect(data.turn.choices?.call).toBe(100);
        expect(data.turn.choices?.turn).toBe(0);

        done();
      }
    });
  });

  it('should return round information when user rejoin table', (done) => {
    // Arrange
    const bets = { ante: 100, call: 100, turn: 0 };

    // Act
    gameServiceClient.emit(eventTypes.inGame);

    // Assert
    gameServiceClient.on(gameNameEvent, (inGameData) => {
      if (inGameData?.ownBets) {
        expect(inGameData.ownBets.roundId).toBe(3);
        expect(inGameData.ownBets.bets).toStrictEqual(bets);
        expect(inGameData.ownBets.player).toBeArrayOfSize(2);
        expect(inGameData.ownBets.player).toSatisfyAll((card) => card.rank >= 0 && card.rank <= 12);
        expect(inGameData.ownBets.player).toSatisfyAll((card) => card.suit >= 0 && card.suit <= 3);
        expect(inGameData.ownBets.communityCards).toBeArrayOfSize(4);
        expect(inGameData.ownBets.communityCards).toSatisfyAll(
          (card) => card.rank >= 0 && card.rank <= 12,
        );
        expect(inGameData.ownBets.communityCards).toSatisfyAll(
          (card) => card.suit >= 0 && card.suit <= 3,
        );
        expect(inGameData.ownBets.combinationResult?.player?.id).toBeGreaterThan(0);
        expect(inGameData.ownBets.combinationResult?.player?.cards).toBeArrayOfSize(5);
        expect(inGameData.ownBets.combinationResult?.player?.combinationCards).toBeArray();
        expect(inGameData.ownBets.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.rank >= 0 && card.rank <= 12,
        );
        expect(inGameData.ownBets.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.suit >= 0 && card.suit <= 3,
        );
        expect(inGameData.ownBets.totalAmount).toBe(200);

        done();
      }
    });
  });

  it('should return round information and settle round when user bet river', (done) => {
    // Arrange
    const payload = { action: actions.betRiver };

    // Act
    gameServiceClient.emit(eventTypes.bet, payload);

    // Assert
    gameServiceClient.on(gameNameEvent, (data) => {
      if (data.river && data.endBet && data.user) {
        expect(data.endBet).toBe(100);
        expect(data.user.red).toBe(19700);
        expect(data.river.dealer).toBeArrayOfSize(2);
        expect(data.river.dealer).toSatisfyAll((card) => card.rank >= 0 && card.rank <= 12);
        expect(data.river.dealer).toSatisfyAll((card) => card.suit >= 0 && card.suit <= 3);
        expect(data.river.communityCards).toBeArrayOfSize(5);
        expect(data.river.communityCards).toSatisfyAll((card) => card.rank >= 0 && card.rank <= 12);
        expect(data.river.communityCards).toSatisfyAll((card) => card.suit >= 0 && card.suit <= 3);
        expect(data.river.combinationResult?.player?.id).toBeGreaterThan(0);
        expect(data.river.combinationResult?.player?.cards).toBeArrayOfSize(5);
        expect(data.river.combinationResult?.player?.combinationCards).toBeArray();
        expect(data.river.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.rank >= 0 && card.rank <= 12,
        );
        expect(data.river.combinationResult?.player?.combinationCards).toSatisfyAll(
          (card) => card.suit >= 0 && card.suit <= 3,
        );
        expect(data.river.combinationResult?.player?.cards).toBeArray();
        expect(data.river.combinationResult?.dealer?.id).toBeGreaterThan(0);
        expect(data.river.combinationResult?.dealer?.cards).toBeArrayOfSize(5);
        expect(data.river.combinationResult?.dealer?.combinationCards).toBeArray();
        expect(data.river.combinationResult?.dealer?.combinationCards).toSatisfyAll(
          (card) => card.rank >= 0 && card.rank <= 12,
        );
        expect(data.river.combinationResult?.dealer?.combinationCards).toSatisfyAll(
          (card) => card.suit >= 0 && card.suit <= 3,
        );
        expect(data.river.totalAmount).toBe(300);
        expect(data.river.choices?.ante).toBe(100);
        expect(data.river.choices?.call).toBe(100);
        expect(data.river.choices?.turn).toBe(0);
        expect(data.river.choices?.river).toBe(100);
      }
      if (data?.finish) {
        expect(data.finish.settlementResult).toContainAllKeys(['ante', 'call', 'turn', 'river']);
        expect(data.finish.settlementResult.ante).toBeNumber();
        expect(data.finish.settlementResult.call).toBeNumber();
        expect(data.finish.settlementResult.turn).toBeNumber();
        expect(data.finish.settlementResult.river).toBeNumber();

        done();
      }
    });
  });

  it('should return user ticket history when user views ticket history', (done) => {
    // Act
    gameServiceClient.emit(eventTypes.getHistory, { page: 1 });

    // Assert
    gameServiceClient.on(gameNameEvent, (data) => {
      if (data?.history) {
        expect(data.history.page).toBe(1);
        expect(data.history.pageSize).toBe(8);
        expect(data.history.total).toBe(1);
        expect(data.history.betLogs).toBeArrayOfSize(1);
        expect(data.history.betLogs[0].roundId).toBe(3);
        expect(data.history.betLogs[0].dealerHandId).toBeGreaterThanOrEqual(ranks.highCard);
        expect(data.history.betLogs[0].dealerHandId).toBeLessThanOrEqual(ranks.royalFlush);
        expect(data.history.betLogs[0].isPlayerWin).toBeNumber();
        expect(data.history.betLogs[0].playerHandId).toBeGreaterThanOrEqual(ranks.highCard);
        expect(data.history.betLogs[0].playerHandId).toBeLessThanOrEqual(ranks.royalFlush);
        expect(data.history.betLogs[0].isFold).toBeFalse();
        expect(data.history.betLogs[0].stake).toBe(300);
        expect(data.history.betLogs[0].betWin).toBeNumber();

        done();
      }
    });
  });

  it('should return user ticket detail history when user views ticket detail history', (done) => {
    // Act
    gameServiceClient.emit('getTicketDetail', { roundId: 3 });

    // Assert
    gameServiceClient.on(gameNameEvent, (data) => {
      if (data?.ticketDetail) {
        expect(data.ticketDetail.player?.cards).toBeArrayOfSize(2);
        expect(data.ticketDetail.player?.combination).toBeArrayOfSize(5);
        expect(data.ticketDetail.player?.handId).toBeGreaterThanOrEqual(ranks.highCard);
        expect(data.ticketDetail.player?.handId).toBeLessThanOrEqual(ranks.royalFlush);

        expect(data.ticketDetail.dealer?.cards).toBeArrayOfSize(2);
        expect(data.ticketDetail.dealer?.combination).toBeArrayOfSize(5);
        expect(data.ticketDetail.dealer?.handId).toBeGreaterThanOrEqual(ranks.highCard);
        expect(data.ticketDetail.dealer?.handId).toBeLessThanOrEqual(ranks.royalFlush);

        expect(data.ticketDetail.bets?.ante).toBe(100);
        expect(data.ticketDetail.bets?.call).toBe(100);
        expect(data.ticketDetail.bets?.turn).toBe(0);
        expect(data.ticketDetail.bets?.river).toBe(100);
        expect(data.ticketDetail.bets?.bet).toBe(300);
        expect(data.ticketDetail.bets?.result?.ante).toBeNumber();
        expect(data.ticketDetail.bets?.result?.call).toBeNumber();
        expect(data.ticketDetail.bets?.result?.turn).toBe(0);
        expect(data.ticketDetail.bets?.result?.river).toBeNumber();

        expect(data.ticketDetail.communityCards).toBeArray();
        expect(data.ticketDetail.communityCards).toSatisfyAll(
          (card) => card.rank >= 0 && card.rank <= 12,
        );
        expect(data.ticketDetail.communityCards).toSatisfyAll(
          (card) => card.suit >= 0 && card.suit <= 3,
        );
        expect(data.ticketDetail.isFold).toBeFalse();
        expect(data.ticketDetail.isPlayerWin).toBeNumber();

        done();
      }
    });
  });
});
