import { addPoint, eqPoint, Point, Region } from "@/cartesian/domain";
import { Effect, Option } from "effect";
import { cartesian, map, range, reduce, take, unfold } from "effect/Array";
import { pipe } from "fp-ts/lib/function";
import { match } from "ts-pattern";
import { shuffle } from "./utils";

/**
 * Denote the status of a single cell.
 */
export enum CellState {
  Living = "living",
  Dead = "dead",
}

/**
 * Denote the status of a rectangular grid of cells.
 */
export type Board = (p: Point) => CellState;

/**
 * Define a Board with a constant value at all coordinates.
 */
export const constantBoard =
  (c: CellState): Board =>
  (/*p: Point*/) =>
    c;

/**
 * Define a new Board like another board but on which the cell at a given
 * coordinate is alive.
 */
export const birth =
  (b: Board, p: Point): Board =>
  (p2: Point) =>
    eqPoint.equals(p, p2) ? CellState.Living : b(p2);

/**
 * Define a Board with only dead cells.
 */
export const emptyBoard: Board = constantBoard(CellState.Dead);

/**
 * Denote each possible direction in which a cell can have a neighbor.
 */
export enum Direction {
  North = "north",
  Northeast = "northeast",
  East = "east",
  Southeast = "southeast",
  South = "south",
  Southwest = "southwest",
  West = "west",
  Northwest = "northwest",
}

export const allDirections = [
  Direction.North,
  Direction.Northeast,
  Direction.East,
  Direction.Southeast,
  Direction.South,
  Direction.Southwest,
  Direction.West,
  Direction.Northwest,
];

/**
 * Compute the Point one cell in the given direction from the given Point.
 */
export const move = (d: Direction, p: Point) =>
  addPoint(p)(
    match(d)
      .with(Direction.North, () => ({ x: 0, y: -1 }))
      .with(Direction.Northeast, () => ({ x: 1, y: -1 }))
      .with(Direction.East, () => ({ x: 1, y: 0 }))
      .with(Direction.Southeast, () => ({ x: 1, y: 1 }))
      .with(Direction.South, () => ({ x: 0, y: 1 }))
      .with(Direction.Southwest, () => ({ x: -1, y: 1 }))
      .with(Direction.West, () => ({ x: -1, y: 0 }))
      .with(Direction.Northwest, () => ({ x: -1, y: -1 }))
      .exhaustive(),
  );

/**
 * Define a Board for which all cells outside of the given region are always
 * considered dead.
 */
export const bounded = (included: Region, board: Board): Board => {
  return (p: Point): CellState => {
    if (included(p)) {
      return board(p);
    } else {
      return CellState.Dead;
    }
  };
};

/**
 * Denote the difference between two cell states.
 */
export enum CellDifference {
  Birth = "Birth",
  Death = "Death",
  NoChange = "NoChange",
}

/**
 * Compute the state that results from applying a difference to a state.
 */
export const updateCell = (
  state: CellState,
  change: Option.Option<CellDifference>,
): CellState =>
  Option.isNone(change)
    ? state
    : change.value === CellDifference.Birth
      ? CellState.Living
      : CellState.Dead;

/**
 * Compute the difference between two cell states.
 */
export const subtractState = (a: CellState, b: CellState): CellDifference =>
  match([a, b])
    .with([CellState.Dead, CellState.Living], () => CellDifference.Death)
    .with([CellState.Living, CellState.Dead], () => CellDifference.Birth)
    .otherwise(() => CellDifference.NoChange);

/**
 * Compute the difference between two boards.
 */
export const subtractBoard =
  (a: Board, b: Board): ((p: Point) => CellDifference) =>
  (p: Point) =>
    subtractState(a(p), b(p));

/**
 * Denote a rule for how the state of a single cell changes, given the state
 * of its neighbors.
 */
export type StateChangeRule = (
  state: CellState,
  numLivingNeighbors: number,
) => Option.Option<CellDifference>;

/**
 * Define the standard rules of Conway's Game of Life.
 */
export const conwayRules: StateChangeRule = (state, numLivingNeighbors) =>
  match([state, numLivingNeighbors])
    .with([CellState.Dead, 3], () => Option.some(CellDifference.Birth))
    .with([CellState.Living, 0], () => Option.some(CellDifference.Death))
    .with([CellState.Living, 1], () => Option.some(CellDifference.Death))
    .with([CellState.Living, 4], () => Option.some(CellDifference.Death))
    .with([CellState.Living, 5], () => Option.some(CellDifference.Death))
    .with([CellState.Living, 6], () => Option.some(CellDifference.Death))
    .otherwise(Option.none);

/**
 * Define the Board recursively in terms of all earlier Boards.
 */
export const recursiveAdvance =
  (rule: StateChangeRule) =>
  (board: Board): Board => {
    return (p: Point): CellState => {
      const neighbors = allDirections.map((d) => ({ d, p: move(d, p) }));
      const living = neighbors.filter(({ p }) => board(p) === CellState.Living);
      const state = board(p);
      return updateCell(state, rule(state, living.length));
    };
  };

export const newStoreBoard = (
  width: number,
  height: number,
  state: Board,
): Board => {
  const b = range(0, width - 1).map((x) =>
    range(0, height - 1).map((y) => state({ x, y })),
  );
  return (p: Point) => b[p.x]?.[p.y] ?? CellState.Dead;
};

export const advanceWithStorage =
  (width: number, height: number) =>
  (rule: StateChangeRule) =>
  (board: Board): Board =>
    newStoreBoard(width, height, recursiveAdvance(rule)(board));

export const backends = {
  function: recursiveAdvance,
  array: advanceWithStorage,
};

/**
 * Define the living cells that make up a few well-known patterns.
 */
export const patterns = {
  glider: [
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 2, y: 2 },
  ],
  blinker: [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  preblock: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
  ],
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

  const startingAliveCells = unfold(seed, ({ n, p }) => {
    if (n <= 0) {
      return Option.none();
    } else {
      const p_ = nextPoint(p);
      return Option.some([p_, { n: n - 1, p: p_ }]);
    }
  });
  return reduce(emptyBoard, birth)(startingAliveCells);
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
  const coords = cartesian(range(0, width - 1), range(0, height - 1));
  return pipe(
    coords,
    map(([x, y]) => ({ x, y })),
    shuffle(prng),
    Effect.map(take(aliveCellCount)),
    Effect.map(reduce(emptyBoard, birth)),
  );
};

export const makePatternBoard: (points: readonly Point[]) => Board = reduce(
  emptyBoard,
  birth,
);

export const pickBackend = (name: string, width: number, height: number) =>
  match(name)
    .with("function", () => recursiveAdvance)
    .with("array", () => advanceWithStorage(width, height))
    .otherwise(() => {
      throw new Error("zoops");
    });
