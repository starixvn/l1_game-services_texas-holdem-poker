import BaseActionAfterDealingConsumer from './base-action-after-dealing-consumer';
import { actions } from '../helpers/constants';

export default class UserCallConsumer extends BaseActionAfterDealingConsumer {
  async composeActionValidationCriteria(player, payload) {
    const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === player.session.currencyGroupId);
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
    const amount = betTracks.bets?.ante * 2 || 0;
    return super.composeActionValidationCriteria(player, amount,  settings.maxBetPerChoices.callBet);
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
