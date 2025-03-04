import { Command, Options } from "@effect/cli";
import { p } from "@effect/cli/HelpDoc";
import * as Spans from "@effect/cli/HelpDoc/Span";
import { invalidValue } from "@effect/cli/ValidationError";
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
  randomBoard,
} from "./domain";
import { finally_, iterateEffect, randomEffect } from "./utils";
import {
  BorderDecorations,
  decorations,
  simpleRectangleConsolePresenter,
} from "./view";
import { Point } from "src/cartesian/domain";

const withMinimum = (n: number) => (o: Options.Options<number>) =>
  pipe(
    o,
    Options.map((m: number) => {
      if (m < n) {
        // From https://github.com/Effect-TS/effect/blob/main/packages/cli/src/internal/primitive.ts#L417
        // it looks like Effect.orElseFail might be the right way to produce parse errors.  This way
        // produces extremely ugly errors.
        throw invalidValue(
          p(
            Spans.error(
              `${Options.getIdentifier(o)}: ${m} is less than the minimum allowed value ${n}`,
            ),
          ),
        );
      } else {
        return m;
      }
    }),
  );

const width = Options.integer("width").pipe(
  // The adjustment here comes from knowledge of how the renderer works, which of course doesn't belong here.
  Options.withDefault(process.stdout.columns / 2 - 2),
  withMinimum(1),
  Options.withAlias("w"),
  Options.withDescription("the size of the board on the x axis"),
);
const height = Options.integer("height").pipe(
  // See comment on width about the adjustment to the rows value.
  Options.withDefault(process.stdout.rows - 3),
  withMinimum(1),
  Options.withAlias("h"),
  Options.withDescription("the size of the board on the y axis"),
);
const maxTurns = Options.integer("max-turns").pipe(
  Options.withDefault(20),
  withMinimum(0),
  Options.withAlias("m"),
  Options.withDescription(
    "the maximum number of generations for which to run the game",
  ),
);
const cellCount = Options.integer("cell-count").pipe(
  Options.withDefault(15),
  withMinimum(0),
  Options.withAlias("c"),
  Options.withDescription(
    "the number of cells which will be alive in the initial game state",
  ),
);
const delay = Options.integer("iteration-delay").pipe(
  Options.withDefault(200),
  withMinimum(0),
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
const pattern = Options.choiceWithValue(
  "pattern",
  Object.entries(patterns),
).pipe(
  Options.optional,
  Options.withAlias("p"),
  Options.withDescription("name of a well-known pattern to start with"),
);
const style = Options.choiceWithValue(
  "style",
  Object.entries(decorations),
).pipe(
  Options.withDefault(decorations.fancy),
  Options.withAlias("S"),
  Options.withDescription("choose the style of border decorations"),
);
const animate = Options.boolean("no-animate").pipe(
  Options.withDefault(false),
  Options.withAlias("A"),
  Options.withDescription("don't animate state updates"),
  Options.map((b) => !b),
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
  animate,
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
  animate: boolean;
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
  animate,
}: LifeOptions) => {
  const boardEff = makeBoard(width, height, cellCount, prng, pattern);
  const advance = pickBackend(backend, width, height)(conwayRules);
  const present = simpleRectangleConsolePresenter(
    width,
    height,
    style,
    animate,
  );
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
