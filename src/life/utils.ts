import { Array, Effect, flow } from "effect";
import { isLeft } from "effect/Either";
import { pipe } from "fp-ts/lib/function";
import { range } from "fp-ts/lib/NonEmptyArray";
import * as Ord from "fp-ts/lib/Ord";
import * as ReadonlyArray from "fp-ts/lib/ReadonlyArray";
import seedrandom from "seedrandom";

/**
 * Create an Effect which produces a new pseudo-random number each
 * time it is evaluated.
 */
export const randomEffect = (seed: string) => {
  const prng = seedrandom(seed);
  return Effect.sync(prng);
};

/**
 * Re-arrange the elements of an array based on the output of a PRNG.
 */
export const shuffle =
  (prng: Effect.Effect<number, never, never>) =>
  <X>(xs: X[]): Effect.Effect<X[], never, never> => {
    return pipe(
      Effect.replicateEffect(xs.length)(prng),
      Effect.andThen(
        flow(
          ReadonlyArray.zip(range(0, xs.length)),
          ReadonlyArray.sort(ordTuple),
          Array.map((pair) => xs[pair[1]]),
        ),
      ),
    );
  };

export const replicate = (s: string, n: number): string =>
  n <= 0 ? "" : s + replicate(s, n - 1);

export const finally_ =
  <C, E1>(handler: Effect.Effect<void, E1, C>) =>
  <R, E2>(program: Effect.Effect<R, E2, C>): Effect.Effect<R, E1 | E2, C> =>
    pipe(
      program,
      Effect.either,
      Effect.andThen((result) => pipe(handler, Effect.andThen(result))),
    );

/**
 * Call a function and perform the resulting Effect some number of times,
 * using the result of each Effect as the argument to the function call
 * next time.
 */
export const iterateEffect = <S, E extends Error>(
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
 * Order tuples by the order of their first element only.
 */
const ordTuple = Ord.fromCompare<readonly [number, unknown]>((a, b) =>
  a[0] < b[0] ? -1 : a[0] === b[0] ? 0 : 1,
);
