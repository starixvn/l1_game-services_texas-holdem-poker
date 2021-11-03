import { Core, Table } from 'sc-game-base';
import appConfigs from '../../src/configs/configs.IGT.json';
import gameSettings from '../../src/game-settings';
import ContainerRegistry from './game-service-container-registry';
import GameStartup from '../../src/game-startup';
import MarketManagement from '@nex3/market-management';

const run = async () => {
  const definition = new Core.GameDefinition(gameSettings);
  const gameData = new Table.TableGameData(gameSettings.durations.wholeRound);
  const container = new ContainerRegistry().register(appConfigs, definition, gameData);
  const startup = new GameStartup(container);
  const app = new Core.BaseGameApp(container, startup);

  MarketManagement.init(appConfigs.marketConfigCacheTimeout);

  await app.run();
};

run();
