import BasePlaceBetConsumer from '../base-place-bet-consumer';
import BaseActionAfterDealingConsumer from '../base-action-after-dealing-consumer';
import UserCallConsumer from '../user-call-consumer';
import { actions } from '../../helpers/constants';
import MarketManagement from '@nex3/market-management';

jest.mock('@nex3/market-management');

describe('UserCallConsumer test', () => {
  it('inherit BaseActionAfterDealingConsumer', () => {
    // Act
    const consumer = new UserCallConsumer();

    // Assert
    expect(consumer instanceof BaseActionAfterDealingConsumer);
  });

  describe('composeActionValidationCriteria', () => {
    const definition = { id: 1 };
    const player = { profile: { name: 'a' } };
    const configs = { maxBetChoices: { callBet: 100 } };
    beforeAll(() => {
      MarketManagement.getInstance = jest
        .fn()
        .mockReturnValue({ getGameMarketConfig: jest.fn().mockReturnValue(configs) });
      BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria = jest.fn();
    });
    it('should run expected when betTracks empty and action is call', async () => {
      // Arrange
      const gameData = { ingame: {} };
      const consumer = new UserCallConsumer(definition, gameData);
      const payload = { action: actions.call };
      const expected = [];
      BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria.mockReturnValue(
        expected,
      );

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, 0, configs.maxBetChoices.callBet);
      expect(actual).toStrictEqual(expected);
    });

    it('should run expected when action is call and ante has value', async () => {
      // Arrange
      const bets = { ante: 10 };
      const gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
      const consumer = new UserCallConsumer(definition, gameData);
      const payload = { action: actions.call };
      const expected = [];
      BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria.mockReturnValue(
        expected,
      );

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, bets.ante, configs.maxBetChoices.callBet);
      expect(actual).toStrictEqual(expected);
    });

    it('should run expected when action is doubleCall and ante has value', async () => {
      // Arrange
      const bets = { ante: 10 };
      const gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
      const consumer = new UserCallConsumer(definition, gameData);
      const payload = { action: actions.doubleCall };
      const expected = [];
      BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria.mockReturnValue(
        expected,
      );

      // Act
      const actual = await consumer.composeActionValidationCriteria(player, payload);

      // Assert
      expect(
        BaseActionAfterDealingConsumer.prototype.composeActionValidationCriteria,
      ).toHaveBeenCalledWith(player, 20, configs.maxBetChoices.callBet);
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('composeBettingTimeValidationCriteria', () => {
    it('should run correctly', async () => {
      // Arrange
      const consumer = new UserCallConsumer();
      const player = { UID: 1 };
      const expected = [
        {
          failure: false,
          notice: 'cannotProcessBet',
        },
      ];
      BaseActionAfterDealingConsumer.prototype.composeBettingTimeValidationCriteria = jest
        .fn(player, actions.call)
        .mockReturnValue(expected);

      // Act
      const actual = await consumer.composeBettingTimeValidationCriteria(player, {});

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('consume', () => {
    const player = { UID: 1, profile: { name: 'a' } };
    beforeAll(() => {
      BasePlaceBetConsumer.prototype.consume = jest.fn();
    });
    it('should run correctly when action is call and betTracks empty', async () => {
      // Arrange
      const consumer = new UserCallConsumer();
      consumer.gameData = { ingame: {} };
      const payload = { action: actions.call };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.call,
        amount: 0,
      });
    });

    it('should run correctly when action is call and bet ante has value', async () => {
      // Arrange
      const consumer = new UserCallConsumer();
      const bets = { ante: 10 };
      consumer.gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
      const payload = { action: actions.call };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.call,
        amount: bets.ante,
      });
    });

    it('should run correctly when action is doubleCall and bet ante has value', async () => {
      // Arrange
      const consumer = new UserCallConsumer();
      const bets = { ante: 10 };
      consumer.gameData = { ingame: { [player.profile.name]: { betTracks: { bets } } } };
      const payload = { action: actions.doubleCall };

      // Act
      await consumer.consume(player, payload);

      // Assert
      expect(BasePlaceBetConsumer.prototype.consume).toHaveBeenCalledWith(player, payload, {
        action: actions.call,
        amount: 20,
      });
    });
  });
});
