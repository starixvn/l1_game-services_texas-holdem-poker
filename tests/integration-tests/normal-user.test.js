import { GameClientDriver, normalUser } from 'sc-game-service-integration-utils';
import { socketOptions } from './stubs/test-data';
import {
  initUserSession,
  JEST_ASSERT_WAITING_RESPONSE_TIMEOUT,
} from './init-user-helper';

let gameClientDriver;

describe('Texas Holdem Service', () => {
  beforeAll(() => {
    // set timeout for jest, waiting for socket response
    jest.setTimeout(JEST_ASSERT_WAITING_RESPONSE_TIMEOUT);
    // Arrange
    gameClientDriver = new GameClientDriver(socketOptions, initUserSession(normalUser));
  });

  afterAll(() => {
    gameClientDriver.close();
    jest.clearAllTimers();
  });

  it('should start and allow game client connect to.', (done) => {
    // Assert
    gameClientDriver.handleSignedInEvent(() => {
      done();
    });
  });

  it('should return user information when user joins game.', (done) => {
    // Arrange
    const expectedUser = {
      UID: 1,
      avatarId: 1,
      currency: '$US',
      name: 'NormalUser',
      rate: 1,
      red: 20000,
    };

    // Act
    gameClientDriver.sendInGameEvent();

    // Assert
    gameClientDriver.handleInGameEvent((inGameData) => {
      if (inGameData?.user?.UID) {
        expect(inGameData.user).toStrictEqual(expectedUser);

        done();
      }
    });
  });

  it('should does not return bet history when user request', (done) => {
    // Act
    gameClientDriver.sendGetHistoryEvent();

    // Assert
    gameClientDriver.handleGetHistoryEvent((betHistoryData) => {
      if (betHistoryData?.history) {
        expect(betHistoryData.history.betLogs.length > 0).toBeFalsy();
        done();
      }
    });
  });

  it('should return game configuration (odds, min bet, max bet) when user joins game.', (done) => {
    // Arrange
    const expectedGameConfigs = {
      minBet: 1,
      maxBet: 3000,
      maxBetPerChoices: {
        anteBet: 3000,
        callBet: 3000,
        turnBet: 3000,
        riverBet: 3000,
      },
      odds: {
        call: 2,
        turn: 2,
        river: 2,
        AnteBet_highCard: 3,
        AnteBet_onePair: 2,
        AnteBet_twoPairs: 2,
        AnteBet_threeKind: 2,
        AnteBet_straight: 2,
        AnteBet_flush: 2,
        AnteBet_fullHouse: 2,
        AnteBet_fourKind: 0,
        AnteBet_straightFlush: 0,
        AnteBet_royalFlush: 2,
      },
    };

    // Act
    gameClientDriver.sendInGameEvent();

    // Assert
    gameClientDriver.handleInGameEvent((inGameData) => {
      if (inGameData?.gameConfigs) {
        if (inGameData.gameConfigs) {
          expect(inGameData.gameConfigs.minBet).toEqual(expectedGameConfigs.minBet);
          expect(inGameData.gameConfigs.maxBet).toEqual(expectedGameConfigs.maxBet);
          expect(inGameData.gameConfigs.maxBetPerChoices).toStrictEqual(
            expectedGameConfigs.maxBetPerChoices,
          );
          expect(inGameData.gameConfigs.odds).toStrictEqual(expectedGameConfigs.odds);

          done();
        }
      }
    });
  });

  // it('should return current user ticket result when user is playing game.', (done) => {
  //   // Arrange
  //   const expectedEndBetResponse = {
  //     deal: {
  //       choices: {
  //         ante: 100,
  //       },
  //     },
  //     user: { maxBet: 2000, minBet: 1, red: 24250, scoins: 0 },
  //   };

  //   // Act
  //   gameClientDriver.socket.emit('bet', {
  //     action: 'deal',
  //     anteBet: 100,
  //   });

  //   // Assert
  //   gameClientDriver.handleEndBetEvent((endBetData) => {
  //     if (endBetData.endBet) {
  //       console.log(JSON.stringify(endBetData, null, 2));
  //       expect(endBetData.deal.choices).toEqual(expectedEndBetResponse.deal.choices);
  //       expect(endBetData.deal.combinationResult).toBeFalsy();
  //       expect(endBetData.deal.player).toBeFalsy();
  //       expect(endBetData.deal.totalAmount).toEqual(100);
  //       expect(endBetData.user).toEqual(expectedEndBetResponse.user);

  //       done();
  //     }
  //   });
  // });
});
