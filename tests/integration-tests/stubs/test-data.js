const game = {
    id: 42,
    name: 'TexasHoldemPoker',
};
const currencyData = { code: "USD", name: "$US" };

const socketOptions = {
    socketUri: "http://127.0.0.1:8037/user/texasholdempoker",
    gameName: game.name,
    proxyRoute: "/socket.io",
};

const gameConfig = {
    type: 0,
    name: "texasholdempoker",
    minBet: 1,
    maxBet: 3000,
    maxBetPerChoices: {
        "anteBet": 3000,
        "callBet": 3000,
        "turnBet": 3000,
        "riverBet": 3000
      },
    odds: {
        "call": 2,
        "turn": 2,
        "river": 2,
        "AnteBet_highCard": 3,
        "AnteBet_onePair": 2,
        "AnteBet_twoPairs": 2,
        "AnteBet_threeKind": 2,
        "AnteBet_straight": 2,
        "AnteBet_flush": 2,
        "AnteBet_fullHouse": 2,
        "AnteBet_fourKind": 0,
        "AnteBet_straightFlush": 0,
        "AnteBet_royalFlush": 2
      }
};

const rounds = [
    {"id":2,"ended":true,"communityCardsGenerated":[{"rank":2,"suit":2},{"rank":7,"suit":2},{"rank":12,"suit":2},{"rank":8,"suit":1},{"rank":5,"suit":0}],"result":{"dealer":[{"rank":11,"suit":1},{"rank":4,"suit":2}],"communityCards":[{"rank":2,"suit":2},{"rank":7,"suit":2},{"rank":12,"suit":2},{"rank":8,"suit":1},{"rank":5,"suit":0}]},"uid":"61b872253d1ef13ff8368d76","name":"Vision44859","odds":{"call":2,"turn":2,"river":2,"AnteBet_highCard":3,"AnteBet_onePair":2,"AnteBet_twoPairs":2,"AnteBet_threeKind":2,"AnteBet_straight":2,"AnteBet_flush":2,"AnteBet_fullHouse":2,"AnteBet_fourKind":0,"AnteBet_straightFlush":0,"AnteBet_royalFlush":2},"md5":"bb135ddecd783e45559818ca02aa6c42","resultKey":"[{\"rank\":6,\"suit\":1},{\"rank\":12,\"suit\":0},{\"rank\":11,\"suit\":1},{\"rank\":4,\"suit\":2},{\"rank\":2,\"suit\":2},{\"rank\":7,\"suit\":2},{\"rank\":12,\"suit\":2},{\"rank\":8,\"suit\":1},{\"rank\":5,\"suit\":0}]964af3729c077874e88d14","__v":0,"settlementResult":{"id":1,"combinationCards":[{"rank":12,"suit":2}],"cards":[{"rank":12,"suit":2},{"rank":11,"suit":1},{"rank":8,"suit":1},{"rank":7,"suit":2},{"rank":5,"suit":0}]}},
    {"id":3,"ended":true,"communityCardsGenerated":[{"rank":1,"suit":2},{"rank":2,"suit":1},{"rank":8,"suit":1},{"rank":9,"suit":1},{"rank":6,"suit":3}],"result":{"dealer":[{"rank":5,"suit":2},{"rank":0,"suit":2}],"communityCards":[]},"uid":"61b872253d1ef13ff8368d76","name":"Vision44859","odds":{"call":2,"turn":2,"river":2,"AnteBet_highCard":3,"AnteBet_onePair":2,"AnteBet_twoPairs":2,"AnteBet_threeKind":2,"AnteBet_straight":2,"AnteBet_flush":2,"AnteBet_fullHouse":2,"AnteBet_fourKind":0,"AnteBet_straightFlush":0,"AnteBet_royalFlush":2},"md5":"ef73b79208dec6d17e79a46d49a2ea5a","resultKey":"[{\"rank\":7,\"suit\":3},{\"rank\":0,\"suit\":1},{\"rank\":5,\"suit\":2},{\"rank\":0,\"suit\":2},{\"rank\":1,\"suit\":2},{\"rank\":2,\"suit\":1},{\"rank\":8,\"suit\":1},{\"rank\":9,\"suit\":1},{\"rank\":6,\"suit\":3}]a3e6f0152c49dab132bd75"}
];

export { game, currencyData, socketOptions, gameConfig, rounds };
