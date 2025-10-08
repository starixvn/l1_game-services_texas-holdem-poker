import cron from 'cron';
import moment from 'moment';
import { logger } from 'sc-common';
import appConfigs from '../app-configs';
import { buildDeckOfCards, reGenerateDecks } from '../helpers/deck-helper';
import { Core } from 'sc-game-base';
import { decrypt, decryptObject } from '../helpers/crypto-helper';

export default class GameCron extends Core.Crons.BaseGameCron {
  constructor({
    definition,
    gameData,
    bot,
    settleGameRoundConsumer,
    gameStatusPublisher,
    runningRoundInfoPublisher,
    logService,
    gameConfigsRepository,
    roundsRepository,
    archiveStatusesRepository,
    notificationRepository,
    exchangeRatesRepository,
    currencyGroupGamesRepository,
    partnerConfigRepository,
    currencyGroupRepository,
    currencyRepository,
    betsRepository,
  }) {
    super({
      definition,
      gameData,
      bot,
      settleGameRoundConsumer,
      gameStatusPublisher,
      runningRoundInfoPublisher,
      logService,
      gameConfigsRepository,
      roundsRepository,
      archiveStatusesRepository,
      notificationRepository,
      exchangeRatesRepository,
      currencyGroupGamesRepository,
      partnerConfigRepository,
      currencyGroupRepository,
      currencyRepository,
    });
    this.betsRepository = betsRepository;
  }

  async start() {
    const job = new cron.CronJob(
      '* * * * * *',
      () => this.proceed().catch(logger.logError),
      () => {
        logger.logError(
          `${this.definition.name} unexpectedly stopped because some other tasks halt it.`,
        );
        job.start();
      },
    );

    const lastRound = await this.roundsRepository
      .findOne({}, 'id', { sort: { id: -1 } })
      .lean()
      .exec();

    if (lastRound) {
      this.gameData.roundId = lastRound.id;
    } else {
      this.gameData.roundId = (await this.getLastArchiveRound()) - 1;
    }

    await this.initBetTracks();
    await this.getSettingForNewRound();
    await this.updateExchangeRates();
    job.start();
  }

  async initBetTracks() {
    const runningRounds = await this.roundsRepository.find({ ended: false }).lean().exec();

    await Promise.all(
      runningRounds.map(async (round) => {
        const usedCards = [...round.result.communityCards, ...round.result.dealer];
        const bet = await this.betsRepository.findOne({ roundId: round.id }).lean().exec();

        if (bet) {
          usedCards.push(...bet.cards);
        }

        const generatedResult = decryptObject(round.encryptedResult);
        const { randomMode } = this.gameData.gameConfigs;

        const newPlayer = {
          name: round.name,
          betTracks: {
            roundId: round.id,
            roundStartTime: round.roundStartTime,
            uid: round.uid,
            deck: reGenerateDecks(randomMode, usedCards),
            combinationResult: { player: { ...bet?.result } },
            player: bet?.cards,
            bets: { ante: bet?.ante, call: bet?.call, turn: bet?.turn },
            dealer: [...(round?.result?.dealer || [])],
            communityCards: [...(round?.result?.communityCards ?? [])],
            isSwappedOrHold: round.isSwappedOrHold,
            resultKey: {
              rawValue: decrypt(round.encryptedMd5),
              formatValue: {
                cards: buildDeckOfCards(generatedResult),
                suffix: generatedResult.suffix,
                roundId: round.id,
              },
            },
            generatedResult,
          },
          betQueue: [],
        };

        this.gameData.ingame[round.name] = newPlayer;
      }),
    );
  }

  async proceed() {
    const { durations } = this.definition;

    if (this.gameData.remainingTime === durations.wholeRound) {
      await this.checkGameStatus();
      this.bot && (await this.bot.reset());
    }

    if (!this.gameData.disabled) {
      if (this.gameData.remainingTime % durations.botFrequency === 0) {
        this.bot && (await this.bot.run());
      }
      this.gameData.remainingTime--;
    }

    if (
      this.gameData.remainingTime < 0 ||
      (this.gameData.disabled && this.gameData.remainingTime === durations.wholeRound)
    ) {
      this.gameData.remainingTime = durations.wholeRound;
      const expiredTime = moment.utc().subtract(appConfigs.roundMaxDurationInMinutes, 'minutes');

      if (this.gameData.ingame) {
        await Promise.all(
          Object.values(this.gameData.ingame)
            .filter(
              (userBet) =>
                userBet.betTracks && moment(userBet.betTracks.roundStartTime) < expiredTime,
            )
            .map((userBet) => this.settleGameRoundConsumer.settleRound(userBet.name, false, true)),
        );
      }
    }
  }
}
