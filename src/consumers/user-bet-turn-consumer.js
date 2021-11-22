import BaseActionAfterDealingConsumer from './base-action-after-dealing-consumer';
import MarketManagement from '@nex3/market-management';
import { actions } from '../helpers/constants';

export default class UserBetTurnConsumer extends BaseActionAfterDealingConsumer {
  async composeActionValidationCriteria(player, payload) {
    const marketManagement = MarketManagement.getInstance();
    const configs = await marketManagement.getGameMarketConfig(this.definition.id, player.session);
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
    let amount = betTracks.bets?.ante || 0;
    if (payload.action === actions.checkTurn) {
      amount = 0;
    }
    return super.composeActionValidationCriteria(player, amount, configs.maxBetChoices.turnBet);
  }

  async composeBettingTimeValidationCriteria(player) {
    return super.composeBettingTimeValidationCriteria(player, actions.betTurn);
  }

  async consume(player, payload) {
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
    let amount = betTracks.bets?.ante || 0;
    if (payload.action === actions.checkTurn) {
      amount = 0;
    }

    await super.consume(player, payload, { action: actions.betTurn, amount });
  }
}
