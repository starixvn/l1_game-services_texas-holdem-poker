import BaseActionAfterDealingConsumer from './base-action-after-dealing-consumer';
import { actions } from '../helpers/constants';
import { helpers } from 'sc-common';

export default class UserHoldOrSwapConsumer extends BaseActionAfterDealingConsumer {
  async composeActionValidationCriteria(player) {
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };

    return [
      {
        failure: !betTracks.canSwap,
        notice: helpers.noticeHelper.invalidBet,
      },
    ];
  }

  async composeBettingTimeValidationCriteria(player) {
    return super.composeBettingTimeValidationCriteria(player, actions.fold);
  }

  async consume(player, payload) {
    await super.consume(player, payload, { action: payload.action });
  }
}
