import moment from 'moment';
import { reGenerateDecks, buildDeckOfCards } from '../../../src/helpers/deck-helper';
import GameCron from '../../../src/crons/game-cron';

const identity = (input) => input;

jest.mock('cron');
jest.mock('sc-common');
jest.mock('../../../src/helpers/deck-helper');

jest.mock('../../../src/helpers/crypto-helper', () => ({
  encrypt: identity,
  decrypt: identity,
  encryptObject: identity,
  decryptObject: identity,
  randomString: () => 'random',
  createHashMD5: identity,
}));

buildDeckOfCards.mockReturnValue([]);

describe('Game Cron test', () => {
  describe('start', () => {
    describe('when have last round', () => {
      it('should set last roundId', async () => {
        // Arrange
        const lastRound = { id: 10 };
        const game = new GameCron({});
        game.getSettingForNewRound = jest.fn();
        game.updateExchangeRates = jest.fn();
        game.proceed = jest.fn();
        game.initBetTracks = jest.fn();
        game.roundsRepository = {
          findOne: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(lastRound) }),
          }),
        };
        game.gameData = { roundId: 0 };

        // Act
        await game.start();

        // Assert
        expect(game.gameData.roundId).toBe(10);
        expect(game.initBetTracks).toHaveBeenCalled();
      });
    });

    describe('when last round null', () => {
      it('should run correctly', async () => {
        // Arrange
        const game = new GameCron({});
        game.getSettingForNewRound = jest.fn();
        game.updateExchangeRates = jest.fn();
        game.proceed = jest.fn();
        game.initBetTracks = jest.fn();
        game.roundsRepository = {
          findOne: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(null) }),
          }),
        };
        game.gameData = { roundId: 0 };

        spyOn(game, "getLastArchiveRound").and.returnValue(10);
        // Act
        await game.start();

        // Assert
        expect(game.gameData.roundId).toBe(10);
        expect(game.initBetTracks).toHaveBeenCalled();
      });
    });
  });

  describe('initBetTracks', () => {
    const player = { uid: 1, name: 'a' };
    const round = {
      id: 2,
      roundStartTime: new Date(123456),
      uid: player.uid,
      result: {
        dealer: [{ rank: 1 }, { rank: 2 }],
        communityCards: [{ rank: 1 }, { rank: 2 }, { rank: 3 }],
      },
      name: player.name,
      encryptedResult: {
        suffix: 'suffix',
        dealer: [{ rank: 1 }, { rank: 2 }],
        community: [{ rank: 1 }, { rank: 2 }, { rank: 3 }, { rank: 4 }, { rank: 5 }],
        player: [{ rank: 6 }, { rank: 7 }],
      },
      isSwappedOrHold: true,
      encryptedMd5: 'md5',
    };

    describe('when have running round and bet', () => {
      it('should set ingame', async () => {
        // Arrange
        const game = new GameCron({});
        game.gameData = { ingame: {} };
        game.roundsRepository = {
          find: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue([round]) }),
          }),
        };
        const bet = {
          cards: [{ rank: 4 }, { rank: 5 }],
          ante: 10,
          call: 10,
          turn: 0,
          result: { id: 3 },
        };
        game.betsRepository = {
          findOne: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockReturnValue(bet) }),
          }),
        };
        const deckCards = [{ rank: 0 }];
        reGenerateDecks.mockReturnValue(deckCards);
        const newPlayer = {
          name: round.name,
          betTracks: {
            roundId: round.id,
            roundStartTime: round.roundStartTime,
            uid: round.uid,
            deck: deckCards,
            combinationResult: { player: { ...bet.result } },
            player: bet.cards,
            bets: { ante: bet.ante, call: bet.call, turn: bet.turn },
            dealer: [...round.result.dealer],
            communityCards: [...round.result.communityCards],
            isSwappedOrHold: true,
            generatedResult: round.encryptedResult,
            resultKey: {
              rawValue: 'md5',
              formatValue: {
                suffix: 'suffix',
                cards: [],
              },
            },
          },
          betQueue: [],
        };

        // Act
        await game.initBetTracks();

        // Assert
        expect(game.gameData.ingame[player.name]).toStrictEqual(newPlayer);
      });
    });
  });

  describe('proceed', () => {
    const definition = {
      durations: {
        wholeRound: 60,
        botFrequency: 29,
      },
    };

    describe('when remainingTime equal wholeRound and game disabled', () => {
      it('should run correctly', async () => {
        // Arrange
        const game = new GameCron({ definition });
        game.gameData = {
          remainingTime: 60,
          disabled: true,
        };
        game.bot = { reset: jest.fn() };
        game.checkGameStatus = jest.fn();

        // Act
        await game.proceed();

        // Assert
        expect(game.checkGameStatus).toHaveBeenCalled();
        expect(game.bot.reset).toHaveBeenCalled();
        expect(game.gameData.remainingTime).toBe(60);
      });
    });

    describe('when undisabled', () => {
      it('should decrease remainingTime ', async () => {
        // Arrange
        const game = new GameCron({ definition });
        game.gameData = {
          remainingTime: 50,
          disabled: false,
        };

        // Act
        await game.proceed();

        // Assert
        expect(game.gameData.remainingTime).toBe(49);
      });
    });

    describe('when undisabled and remainingTime equal botFrequency', () => {
      it('should decrease remainingTime and run bot', async () => {
        // Arrange
        const game = new GameCron({ definition });
        game.gameData = {
          remainingTime: 29,
          disabled: false,
        };
        game.bot = { run: jest.fn() };

        // Act
        await game.proceed();

        // Assert
        expect(game.bot.run).toHaveBeenCalled();
        expect(game.gameData.remainingTime).toBe(28);
      });
    });

    describe('when round expire', () => {
      it('should settle round', async () => {
        // Arrange
        const game = new GameCron({ definition });
        game.gameData = {
          remainingTime: -1,
          disabled: true,
          ingame: {
            a: {
              betTracks: { roundStartTime: new Date(123456789) },
              name: 'a',
            },
          },
        };
        game.settleGameRoundConsumer = { settleRound: jest.fn() };
        moment.now = function () {
          return +new Date(999999999);
        };

        // Act
        await game.proceed();

        // Assert
        expect(game.gameData.remainingTime).toBe(definition.durations.wholeRound);
        expect(game.settleGameRoundConsumer.settleRound).toHaveBeenCalledWith('a', false, true);
      });
    });
  });
});
