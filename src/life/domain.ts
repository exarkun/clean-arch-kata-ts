import { Option, Effect, Number, Struct } from "effect";
import { unfold, cartesian, map, range, reduce, take } from "effect/Array";
import { match } from "ts-pattern";
import { shuffle } from "./utils";
import { pipe } from "fp-ts/lib/function";

/**
 * Denote the status of a single cell.
 */
export enum CellState {
  Living = "living",
  Dead = "dead",
}

/**
 * Denote the position of a cell.
 */
export type Point = { x: number; y: number };

export const eqPoint = Struct.getEquivalence({
  x: Number.Equivalence,
  y: Number.Equivalence,
});

/**
 * Denote vector addition in (N, N).
 */
export const addPoint = (p1: Point, p2: Point) => ({
  x: p1.x + p2.x,
  y: p1.y + p2.y,
});

/**
 * Denote a subset of the cartesian plane.
 */
export type Region = (p: Point) => boolean;

/**
 * Denote the status of a rectangular grid of cells.
 */
export type Board = (p: Point) => CellState;

/**
 * Define a new Board like another board but on which the cell at a given
 * coordinate is alive.
 */
export const birth =
  (b: Board, p: Point): Board =>
  (p2: Point) =>
    eqPoint(p, p2) ? CellState.Living : b(p2);

/**
 * Define a Board with only dead cells.
 */
export const emptyBoard: Board = () => CellState.Dead;

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
  addPoint(
    p,
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
 * Define a rectangular Region of finite extent anchored at the origin.
 */
export const rectangle = (width: number, height: number): Region => {
  return ({ x, y }: Point) => {
    return x >= 0 && x < width && y >= 0 && y < height;
  };
};

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
 * Denote a rule for how the state of a single cell changes, given the state
 * of its neighbors.
 */
export type StateChangeRule = (
  state: CellState,
  allLivingNeighbors: Set<Direction>,
) => CellState;

/**
 * Define the standard rules of Conway's Game of Life.
 */
export const conwayRules: StateChangeRule = (state, allLivingNeighbors) =>
  match([state, allLivingNeighbors.size])
    .with([CellState.Dead, 3], () => CellState.Living)
    .with([CellState.Living, 2], () => CellState.Living)
    .with([CellState.Living, 3], () => CellState.Living)
    .otherwise(() => CellState.Dead);

/**
 * Define the Board recursively in terms of all earlier Boards.
 */
export const recursiveAdvance =
  (rule: StateChangeRule) =>
  (board: Board): Board => {
    return (p: Point): CellState => {
      const neighbors = allDirections.map((d) => ({ d, p: move(d, p) }));
      const living = neighbors.filter(({ p }) => board(p) === CellState.Living);
      const aliveInDirection = living.map(({ d }) => d);
      return rule(board(p), new Set(aliveInDirection));
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
  const coords = cartesian(
    range(0, width - 1),
    range(0, height - 1),
  );
  return pipe(
    coords,
    map(([x, y]) => ({ x, y })),
    shuffle(prng),
    Effect.map(take(aliveCellCount)),
    Effect.map(reduce(emptyBoard, birth)),
  );
};
