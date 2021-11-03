import awilix from 'awilix';
import { Table } from 'sc-game-base';

import { GetGameConfigsConsumer, ChangeLanguageConsumer } from '@nex3/nex3-game-base/consumers';
import {
  UserDealConsumer,
  UserCallConsumer,
  UserFoldConsumer,
  UserBetTurnConsumer,
  UserBetRiverConsumer,
  SettleGameConsumer,
  UserDisconnectConsumer,
} from '../../src/consumers';
import { GameCron, ProcessBetQueue, Bot } from '../../src/crons';
import { SocketRouter, HttpRouter } from '../../src/routes';
import { TexasHoldemPokerBets, TexasHoldemPokerRounds } from '../../src/models';
import HistoryQuery from '../../src/query-apis/history-query';
import {
  placeBet,
  getBalance,
  endGame,
} from '@nex3/game-service-integration/src/stubs/api-client-stub';
import UserSignInConsumer from '@nex3/game-service-integration/src/stubs/user-sign-in-by-pass-authentication-consumer';
import InGameConsumer from '../stubs/in-game-consumer-stub';

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
      userSignInConsumer: asClass(UserSignInConsumer).singleton(),
      changeLanguageConsumer: asClass(ChangeLanguageConsumer).singleton(),
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
      endGame: asValue(endGame),
      getBalance: asValue(getBalance),
      placeBet: asValue(placeBet),
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
