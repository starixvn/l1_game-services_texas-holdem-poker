import { ProcessBetQueue as BaseProcessBetQueue } from '@nex3/nex3-game-base/crons';
import { deal, generateDecks, reGenerateDecks } from '../helpers/deck-helper';
import { getCombinationResult } from '../helpers/result-helper';
import Translation from '@nex3/translation';
import { helpers } from 'sc-common';
import { actions, ranks } from '../helpers/constants';

export default class ProcessBetQueue extends BaseProcessBetQueue {
  constructor({
    definition,
    gameData,
    placeBetPublisher,
    placeBet,
    logService,
    betsRepository,
    betLogsRepository,
    userInfosRepository,
    baseMetrics,
    roundsRepository,
    publisher,
    settleGameRoundConsumer,
  }) {
    super({
      definition,
      gameData,
      placeBetPublisher,
      placeBet,
      logService,
      betsRepository,
      betLogsRepository,
      userInfosRepository,
      baseMetrics,
    });
    this.roundsRepository = roundsRepository;
    this.publisher = publisher;
    this.settleGameRoundConsumer = settleGameRoundConsumer;
  }
  async proceedBet(player, payload) {
    try {
      switch (payload.action) {
        case actions.deal:
          await this.processDeal(player, payload.amount);
          break;
        case actions.call:
          await this.processCall(player, payload.amount);
          break;
        case actions.fold:
          await this.settleGameRoundConsumer.settleRound(player.profile.name, true);
          break;
        case actions.betTurn:
          await this.processBetTurn(player, payload.amount);
          break;
        case actions.betRiver:
          await this.processBetRiver(player, payload.amount);
          break;
      }
    } catch (e) {
      this.logService.logError(e);
    }
  }

  buildPresetCards(resultFromAdmin) {
    const player = resultFromAdmin.player || [];
    const dealer = resultFromAdmin.dealer || [];
    const communityCards = resultFromAdmin.communityCards || [];
    const unusedCards = reGenerateDecks(player.concat(dealer, communityCards));
    const cards = [];
    cards.push(player[0] || unusedCards.shift());
    cards.push(dealer[0] || unusedCards.shift());
    cards.push(player[1] || unusedCards.shift());
    cards.push(dealer[1] || unusedCards.shift());
    return cards.concat(communityCards);
  }

  getPresetCards(player) {
    let presetCards = [];
    try {
      if (
        this.gameData.resultFromAdmin &&
        this.gameData.resultFromAdmin.roundName === player.profile.name
      ) {
        presetCards = this.buildPresetCards(this.gameData.resultFromAdmin);
        this.gameData.resultFromAdmin = null;
      }
    } catch (e) {
      this.logService.logError(e);
    }
    return presetCards;
  }

  async processDeal(player, amount) {
    const { betTracks } = this.gameData.ingame[player.profile.name];
    betTracks.player = [];
    betTracks.dealer = [];
    betTracks.communityCards = [];
    betTracks.uid = player.UID;
    betTracks.combinationResult = {};
    betTracks.bets = { ante: amount };
    betTracks.isDealing = true;

    this.gameData.roundId++;
    const roundId = this.gameData.roundId;

    const betInfo = {
      amount,
      gameId: this.definition.id,
      gameRoundId: roundId,
      choiceId: this.definition.choicesMapper[actions.deal],
    };

    const apiResult = await this.placeBet({ id: player.UID, session: player.session }, betInfo);
    const { response } = apiResult;
    if (apiResult.isOk) {
      await this.handleSuccessDeal(player, response, roundId);
    } else {
      this.handleFailPlaceBetResponse(player, response, actions.deal);
    }
    betTracks.isDealing = false;
  }

  async handleSuccessDeal(player, balance, roundId) {
    const presetCards = this.getPresetCards(player);
    const { betTracks } = this.gameData.ingame[player.profile.name];
    betTracks.deck = generateDecks(presetCards);
    deal(betTracks);

    const newRound = await this.createRound(player, roundId);
    betTracks.roundId = newRound.id;
    betTracks.roundStartTime = new Date();
    betTracks.combinationResult.player = this.getCombinationResultWhenDeal(betTracks.player);
    await this.createBet(player);

    this.publisher.publishToUser(player.UID, {
      deal: {
        roundId: betTracks.roundId,
        player: betTracks.player,
        combinationResult: betTracks.combinationResult,
        totalAmount: betTracks.bets.ante,
        choices: betTracks.bets,
      },
      endBet: betTracks.bets.ante,
      user: balance,
    });
  }

