import { middlewares } from 'sc-common';
import mongoose from 'mongoose';
import configs from '../../src/configs/configs.IGT.json';
import createdGameConfig from '@nex3/game-service-integration/src/stubs/game-config-stubs';
import createDummyUser from '@nex3/game-service-integration/src/stubs/user-stubs';
import createGameMarket from '@nex3/game-service-integration/src/stubs/game-market-stubs';
import { user, gameConfig, marketConfig, gameMarketConfig, round } from './test-data';
import { TexasHoldemPokerRounds } from '../../src/models';

const connectDatabase = async () => {
  await middlewares.database.configureDatabase(mongoose, configs.database);
  await clearAllData();
};

const clearAllData = async () => {
  const collections = await mongoose.connection.db.collections();

  for (let collection of collections) {
    await collection.remove();
  }
};

const createRound = async () => {
  await TexasHoldemPokerRounds.findOneAndUpdate({ id: round.id }, round, {
    new: true,
    upsert: true,
  });
};

const createTestData = async () => {
  await connectDatabase();
  await createdGameConfig(gameConfig);
  await createDummyUser(user.id, user.name, user.currency);
  await createGameMarket(marketConfig, gameMarketConfig);
  await createRound();

  console.log('Create game config & dummy user for testing successfully!');

  process.exit(0);
};

createTestData();
