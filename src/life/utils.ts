import { Effect, flow } from "effect";
import { pipe } from "fp-ts/lib/function";
import { range } from "fp-ts/lib/NonEmptyArray";
import { Array } from "effect";
import * as ReadonlyArray from "fp-ts/lib/ReadonlyArray";
import * as Ord from "fp-ts/lib/Ord";
import { isLeft } from "effect/Either";

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
  (handler: Effect.Effect<void, Error, never>) =>
  <R, C>(program: Effect.Effect<R, Error, C>): Effect.Effect<R, Error, C> =>
    pipe(
      program,
      Effect.either,
      Effect.andThen((result) =>
        pipe(
          handler,
          Effect.andThen(() => {
            if (isLeft(result)) {
              throw result.left;
            } else {
              return result;
            }
          }),
        ),
      ),
    );

/**
 * Order tuples by the order of their first element only.
 */
const ordTuple = Ord.fromCompare<readonly [number, unknown]>((a, b) =>
  a[0] < b[0] ? -1 : a[0] === b[0] ? 0 : 1,
);
