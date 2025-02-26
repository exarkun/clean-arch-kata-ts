import { describe, expect, it, jest } from "@jest/globals";
import { IO } from "fp-ts/lib/IO";
import { rollDice } from "./domain";

describe("rollDice", () => {
  const stubRandom = (values: number[]): jest.Mock<IO<number>> => {
    const random = jest.fn<jest.Mock<() => number>>();
    values.forEach((value) => random.mockReturnValueOnce(value));
    return random;
  };

  it.each([
    {
      diceSize: 6,
      rolls: 4,
      randomValues: [0.1, 0.8, 0.2, 0.99],
      expectedRolls: [1, 5, 2, 6],
    },
    {
      diceSize: 12,
      rolls: 3,
      randomValues: [0.1, 0.8, 0.99],
      expectedRolls: [2, 10, 12],
    },
  ])(
    "simulates rolls for the given parameters (size: $diceSize, rolls: $rolls, random values: $randomValues)",
    ({ diceSize, rolls, randomValues, expectedRolls }) => {
      const random = stubRandom(randomValues);
      const roll = rollDice({ diceSize, rolls })(random);
      expect(roll()).toStrictEqual(expectedRolls);
    },
  );
});
