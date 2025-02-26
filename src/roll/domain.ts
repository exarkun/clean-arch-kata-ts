import { array, io } from "fp-ts";
import { flow } from "fp-ts/lib/function";
import { IO, sequenceArray } from "fp-ts/lib/IO";

type RollParams = {
  diceSize: number;
  rolls: number;
};

/**
 * A program in the IO monad which when executed yields a single random number representing a dice
 * roll.
 */
type SingleRoll = IO<number>;

/**
 * A program in the IO monad which when executed yields the results of multiple dice rolls.
 */
type ManyRolls = IO<readonly number[]>;

/**
 * A program that simulates a single roll of a dice of the given size.
 * @param diceSize The size of the dice
 * @returns {SingleRoll} A random value from the dice
 */
const rollOnce: (diceSize: number) => (random: number) => SingleRoll =
  (diceSize) => (random) => () =>
    Math.floor(random * diceSize + 1);

/**
 * A program that simulates a number of dice rolls for a dice of the given size.
 * @returns {ManyRolls} An array of random values representing dice rolls
 */
export const rollDice = ({
  diceSize,
  rolls,
}: RollParams): ((random: SingleRoll) => ManyRolls) => {
  return flow(
    (random) => array.replicate(rolls, io.chain(rollOnce(diceSize))(random)),
    sequenceArray,
  );
};
