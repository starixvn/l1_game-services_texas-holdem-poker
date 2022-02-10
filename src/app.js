import { Core, Table } from 'sc-game-base';
import appConfigs from "./app-configs";
import gameSettings from './game-settings';
import ContainerRegistry from './container-registry';
import { generateResult, getCombinationResult } from './helpers/result-helper';

const run = async () => {
  const definition = new Core.GameDefinition(gameSettings, generateResult, getCombinationResult);
  const gameData = new Table.TableGameData(gameSettings.durations.wholeRound);
  const container = new ContainerRegistry().register(appConfigs, definition, gameData);

  const app = new Core.BaseGameApp("Texas Holdem Poker", appConfigs);
  await app.run();
  app.startGame(container);
};


run();
