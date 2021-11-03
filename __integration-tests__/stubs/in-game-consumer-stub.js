import { InGameConsumer as BaseInGameConsumer } from '../../src/consumers';

export default class InGameConsumer extends BaseInGameConsumer {
  async getUserInfo(uid) {
    return await this.userInfosRepository
      .findOne(
        { id: uid },
        {
          _id: false,
          UID: true,
          name: true,
          avatarId: true,
          red: true,
          scoins: true,
          joinedOn: true,
          security: true,
          currency: true,
          type: true,
        },
      )
      .lean()
      .exec();
  }
}
