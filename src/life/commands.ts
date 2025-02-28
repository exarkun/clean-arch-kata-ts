import { Array, Effect, flow, Option, pipe } from "effect";
import seedrandom from "seedrandom";
import { Argv } from "yargs";
import { StrictCommandType } from "../lib/cli";
import {
  advanceWithStorage,
  birth,
  Board,
  conwayRules,
  emptyBoard,
  patterns,
  Point,
  recursiveAdvance,
} from "./domain";
import { decorations, Present, simpleRectangleConsolePresenter } from "./view";
import { match } from "ts-pattern";
import { shuffle } from "./utils";

const builder = (yargs: Argv) =>
  yargs.options({
    width: {
      alias: "w",
      type: "number",
      desc: "the size of the board on the x axis",
      default: 10,
    },
    height: {
      alias: "h",
      type: "number",
      desc: "the size of the board on the y axis",
      default: 10,
    },
    "max-turns": {
      alias: "m",
      type: "number",
      desc: "the maximum number of generations for which to run the game",
      default: 20,
    },
    "cell-count": {
      alias: "c",
      type: "number",
      desc: "the number of cells which will be alive in the initial game state",
      default: 15,
    },
    delay: {
      alias: "d",
      type: "number",
      desc: "the number of milliseconds to wait between generations",
      default: 20,
    },
    backend: {
      alias: "b",
      choices: ["function", "array"],
      desc: "the game state strategy to use",
      default: "array",
    },
    seed: {
      alias: "s",
      type: "string",
      desc: "A value to use to seed the PRNG",
      default: null,
    },
    pattern: {
      alias: "p",
      choices: Object.keys(patterns),
      coerce: (p: string) => validateOption(p, patterns),
      desc: "name of a well-known pattern to start with",
      default: null,
    },
    style: {
      choices: Object.keys(decorations),
      desc: "choose the style of border decorations",
      default: "fancy",
    },
  });

const validateOption = <R extends Record<string, unknown>>(s: string, record: R): keyof R => {
  if (Object.keys(record).includes(s)) {
    return s;
  } else {
    throw new Error(`${s} is not one of the valid options: ${Object.keys(record)}`)
  }
  };

const randomEffect = (seed: string) => {
  const prng = seedrandom(seed);
  return Effect.sync(prng);
};

const makeBoard = (
  width: number,
  height: number,
  cellCount: number,
  seed: string | null,
  pattern: keyof typeof patterns | null,
) =>
  seed !== null
    ? randomBoard(width, height, cellCount, randomEffect(seed))
    : pattern !== null
      ? Effect.succeed(patternBoard(pattern))
      : Effect.sync(() => initialBoard(width, height, cellCount));

const patternBoard = (pattern: keyof typeof patterns) =>
  Array.reduce(emptyBoard, birth)(patterns[pattern]);

const pickBackend = (name: string, width: number, height: number) =>
  match(name)
    .with("function", () => recursiveAdvance)
    .with("array", () => advanceWithStorage(width, height))
    .otherwise(() => {
      throw new Error("zoops");
    });

export const lifeCommand: StrictCommandType<typeof builder> = {
  command: "life",
  describe: "Simulate the game of life",
  builder,
  async handler({
    backend,
    width,
    height,
    delay,
    maxTurns,
    cellCount,
    seed,
    pattern,
    style,
  }) {
    const board = makeBoard(width, height, cellCount, seed, pattern ?? null /* why isn't it null already? */);
    const advance = pickBackend(backend, width, height)(conwayRules);
    const present = simpleRectangleConsolePresenter(
      width,
      height,
      decorations[style as keyof typeof decorations],
    );
    const simulate = simulationStep(advance, present);
    const delayedSimulate = flow(
      simulate,
      Effect.tap(() => Effect.sleep(delay)),
    );
    const eff = pipe(
      board,
      Effect.flatMap((b) => iterateEffect(delayedSimulate, b, maxTurns)),
    );
    await Effect.runPromise(eff);
  },
};

const simulationStep =
  (advance: (b: Board) => Board, present: Present) =>
  (state: Board): Effect.Effect<Board, Error, never> => {
    const eff = Effect.tap(Effect.succeed(state), present);
    return Effect.map((b: Board) => advance(b))(eff);
  };

const iterateEffect = <S, E extends Error>(
  f: (s: S) => Effect.Effect<S, E, never>,
  s: S,
  n: number,
): Effect.Effect<S, E, never> => {
  if (n <= 0) {
    return Effect.succeed(s);
  } else {
    return pipe(
      s,
      f,
      Effect.flatMap((ss) => iterateEffect(f, ss, n - 1)),
    );
  }
};

/**
 * Define the simple initial board state.
 */
export const initialBoard = (
  width: number,
  height: number,
  numStartingAlive: number,
): Board => {
  const seed: { n: number; p: Point } = {
    n: numStartingAlive,
    p: { x: -1, y: 0 },
  };
  const nextPoint = ({ x, y }: Point): Point =>
    x < width - 1 ? { x: x + 1, y } : { x: 0, y: y + 1 };

  const startingAliveCells = Array.unfold(seed, ({ n, p }) => {
    if (n <= 0) {
      return Option.none();
    } else {
      const p_ = nextPoint(p);
      return Option.some([p_, { n: n - 1, p: p_ }]);
    }
  });
  return Array.reduce(emptyBoard, birth)(startingAliveCells);
};

/**
 * Define a random initial board state.
 */
export const randomBoard = (
  width: number,
  height: number,
  aliveCellCount: number,
  prng: Effect.Effect<number, never, never>,
): Effect.Effect<Board, never, never> => {
  const coords = Array.cartesian(
    Array.range(0, width - 1),
    Array.range(0, height - 1),
  );
  return pipe(
    coords,
    Array.map(([x, y]) => ({ x, y })),
    shuffle(prng),
    Effect.map(Array.take(aliveCellCount)),
    Effect.map(Array.reduce(emptyBoard, birth)),
  );
};
