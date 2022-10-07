import { Core } from 'sc-game-base';
import { buildDeckOfCards, deal, generateDecks, reGenerateDecks } from '../helpers/deck-helper';
import { getCombinationResult } from '../helpers/result-helper';
import { helpers } from 'sc-common';
import { actions, ranks } from '../helpers/constants';
import { createHashMD5, encrypt, encryptObject, randomString } from '../helpers/crypto-helper';
import { cardToString } from '../helpers/card';

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
        case actions.swap:
          await this.processSwap(player);
          break;
        case actions.hold:
          await this.processHold(player);
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
    const { randomMode } = this.gameData.gameConfigs;
    const unusedCards = reGenerateDecks(randomMode, player.concat(dealer, communityCards));
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
    betTracks.isSwappedOrHold = false;

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

    await this.checkUserStakeLevel(player, balance);

    const { randomMode } = this.gameData.gameConfigs;
    betTracks.deck = generateDecks(randomMode, presetCards);
    deal(betTracks);

    const newRound = await this.createRound(player, roundId);
    betTracks.roundId = newRound.id;
    betTracks.roundStartTime = new Date();
    betTracks.combinationResult.player = this.getCombinationResultWhenDeal(betTracks.player);
    await this.createBet(player);

    this.publisher.publishToUser(player.UID, {
      deal: {
        roundId: betTracks.roundId,
        totalAmount: betTracks.bets.ante,
        choices: betTracks.bets,
      },
      endBet: betTracks.bets.ante,
      user: balance,
      md5: { key: betTracks.md5 },
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

    const generatedResult = {
      player: betTracks.player,
      dealer: betTracks.dealer,
      community: this.definition.generateResult(betTracks.communityCards, betTracks.deck),
      suffix: randomString(),
    };

    const md5Plaintext = this.createMD5Raw(generatedResult, roundId);
    const md5 = createHashMD5(md5Plaintext);

    betTracks.md5 = md5;
    betTracks.resultKey = {
      rawValue: md5Plaintext,
      formatValue: {
        cards: buildDeckOfCards(generatedResult),
        suffix: generatedResult.suffix,
        roundId,
      },
    };
    betTracks.generatedResult = generatedResult;

    return this.roundsRepository.create({
      id: roundId,
      result: { dealer: [], communityCards: [] },
      roundStartTime: new Date(),
      uid: player.UID,
      name: player.profile.name,
      odds,
      exchangeRateId: this.gameData.exchangeRates.exId,
      encryptedResult: encryptObject(generatedResult),
      md5,
      encryptedMd5: encrypt(md5Plaintext),
    });
  }

  createMD5Raw(generatedResult, roundId) {
    const cardString = [
      generatedResult.player.map(cardToString).join(' '),
      generatedResult.dealer.map(cardToString).join(' '),
      generatedResult.community.map(cardToString).join(' '),
    ].join(', ');

    return `{${cardString}}_{#${roundId}${generatedResult.suffix}}`;
  }

  async createBet(player) {
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.betsRepository.create({
      uid: player.UID,
      name: player.profile.name,
      ante: betTracks.bets?.ante,
      cards: [],
      bet: betTracks.bets?.ante,
      time: new Date(),
      siteId: player.session?.siteId,
      currency: player.session?.currencyName,
      operatorId: player.session?.operatorId,
      playerId: player.session?.playerId,
      roundId: betTracks.roundId,
      rate: this.calculateCurrencyRate(player.session),
    });
  }

  async processCall(player, payload) {
    const { betTracks } = this.gameData.ingame[player.profile.name];
    const { amount } = payload;

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
    this.updateBetTracksAfterCall(player.profile.name, amount);

    await this.checkUserStakeLevel(player, balance);
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.updateRoundWhenContinuesDealing(player.profile.name);
    await this.betsRepository.update(
      { roundId: betTracks.roundId },
      {
        $inc: { call: amount, bet: amount },
        cards: betTracks.player,
        result: betTracks.combinationResult.player,
        callTime: new Date(),
      },
    );

    const call = {
      communityCards: betTracks.communityCards,
      combinationResult: betTracks.combinationResult,
      totalAmount: Object.values(betTracks.bets).reduce((total, item) => total + item),
      choices: betTracks.bets,
    };

    this.publisher.publishToUser(player.UID, { endBet: amount, user: balance, call });
  }

  async processHold(player) {
    const { betTracks } = this.gameData.ingame[player.profile.name];
    const generatedResult = betTracks.generatedResult;

    betTracks.player = generatedResult.player;
    betTracks.dealer = generatedResult.dealer;
    betTracks.combinationResult.player = this.getCombinationResultWhenDeal(betTracks.player);
    betTracks.isSwappedOrHold = true;

    await this.betsRepository.update(
      { roundId: betTracks.roundId },
      {
        holdTime: new Date(),
        cards: betTracks.player,
        result: betTracks.combinationResult.player,
      },
    );
    await this.roundsRepository.update(
      { id: betTracks.roundId },
      {
        isSwappedOrHold: true,
        result: { dealer: betTracks.dealer, communityCards: [] },
      },
    );

    const hold = {
      roundId: betTracks.roundId,
      player: betTracks.player,
      combinationResult: betTracks.combinationResult,
    };

    this.publisher.publishToUser(player.UID, { hold });
  }

  async processSwap(player) {
    const playerName = player.profile.name;
    const { betTracks } = this.gameData.ingame[playerName];
    const generatedResult = betTracks.generatedResult;

    betTracks.isSwappedOrHold = true;
    betTracks.player = generatedResult.dealer;
    betTracks.dealer = generatedResult.player;
    betTracks.combinationResult.player = this.getCombinationResultWhenDeal(betTracks.player);

    await this.betsRepository.update(
      { roundId: betTracks.roundId },
      {
        cards: betTracks.player,
        result: betTracks.combinationResult.player,
        swapTime: new Date(),
      },
    );

    await this.roundsRepository.update(
      { id: betTracks.roundId },
      {
        result: { dealer: betTracks.dealer, communityCards: [] },
        isSwappedOrHold: true,
      },
    );

    const swap = {
      roundId: betTracks.roundId,
      player: betTracks.player,
      combinationResult: betTracks.combinationResult,
    };

    this.publisher.publishToUser(player.UID, { swap });
  }

  updateBetTracksAfterCall(playerName, amount) {
    const { betTracks } = this.gameData.ingame[playerName];
    const communityCards = betTracks.generatedResult.community;

    betTracks.bets.call = amount;

    betTracks.communityCards = communityCards.slice(0, 3);
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
    this.updateBetTracksAfterBetTurn(player.profile.name, amount);

    if (balance) {
      await this.checkUserStakeLevel(player, balance);
    }

    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.updateRoundWhenContinuesDealing(player.profile.name);
    await this.betsRepository.update(
      { roundId: betTracks.roundId },
      {
        $inc: { turn: amount, bet: amount },
        result: betTracks.combinationResult.player,
        turnTime: new Date(),
      },
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

  updateBetTracksAfterBetTurn(playerName, amount) {
    const { betTracks } = this.gameData.ingame[playerName];
    const communityCards = betTracks.generatedResult.community;

    betTracks.bets.turn = amount;

    betTracks.communityCards.push(communityCards[3]);
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
    this.updateBetTracksAfterBetRiver(player.profile.name, amount);
    if (balance) {
      await this.checkUserStakeLevel(player, balance);
    }
    const { betTracks } = this.gameData.ingame[player.profile.name];

    await this.betsRepository.update(
      { roundId: betTracks.roundId },
      {
        $inc: { river: amount, bet: amount },
        result: betTracks.combinationResult.player,
        riverTime: new Date(),
      },
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

  updateBetTracksAfterBetRiver(playerName, amount) {
    const { betTracks } = this.gameData.ingame[playerName];
    const communityCards = betTracks.generatedResult.community;

    betTracks.bets.river = amount;
    betTracks.communityCards.push(communityCards[4]);

    this.updateCombinationPlayerResultInBetTracks(playerName);

    const combinationDealerResult = getCombinationResult(
      betTracks.dealer.concat(betTracks.communityCards),
    );

    betTracks.combinationResult.dealer = combinationDealerResult;
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

  async checkUserStakeLevel(player, balance) {
    if (player.profile.minBet !== balance.minBet || player.profile.maxBet !== balance.maxBet) {
      await this.updateUserStakeLevel(player, balance.minBet, balance.maxBet);
    }
  }
}
