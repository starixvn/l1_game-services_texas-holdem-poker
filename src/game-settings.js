export default {
  id: 42,
  name: 'TexasHoldemPoker',
  durations: {
    wholeRound: 60,
    botFrequency: 60,
  },
  choices: {
    ante: 'ante',
    call: 'call',
    turn: 'turn',
    river: 'river',
  },
  choicesMapper: { deal: 1, call: 2, turn: 3, river: 4 },
};
