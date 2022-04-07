import { Table } from "sc-game-base";
import GetGameConfigsConsumer from "../../../src/consumers/get-game-configs-consumer";

describe("GetGameConfigConsumer", () => {
  // Arrange
  const definition = new Table.TableGameDefinition({ id: 1, name: "game-name" });
  const gameData = new Table.TableGameData();
  const consumer = new GetGameConfigsConsumer({ definition, gameData });

  describe("consume", () => {
    it("should emit event with correct result", async () => {
      // Arrange
      const player = {
        session: { currency: "UUS", language: "en-US" },
        socketClient: {
          emit: jest.fn(),
        },
      };

      // Act
      await consumer.consume(player);

      //Assert
      expect(player.socketClient.emit).toBeCalledWith(expect.anything(), expect.anything());
    });
  });
});
