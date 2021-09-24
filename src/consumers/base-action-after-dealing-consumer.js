import BasePlaceBetConsumer from './base-place-bet-consumer';
import { helpers } from 'sc-common';
import { loadLanguage } from '../resources/translation/languages';
import Translation from '@nex3/translation';
import MarketManagement from '@nex3/market-management';
import { actions } from '../helpers/constants';

export default class BaseActionAfterDealingConsumer extends BasePlaceBetConsumer {
  async composeActionValidationCriteria(player, amount, maxBetChoice) {
    const marketManagement = MarketManagement.getInstance();
    const configs = await marketManagement.getGameMarketConfig(
      this.definition.id,
      player.session?.currency,
      player.session?.language,
    );
    const resource = await loadLanguage(player?.session?.language);
    const translation = Translation.getInstance(player?.session?.language, resource);
    const formatNumberWithComma = helpers.numberHelper.formatNumberWithComma;
    const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: { bets: {} } };
    const total = Object.values(betTracks.bets).reduce((total, item) => total + item, 0);

    return [
      {
        failure: amount > maxBetChoice,
        notice: translation.t(translation.keys.maxBetChoice, {
          max: formatNumberWithComma(maxBetChoice),
        }),
      },
      {
        failure: amount + total > configs.maxBet,
        notice: translation.t(translation.keys.maxBet, {
          max: formatNumberWithComma(configs.maxBet),
        }),
      },
    ];
  }

  async composeBettingTimeValidationCriteria(player, action) {
    const result = await super.composeBettingTimeValidationCriteria(player);
    const translation = Translation.getInstance(player?.session?.language);
    const playerData = this.gameData.ingame[player.profile.name];
    if (!playerData) {
      this.logService.logWarning(`player ${player.profile.name} ingame undefined`);

      result.push({
        failure: true,
        notice: translation.t(translation.keys.cannotProcessBet),
      });
    } else {
      const { betTracks } = playerData;
      result.push({
        failure: !betTracks.roundId,
        notice: translation.t(translation.keys.cannotProcessBet),
      });
      switch (action) {
        case actions.call:
        case actions.fold:
          result.push({
            failure: betTracks.communityCards.length !== 0,
            notice: translation.t(translation.keys.cannotProcessBet),
          });
          break;
        case actions.betTurn:
          result.push({
            failure: betTracks.communityCards.length !== 3,
            notice: translation.t(translation.keys.cannotProcessBet),
          });
          break;
        case actions.betRiver:
          result.push({
            failure: betTracks.communityCards.length !== 4,
            notice: translation.t(translation.keys.cannotProcessBet),
          });
      }
    }

    return result;
  }
}
