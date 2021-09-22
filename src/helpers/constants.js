export const ranks = {
  royalFlush: 10,
  straightFlush: 9,
  fourKind: 8,
  fullHouse: 7,
  flush: 6,
  straight: 5,
  threeKind: 4,
  twoPairs: 3,
  onePair: 2,
  highCards: 1,
};

// export const steps = { deal: 1, call: 2, turn: 3, river: 4 };

export const actions = {
  deal: 'deal',
  call: 'call',
  doubleCall: 'doubleCall',
  fold: 'fold',
  betTurn: 'betTurn',
  checkTurn: 'checkTurn',
  betRiver: 'betRiver',
  checkRiver: 'checkRiver',
};