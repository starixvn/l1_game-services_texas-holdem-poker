import BaseActionAfterDealingConsumer from './base-action-after-dealing-consumer';
import { actions } from '../helpers/constants';

export default class UserFoldConsumer extends BaseActionAfterDealingConsumer {
  async composeActionValidationCriteria(player, payload) {
    return [];
  }

  async composeBettingTimeValidationCriteria(player) {
    return super.composeBettingTimeValidationCriteria(player, actions.fold);
  }

  async consume(player, payload) {
    await super.consume(player, payload, { action: actions.fold });
  }
}
