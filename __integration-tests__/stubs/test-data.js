const game = {
  id: 42,
  name: 'texasholdempoker',
};

const user = {
  id: 1,
  name: 'UserTest',
  currency: 'UUS',
};

const userSession = {
  session: '1-session-id',
  ss: '1-session-id',
  currency: user.currency,
  username: `${user.id}_${user.name}`,
};

const socketOptions = {
  socketUri: 'http://127.0.0.1:5001/user/texasholdempoker',
  gameName: game.name,
  proxyRoute: '/socket.io',
};

const gameConfig = {
  name: 'texasholdempoker',
  enabled: true,
  minbet: 10,
  maxbet: 10000,
  choices_maxbet: {
    anteBet: 1000,
    callBet: 2000,
    turnBet: 1000,
    riverBet: 1000,
  },
  odds: {
    AnteBet_highCard: 2,
    AnteBet_onePair: 2,
    AnteBet_twoPairs: 2,
    AnteBet_threeKind: 2,
    AnteBet_straight: 2,
    AnteBet_flush: 2,
    AnteBet_fullHouse: 2,
    AnteBet_fourKind: 2,
    AnteBet_straightFlush: 2,
    AnteBet_royalFlush: 2,
    call: 2,
    turn: 2,
    river: 2,
  },
  disabled_message: 'disabled message',
};

const marketConfig = {
  currencies: [user.currency],
  marketName: 'DefaultMarket',
  enabled: true,
  defaultChipId: 1,
  rate: 1,
  isBase: true,
};

const gameMarketConfig = {
  gameId: game.id,
  gameName: game.name,
  markets: [
    {
      enabled: true,
      minBet: 10,
      maxBet: 200000,
      maxBetChoices: [
        { name: 'anteBet', maxBet: 10000 },
        { name: 'callBet', maxBet: 20000 },
        { name: 'turnBet', maxBet: 10000 },
        { name: 'riverBet', maxBet: 10000 },
      ],
    },
  ],
};

const round = {
  id: 2,
  ended: true,
  roundStartTime: new Date(2021, 9, 29),
  uid: user.id,
  name: user.name,
  odds: gameConfig.odds,
  result: {
    dealer: [
      { rank: 8, suit: 0 },
      { rank: 10, suit: 1 },
    ],
    communityCards: [],
  },
  settlementResult: null,
};

export {
  game,
  user,
  userSession,
  socketOptions,
  gameConfig,
  marketConfig,
  gameMarketConfig,
  round,
};
