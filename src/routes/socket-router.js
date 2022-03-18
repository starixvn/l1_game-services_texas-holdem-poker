import { BaseSocketRouter } from 'sc-game-base/src/core/routers';
import { actions } from '../helpers/constants';

export default class SocketRouter extends BaseSocketRouter {
  constructor({
    definition,
    gameData,
    userSignInConsumer,
    inGameConsumer,
    placeBetConsumer,
    userDisconnectConsumer,
    userSignInPublisher,
    historyQuery,
    logService,
    playGamePermissionValidator,
    getGameConfigsConsumer,
    userDealConsumer = null,
    userCallConsumer = null,
    userFoldConsumer = null,
    userBetTurnConsumer = null,
    userBetRiverConsumer = null,
    userHoldOrSwapConsumer = null,
  }) {
    super({
      definition,
      gameData,
      userSignInConsumer,
      inGameConsumer,
      placeBetConsumer,
      userDisconnectConsumer,
      userSignInPublisher,
      historyQuery,
      logService,
      playGamePermissionValidator,
    });

    this.getGameConfigsConsumer = getGameConfigsConsumer;
    this.userDealConsumer = userDealConsumer;
    this.userCallConsumer = userCallConsumer;
    this.userFoldConsumer = userFoldConsumer;
    this.userBetTurnConsumer = userBetTurnConsumer;
    this.userBetRiverConsumer = userBetRiverConsumer;
    this.userHoldOrSwapConsumer = userHoldOrSwapConsumer;
  }

  init(socketClient) {
    super.init(socketClient);

    this.socketClient.on('getTicketDetail', this.handleGetTicketDetail.bind(this));
    this.socketClient.on('getGameConfigs', this.handleGetGameConfigs.bind(this));
  }

  async handlePlaceBet(payload) {
    try {
      if (!this.verify()) {
        return;
      }
      if (payload.action) {
        switch (payload.action) {
          case actions.deal:
            await this.userDealConsumer.consume(
              this.gameData.realPlayers[this.socketClient.id],
              payload,
            );
            break;
          case actions.fold:
            await this.userFoldConsumer.consume(
              this.gameData.realPlayers[this.socketClient.id],
              payload,
            );
            break;
          case actions.doubleCall:
            await this.userCallConsumer.consume(
              this.gameData.realPlayers[this.socketClient.id],
              payload,
            );
            break;
          case actions.checkTurn:
          case actions.betTurn:
            await this.userBetTurnConsumer.consume(
              this.gameData.realPlayers[this.socketClient.id],
              payload,
            );
            break;
          case actions.checkRiver:
          case actions.betRiver:
            await this.userBetRiverConsumer.consume(
              this.gameData.realPlayers[this.socketClient.id],
              payload,
            );
            break;
          case actions.hold:
          case actions.swap:
            await this.userHoldOrSwapConsumer.consume(
              this.gameData.realPlayers[this.socketClient.id],
              payload,
            );
            break;
        }
      }
    } catch (error) {
      this.logService.logError(error);
    }
  }

  async handleGetTicketDetail(payload) {
    try {
      if (!this.verify()) {
        return;
      }

      const ticketDetail = await this.historyQuery.queryTicketDetail(
        this.gameData.realPlayers[this.socketClient.id],
        payload.roundId,
      );

      this.socketClient.emit(this.definition.name, ticketDetail);
    } catch (error) {
      this.logService.logError(error);
    }
  }

  async handleGetGameConfigs() {
    try {
      await this.getGameConfigsConsumer.consume(this.gameData.realPlayers[this.socketClient.id]);
    } catch (error) {
      this.logService.logError(error);
    }
  }
}
