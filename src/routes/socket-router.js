import { TableSocketRouter } from '@nex3/nex3-game-base/routes';
import { actions } from '../helpers/constants';

export default class SocketRouter extends TableSocketRouter {
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
    changeLanguageConsumer,
    getGameConfigsConsumer,
    userDealConsumer = null,
    userCallConsumer = null,
    userFoldConsumer = null,
    userBetTurnConsumer = null,
    userBetRiverConsumer = null,
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
      changeLanguageConsumer,
      getGameConfigsConsumer,
    });

    this.userDealConsumer = userDealConsumer;
    this.userCallConsumer = userCallConsumer;
    this.userFoldConsumer = userFoldConsumer;
    this.userBetTurnConsumer = userBetTurnConsumer;
    this.userBetRiverConsumer = userBetRiverConsumer;
  }

  init(socketClient) {
    super.init(socketClient);

    this.socketClient.on('getTicketDetail', this.handleGetTicketDetail.bind(this));
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
          case actions.call:
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
}
