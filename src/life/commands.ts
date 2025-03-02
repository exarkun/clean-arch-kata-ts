import { Effect, flow, Option, pipe } from "effect";
import {
  backends,
  Board,
  conwayRules,
  initialBoard,
  Iterated,
  makePatternBoard,
  patterns,
  pickBackend,
  Point,
  randomBoard,
} from "./domain";
import {
  BorderDecorations,
  decorations,
  simpleRectangleConsolePresenter,
} from "./view";
import { finally_, iterateEffect, randomEffect } from "./utils";
import { Command, Options } from "@effect/cli";

const width = Options.integer("width").pipe(
  Options.withDefault(80),
  Options.withAlias("w"),
  Options.withDescription("the size of the board on the x axis"),
);
const height = Options.integer("height").pipe(
  Options.withDefault(40),
  Options.withAlias("h"),
  Options.withDescription("the size of the board on the y axis"),
);
const maxTurns = Options.integer("max-turns").pipe(
  Options.withDefault(20),
  Options.withAlias("m"),
  Options.withDescription(
    "the maximum number of generations for which to run the game",
  ),
);
const cellCount = Options.integer("cell-count").pipe(
  Options.withDefault(15),
  Options.withAlias("c"),
  Options.withDescription(
    "the number of cells which will be alive in the initial game state",
  ),
);
const delay = Options.integer("iteration-delay").pipe(
  Options.withDefault(200),
  Options.withAlias("d"),
  Options.withDescription(
    "the number of milliseconds to wait between generations",
  ),
);
const prng = Options.text("seed").pipe(
  Options.optional,
  Options.withAlias("s"),
  Options.withDescription(
    "for a randomly initialised board, a value to use to seed the PRNG",
  ),
  Options.map(Option.map(randomEffect)),
);
const backend = Options.choice("backend", Object.keys(backends)).pipe(
  Options.withDefault("array"),
  Options.withAlias("b"),
  Options.withDescription("the game state strategy to use"),
);
const pattern = Options.choice("pattern", Object.keys(patterns)).pipe(
  Options.optional,
  Options.withAlias("p"),
  Options.withDescription("name of a well-known pattern to start with"),
  Options.map(Option.map((x) => patterns[validateOption(x, patterns)])),
);
const style = Options.choice("style", Object.keys(decorations)).pipe(
  Options.withDefault("fancy"),
  Options.withAlias("S"),
  Options.withDescription("choose the style of border decorations"),
  Options.map((x) => decorations[validateOption(x, decorations)]),
);

const lifeOptions = {
  width,
  height,
  maxTurns,
  cellCount,
  delay,
  prng,
  backend,
  pattern,
  style,
};

type LifeOptions = {
  width: number;
  height: number;
  maxTurns: number;
  cellCount: number;
  delay: number;
  backend: string;
  prng: Option.Option<Effect.Effect<number, never, never>>;
  pattern: Option.Option<readonly Point[]>;
  style: BorderDecorations;
};

const lifeImpl = ({
  width,
  height,
  maxTurns,
  cellCount,
  delay,
  backend,
  prng,
  pattern,
  style,
}: LifeOptions) => {
  const boardEff = makeBoard(width, height, cellCount, prng, pattern);
  const advance = pickBackend(backend, width, height)(conwayRules);
  const present = simpleRectangleConsolePresenter(width, height, style);
  const simulate = simulationStep(advance, present.present);
  const delayedSimulate = flow(
    simulate,
    Effect.tap(() => Effect.sleep(delay)),
  );
  return pipe(
    present.setup,
    Effect.andThen(() => boardEff),
    Effect.flatMap((b) =>
      iterateEffect(delayedSimulate, { iteration: 0, value: b }, maxTurns),
    ),
    finally_(present.cleanup),
  );
};

export const lifeCommand = Command.make("life", lifeOptions, lifeImpl).pipe(
  Command.withDescription("Simulate the game of life"),
);

const validateOption = <R extends Record<string, unknown>>(
  s: string,
  record: R,
): keyof R => {
  if (Object.keys(record).includes(s)) {
    return s;
  } else {
    throw new Error(
      `${s} is not one of the valid options: ${Object.keys(record)}`,
    );
  }
};

const simulationStep = (
  advance: (b: Board) => Board,
  present: (b: Iterated<Board>) => Effect.Effect<void, Error, never>,
) =>
  flow(
    Effect.succeed<Iterated<Board>>,
    Effect.tap(present),
    Effect.map(({ iteration, value }) => ({
      iteration: iteration + 1,
      value: advance(value),
    })),
  );

const makeBoard = (
  width: number,
  height: number,
  cellCount: number,
  optionalPrng: Option.Option<Effect.Effect<number, never, never>>,
  optionalPattern: Option.Option<readonly Point[]>,
) =>
  pipe(
    optionalPrng,
    Option.match({
      onSome: (prng) => randomBoard(width, height, cellCount, prng),
      onNone: () =>
        pipe(
          optionalPattern,
          Option.match({
            onSome: (pattern) => Effect.succeed(makePatternBoard(pattern)),
            onNone: () =>
              Effect.sync(() => initialBoard(width, height, cellCount)),
          }),
        ),
    }),
  );
