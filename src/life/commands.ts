import { Command, Options } from "@effect/cli";
import { Point } from "cartesian/domain";
import { Effect, Option, pipe, Stream } from "effect";
import { iteratedApplicative, liftIterated } from "../iterated";
import {
  backends,
  Board,
  emptyBoard,
  initialBoard,
  makePatternBoard,
  patterns,
  pickBackend,
  randomBoard,
  StateChangeRule,
} from "./domain";
import { finally_, randomEffect } from "./utils";
import {
  BorderDecorations,
  borderImage,
  decorations,
  makeAnimator,
  makeStatic,
} from "./view";
import { withMinimum, withRight } from "@/lib/cli";
import { parse } from "@/parse";
import { ruleParser } from "./rule";

const width = Options.integer("width").pipe(
  // We suppose that the aspect ratio of the terminal is 2:1 (height:width).
  Options.withDefault(process.stdout.columns / 2),
  withMinimum(1),
  Options.withAlias("w"),
  Options.withDescription("the size of the board on the x axis"),
);
const height = Options.integer("height").pipe(
  Options.withDefault(process.stdout.rows),
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
const rule = Options.text("rule").pipe(
  Options.withDefault("B3/S23"),
  Options.withAlias("R"),
  Options.withDescription("specify the state evolution rule"),
  Options.map((s) => parse(ruleParser, s)),
  withRight,
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
  rule,
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
  style: BorderDecorations<string>;
  animate: boolean;
  rule: StateChangeRule;
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
  rule,
}: LifeOptions): Effect.Effect<void, Error, never> => {
  const boardEff = makeBoard(width, height, cellCount, prng, pattern);
  const advance = pickBackend(backend, width, height)(rule);

  const border = borderImage(width, height, style);
  const renderer = (animate ? makeAnimator : makeStatic)(
    width,
    height,
    () => border,
    delay,
  );

  return pipe(
    renderer.setup,
    Effect.andThen(boardEff),
    Effect.map(iteratedApplicative.of<Board>),
    Effect.map((b) => Stream.iterate(b, liftIterated(advance))),
    Effect.map(Stream.take(maxTurns)),
    Effect.flatMap(
      Stream.runFoldEffect(
        iteratedApplicative.of(emptyBoard),
        renderer.step<Error, never>,
      ),
    ),
    finally_(renderer.cleanup),
  );
};

export const lifeCommand = Command.make("life", lifeOptions, lifeImpl).pipe(
  Command.withDescription("Simulate the game of life"),
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
