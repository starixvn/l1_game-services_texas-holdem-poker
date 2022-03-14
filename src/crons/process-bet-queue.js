import { Core } from "sc-game-base";
import { deal, generateDecks, reGenerateDecks } from '../helpers/deck-helper';
import { getCombinationResult, isQualified } from '../helpers/result-helper';
import { helpers } from 'sc-common';
import { actions, ranks } from '../helpers/constants';
import { createHashMD5, randomString } from "../helpers/crypto-helper";
import { cardLabels } from "../helpers/card";

export default class ProcessBetQueue extends Core.Crons.ProcessBetQueue {
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
          await this.processDeal(player, payload);
          break;
        case actions.call:
          await this.processCall(player, payload);
          break;
        case actions.fold:
          await this.settleGameRoundConsumer.settleRound(player.profile.name, true);
          break;
        case actions.betTurn:
          await this.processBetTurn(player, payload);
          break;
        case actions.betRiver:
          await this.processBetRiver(player, payload);
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

  async processDeal(player, payload) {
    const { betTracks } = this.gameData.ingame[player.profile.name];
    const { amount } = payload;
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
      freeBet: payload.freeBet,
      clientSentTime: payload.time ?? new Date(),
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
      md5: { key: betTracks.md5 }
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

    const communityCardsGenerated = this.definition.generateResult(
      betTracks.communityCards,
      betTracks.deck,
    );

    const resultKeySuffix = randomString();
    const cards = betTracks.player.concat(betTracks.dealer).concat(communityCardsGenerated);

    const resultKeyRaw = `[${cards.map(card => cardLabels[card.rank]).join(', ')}]${resultKeySuffix}`;
    const md5 = createHashMD5(resultKeyRaw);

    betTracks.md5 = md5;
    betTracks.resultKey = { rawValue: resultKeyRaw, formatValue: { cards, suffix: resultKeySuffix } };

    return this.roundsRepository.create({
      id: roundId,
      result: { dealer: betTracks.dealer, communityCards: [] },
      roundStartTime: new Date(),
      uid: player.UID,
      name: player.profile.name,
      odds,
      exchangeRateId: this.gameData.exchangeRates.exId,
      communityCardsGenerated,
      md5,
      resultKeyRaw,
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
      currency: player.session?.currencyName,
      partnerId: player.session?.partnerId,
    });
  }

  async processCall(player, payload) {
    const { betTracks } = this.gameData.ingame[player.profile.name];
    const { amount } = payload
    betTracks.isDealing = true;

    const betInfo = {
      amount,
      gameId: this.definition.id,
      gameRoundId: betTracks.roundId,
      choiceId: this.definition.choicesMapper[actions.call],
      freeBet: payload.freeBet,
      clientSentTime: payload.time ?? new Date(),
    };

    const apiResult = await this.placeBet({ id: player.UID, session: player.session }, betInfo);
    const { response } = apiResult;
    if (apiResult.isOk) {
      await this.handleSuccessCall(player, amount, response);
    } else {
      this.handleFailPlaceBetResponse(player, response, actions.call);
    }
    betTracks.isDealing = false;
  }

  async handleSuccessCall(player, amount, balance) {
    await this.updateBetTracksAfterCall(player.profile.name, amount);
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.updateRoundWhenContinuesDealing(player.profile.name);
    await this.betsRepository.update(
      { phien: betTracks.roundId },
      { $inc: { call: amount, bet: amount }, result: betTracks.combinationResult.player, callTime: new Date(), },
    );

    const call = {
      communityCards: betTracks.communityCards,
      combinationResult: betTracks.combinationResult,
      totalAmount: Object.values(betTracks.bets).reduce((total, item) => total + item),
      choices: betTracks.bets,
    };

    this.publisher.publishToUser(player.UID, { endBet: amount, user: balance, call });
  }

  async updateBetTracksAfterCall(playerName, amount) {
    const { betTracks } = this.gameData.ingame[playerName];

    betTracks.bets.call = amount;
    const { communityCardsGenerated } = await this.roundsRepository.findOne({ id: betTracks.roundId }, { _id: false }).lean().exec();

    betTracks.communityCards = communityCardsGenerated.slice(0, 3);
    this.updateCombinationPlayerResultInBetTracks(playerName);
  }

  async processBetTurn(player, payload) {
    const { amount } = payload;
    if (amount > 0) {
      const { betTracks } = this.gameData.ingame[player.profile.name];
      betTracks.isDealing = true;

      const betInfo = {
        amount,
        gameId: this.definition.id,
        gameRoundId: betTracks.roundId,
        choiceId: this.definition.choicesMapper.turn,
        freeBet: payload.freeBet,
        clientSentTime: payload.time ?? new Date(),
      };
      const apiResult = await this.placeBet({ id: player.UID, session: player.session }, betInfo);
      const { response } = apiResult;
      if (apiResult.isOk) {
        await this.handleSuccessBetTurn(player, amount, response);
      } else {
        this.handleFailPlaceBetResponse(player, response, actions.betTurn);
      }
      betTracks.isDealing = false;
    } else {
      await this.handleSuccessBetTurn(player, amount);
    }
  }

