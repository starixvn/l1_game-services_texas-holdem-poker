import { errorUser, GameClientDriver, internalServerErrorUser, normalUser } from "sc-game-service-integration-utils";
import { deal } from "../../src/helpers/deck-helper";

import { currencyData, socketOptions } from "./stubs/test-data";

const JEST_ASSERT_WAITING_RESPONSE_TIMEOUT = 10000;
const WAITING_END_GAME_TIMEOUT = 5000;

describe("Texas Casino Holdem Service", () => {
    beforeAll(() => {
        // set timeout for jest, waiting for socket response
        jest.setTimeout(JEST_ASSERT_WAITING_RESPONSE_TIMEOUT);
    });

    afterAll(() => {
        jest.clearAllTimers()
    });

    describe("Happy Path Cases", () => {
        let gameClientDriver;
        beforeAll(() => {
            // Arrange
            gameClientDriver = new GameClientDriver(socketOptions, initUserSession(normalUser));
        });

        afterAll(() => {
            gameClientDriver.close();
        });

        it("should start and allow game client connect to.", async (done) => {
            // Assert
            await gameClientDriver.handleSignedInEvent(() => {
                done();
            });
        });

        it("should return user information when user joins game.", (done) => {
            // Arrange
            const expectedUser = {
                UID: 1,
                avatarId: 1,
                currency: "$US",
                name: "NormalUser",
                rate: 1,
                red: 25000,
            };

            // Act
            gameClientDriver.sendInGameEvent();

             // Assert
            gameClientDriver.handleInGameEvent((inGameData) => {
                if (inGameData?.user?.UID) {
                    expect(inGameData.user).toStrictEqual(expectedUser);

                    done();
                }
            });
        });

        it("should does not return bet history when user request", async (done) => {
            // Arrange
            await new Promise((r) => setTimeout(r, WAITING_END_GAME_TIMEOUT));

            // Act
            gameClientDriver.sendGetHistoryEvent();

            // Assert
            await gameClientDriver.handleGetHistoryEvent((betHistoryData) => {
                if (betHistoryData?.history) {
                    expect(betHistoryData.history.betLogs.length > 0).toBeFalsy();
                    done();
                }
            });
        });

        it("should return game configuration (odds, min bet, max bet) when user joins game.", (done) => {
            // Arrange
            const expectedGameConfigs = {
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

            // Act
            gameClientDriver.sendInGameEvent();

            // Assert
            gameClientDriver.handleInGameEvent((inGameData) => {
                if (inGameData?.gameConfigs) {
                    if (inGameData.gameConfigs) {
                        expect(inGameData.gameConfigs.minBet).toEqual(expectedGameConfigs.minBet);
                        expect(inGameData.gameConfigs.maxBet).toEqual(expectedGameConfigs.maxBet);
                        expect(inGameData.gameConfigs.maxBetPerChoices).toStrictEqual(expectedGameConfigs.maxBetPerChoices);
                        expect(inGameData.gameConfigs.odds).toStrictEqual(expectedGameConfigs.odds);

                        done();
                    }
                }
            });
        });

        it("should return current user ticket result when user is playing game.", async (done) => {
            // Arrange
            const expectedEndBetResponse = {
                deal:{
                    choices:{
                        ante: 10
                    }
                },
                user: { maxBet: 2000, minBet: 1, red: 24250, scoins: 0 },
            };

            // Act
            gameClientDriver.socket.emit("bet", {
                action: "deal",
                anteBet: 10
              })

            // Assert
            await gameClientDriver.handleEndBetEvent((endBetData) => {
                if (endBetData.endBet) {
                    expect(endBetData.deal.choices).toEqual(expectedEndBetResponse.deal.choices);
                    expect(endBetData.deal.combinationResult.player.cards.length).toEqual(2);
                    expect(endBetData.deal.combinationResult.player.combinationCards.length).toEqual(1);
                    expect(endBetData.deal.player.length).toEqual(2);
                    expect(endBetData.deal.totalAmount).toEqual(10);
                    expect(endBetData.user).toEqual(expectedEndBetResponse.user);
                   
                    done();
                }
            });
        });
    });
});

const initUserSession = (user) => {
    return {
        session: `${user.memberId}-session-id`,
        ss: `${user.memberId}-session-id`,
        currency: currencyData.name,
        username: `${user.memberId}_${user.memberName}`,
        browserUserAgent: "browser-user-agent",
    };
};
