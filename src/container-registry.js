import awilix from 'awilix';
import { Table } from 'sc-game-base';

import {
  InGameConsumer,
  UserDealConsumer,
  UserCallConsumer,
  UserFoldConsumer,
  UserBetTurnConsumer,
  UserBetRiverConsumer,
  SettleGameConsumer,
  UserDisconnectConsumer,
  GetGameConfigsConsumer,
} from './consumers';
import { GameCron, ProcessBetQueue, Bot } from './crons';
import { SocketRouter, HttpRouter } from './routes';
import HistoryQuery from './query-apis/history-query';
import { TexasHoldemPokerBets, TexasHoldemPokerRounds } from './models';

const { asClass, asValue } = awilix;

export default class ContainerRegistry extends Table.TableContainerRegistry {
  registerModels() {
    super.registerModels();

    this.container.register({
      roundsRepository: asValue(TexasHoldemPokerRounds),
      betsRepository: asValue(TexasHoldemPokerBets),
    });
  }

  registerCrons() {
    super.registerCrons();

    this.container.register({
      bot: asClass(Bot).singleton(),
      gameCron: asClass(GameCron).singleton().proxy(),
      processBetQueue: asClass(ProcessBetQueue).singleton().proxy(),
    });
  }

  registerConsumers() {
    super.registerConsumers();

    this.container.register({
      inGameConsumer: asClass(InGameConsumer).singleton(),
      settleGameRoundConsumer: asClass(SettleGameConsumer).singleton().proxy(),
      getGameConfigsConsumer: asClass(GetGameConfigsConsumer).singleton().proxy(),
      userDealConsumer: asClass(UserDealConsumer).singleton(),
      userCallConsumer: asClass(UserCallConsumer).singleton(),
      userFoldConsumer: asClass(UserFoldConsumer).singleton(),
      userBetTurnConsumer: asClass(UserBetTurnConsumer).singleton(),
      userBetRiverConsumer: asClass(UserBetRiverConsumer).singleton(),
      userDisconnectConsumer: asClass(UserDisconnectConsumer).singleton(),
    });
  }

  registerApis() {
    super.registerApis();

    this.container.register({
      historyQuery: asClass(HistoryQuery).singleton(),
    });
  }

  registerRouters() {
    super.registerRouters();

    this.container.register({
      socketRouter: asClass(SocketRouter).proxy(),
      httpRouter: asClass(HttpRouter),
    });
  }
}