  async handleSuccessBetTurn(player, amount, balance) {
    await this.updateBetTracksAfterBetTurn(player.profile.name, amount);
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.updateRoundWhenContinuesDealing(player.profile.name);
    await this.betsRepository.update(
      { phien: betTracks.roundId },
      { $inc: { turn: amount, bet: amount }, result: betTracks.combinationResult.player, turnTime: new Date(), },
    );

    const turn = {
      communityCards: betTracks.communityCards,
      combinationResult: betTracks.combinationResult,
      totalAmount: Object.values(betTracks.bets).reduce((total, item) => total + item),
      choices: betTracks.bets,
    };
    if (amount > 0) {
      this.publisher.publishToUser(player.UID, { endBet: amount, user: balance, turn });
    } else {
      this.publisher.publishToUser(player.UID, { turn });
    }
  }

  async updateBetTracksAfterBetTurn(playerName, amount) {
    const { betTracks } = this.gameData.ingame[playerName];

    betTracks.bets.turn = amount;
    const { communityCardsGenerated } = await this.roundsRepository.findOne({ id: betTracks.roundId }, { _id: false }).lean().exec();
    betTracks.communityCards.push(communityCardsGenerated[3]);
    this.updateCombinationPlayerResultInBetTracks(playerName);
  }

  async processBetRiver(player, payload) {
    const { amount } = payload;
    if (amount > 0) {
      const { betTracks } = this.gameData.ingame[player.profile.name];
      betTracks.isDealing = true;

      const betInfo = {
        amount,
        gameId: this.definition.id,
        gameRoundId: betTracks.roundId,
        choiceId: this.definition.choicesMapper.river,
        freeBet: payload.freeBet,
        clientSentTime: payload.time ?? new Date(),
      };

      const apiResult = await this.placeBet({ id: player.UID, session: player.session }, betInfo);
      const { response } = apiResult;
      if (apiResult.isOk) {
        await this.handleSuccessBetRiver(player, amount, response);
      } else {
        this.handleFailPlaceBetResponse(player, response, actions.betRiver);
      }
      betTracks.isDealing = false;
    } else {
      await this.handleSuccessBetRiver(player, amount);
    }
  }

  async handleSuccessBetRiver(player, amount, balance) {
    await this.updateBetTracksAfterBetRiver(player.profile.name, amount);
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.betsRepository.update(
      { phien: betTracks.roundId },
      { $inc: { river: amount, bet: amount }, result: betTracks.combinationResult.player, riverTime: new Date(), },
    );

    const river = {
      communityCards: betTracks.communityCards,
      combinationResult: betTracks.combinationResult,
      dealer: betTracks.dealer,
      totalAmount: Object.values(betTracks.bets).reduce((total, item) => total + item),
      choices: betTracks.bets,
    };

    if (amount > 0) {
      this.publisher.publishToUser(player.UID, { endBet: amount, user: balance, river });
    } else {
      this.publisher.publishToUser(player.UID, { river });
    }

    await this.settleGameRoundConsumer.settleRound(player.profile.name);
  }

  async updateBetTracksAfterBetRiver(playerName, amount) {
    const { betTracks } = this.gameData.ingame[playerName];
    const { communityCardsGenerated } = await this.roundsRepository.findOne({ id: betTracks.roundId }, { _id: false }).lean().exec();

    betTracks.bets.river = amount;
    betTracks.communityCards.push(communityCardsGenerated[4]);

    this.updateCombinationPlayerResultInBetTracks(playerName);

    const combinationDealerResult = getCombinationResult(
      betTracks.dealer.concat(betTracks.communityCards),
    );

    betTracks.combinationResult.dealer =  combinationDealerResult;
    betTracks.combinationResult.isQualified = isQualified(combinationDealerResult);
  }

  updateCombinationPlayerResultInBetTracks(playerName) {
    const { betTracks } = this.gameData.ingame[playerName];

    betTracks.combinationResult.player = getCombinationResult(
      betTracks.player.concat(betTracks.communityCards),
    );
  }

  async updateRoundWhenContinuesDealing(playerName) {
    const { betTracks } = this.gameData.ingame[playerName];
    await this.roundsRepository.update(
      { id: betTracks.roundId },
      { result: { dealer: betTracks.dealer, communityCards: betTracks.communityCards } },
    );
  }

  handleFailPlaceBetResponse(player, response, action) {
    const noticeMapping = {
      inSufficientBalance: helpers.noticeHelper.notEnoughMoney,
      cannotProcessBet: helpers.noticeHelper.placeBetNextRound,
      inSufficientScoin: helpers.noticeHelper.notEnoughScoin,
    };

    const notice = Object.keys(noticeMapping).reduce(
      (result, key) => (response[key] ? noticeMapping[key] : result),
      response,
    );

    this.handleFailedBet(player, notice, { betChoice: action });
  }
}
