import { TableSocketRouter } from '@nex3/nex3-game-base/routes';
import SocketRouter from '../socket-router';
import { actions } from '../../helpers/constants';

describe('Socket router test', () => {
  it('inherit TableHttpRouter', () => {
    // Act
    const router = new SocketRouter({});

    // Assert
    expect(router instanceof TableSocketRouter);
  });

  describe('init', () => {
    it('should run correctly', () => {
      // Arrange
      const router = new SocketRouter({});
      TableSocketRouter.prototype.init = jest.fn();
      const socket = { on: jest.fn() };
      router.socketClient = socket;

      // Act
      router.init(socket);

      // Assert
      expect(TableSocketRouter.prototype.init).toHaveBeenCalledWith(socket);
      expect(socket.on).toHaveBeenCalledWith('getTicketDetail', expect.any(Function));
    });
  });

  describe('handlePlaceBet', () => {
    it('should run correctly when verify false', async () => {
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

    it('should log error when have error', async () => {
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

    it('should call user deal when action deal', async () => {
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

    it('should call user fold when action fold', async () => {
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

    it('should call user call when action call', async () => {
      // Arrange
      const router = new SocketRouter({});
      const payload = { action: actions.call };
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

    it('should call user call when action doubleCall', async () => {
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

    it('should call user bet turn when action betTurn', async () => {
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

    it('should call user bet turn when action checkTurn', async () => {
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

    it('should call user bet turn when action betRiver', async () => {
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

    it('should call user bet turn when action checkRiver', async () => {
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

    it('should run correct when payload empty', async () => {
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

  describe('handleGetTicketDetail', () => {
    it('should return run correct when verify false', () => {
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

    it('should log error when have error', () => {
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

    it('should run correctly when verify true', async () => {
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
