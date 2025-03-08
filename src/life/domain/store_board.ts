import { addPoint, Point } from "@/cartesian/domain";
import { pipe } from "effect";
import * as ReadonlyArray from "fp-ts/ReadonlyArray";
import * as ReadonlySet from "fp-ts/ReadonlySet";
import * as Store from "fp-ts/Store";
import {
    allDirections,
    CellState,
    Direction,
    move,
    StateChangeRule,
    updateCell,
} from "../domain";

export const URI = "Board";

export type URI = typeof URI;

export type Board<T> = {
  width: number;
  height: number;
  cells: ReadonlyArray<T>;
};

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly Board: Board<A>;
  }
}

export const getStore = <A>({
  width,
  height,
  cells,
}: Board<A>): Store.Store<Point, A> => ({
  pos: { x: 0, y: 0 },
  peek: ({ x, y }) => cells[y * width + (x % (width * height))],
});

const getNeighbors = (() => {
  const toPair = (d: Direction): readonly [Point, Direction] => [
    move(d, { x: 0, y: 0 }),
    d,
  ];
  const neighbors = ReadonlyArray.map(toPair)(allDirections);
  return (s: Store.Store<Point, CellState>): ReadonlySet<Direction> =>
    pipe(
      neighbors,
      ReadonlyArray.map(([v, d]): readonly [CellState, Direction] => [
        s.peek(addPoint(s.pos, v)),
        d,
      ]),
      ReadonlyArray.filter(([v, _]) => v === CellState.Living),
      ReadonlyArray.map(([_, d]) => d),
      ReadonlySet.fromReadonlyArray({
        equals: (a: Direction, b: Direction) => a === b,
      }),
    );
})();

export const applyRule =
  (rule: StateChangeRule) =>
  (s: Store.Store<Point, CellState>): CellState => {
    const state = s.peek(s.pos);
    return updateCell(state, rule(state, getNeighbors(s)));
  };

export const advanceStore = (rule: StateChangeRule) =>
  Store.extend(applyRule(rule));
