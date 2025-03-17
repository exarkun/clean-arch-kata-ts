import { withMinimum, withRight } from "@/lib/cli";
import { parse } from "@/parse";
import { Command, Options } from "@effect/cli";
import { Console, Effect, flow, Option, Sink, Stream } from "effect";
import { pipe } from "fp-ts/lib/function";
import { Iterated, iteratedApplicative, liftIterated } from "../iterated";
import {
  backends,
  Board,
  boardToBigNum,
  initialBoard,
  patterns,
  pickBackend,
  randomBoard,
} from "./domain";
import { ruleParser } from "./rule";
import { finally_, randomEffect } from "./utils";
import {
  BorderDecorations,
  borderImage,
  decorations,
  makeAnimator,
  makeStatic,
} from "./view";

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
const prng = Options.text("seed").pipe(
  Options.withAlias("s"),
  Options.withDescription(
    "for a randomly initialised board, a value to use to seed the PRNG",
  ),
  Options.map(randomEffect),
  Options.optional,
);
const cellCount = Options.integer("cell-count").pipe(
  withMinimum(0),
  Options.withAlias("c"),
  Options.withDescription(
    "the number of cells which will be alive in the initial game state",
  ),
);
const pattern = Options.choiceWithValue(
  "pattern",
  Object.entries(patterns),
).pipe(
  Options.withAlias("p"),
  Options.withDescription("name of a well-known pattern to start with"),
);

type SizedBoard = {
  width: number;
  height: number;
  board: Effect.Effect<Board, never, never>;
};

const patternBoardOption: Options.Options<SizedBoard> = Options.all({
  width,
  height,
  pattern,
}).pipe(
  Options.map(
    ({ width, height, pattern }): SizedBoard => ({
      width,
      height,
      board: Effect.succeed(pattern),
    }),
  ),
);

const randomBoardOption: Options.Options<SizedBoard> = Options.all({
  width,
  height,
  cellCount,
  optionalPrng: prng,
}).pipe(
  Options.map(({ width, height, optionalPrng, cellCount }) => ({
    width,
    height,
    board: pipe(
      optionalPrng,
      Option.map((prng) => randomBoard(width, height, cellCount, prng)),
      Option.getOrElse(() =>
        Effect.succeed(initialBoard(width, height, cellCount)),
      ),
    ),
  })),
);

const backend = Options.choice("backend", Object.keys(backends)).pipe(
  Options.withDefault("array"),
  Options.withAlias("b"),
  Options.withDescription("the game state strategy to use"),
);
const rule = Options.text("rule").pipe(
  Options.withDefault("B3/S23"),
  Options.withAlias("R"),
  Options.withDescription("specify the state evolution rule"),
  Options.map((s) => parse(ruleParser, s)),
  withRight,
);

const board: Options.Options<SizedBoard> = Options.orElse(
  randomBoardOption,
  patternBoardOption,
);

const boardInfo = Options.all({
  board,
  backend,
  rule,
}).pipe(
  Options.map(({ board: { board, width, height }, backend, rule }) => ({
    width,
    height,
    board,
    advance: pickBackend(backend, width, height)(rule),
  })),
);

const maxTurns = Options.integer("max-turns").pipe(
  Options.withDefault(20),
  withMinimum(0),
  Options.withAlias("m"),
  Options.withDescription(
    "the maximum number of generations for which to run the game",
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
  boardInfo,
  maxTurns,
  delay,
  backend,
  style,
  animate,
  rule,
};

type LifeOptions = {
  boardInfo: {
    width: number;
    height: number;
    board: Effect.Effect<Board, never, never>;
    advance: (_: Board) => Board;
  };
  maxTurns: number;
  delay: number;
  style: BorderDecorations<string>;
  animate: boolean;
};

const lifeImpl = ({
  boardInfo: { width, height, board, advance },
  maxTurns,
  delay,
  style,
  animate,
}: LifeOptions): Effect.Effect<void, Error, never> => {
  const border = borderImage(width, height, style);
  const renderer = (animate ? makeAnimator : makeStatic)(
    width,
    height,
    () => border,
    delay,
  );

  return board.pipe(
    Effect.tap(renderer.setup),
    Effect.map(iteratedApplicative.of<Board>),

    Effect.map(
      flow(
        // Generate successive iterations of the board
        (b) => Stream.iterate(b, liftIterated(advance)),

        // Check for revisited states and end the stream when one is found.
        Stream.mapAccum([], checkSettling(width, height)),
        Stream.takeWhile(({ cycling }) => !cycling),
        Stream.map(({ board }) => board),

        // Stop after the specified number of iterations.
        Stream.take(maxTurns),

        // Pair up consecutive board states to facilitate animation of the
        // transition.  We have to drop the first pairing because its
        // "previous" doesn't exist.
        Stream.zipWithPrevious,
        Stream.flatMap(([c, n]) =>
          Option.match(c, {
            onNone: () => Stream.empty,
            onSome: (value) => Stream.make({ c: value, n }),
          }),
        ),

        // Render the animation.
        Stream.mapEffect(({ c, n }) => renderer.step<Error, never>(c, n)),

        // Consume the whole stream, keeping just the final value.
        Stream.run(Sink.last()),
      ),
    ),

    // Report the outcome
    Effect.flatMap(
      Effect.flatMap(
        Option.match({
          onSome: reportCompletion(maxTurns),
          onNone: reportNoGenerations,
        }),
      ),
    ),
    finally_(renderer.cleanup),
  );
};

export const lifeCommand = Command.make("life", lifeOptions, lifeImpl).pipe(
  Command.withDescription("Simulate the game of life"),
);

export const checkSettling =
  (width: number, height: number) =>
  (
    recent: readonly bigint[],
    b: Iterated<Board>,
  ): [readonly bigint[], { cycling: boolean; board: Iterated<Board> }] => {
    const n = boardToBigNum(width, height)(b.value);
    const idx = recent.indexOf(n);
    if (idx === -1) {
      // Not seen recently
      return [[n, ...recent].slice(0, 100), { cycling: false, board: b }];
    } else {
      // A cycle has been detected
      return [recent, { cycling: true, board: b }];
    }
  };

export const reportCompletion =
  (max: number) =>
  ({ iteration }: Iterated<Board>) =>
    Console.log(
      max === iteration
        ? `Game ended after max (${iteration}) turns without settling.`
        : `Board settled after ${iteration} turns.`,
    );

export const reportNoGenerations = () =>
  Console.log("Completed without simulating anything.");
