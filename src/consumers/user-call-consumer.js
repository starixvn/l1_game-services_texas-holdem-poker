import BaseActionAfterDealingConsumer from './base-action-after-dealing-consumer';
import MarketManagement from '@nex3/market-management';
import { actions } from '../helpers/constants';

export default class UserCallConsumer extends BaseActionAfterDealingConsumer {
  async composeActionValidationCriteria(player, payload) {
    const marketManagement = MarketManagement.getInstance();
    const configs = await marketManagement.getGameMarketConfig(
      this.definition.id,
      player.session?.currency,
      player.session?.language,
    );
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
    const amount = betTracks.bets?.ante * 2 || 0;
    return super.composeActionValidationCriteria(player, amount, configs.maxBetChoices.callBet);
  }

  async composeBettingTimeValidationCriteria(player) {
    return super.composeBettingTimeValidationCriteria(player, actions.call);
  }

  async consume(player, payload) {
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
    const amount = betTracks.bets?.ante * 2 || 0;
    await super.consume(player, payload, { action: actions.call, amount });
  }
}
