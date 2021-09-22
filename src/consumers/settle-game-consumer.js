import { Core } from 'sc-game-base';
import { gameNotifications } from 'sc-base-database';

export default class SettleGameConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
  constructor({
    definition,
    gameData,
    roundResultPublisher,
    userBetResultPublisher,
    endGame,
    roundsRepository,
    betsRepository,
    publisher,
  }) {
    super({
      definition,
      gameData,
      roundResultPublisher,
      userBetResultPublisher,
      endGame,
      roundsRepository,
      betsRepository,
    });

    this.publisher = publisher;
  }

  async settleRound(playerName, isFold = false) {
    const { betTracks } = this.gameData.ingame[playerName];
    const result = { dealer: betTracks.dealer, communityCards: betTracks.communityCards };
    const settlementResult = betTracks.combinationResult.dealer;

    const round = await this.roundsRepository
      .findOneAndUpdate(
        { id: betTracks.roundId },
        { result, settlementResult, time: new Date(), ended: true },
      )
      .lean()
      .exec();
    const finish = {
      roundId: betTracks.roundId,
      odds: round.odds,
      time: new Date(),
    };

    // await this.settleBets({ ...finish, playerName, playerUID: betTracks.uid }, isFold);

    // this.publisher.publishToUser(playerUID, {
    //   finish: {
    //     settlementResult: {},
    //   },
    // });
    await gameNotifications.deleteOne({ uid: betTracks.uid, gameId: this.definition.id });
  }
}
