import mongoose from 'mongoose';

const modelName = 'TexasHoldemPoker_phien';

const Schema = new mongoose.Schema({
  id: { type: Number, default: 0 },
  result: { type: Object },
  settlementResult: { type: Object },
  roundStartTime: { type: Date },
  time: { type: Date },
  ended: { type: Boolean, default: false },
  uid: { type: String, required: true },
  name: { type: String, required: true },
  odds: { type: Object },
  exchangeRateId: { type: Number, required: true },
  md5: { type: String, required: true },
  encryptedMd5: { type: Object, required: true },
  encryptedResult: { type: Object },
  isSwappedOrHold: { type: Boolean, default: false },
});

export default mongoose.model(modelName, Schema);