  getCombinationResultWhenDeal(cards) {
    if (cards[0].rank === cards[1].rank) {
      return {
        id: ranks.onePair,
        combinationCards: cards,
        cards,
      };
    } else {
      return {
        id: ranks.highCard,
        combinationCards: (cards[0].rank || 13) > (cards[1].rank || 13) ? [cards[0]] : [cards[1]],
        cards,
      };
    }
  }

  async createRound(player, roundId) {
    const { betTracks } = this.gameData.ingame[player.profile.name];
    const { odds } = this.gameData.gameConfigs;
    return this.roundsRepository.create({
      id: roundId,
      result: { dealer: betTracks.dealer, communityCards: [] },
      roundStartTime: new Date(),
      uid: player.UID,
      name: player.profile.name,
      odds,
    });
  }

  async createBet(player) {
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.betsRepository.create({
      uid: player.UID,
      name: player.profile.name,
      phien: betTracks.roundId,
      ante: betTracks.bets?.ante,
      cards: betTracks.player,
      bet: betTracks.bets?.ante,
      result: betTracks.combinationResult.player,
      time: new Date(),
      memberId: player.session?.memberId,
      siteId: player.session?.siteId,
    });
  }

  async processCall(player, amount) {
    const { betTracks } = this.gameData.ingame[player.profile.name];

    const betInfo = {
      amount,
      gameId: this.definition.id,
      gameRoundId: betTracks.roundId,
      choiceId: this.definition.choicesMapper[actions.call],
    };
    const apiResult = await this.placeBet({ id: player.UID, session: player.session }, betInfo);
    const { response } = apiResult;
    if (apiResult.isOk) {
      await this.handleSuccessCall(player, amount, response);
    } else {
      this.handleFailPlaceBetResponse(player, response, actions.call);
    }
  }

  async handleSuccessCall(player, amount, balance) {
    this.updateBetTracksAfterCall(player.profile.name, amount);
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.updateRoundWhenContinuesDealing(player.profile.name);
    await this.betsRepository.update(
      { phien: betTracks.roundId },
      { $inc: { call: amount, bet: amount }, result: betTracks.combinationResult.player },
    );

    const call = {
      communityCards: betTracks.communityCards,
      combinationResult: betTracks.combinationResult,
      totalAmount: Object.values(betTracks.bets).reduce((total, item) => total + item),
    };

    this.publisher.publishToUser(player.UID, { endBet: amount, user: balance, call });
  }

  updateBetTracksAfterCall(playerName, amount) {
    const { betTracks } = this.gameData.ingame[playerName];

    betTracks.bets.call = amount;
    betTracks.communityCards.push(
      betTracks.deck.shift(),
      betTracks.deck.shift(),
      betTracks.deck.shift(),
    );
    this.updateCombinationPlayerResultInBetTracks(playerName);
  }

  async processBetTurn(player, amount) {
    if (amount > 0) {
      const { betTracks } = this.gameData.ingame[player.profile.name];

      const betInfo = {
        amount,
        gameId: this.definition.id,
        gameRoundId: betTracks.roundId,
        choiceId: this.definition.choicesMapper.turn,
      };
      const apiResult = await this.placeBet({ id: player.UID, session: player.session }, betInfo);
      const { response } = apiResult;
      if (apiResult.isOk) {
        await this.handleSuccessBetTurn(player, amount, response);
      } else {
        this.handleFailPlaceBetResponse(player, response, actions.betTurn);
      }
    } else {
      await this.handleSuccessBetTurn(player, amount);
    }
  }

