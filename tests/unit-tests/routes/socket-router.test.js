import { BaseSocketRouter } from "sc-game-base/src/core/routers";
import SocketRouter from '../../../src/routes/socket-router';
import { actions } from '../../../src/helpers/constants';

describe('SocketRouter', () => {
  it('should inherit TableHttpRouter', () => {
    // Act
    const router = new SocketRouter({});

    // Assert
    expect(router instanceof BaseSocketRouter);
  });

  describe('init', () => {
    it('should run correctly', () => {
      // Arrange
      const router = new SocketRouter({});
      BaseSocketRouter.prototype.init = jest.fn();
      const socket = { on: jest.fn() };
      router.socketClient = socket;

      // Act
      router.init(socket);

      // Assert
      expect(BaseSocketRouter.prototype.init).toHaveBeenCalledWith(socket);
      expect(socket.on).toHaveBeenCalledWith('getTicketDetail', expect.any(Function));
    });
  });

  describe('handlePlaceBet', () => {
    describe('when verify false', () => {
      it('should run correctly', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = { action: actions.deal };
        router.verify = jest.fn().mockReturnValue(false);
        router.userDealConsumer = { consume: jest.fn() };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.userDealConsumer.consume).not.toHaveBeenCalled();
      });
    });

    describe('when have error', () => {
      it('should log error', async () => {
        // Arrange
        const error = new Error('error');
        const router = new SocketRouter({});
        const payload = { action: actions.deal };
        router.verify = jest.fn(() => {
          throw error;
        });
        router.logService = { logError: jest.fn() };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.logService.logError).toHaveBeenCalledWith(error);
      });
    });

    describe('when action deal', () => {
      it('should call user deal', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = { action: actions.deal, anteBet: 10 };
        router.verify = jest.fn().mockReturnValue(true);
        router.userDealConsumer = { consume: jest.fn() };
        router.socketClient = { id: 1 };
        const realPlayer = { uid: 123 };
        router.gameData = { realPlayers: { 1: realPlayer } };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.userDealConsumer.consume).toHaveBeenCalledWith(realPlayer, payload);
      });
    });

    describe('when action fold', () => {
      it('should call user fold', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = { action: actions.fold };
        router.verify = jest.fn().mockReturnValue(true);
        router.userFoldConsumer = { consume: jest.fn() };
        router.socketClient = { id: 1 };
        const realPlayer = { uid: 123 };
        router.gameData = { realPlayers: { 1: realPlayer } };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.userFoldConsumer.consume).toHaveBeenCalledWith(realPlayer, payload);
      });
    });

    describe('when action doubleCall', () => {
      it('should call user call', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = { action: actions.doubleCall };
        router.verify = jest.fn().mockReturnValue(true);
        router.userCallConsumer = { consume: jest.fn() };
        router.socketClient = { id: 1 };
        const realPlayer = { uid: 123 };
        router.gameData = { realPlayers: { 1: realPlayer } };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.userCallConsumer.consume).toHaveBeenCalledWith(realPlayer, payload);
      });
    });

    describe('when action betTurn', () => {
      it('should call user bet turn', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = { action: actions.betTurn };
        router.verify = jest.fn().mockReturnValue(true);
        router.userBetTurnConsumer = { consume: jest.fn() };
        router.socketClient = { id: 1 };
        const realPlayer = { uid: 123 };
        router.gameData = { realPlayers: { 1: realPlayer } };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.userBetTurnConsumer.consume).toHaveBeenCalledWith(realPlayer, payload);
      });
    });

    describe('when action checkTurn', () => {
      it('should call user bet turn', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = { action: actions.checkTurn };
        router.verify = jest.fn().mockReturnValue(true);
        router.userBetTurnConsumer = { consume: jest.fn() };
        router.socketClient = { id: 1 };
        const realPlayer = { uid: 123 };
        router.gameData = { realPlayers: { 1: realPlayer } };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.userBetTurnConsumer.consume).toHaveBeenCalledWith(realPlayer, payload);
      });
    });

    describe('when action betRiver', () => {
      it('should call user bet turn', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = { action: actions.betRiver };
        router.verify = jest.fn().mockReturnValue(true);
        router.userBetRiverConsumer = { consume: jest.fn() };
        router.socketClient = { id: 1 };
        const realPlayer = { uid: 123 };
        router.gameData = { realPlayers: { 1: realPlayer } };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.userBetRiverConsumer.consume).toHaveBeenCalledWith(realPlayer, payload);
      });
    });

    describe('when action checkRiver', () => {
      it('should call user bet turn', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = { action: actions.checkRiver };
        router.verify = jest.fn().mockReturnValue(true);
        router.userBetRiverConsumer = { consume: jest.fn() };
        router.socketClient = { id: 1 };
        const realPlayer = { uid: 123 };
        router.gameData = { realPlayers: { 1: realPlayer } };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.userBetRiverConsumer.consume).toHaveBeenCalledWith(realPlayer, payload);
      });
    });

    describe('when payload empty', () => {
      it('should run correct.', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = {};
        router.verify = jest.fn().mockReturnValue(true);
        router.userDealConsumer = { consume: jest.fn() };
        router.userFoldConsumer = { consume: jest.fn() };
        router.userCallConsumer = { consume: jest.fn() };
        router.userBetTurnConsumer = { consume: jest.fn() };
        router.userBetRiverConsumer = { consume: jest.fn() };

        // Act
        await router.handlePlaceBet(payload);

        // Assert
        expect(router.userDealConsumer.consume).not.toHaveBeenCalled();
        expect(router.userFoldConsumer.consume).not.toHaveBeenCalled();
        expect(router.userCallConsumer.consume).not.toHaveBeenCalled();
        expect(router.userBetTurnConsumer.consume).not.toHaveBeenCalled();
        expect(router.userBetRiverConsumer.consume).not.toHaveBeenCalled();
      });
    });
  });

  describe('handleGetTicketDetail', () => {
    describe('when verify false', () => {
      it('should return run correct', () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = {};
        router.verify = jest.fn().mockReturnValue(false);
        router.historyQuery = { queryTicketDetail: jest.fn() };

        // Act
        router.handleGetTicketDetail(payload);

        // Assert
        expect(router.historyQuery.queryTicketDetail).not.toHaveBeenCalled();
      });
    });

    describe(' when have error', () => {
      it('should log error', () => {
        // Arrange
        const error = new Error('error');
        const router = new SocketRouter({});
        const payload = { deal: {} };
        router.verify = jest.fn(() => {
          throw error;
        });
        router.logService = { logError: jest.fn() };

        // Act
        router.handleGetTicketDetail(payload);

        // Assert
        expect(router.logService.logError).toHaveBeenCalledWith(error);
      });
    });

    describe('when verify true', () => {
      it('should run correctly ', async () => {
        // Arrange
        const router = new SocketRouter({});
        const payload = { roundId: 1 };
        router.verify = jest.fn().mockReturnValue(true);
        const ticketDetail = { ticketDetail: {} };
        router.historyQuery = { queryTicketDetail: jest.fn().mockReturnValue(ticketDetail) };
        router.socketClient = { id: 1, emit: jest.fn() };
        router.definition = { name: 'CasinoHoldemPoker' };
        const realPlayer = { uid: 123 };
        router.gameData = { realPlayers: { 1: realPlayer } };

        // Act
        await router.handleGetTicketDetail(payload);

        // Assert
        expect(router.socketClient.emit).toHaveBeenCalledWith(router.definition.name, ticketDetail);
      });
    });
  });
});
