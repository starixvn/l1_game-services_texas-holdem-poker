import { generateDecks, deal } from '../../src/helpers/deck-helper';

import {
  generateResult,
  getCombinationResult,
  compareCombination,
} from '../../src/helpers/result-helper';

const streakNumber = 4;
const longestStreak = 4;
function initStreaks() {
  return {
    total: 0,
    dealer: { count: 0, ratio: 0 },
    player: { count: 0, ratio: 0 },
    tie: { count: 0, ratio: 0 },
  };
}

function settleWin({ winName, loseNames }, occurrences, streaks, totalRounds) {
  occurrences[winName].count++;
  loseNames.forEach((n) => {
    occurrences[n].count = 0;
    occurrences[n].ratio = 0;
  });

  if (occurrences[winName].count >= streakNumber) {
    streaks.total++;
    streaks[winName].count++;
    streaks[winName].ratio = streaks[winName].count / totalRounds;
  }

  if (occurrences[winName].count >= longestStreak) {
    occurrences[winName].count = 0;
    occurrences[winName].ratio = 0;
  }
}

function run(randomMode) {
  const totalRounds = 100_000;
  const stats = { dealer: {}, player: {} };
  for (let i = 1; i < 11; i++) {
    stats.dealer[i] = { id: i, count: 0, ratio: 0 };
    stats.player[i] = { id: i, count: 0, ratio: 0 };
  }

  const streaks = initStreaks();
  const occurrences = initStreaks();

  for (let index = 0; index < totalRounds; index++) {
    const betTracks = { deck: generateDecks(randomMode, []), player: [], dealer: [] };
    deal(betTracks);

    const communityCards = [];
    const communityCardsGenerated = generateResult(communityCards, betTracks.deck);

    const dealer = getCombinationResult([...betTracks.dealer, ...communityCardsGenerated]);
    const player = getCombinationResult([...betTracks.player, ...communityCardsGenerated]);
    const settleResult = compareCombination(dealer, player);

    stats.dealer[dealer.id].count++;
    stats.dealer[dealer.id].ratio = stats.dealer[dealer.id].count / totalRounds;
    stats.player[player.id].count++;
    stats.player[player.id].ratio = stats.player[player.id].count / totalRounds;

    switch (settleResult) {
      case 1:
        settleWin(
          { winName: 'dealer', loseNames: ['player', 'tie'] },
          occurrences,
          streaks,
          totalRounds,
        );
        break;
      case -1:
        settleWin(
          { winName: 'player', loseNames: ['dealer', 'tie'] },
          occurrences,
          streaks,
          totalRounds,
        );
        break;
      default:
        settleWin(
          { winName: 'tie', loseNames: ['dealer', 'player'] },
          occurrences,
          streaks,
          totalRounds,
        );
        break;
    }
  }

  stats.streaks = streaks;

  console.log(`======== Run ${totalRounds} rounds for mode ${randomMode} ========`);
  console.log(stats);
}

const randomModes = [1, 2, 3];
const runNo = 3;

for (let randomMode of randomModes) {
  for (let i = 0; i < runNo; i++) {
    run(randomMode);
  }
}
