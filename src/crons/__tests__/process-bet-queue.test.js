import ProcessBetQueue from '../process-bet-queue';
import { actions, ranks } from '../../helpers/constants';
import { deal, generateDecks, reGenerateDecks } from '../../helpers/deck-helper';
import { getCombinationResult } from '../../helpers/result-helper';

jest.mock('sc-common');
jest.mock('../../helpers/result-helper');
jest.mock('../../helpers/deck-helper');

describe('Process bet queue test', () => {
  const mockDate = new Date(123456);
  let spy;

  beforeAll(() => {
    jest.useFakeTimers();
    spy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  });

  afterAll(() => {
    jest.clearAllMocks();
    spy.mockRestore();
  });

  describe('proceedBet', () => {
    it('should logError when have error', async () => {
      // Arrange
      const error = new Error('error');
      const process = new ProcessBetQueue({});
      const betTrack = { action: actions.deal };
      process.processDeal = jest.fn(() => {
        throw error;
      });
      process.logService = { logError: jest.fn() };

      // Act
      await process.proceedBet({}, betTrack);

      // Assert
      expect(process.logService.logError).toHaveBeenCalledWith(error);
    });

    it('should call processDeal when action deal', async () => {
      // Arrange
      const process = new ProcessBetQueue({});
      const payload = { action: actions.deal, amount: 10 };
      process.processDeal = jest.fn();

      // Act
      await process.proceedBet({}, payload);

      // Assert
      expect(process.processDeal).toHaveBeenCalledWith({}, payload.amount);
    });

    it('should call processCall when action call', async () => {
      // Arrange
      const process = new ProcessBetQueue({});
      const payload = { action: actions.call, amount: 10 };
      process.processCall = jest.fn();

      // Act
      await process.proceedBet({}, payload);

      // Assert
      expect(process.processCall).toHaveBeenCalledWith({}, payload.amount);
    });

    it('should call processBetTurn when action betTurn', async () => {
      // Arrange
      const process = new ProcessBetQueue({});
      const payload = { action: actions.betTurn, amount: 10 };
      process.processBetTurn = jest.fn();

      // Act
      await process.proceedBet({}, payload);

      // Assert
      expect(process.processBetTurn).toHaveBeenCalledWith({}, payload.amount);
    });

    it('should call processBetRiver when action betRiver', async () => {
      // Arrange
      const process = new ProcessBetQueue({});
      const payload = { action: actions.betRiver, amount: 10 };
      process.processBetRiver = jest.fn();

      // Act
      await process.proceedBet({}, payload);

      // Assert
      expect(process.processBetRiver).toHaveBeenCalledWith({}, payload.amount);
    });

    it('should settle round when action fold', async () => {
      // Arrange
      const process = new ProcessBetQueue({});
      const payload = { action: actions.fold };
      const player = { profile: { name: 'a' } };
      process.settleGameRoundConsumer = { settleRound: jest.fn() };

      // Act
      await process.proceedBet(player, payload);

      // Assert
      expect(process.settleGameRoundConsumer.settleRound).toHaveBeenCalledWith(
        player.profile.name,
        true,
      );
    });
  });

  describe('buildPresetCards', () => {
    it('should return expected when resultFromAdmin has value', () => {
      // Arrange
      const process = new ProcessBetQueue({});
      const resultFromAdmin = {
        player: [{ rank: 1 }, { rank: 1 }],
        dealer: [{ rank: 2 }, { rank: 2 }],
        communityCards: [{ rank: 3 }],
      };
      const expected = [
        resultFromAdmin.player[0],
        resultFromAdmin.dealer[0],
        resultFromAdmin.player[1],
        resultFromAdmin.dealer[1],
        resultFromAdmin.communityCards[0],
      ];

      // Act
      const actual = process.buildPresetCards(resultFromAdmin);

      // Assert
      expect(actual).toStrictEqual(expected);
    });

    it('should return expected when resultFromAdmin empty', () => {
      // Arrange
      const process = new ProcessBetQueue({});
      const unusedCards = [{ rank: 1 }, { rank: 1 }, { rank: 2 }, { rank: 2 }, { rank: 3 }];
      reGenerateDecks.mockReturnValue(unusedCards);
      const expected = [{ rank: 1 }, { rank: 1 }, { rank: 2 }, { rank: 2 }];

      // Act
      const actual = process.buildPresetCards({});

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('getPresetCards', () => {
    it('should logError and return empty array when buildPresetCards error', () => {
      // Arrange
      const error = new Error('error');
      const player = { profile: { name: 'a' } };
      const gameData = { resultFromAdmin: { roundName: player.profile.name } };
      const logService = { logError: jest.fn() };
      const process = new ProcessBetQueue({ gameData, logService });
      process.buildPresetCards = jest.fn(() => {
        throw error;
      });

      // Act
      const actual = process.getPresetCards(player);

      // Assert
      expect(actual).toBeArrayOfSize(0);
    });

    it('should return empty array when resultFromAdmin has roundName not equal player name', () => {
      // Arrange
      const player = { profile: { name: 'a' } };
      const gameData = { resultFromAdmin: { roundName: 'b' } };
      const process = new ProcessBetQueue({ gameData });

      // Act
      const actual = process.getPresetCards(player);

      // Assert
      expect(actual).toBeArrayOfSize(0);
    });

    it('should return expected when resultFromAdmin has roundName equal player name', () => {
      // Arrange
      const player = { profile: { name: 'a' } };
      const gameData = { resultFromAdmin: { roundName: player.profile.name } };
      const process = new ProcessBetQueue({ gameData });
      process.buildPresetCards = jest.fn().mockReturnValue([{ rank: 1 }]);

      // Act
      const actual = process.getPresetCards(player);

      // Assert
      expect(actual).toStrictEqual([{ rank: 1 }]);
      expect(gameData.resultFromAdmin).toBeNull();
    });
  });

  describe('processDeal', () => {
    const player = { UID: 1, profile: { name: 'a' }, session: {} };
    const definition = { id: 42, choicesMapper: { deal: 1 } };

    it('should call handleSuccessDeal when placeBet successfully', async () => {
      const betTracks = {};
      const gameData = { roundId: 1, ingame: { [player.profile.name]: { betTracks } } };
      const process = new ProcessBetQueue({ definition, gameData });
      const amount = 50;
      const betInfo = {
        amount,
        gameId: definition.id,
        gameRoundId: 2,
        choiceId: definition.choicesMapper[actions.deal],
      };
      const apiResult = { isOk: true, response: { red: 1000 } };
      process.placeBet = jest
        .fn({ id: player.UID, session: player.session }, betInfo)
        .mockReturnValue(apiResult);
      process.handleSuccessDeal = jest.fn();

      // Act
      await process.processDeal(player, amount);

      // Assert
      expect(betTracks.player).toBeArrayOfSize(0);
      expect(betTracks.dealer).toBeArrayOfSize(0);
      expect(betTracks.communityCards).toBeArrayOfSize(0);
      expect(betTracks.uid).toBe(player.UID);
      expect(betTracks.combinationResult).toStrictEqual({});
      expect(betTracks.bets).toStrictEqual({ ante: amount });
      expect(process.handleSuccessDeal).toHaveBeenCalledWith(player, apiResult.response, 2);
      expect(betTracks.isDealing).toBeFalse();
    });

    it('should call handleSuccessDeal when placeBet unsuccessfully', async () => {
      const betTracks = {};
      const gameData = { roundId: 1, ingame: { [player.profile.name]: { betTracks } } };
      const process = new ProcessBetQueue({ definition, gameData });
      const amount = 50;
      const betInfo = {
        amount,
        gameId: definition.id,
        gameRoundId: 2,
        choiceId: definition.choicesMapper[actions.deal],
      };
      const apiResult = { isOk: false, response: {} };
      process.placeBet = jest
        .fn({ id: player.UID, session: player.session }, betInfo)
        .mockReturnValue(apiResult);
      process.handleFailPlaceBetResponse = jest.fn();

      // Act
      await process.processDeal(player, amount);

      // Assert
      expect(betTracks.player).toBeArrayOfSize(0);
      expect(betTracks.dealer).toBeArrayOfSize(0);
      expect(betTracks.communityCards).toBeArrayOfSize(0);
      expect(betTracks.uid).toBe(player.UID);
      expect(betTracks.combinationResult).toStrictEqual({});
      expect(betTracks.bets).toStrictEqual({ ante: amount });
      expect(process.handleFailPlaceBetResponse).toHaveBeenCalledWith(
        player,
        apiResult.response,
        actions.deal,
      );
      expect(betTracks.isDealing).toBeFalse();
    });
  });

  describe('handleSuccessDeal', () => {
    it('should run correctly', async () => {
      // Arrange
      const player = { UID: 1, profile: { name: 'a' } };
      const betTracks = {
        bets: { ante: 100 },
        player: [],
        combinationResult: {},
      };
      const gameData = { ingame: { [player.profile.name]: { betTracks } } };
      const publisher = { publishToUser: jest.fn() };
      const process = new ProcessBetQueue({ gameData, publisher });
      process.getPresetCards = jest.fn().mockReturnValue([]);
      const deck = [{ rank: 1 }, { rank: 2 }];
      generateDecks.mockReturnValue(deck);
      const newRound = { id: 3 };
      process.createRound = jest.fn(player, newRound.id).mockReturnValue(newRound);
      process.getCombinationResultWhenDeal = jest.fn().mockReturnValue({});
      process.createBet = jest.fn();
      const data = {
        deal: {
          roundId: newRound.id,
          player: betTracks.player,
          combinationResult: { player: {} },
          totalAmount: 100,
          choices: betTracks.bets,
        },
        endBet: betTracks.bets.ante,
        user: {},
      };

      // Act
      await process.handleSuccessDeal(player, {}, newRound.id);

      // Assert
      expect(betTracks.deck).toStrictEqual(deck);
      expect(deal).toHaveBeenCalled();
      expect(betTracks.roundId).toBe(newRound.id);
      expect(betTracks.roundStartTime).toEqual(new Date(123456));
      expect(process.createBet).toHaveBeenCalledWith(player);
      expect(publisher.publishToUser).toHaveBeenCalledWith(player.UID, data);
    });
  });

  describe('getCombinationResultWhenDeal', () => {
    it('should return expected when cards is one pair', () => {
      // Arrange
      const process = new ProcessBetQueue({});
      const cards = [{ rank: 1 }, { rank: 1 }];
      const expected = {
        id: ranks.onePair,
        combinationCards: cards,
        cards,
      };

      // Act
      const actual = process.getCombinationResultWhenDeal(cards);

      // Assert
      expect(actual).toStrictEqual(expected);
    });

    describe('when high card', () => {
      it('should return expected when first card greater than second', () => {
        // Arrange
        const process = new ProcessBetQueue({});
        const cards = [{ rank: 0 }, { rank: 1 }];
        const expected = {
          id: ranks.highCard,
          combinationCards: [cards[0]],
          cards,
        };

        // Act
        const actual = process.getCombinationResultWhenDeal(cards);

        // Assert
        expect(actual).toStrictEqual(expected);
      });

      it('should return expected when first card less than second', () => {
        // Arrange
        const process = new ProcessBetQueue({});
        const cards = [{ rank: 1 }, { rank: 0 }];
        const expected = {
          id: ranks.highCard,
          combinationCards: [cards[1]],
          cards,
        };

        // Act
        const actual = process.getCombinationResultWhenDeal(cards);

        // Assert
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe('createRound', () => {
    it('should return expected', async () => {
      const player = { UID: 1, profile: { name: 'profile' } };
      const betTracks = { dealer: [{ rank: 1 }], communityCards: [] };
      const gameData = {
        gameConfigs: { odds: { callBet: 2 } },
        ingame: { [player.profile.name]: { betTracks } },
      };
      const expected = {
        id: 10,
        result: { dealer: betTracks.dealer, communityCards: [] },
        roundStartTime: new Date(123456),
        uid: player.UID,
        name: player.profile.name,
        odds: gameData.gameConfigs.odds,
      };
      const roundsRepository = { create: jest.fn().mockReturnValue(expected) };
      const process = new ProcessBetQueue({ gameData, roundsRepository });

      // Act
      const actual = await process.createRound(player, 10);

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('createBet', () => {
    it('should run correctly', async () => {
      // Arrange
      const player = {
        UID: 1,
        profile: { name: 'profile' },
        session: { memberId: 123, siteId: 2 },
      };
      const betTracks = {
        roundId: 1,
        player: [{ rank: 1 }],
        communityCards: [{ rank: 2 }],
        bets: { ante: 100 },
        combinationResult: { player: {} },
      };
      const gameData = {
        ingame: { [player.profile.name]: { betTracks } },
      };
      const definition = {};
      const betsRepository = { create: jest.fn() };
      const process = new ProcessBetQueue({ definition, gameData, betsRepository });
      const data = {
        uid: player.UID,
        name: player.profile.name,
        phien: betTracks.roundId,
        ante: betTracks.bets.ante,
        cards: betTracks.player,
        bet: betTracks.bets.ante,
        result: betTracks.combinationResult.player,
        time: new Date(123456),
        memberId: player.session.memberId,
        siteId: player.session.siteId,
      };

      // Act
      await process.createBet(player);

      // Assert
      expect(betsRepository.create).toHaveBeenCalledWith(data);
    });
  });

  describe('processCall', () => {
    const player = { UID: 1, profile: { name: 'profile' }, session: {} };
    const definition = { id: 42, choicesMapper: { call: 2 } };

    it('should call handleSuccessCall when placeBet successfully', async () => {
      const betTracks = { roundId: 1 };
      const amount = 100;
      const gameData = {
        ingame: { [player.profile.name]: { betTracks } },
      };
      const process = new ProcessBetQueue({ definition, gameData });
      const betInfo = {
        amount,
        gameId: definition.id,
        gameRoundId: betTracks.roundId,
        choiceId: definition.choicesMapper[actions.call],
      };
      const apiResult = { isOk: true, response: { red: 1000 } };
      process.placeBet = jest
        .fn({ id: player.UID, session: player.session }, betInfo)
        .mockReturnValue(apiResult);
      process.handleSuccessCall = jest.fn();

      // Act
      await process.processCall(player, amount);

      // Assert
      expect(process.handleSuccessCall).toHaveBeenCalledWith(
        player,
        betInfo.amount,
        apiResult.response,
      );
    });

    it('should call handleSuccessCall when placeBet unsuccessfully', async () => {
      const betTracks = { roundId: 1 };
      const amount = 100;
      const gameData = {
        ingame: { [player.profile.name]: { betTracks } },
      };
      const process = new ProcessBetQueue({ definition, gameData });
      const betInfo = {
        amount,
        gameId: definition.id,
        gameRoundId: betTracks.roundId,
        choiceId: definition.choicesMapper[actions.call],
      };
      const apiResult = { isOk: false, response: { red: 1000 } };
      process.placeBet = jest
        .fn({ id: player.UID, session: player.session }, betInfo)
        .mockReturnValue(apiResult);
      process.handleFailPlaceBetResponse = jest.fn();

      // Act
      await process.processCall(player, amount);

      // Assert
      expect(process.handleFailPlaceBetResponse).toHaveBeenCalledWith(
        player,
        apiResult.response,
        actions.call,
      );
    });
  });

  describe('handleSuccessCall', () => {
    it('should run correctly', async () => {
      // Arrange
      const player = { profile: { name: 'a' } };
      const betTracks = {
        roundId: 1,
        combinationResult: { player: { id: 3 } },
        communityCards: [],
        dealer: [],
        bets: { ante: 100, call: 100 },
      };
      const gameData = {
        ingame: { [player.profile.name]: { betTracks } },
      };
      const betsRepository = { update: jest.fn() };
      const publisher = { publishToUser: jest.fn() };
      const process = new ProcessBetQueue({
        gameData,
        betsRepository,
        publisher,
      });
      process.updateBetTracksAfterCall = jest.fn();
      process.updateRoundWhenContinuesDealing = jest.fn();
      const call = {
        communityCards: betTracks.communityCards,
        combinationResult: betTracks.combinationResult,
        totalAmount: 200,
        choices: betTracks.bets,
      };

      // Act
      await process.handleSuccessCall(player, 100, {});

      // Assert
      expect(process.updateBetTracksAfterCall).toHaveBeenCalledWith(player.profile.name, 100);
      expect(process.updateRoundWhenContinuesDealing).toHaveBeenCalledWith(player.profile.name);
      expect(betsRepository.update).toHaveBeenCalledWith(
        { phien: betTracks.roundId },
        { $inc: { call: 100, bet: 100 }, result: betTracks.combinationResult.player },
      );
      expect(publisher.publishToUser).toHaveBeenCalledWith(player.UID, {
        endBet: 100,
        user: {},
        call,
      });
    });
  });

  describe('updateBetTracksAfterCall', () => {
    it('should run correctly', () => {
      // Arrange
      const player = { profile: { name: 'a' } };
      const betTracks = {
        communityCards: [],
        deck: [{ rank: 3 }, { rank: 4 }, { rank: 5 }],
        bets: { ante: 100 },
      };
      const gameData = { ingame: { [player.profile.name]: { betTracks } } };
      const process = new ProcessBetQueue({ gameData });
      process.updateCombinationPlayerResultInBetTracks = jest.fn();

      // Act
      process.updateBetTracksAfterCall(player.profile.name, 100);

      // Assert
      expect(betTracks.bets.call).toBe(100);
      expect(betTracks.communityCards.length).toBe(3);
      expect(betTracks.communityCards[0]).toStrictEqual({ rank: 3 });
      expect(betTracks.communityCards[1]).toStrictEqual({ rank: 4 });
      expect(betTracks.communityCards[2]).toStrictEqual({ rank: 5 });
    });
  });

  describe('processBetTurn', () => {
    const player = { UID: 1, profile: { name: 'profile' }, session: {} };
    const definition = { id: 42, choicesMapper: { turn: 3 } };

    describe('when amount > 0', () => {
      it('should call handleSuccessCall when placeBet successfully', async () => {
        const betTracks = { roundId: 1 };
        const amount = 100;
        const gameData = {
          ingame: { [player.profile.name]: { betTracks } },
        };
        const process = new ProcessBetQueue({ definition, gameData });
        const betInfo = {
          amount,
          gameId: definition.id,
          gameRoundId: betTracks.roundId,
          choiceId: definition.choicesMapper.turn,
        };
        const apiResult = { isOk: true, response: { red: 1000 } };
        process.placeBet = jest
          .fn({ id: player.UID, session: player.session }, betInfo)
          .mockReturnValue(apiResult);
        process.handleSuccessBetTurn = jest.fn();

        // Act
        await process.processBetTurn(player, amount);

        // Assert
        expect(process.handleSuccessBetTurn).toHaveBeenCalledWith(
          player,
          betInfo.amount,
          apiResult.response,
        );
      });

      it('should call handleSuccessCall when placeBet unsuccessfully', async () => {
        const betTracks = { roundId: 1 };
        const amount = 100;
        const gameData = {
          ingame: { [player.profile.name]: { betTracks } },
        };
        const process = new ProcessBetQueue({ definition, gameData });
        const betInfo = {
          amount,
          gameId: definition.id,
          gameRoundId: betTracks.roundId,
          choiceId: definition.choicesMapper.turn,
        };
        const apiResult = { isOk: false, response: { red: 1000 } };
        process.placeBet = jest
          .fn({ id: player.UID, session: player.session }, betInfo)
          .mockReturnValue(apiResult);
        process.handleFailPlaceBetResponse = jest.fn();

        // Act
        await process.processBetTurn(player, amount);

        // Assert
        expect(process.handleFailPlaceBetResponse).toHaveBeenCalledWith(
          player,
          apiResult.response,
          actions.betTurn,
        );
      });

      it('should run correctly when amount is 0', async () => {
        // Arrange
        const process = new ProcessBetQueue({});
        process.handleSuccessBetTurn = jest.fn();

        // Act
        await process.processBetTurn(player, 0);

        // Assert
        expect(process.handleSuccessBetTurn).toHaveBeenCalledWith(player, 0);
      });
    });
  });

  describe('handleSuccessBetTurn', () => {
    const player = { UID: 123, profile: { name: 'a' } };
    const betTracks = {
      roundId: 1,
      communityCards: [{ rank: 1 }, { rank: 1 }, { rank: 2 }, { rank: 3 }],
      combinationResult: { player: { id: 1 } },
      bets: { ante: 10, call: 10 },
    };
    const gameData = { ingame: { [player.profile.name]: { betTracks } } };
    const publisher = { publishToUser: jest.fn() };
    const balance = { red: 2000 };
    const turn = {
      communityCards: betTracks.communityCards,
      combinationResult: betTracks.combinationResult,
      totalAmount: 20,
      choices: betTracks.bets,
    };

    it('should run correctly when amount greater than 0', async () => {
      // Arrange
      const process = new ProcessBetQueue({ gameData, publisher });
      process.updateBetTracksAfterBetTurn = jest.fn();
      process.updateRoundWhenContinuesDealing = jest.fn();
      process.betsRepository = { update: jest.fn() };

      // Act
      await process.handleSuccessBetTurn(player, 10, balance);

      // Assert
      expect(process.updateBetTracksAfterBetTurn).toHaveBeenCalledWith(player.profile.name, 10);
      expect(process.updateRoundWhenContinuesDealing).toHaveBeenCalledWith(player.profile.name);
      expect(process.betsRepository.update).toHaveBeenCalledWith(
        { phien: betTracks.roundId },
        { $inc: { turn: 10, bet: 10 }, result: betTracks.combinationResult.player },
      );
      expect(publisher.publishToUser).toHaveBeenCalledWith(player.UID, {
        endBet: 10,
        user: balance,
        turn,
      });
    });

    it('should run correctly when amount equal 0', async () => {
      // Arrange
      const process = new ProcessBetQueue({ gameData, publisher });
      process.updateBetTracksAfterBetTurn = jest.fn();
      process.updateRoundWhenContinuesDealing = jest.fn();
      process.betsRepository = { update: jest.fn() };

      // Act
      await process.handleSuccessBetTurn(player, 0, balance);

      // Assert
      expect(process.updateBetTracksAfterBetTurn).toHaveBeenCalledWith(player.profile.name, 0);
      expect(process.updateRoundWhenContinuesDealing).toHaveBeenCalledWith(player.profile.name);
      expect(process.betsRepository.update).toHaveBeenCalledWith(
        { phien: betTracks.roundId },
        { $inc: { turn: 0, bet: 0 }, result: betTracks.combinationResult.player },
      );
      expect(publisher.publishToUser).toHaveBeenCalledWith(player.UID, { turn });
    });
  });

  describe('updateBetTracksAfterBetTurn', () => {
    it('should run correctly', () => {
      // Arrange
      const betTracks = {
        bets: { ante: 10, call: 10 },
        deck: [{ rank: 5 }],
        communityCards: [{ rank: 1 }, { rank: 1 }, { rank: 1 }],
      };
      const gameData = { ingame: { a: { betTracks } } };
      const process = new ProcessBetQueue({ gameData });
      process.updateCombinationPlayerResultInBetTracks = jest.fn();

      // Act
      process.updateBetTracksAfterBetTurn('a', 10);

      // Assert
      expect(betTracks.bets.turn).toBe(10);
      expect(betTracks.communityCards.length).toBe(4);
      expect(betTracks.communityCards[3]).toStrictEqual({ rank: 5 });
    });
  });

  describe('processBetRiver', () => {
    const player = { UID: 1, profile: { name: 'profile' }, session: {} };
    const definition = { id: 42, choicesMapper: { river: 3 } };

    describe('when amount > 0', () => {
      it('should call handleSuccessCall when placeBet successfully', async () => {
        const betTracks = { roundId: 1 };
        const amount = 100;
        const gameData = {
          ingame: { [player.profile.name]: { betTracks } },
        };
        const process = new ProcessBetQueue({ definition, gameData });
        const betInfo = {
          amount,
          gameId: definition.id,
          gameRoundId: betTracks.roundId,
          choiceId: definition.choicesMapper.river,
        };
        const apiResult = { isOk: true, response: { red: 1000 } };
        process.placeBet = jest
          .fn({ id: player.UID, session: player.session }, betInfo)
          .mockReturnValue(apiResult);
        process.handleSuccessBetRiver = jest.fn();

        // Act
        await process.processBetRiver(player, amount);

        // Assert
        expect(process.handleSuccessBetRiver).toHaveBeenCalledWith(
          player,
          betInfo.amount,
          apiResult.response,
        );
      });

      it('should call handleSuccessCall when placeBet unsuccessfully', async () => {
        const betTracks = { roundId: 1 };
        const amount = 100;
        const gameData = {
          ingame: { [player.profile.name]: { betTracks } },
        };
        const process = new ProcessBetQueue({ definition, gameData });
        const betInfo = {
          amount,
          gameId: definition.id,
          gameRoundId: betTracks.roundId,
          choiceId: definition.choicesMapper.river,
        };
        const apiResult = { isOk: false, response: { red: 1000 } };
        process.placeBet = jest
          .fn({ id: player.UID, session: player.session }, betInfo)
          .mockReturnValue(apiResult);
        process.handleFailPlaceBetResponse = jest.fn();

        // Act
        await process.processBetRiver(player, amount);

        // Assert
        expect(process.handleFailPlaceBetResponse).toHaveBeenCalledWith(
          player,
          apiResult.response,
          actions.betRiver,
        );
      });

      it('should run correctly when amount is 0', async () => {
        // Arrange
        const process = new ProcessBetQueue({});
        process.handleSuccessBetRiver = jest.fn();

        // Act
        await process.processBetRiver(player, 0);

        // Assert
        expect(process.handleSuccessBetRiver).toHaveBeenCalledWith(player, 0);
      });
    });
  });

  describe('handleSuccessBetRiver', () => {
    const player = { UID: 123, profile: { name: 'a' } };
    const betTracks = {
      roundId: 1,
      communityCards: [{ rank: 1 }, { rank: 1 }, { rank: 2 }, { rank: 3 }],
      combinationResult: { player: { id: 1 }, dealer: { id: 2 } },
      bets: { ante: 10, call: 10, turn: 10 },
      dealer: [{ rank: 0 }, { rank: 0 }],
    };
    const gameData = { ingame: { [player.profile.name]: { betTracks } } };
    const publisher = { publishToUser: jest.fn() };
    const balance = { red: 2000 };
    const river = {
      communityCards: betTracks.communityCards,
      combinationResult: betTracks.combinationResult,
      dealer: betTracks.dealer,
      totalAmount: 30,
      choices: betTracks.bets,
    };

    it('should run correctly when amount greater than 0', async () => {
      // Arrange
      const process = new ProcessBetQueue({ gameData, publisher });
      process.updateBetTracksAfterBetRiver = jest.fn();
      process.betsRepository = { update: jest.fn() };
      process.settleGameRoundConsumer = { settleRound: jest.fn() };

      // Act
      await process.handleSuccessBetRiver(player, 10, balance);

      // Assert
      expect(process.updateBetTracksAfterBetRiver).toHaveBeenCalledWith(player.profile.name, 10);
      expect(process.betsRepository.update).toHaveBeenCalledWith(
        { phien: betTracks.roundId },
        { $inc: { river: 10, bet: 10 }, result: betTracks.combinationResult.player },
      );
      expect(publisher.publishToUser).toHaveBeenCalledWith(player.UID, {
        endBet: 10,
        user: balance,
        river,
      });
      expect(process.settleGameRoundConsumer.settleRound).toHaveBeenCalledWith(player.profile.name);
    });

    it('should run correctly when amount equal 0', async () => {
      // Arrange
      const process = new ProcessBetQueue({ gameData, publisher });
      process.updateBetTracksAfterBetRiver = jest.fn();
      process.betsRepository = { update: jest.fn() };
      process.settleGameRoundConsumer = { settleRound: jest.fn() };

      // Act
      await process.handleSuccessBetRiver(player, 0, balance);

      // Assert
      expect(process.updateBetTracksAfterBetRiver).toHaveBeenCalledWith(player.profile.name, 0);
      expect(process.betsRepository.update).toHaveBeenCalledWith(
        { phien: betTracks.roundId },
        { $inc: { river: 0, bet: 0 }, result: betTracks.combinationResult.player },
      );
      expect(publisher.publishToUser).toHaveBeenCalledWith(player.UID, { river });
      expect(process.settleGameRoundConsumer.settleRound).toHaveBeenCalledWith(player.profile.name);
    });
  });

  describe('updateBetTracksAfterBetRiver', () => {
    it('should run correctly', () => {
      // Arrange
      const betTracks = {
        bets: { ante: 10, call: 10, turn: 10 },
        deck: [{ rank: 5 }],
        communityCards: [{ rank: 1 }, { rank: 1 }, { rank: 1 }, { rank: 1 }],
        combinationResult: {},
        dealer: [{ rank: 2 }, { rank: 2 }],
      };
      const gameData = { ingame: { a: { betTracks } } };
      const process = new ProcessBetQueue({ gameData });
      process.updateCombinationPlayerResultInBetTracks = jest.fn();
      getCombinationResult.mockReturnValue({ id: 2 });

      // Act
      process.updateBetTracksAfterBetRiver('a', 10);

      // Assert
      expect(betTracks.bets.river).toBe(10);
      expect(betTracks.communityCards.length).toBe(5);
      expect(betTracks.communityCards[4]).toStrictEqual({ rank: 5 });
      expect(betTracks.combinationResult.dealer).toStrictEqual({ id: 2 });
    });
  });

  describe('updateCombinationPlayerResultInBetTracks', () => {
    it('should run correctly', () => {
      // Arrange
      const betTracks = {
        communityCards: [{ rank: 1 }, { rank: 1 }, { rank: 1 }, { rank: 1 }],
        combinationResult: {},
        player: [{ rank: 2 }, { rank: 2 }],
      };
      const gameData = { ingame: { a: { betTracks } } };
      const process = new ProcessBetQueue({ gameData });
      getCombinationResult.mockReturnValue({ id: 2 });

      // Act
      process.updateCombinationPlayerResultInBetTracks('a');

      // Assert
      expect(betTracks.combinationResult.player).toStrictEqual({ id: 2 });
    });
  });

  describe('updateRoundWhenContinuesDealing', () => {
    it('should run correctly', async () => {
      // Arrange
      const betTracks = {
        roundId: 1,
        communityCards: [{ rank: 1 }, { rank: 1 }, { rank: 1 }, { rank: 1 }],
        dealer: [{ rank: 2 }, { rank: 2 }],
      };
      const gameData = { ingame: { a: { betTracks } } };
      const roundsRepository = { update: jest.fn() };
      const process = new ProcessBetQueue({ gameData, roundsRepository });

      // Act
      await process.updateRoundWhenContinuesDealing('a');

      // Assert
      expect(roundsRepository.update).toHaveBeenCalledWith(
        { id: betTracks.roundId },
        { result: { dealer: betTracks.dealer, communityCards: betTracks.communityCards } },
      );
    });
  });

  describe('handleFailPlaceBetResponse', () => {
    const player = { session: { language: '' } };
    it('should run correctly', () => {
      // Arrange
      const response = { cannotProcessBet: {} };
      const process = new ProcessBetQueue({});
      process.handleFailedBet = jest.fn();

      // Act
      process.handleFailPlaceBetResponse(player, response, actions.deal);

      // Assert
      expect(process.handleFailedBet).toHaveBeenCalledWith(player, "SB1905", {
        betChoice: actions.deal,
      });
    });

    it('should run correctly', () => {
      // Arrange
      const response = {};
      const process = new ProcessBetQueue({});
      process.handleFailedBet = jest.fn();

      // Act
      process.handleFailPlaceBetResponse(player, response, actions.deal);

      // Assert
      expect(process.handleFailedBet).toHaveBeenCalledWith(
        player,
        {},
        {
          betChoice: actions.deal,
        },
      );
    });
  });
});
