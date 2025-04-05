import { Iterated } from "@/iterated";
import { Console, Stream } from "effect";
import { Functor1 } from "fp-ts/lib/Functor";
import { match } from "ts-pattern";
import { Board, boardToBigNum } from "./domain";

type Cycle<A> = { tag: "cycle"; length: number; value: A };
type Limited<A> = { tag: "limited"; value: A };
export type Completion<A> = Cycle<A> | Limited<A>;

type Incomplete<A> = { tag: "incomplete"; value: A };
export type Simulation<A> = Incomplete<A> | Completion<A>;

export const URI = "Simulation";
export type URI = typeof URI;

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly Simulation: Simulation<A>;
  }
}

export const simulationFunctor: Functor1<URI> = {
  URI,
  map: <A, B>(simulation: Simulation<A>, f: (a: A) => B) => ({
    ...simulation,
    value: f(simulation.value),
  }),
};

export const map =
  <A, B>(f: (a: A) => B) =>
  (simulation: Simulation<A>) =>
    simulationFunctor.map(simulation, f);

export const incomplete = <A>(value: A): Incomplete<A> => ({
  tag: "incomplete",
  value,
});

export const cycle = <A>(value: A, length: number): Cycle<A> => ({
  tag: "cycle",
  value,
  length,
});

export const limited = <A>(value: A): Limited<A> => ({
  tag: "limited",
  value,
});

export const checkCompletion = (
  maxTurns: number,
  width: number,
  height: number,
) => {
  const checkMaxTurns = (sim: Simulation<Iterated<Board>>) => {
    if (sim.value.iteration >= maxTurns) {
      return limited(sim.value);
    }
    return sim;
  };

  type S = [readonly bigint[], Simulation<Iterated<Board>>];

  const checkCycling = (
    recent: readonly bigint[],
    sim: Simulation<Iterated<Board>>,
  ): S => {
    const n = boardToBigNum(width, height)(sim.value.value);
    const idx = recent.indexOf(n);
    if (idx === -1) {
      // Not seen recently, leave the simulation state alone.
      return [[n, ...recent].slice(0, 100), sim];
    } else {
      // A cycle has been detected
      return [recent, cycle(sim.value, idx + 1)];
    }
  };

  const checkAll = (
    recent: readonly bigint[],
    sim: Simulation<Iterated<Board>>,
  ) => checkCycling(recent, checkMaxTurns(sim));

  return Stream.mapAccum([], checkAll);
};

export const reportCompletion = (result: Completion<Iterated<Board>>) =>
  Console.log(
    match(result)
      .with(
        { tag: "cycle", length: 0 },
        () => `Board settled after ${result.value.iteration} turns.`,
      )
      .with(
        { tag: "cycle" },
        ({ length }) =>
          `Board entered cycle of length ${length} after ${result.value.iteration} turns.`,
      )
      .with(
        { tag: "limited" },
        () =>
          `Game ended after max (${result.value.iteration}) turns without settling.`,
      )
      .exhaustive(),
  );

export const isComplete = <A>(sim: Simulation<A>): sim is Completion<A> =>
  sim.tag === "cycle" || sim.tag === "limited";
