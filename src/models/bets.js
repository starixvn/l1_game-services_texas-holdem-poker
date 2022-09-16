import mongoose from 'mongoose';

const modelName = 'TexasHoldemPoker_cuoc';

const schema = new mongoose.Schema({
  uid: { type: String, required: true },
  name: { type: String, required: true },

  ante: { type: Number, default: 0 },
  anteOdds: { type: Number, default: 0 },

  call: { type: Number, default: 0 },
  callOdds: { type: Number, default: 0 },
  callTime: { type: Date },

  turn: { type: Number, default: 0 },
  turnOdds: { type: Number, default: 0 },
  turnTime: { type: Date },

  river: { type: Number, default: 0 },
  riverOdds: { type: Number, default: 0 },
  riverTime: { type: Date },

  isFold: { type: Boolean, default: false },
  cards: { type: Array, default: [] },

  bet: { type: Number, default: 0 },
  betwin: { type: Number, default: 0 },
  time: { type: Date },
  endTime: { type: Date },
  result: { type: Object },
  settlementResult: { type: Object },

  siteId: { type: String },
  freeBet: { type: Boolean, default: false },
  currency: { type: String, require: true },
  rate: { type: Number, require: true },

  holdTime: { type: Date },
  swapTime: { type: Date },

  operatorId: { type: String, require: true },
  playerId: { type: Number },
  roundId: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
});

const bets = mongoose.model(modelName, schema);

export { bets as TexasHoldemPokerBets };
