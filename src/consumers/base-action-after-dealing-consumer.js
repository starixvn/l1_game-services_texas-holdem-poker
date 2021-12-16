import BasePlaceBetConsumer from './base-place-bet-consumer';
import { helpers } from 'sc-common';
import { actions } from '../helpers/constants';

export default class BaseActionAfterDealingConsumer extends BasePlaceBetConsumer {
  async composeActionValidationCriteria(player, amount, maxBetChoice) {
    const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === player.session.currencyGroupId);
    const maxBet = Math.min(player.profile.maxBet, settings.maxBet);

    const formatNumberWithComma = helpers.numberHelper.formatNumberWithComma;
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: { bets: {} } };
    const total = Object.values(betTracks.bets).reduce((sum, item) => sum + item, 0);

    return [
      {
        failure: amount > maxBetChoice,
        notice: this.getNoticeObj(helpers.noticeHelper.maxBetForChoice, { maxBet: formatNumberWithComma(maxBetChoice) })
      },
      {
        failure: amount + total > maxBet,
        notice: this.getNoticeObj(helpers.noticeHelper.maxBet, { maxBet: maxBet })
      },
    ];
  }

  async composeBettingTimeValidationCriteria(player, action) {
    const result = await super.composeBettingTimeValidationCriteria(player);
    const playerData = this.gameData.ingame[player.profile.name];
    if (!playerData) {
      this.logService.logWarning(`player ${player.profile.name} ingame undefined`);

      result.push({
        failure: true,
        notice:this.getNoticeObj(helpers.noticeHelper.invalidBet)
      });
    } else {
      const { betTracks } = playerData;
      result.push(
        {
          failure: !betTracks.roundId,
          notice: translation.t(translation.keys.cannotProcessBet),
        },
        {
          failure: !!betTracks?.isDealing,
          notice:this.getNoticeObj(helpers.noticeHelper.invalidBet)
        },
      );
      switch (action) {
        case actions.call:
        case actions.fold:
          result.push({
            failure: betTracks.communityCards.length !== 0,
            notice:this.getNoticeObj(helpers.noticeHelper.invalidBet)
          });
          break;
        case actions.betTurn:
          result.push({
            failure: betTracks.communityCards.length !== 3,
            notice:this.getNoticeObj(helpers.noticeHelper.invalidBet)
          });
          break;
        case actions.betRiver:
          result.push({
            failure: betTracks.communityCards.length !== 4,
            notice:this.getNoticeObj(helpers.noticeHelper.invalidBet)
          });
      }
    }

    return result;
  }
}
