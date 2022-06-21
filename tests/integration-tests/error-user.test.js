import { errorUser, GameClientDriver } from 'sc-game-service-integration-utils';
import { socketOptions } from './stubs/test-data';
import { initUserSession, JEST_ASSERT_WAITING_RESPONSE_TIMEOUT } from './init-user-helper';

let gameClientDriver;

describe('Texas Holdem Service', () => {
  beforeAll(() => {
    // set timeout for jest, waiting for socket response
    jest.setTimeout(JEST_ASSERT_WAITING_RESPONSE_TIMEOUT);
  });

  afterAll(() => {
    gameClientDriver.close();
    jest.clearAllTimers();
  });

  it('should return error when place bet failed', (done) => {
    // Arrange
    gameClientDriver = new GameClientDriver(socketOptions, initUserSession(errorUser));
    gameClientDriver.handleSignedInEvent(async () => {
      gameClientDriver.sendInGameEvent();
      // Act
      gameClientDriver.socket.emit('bet', {
        action: 'deal',
        anteBet: 10,
      });

      // Assert
      gameClientDriver.handleEndBetEvent((endBetData) => {
        if (endBetData.endBet == -1) {
          expect(endBetData.betChoice).toEqual('deal');
          expect(endBetData.apiError.errorCode).toEqual(3002);
          expect(endBetData.apiError.isPlaceBetFailed).toEqual(true);
          done();
        }
      });
    });
  });
});
