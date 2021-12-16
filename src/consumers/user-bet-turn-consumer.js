import BaseActionAfterDealingConsumer from './base-action-after-dealing-consumer';
import { actions } from '../helpers/constants';

export default class UserBetTurnConsumer extends BaseActionAfterDealingConsumer {
  async composeActionValidationCriteria(player, payload) {
    const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === player.session.currencyGroupId);
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
    let amount = betTracks.bets?.ante || 0;
    if (payload.action === actions.checkTurn) {
      amount = 0;
    }
    return super.composeActionValidationCriteria(player, amount, settings.maxBetPerChoices.turnBet);
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