  async handleSuccessBetTurn(player, amount, balance) {
    this.updateBetTracksAfterBetTurn(player.profile.name, amount);
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.updateRoundWhenContinuesDealing(player.profile.name);
    await this.betsRepository.update(
      { phien: betTracks.roundId },
      { $inc: { turn: amount, bet: amount }, result: betTracks.combinationResult.player },
    );

    const turn = {
      communityCards: betTracks.communityCards,
      combinationResult: betTracks.combinationResult,
      totalAmount: Object.values(betTracks.bets).reduce((total, item) => total + item),
    };
    if (amount > 0) {
      this.publisher.publishToUser(player.UID, { endBet: amount, user: balance, turn });
    } else {
      this.publisher.publishToUser(player.UID, { turn });
    }
  }

  updateBetTracksAfterBetTurn(playerName, amount) {
    const { betTracks } = this.gameData.ingame[playerName];

    betTracks.bets.turn = amount;
    betTracks.communityCards.push(betTracks.deck.shift());
    this.updateCombinationPlayerResultInBetTracks(playerName);
  }

  async processBetRiver(player, amount) {
    if (amount > 0) {
      const { betTracks } = this.gameData.ingame[player.profile.name];

      const betInfo = {
        amount,
        gameId: this.definition.id,
        gameRoundId: betTracks.roundId,
        choiceId: this.definition.choicesMapper.river,
      };
      const apiResult = await this.placeBet({ id: player.UID, session: player.session }, betInfo);
      const { response } = apiResult;
      if (apiResult.isOk) {
        await this.handleSuccessBetRiver(player, amount, response);
      } else {
        this.handleFailPlaceBetResponse(player, response, actions.betRiver);
      }
    } else {
      await this.handleSuccessBetRiver(player, amount);
    }
  }

  async handleSuccessBetRiver(player, amount, balance) {
    this.updateBetTracksAfterBetRiver(player.profile.name, amount);
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.betsRepository.update(
      { phien: betTracks.roundId },
      { $inc: { river: amount, bet: amount }, result: betTracks.combinationResult.player },
    );

    const river = {
      communityCards: betTracks.communityCards,
      combinationResult: betTracks.combinationResult,
      dealer: betTracks.dealer,
      totalAmount: Object.values(betTracks.bets).reduce((total, item) => total + item),
    };

    if (amount > 0) {
      this.publisher.publishToUser(player.UID, { endBet: amount, user: balance, river });
    } else {
      this.publisher.publishToUser(player.UID, { river });
    }

    await this.settleGameRoundConsumer.settleRound(player.profile.name);
  }

  updateBetTracksAfterBetRiver(playerName, amount) {
    const { betTracks } = this.gameData.ingame[playerName];

    betTracks.bets.river = amount;
    betTracks.communityCards.push(betTracks.deck.shift());

    this.updateCombinationPlayerResultInBetTracks(playerName);
    const combinationDealerResult = getCombinationResult(
      betTracks.dealer.concat(betTracks.communityCards),
    );
    betTracks.combinationResult.dealer = combinationDealerResult;
  }

  updateCombinationPlayerResultInBetTracks(playerName) {
    const { betTracks } = this.gameData.ingame[playerName];

    const combinationPlayerResult = getCombinationResult(
      betTracks.player.concat(betTracks.communityCards),
    );
    betTracks.combinationResult.player = combinationPlayerResult;
  }

  async updateRoundWhenContinuesDealing(playerName) {
    const { betTracks } = this.gameData.ingame[playerName];
    await this.roundsRepository.update(
      { id: betTracks.roundId },
      { result: { dealer: betTracks.dealer, communityCards: betTracks.communityCards } },
    );
  }

  handleFailPlaceBetResponse(player, response, action) {
    const translation = Translation.getInstance(player?.session?.language);
    const insufficientNotice = translation.t(translation.keys.notEnoughMoney);
    const cannotProcessBetNotice = translation.t(translation.keys.cannotProcessBet);
    const noticeMapping = {
      inSufficientBalance: insufficientNotice,
      cannotProcessBet: cannotProcessBetNotice,
      inSufficientScoin: helpers.noticeHelper.notEnoughScoin,
    };

    const notice = Object.keys(noticeMapping).reduce(
      (result, key) => (response[key] ? noticeMapping[key] : result),
      response,
    );

    this.handleFailedBet(player, notice, { betChoice: action });
  }
}
