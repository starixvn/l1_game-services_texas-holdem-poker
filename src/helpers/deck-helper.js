import Chance from 'chance';
import _ from 'lodash';
import { shuffle as d3Shuffle } from 'd3-array';
import { Random as RandomJS, MersenneTwister19937 } from 'random-js';
import { cards } from './card';

const random1 = (arr) => {
  const chance = new Chance();
  return chance.shuffle(chance.shuffle(chance.shuffle(arr)));
};

const random2 = (arr) => {
  return d3Shuffle(d3Shuffle(d3Shuffle(arr)));
};

const random3 = (arr) => {
  let result = arr;
  const r = new RandomJS(MersenneTwister19937.autoSeed());

  for (let i = 0; i < 3; i++) {
    result = r.shuffle(arr);
  }

  return result;
};

const random4 = (arr) => {
  return _.shuffle(_.shuffle(_.shuffle(arr)));
};

const random5 = (array) => {
  const chance = new Chance();

  for (let i = 0; i < 3; i++) {
    let lastElementIndex = array.length - 1;

    while (lastElementIndex) {
      const randomIndex = chance.integer({ min: 0, max: lastElementIndex });
      lastElementIndex--;
      const lastElement = array[lastElementIndex];

      array[lastElementIndex] = array[randomIndex];
      array[randomIndex] = lastElement;
    }
  }

  return array;
};

const randomModes = {
  1: [random5],
  2: [random1, random2],
  3: [random3, random4],
};

const generate = (randomMode, exclusions) => {
  const baseDeck = [...cards];

  if (exclusions) {
    exclusions.forEach((excludeCard) => {
      const index = _.findIndex(baseDeck, excludeCard);
      baseDeck.splice(index, 1);
    });
  }

  const randomShuffles = randomModes[randomMode] || randomModes[1];
  const chance = new Chance();
  const shuffle = chance.pickone(randomShuffles);
  return shuffle(baseDeck);
};

export const generateDecks = (randomMode, presetCards) => {
  const deck = generate(randomMode, presetCards);
  return presetCards.concat(deck);
};

export const reGenerateDecks = (randomMode, usedCards) => {
  return generate(randomMode, usedCards);
};

export const deal = ({ dealer, player, deck }) => {
  for (let turn = 1; turn <= 2; turn++) {
    player.push(deck.shift());
    dealer.push(deck.shift());
  }
};

export const buildDeckOfCards = ({ dealer, player, community }) => [
  ...player,
  ...dealer,
  ...community,
];
