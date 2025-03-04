import { Applicative1 } from "fp-ts/lib/Applicative";
import { Functor1 } from "fp-ts/lib/Functor";

/**
 * Denote a value which is computed through a number of iterations.
 */
export type Iterated<A> = {
  iteration: number;
  value: A;
};

export const URI = "Iterated";

export type URI = typeof URI;

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly Iterated: Iterated<A>;
  }
}

export const iteratedFunctor: Functor1<URI> = {
  URI,
  map: <A, B>({ iteration, value }: Iterated<A>, f: (a: A) => B) => ({
    iteration: iteration + 1,
    value: f(value),
  }),
};

export const iteratedApplicative: Applicative1<URI> = {
  ...iteratedFunctor,
  ap: (fab, fa) => ({
    iteration: fab.iteration + fa.iteration,
    value: fab.value(fa.value),
  }),
  of: (a) => ({ iteration: 0, value: a }),
};

/**
 * Lift a function to `Iterated`.
 */
export const liftIterated =
  <A, B>(f: (a: A) => B): ((a: Iterated<A>) => Iterated<B>) =>
  ({ iteration, value }: Iterated<A>) => ({
    iteration: iteration + 1,
    value: f(value),
  });

export const liftA2 =
  <A, B, C>(f: (a: A, b: B) => C) =>
  (fa: Iterated<A>, fb: Iterated<B>) => ({
    iteration: fa.iteration + fb.iteration,
    value: f(fa.value, fb.value),
  });
