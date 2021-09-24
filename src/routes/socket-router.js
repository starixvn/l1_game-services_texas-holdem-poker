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
    settleGameRoundConsumer,
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
    this.settleGameRoundConsumer = settleGameRoundConsumer;
  }

  init(socketClient) {
    super.init(socketClient);

    this.socketClient.on('getTicketDetail', this.handleGetTicketDetail.bind(this));
  }

  handlePlaceBet(payload) {
    try {
      if (!this.verify()) {
        return;
      }
      if (payload.action) {
        switch (payload.action) {
          case actions.deal:
            this.userDealConsumer.consume(this.gameData.realPlayers[this.socketClient.id], payload);
            break;
          case actions.fold:
            this.userFoldConsumer.consume(this.gameData.realPlayers[this.socketClient.id], payload);
            break;
          case actions.call:
          case actions.doubleCall:
            this.userCallConsumer.consume(this.gameData.realPlayers[this.socketClient.id], payload);
            break;
          case actions.checkTurn:
          case actions.betTurn:
            this.userBetTurnConsumer.consume(
              this.gameData.realPlayers[this.socketClient.id],
              payload,
            );
            break;
          case actions.checkRiver:
          case actions.betRiver:
            this.userBetRiverConsumer.consume(
              this.gameData.realPlayers[this.socketClient.id],
              payload,
            );
            break;
          case 'settle':
            this.settleGameRoundConsumer.settleRound(
              this.gameData.realPlayers[this.socketClient.id].profile.name,
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
