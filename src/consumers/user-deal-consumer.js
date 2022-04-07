import BasePlaceBetConsumer from './base-place-bet-consumer';
import { helpers } from 'sc-common';
import { actions } from '../helpers/constants';

export default class UserDealConsumer extends BasePlaceBetConsumer {
  async composeActionValidationCriteria(player, payload) {
    const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === player.session.currencyGroupId);
    const minBet = Math.max(player.profile.minBet, settings.minBet);
    const maxBet = Math.min(player.profile.maxBet, settings.maxBet);
    const amountAnte = payload.anteBet;
    const formatNumberWithComma = helpers.numberHelper.formatNumberWithComma;

    return [
      {
        failure: amountAnte > settings.maxBetPerChoices.anteBet,
        notice: this.getNoticeObj(helpers.noticeHelper.maxBetForChoice, { maxBet: formatNumberWithComma(settings.maxBetPerChoices.anteBet) }),
      },
      {
        failure: amountAnte < minBet,
        notice: this.getNoticeObj(helpers.noticeHelper.minBet, { minBet: formatNumberWithComma(minBet)}),
      },
      {
        failure: amountAnte > maxBet,
        notice: this.getNoticeObj(helpers.noticeHelper.maxBet, { maxBet: formatNumberWithComma(maxBet) }),
      },
    ];
  }

  async composeBettingTimeValidationCriteria(player) {
    const result = await super.composeBettingTimeValidationCriteria(player);
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
    result.push({
      failure: !!betTracks.roundId,
      notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
    });
    result.push({
      failure: !!betTracks?.isDealing,
      notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
    });

    return result;
  }

  async consume(player, payload) {
    Object.assign(payload, {
      anteBet: payload.anteBet >> 0,
    });

    await super.consume(player, payload, {
      action: actions.deal,
      amount: payload.anteBet,
    });
  }
}
