import seedrandom from "seedrandom";
import { rollDice } from "./domain";
import { Command, Options } from "@effect/cli";
import { Console } from "effect";

const diceSize = Options.integer("dice-size").pipe(
  Options.withAlias("d"),
  Options.withDescription("the number of sides on the dice"),
  Options.withDefault(6),
);
const diceCount = Options.integer("number").pipe(
  Options.withAlias("n"),
  Options.withDescription("the number of dice rolls"),
  Options.withDefault(1),
);
const seed = Options.text("seed").pipe(
  Options.withAlias("s"),
  Options.withDescription("seed for the PRNG"),
);
const rollOptions = {
  diceSize,
  diceCount,
  seed,
};

type RollOptions = {
  diceSize: number;
  diceCount: number;
  seed: string;
};
const rollImpl = ({ diceSize, diceCount, seed }: RollOptions) => {
  const roll = rollDice({
    diceSize,
    rolls: diceCount,
  })(seedrandom(seed));

  return Console.info(roll());
};

export const rollCommand = Command.make("roll", rollOptions, rollImpl).pipe(
  Command.withDescription("simulate a dice roll"),
);
