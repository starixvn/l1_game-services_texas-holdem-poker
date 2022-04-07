import { gameNotifications } from 'sc-base-database';
import UserDisconnectConsumer from '../../../src/consumers/user-disconnect-consumer';
import BaseUserDisconnectConsumer from 'sc-game-base/src/core/event-consumers/user-disconnect-consumer';

jest.mock('sc-base-database', () => {
  return {
    gameNotifications: {
      updateOne: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
    },
  };
});

describe('UserDisconnectConsumer', () => {
  let consumer = null;
  beforeEach(() => {
    BaseUserDisconnectConsumer.prototype.consume = jest.fn();
    consumer = new UserDisconnectConsumer();
  });

  it('should inherit BaseUserDisconnectConsumer', () => {
    // Assert
    expect(consumer instanceof BaseUserDisconnectConsumer);
  });

  describe('consume', () => {
    const socketClient = { id: 1 };
    describe('when have realPlayer', () => {
      beforeEach(async () => {
         // Arrange
        consumer.gameData = { realPlayers: { [socketClient.id]: { UID: 2 } }, players: { [2]: {} } };
        consumer.updateRunningRound = jest.fn();

        // Act
        await consumer.consume(socketClient);
      });

      it('should define gameData player.', async () => {
        // Assert
        expect(consumer.gameData.players['2']).toBeUndefined();
      });

      it('should call updateRunningRound with correct player.', async () => {
        // Assert
        expect(consumer.updateRunningRound).toHaveBeenCalledWith(
          consumer.gameData.realPlayers[socketClient.id],
        );
      });

      it('should call super consume.', async () => {
        expect(BaseUserDisconnectConsumer.prototype.consume).toHaveBeenCalledWith(socketClient);
      });
    });

    describe('when empty realPlayer', () => {
      beforeEach(async () => {
        // Arrange
        consumer.gameData = { realPlayers: {} };
        consumer.updateRunningRound = jest.fn();

        // Act
        await consumer.consume(socketClient);
      });

      it('should not call updateRunningRound.', async () => {
        // Assert
        expect(consumer.updateRunningRound).not.toHaveBeenCalled();
      });

      it('should call super consume.', async () => {
        // Assert
        expect(BaseUserDisconnectConsumer.prototype.consume).toHaveBeenCalledWith(socketClient);
      });
    });
  });

  describe('updateRunningRound', () => {
    const player = { UID: 2, profile: { name: 'a' } };

    beforeEach(() => {
      consumer.definition = { id: 1 };
    });

    describe('when empty betTracks', () => {
      it('should not update notifications.', async () => {
        // Arrange
        consumer.gameData = { ingame: {} };

        // Act
        await consumer.updateRunningRound(player);

        // Assert
        expect(gameNotifications.updateOne).not.toHaveBeenCalled();
      });
    });

    describe('when have betTracks', () => {
      it('should update notifications correctly.', async () => {
        // Arrange
        consumer.gameData = {
          ingame: { [player.profile.name]: { betTracks: { roundId: 1, roundStartTime: 123 } } },
        };

        const gameInfo = {
          uid: player.UID,
          gameId: consumer.definition.id,
          gameInfo: { roundId: 1, roundStartTime: 123 },
        };

        // Act
        await consumer.updateRunningRound(player);

        // Assert
        expect(gameNotifications.updateOne).toHaveBeenCalledWith(
          { uid: player.UID, gameId: consumer.definition.id },
          { $setOnInsert: gameInfo },
          { upsert: true, setDefaultsOnInsert: true },
        );
      });
    });
  });
});
