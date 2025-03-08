import { Point } from "@/cartesian/domain";
import { compose } from "effect/Function";
import * as ReadonlyArray from "fp-ts/ReadonlyArray";
import * as Store from "fp-ts/Store";
import {
    allDirections,
    CellState,
    move,
    StateChangeRule,
    updateCell,
} from "../domain";

// export const URI = "Board";

// export type URI = typeof URI;

export type Board<T> = {
  width: number;
  height: number;
  cells: ReadonlyArray<T>;
};

// declare module "fp-ts/HKT" {
//   interface URItoKind<A> {
//     readonly Board: Board<A>;
//   }
// }

export const getStore = <A>({
  width,
  height,
  cells,
}: Board<A>): Store.Store<Point, A> => ({
  pos: { x: 0, y: 0 },
  peek: ({ x, y }) => cells[y * width + (x % (width * height))],
});

const getNeighbors = (() => {
  const getNeighbors = (p: Point) => allDirections.map((d) => move(d, p));
  const experiment = Store.experiment(ReadonlyArray.Functor)(getNeighbors);
  const onlyLiving = ReadonlyArray.filter((s) => s === CellState.Living);
  const length = <A>(a: readonly A[]) => a.length;
  return compose(compose(experiment<CellState>, onlyLiving), length);
})();

export const applyRule =
  (rule: StateChangeRule) =>
  (s: Store.Store<Point, CellState>): CellState => {
    const state = Store.extract(s);
    return updateCell(state, rule(state, getNeighbors(s)));
  };

export const advanceStore = (rule: StateChangeRule) =>
  Store.extend(applyRule(rule));
