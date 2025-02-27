import { Number, Struct } from "effect";
import { match } from "ts-pattern";

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
export const birth = (b: Board, p: Point): Board => {
  return (p2: Point) => {
    if (eqPoint(p, p2)) {
      return CellState.Living;
    } else {
      return b(p2);
    }
  };
};

/**
 * Define a Board with only dead cells.
 */
export const emptyBoard: Board = (_) => CellState.Dead;

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
export const conwayRules: StateChangeRule = (state, allLivingNeighbors) => {
  const n = allLivingNeighbors.size;
  if (state === CellState.Dead && n === 3) {
    return CellState.Living;
  } else if (state === CellState.Living && n >= 2 && n <= 3) {
    return CellState.Living;
  } else {
    return CellState.Dead;
  }
};

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
