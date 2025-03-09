import { isSome, none, some } from "fp-ts/lib/Option";
import { Parser } from "./parser";

/**
 * Always fail to parse.
 */
export const fail = <T>(): Parser<T> => ({
  run: (/* s: string */) => none,
});

/**
 * Match exactly the given string.
 */
export const str = (target: string): Parser<string> => ({
  run: (candidate: string) => {
    if (candidate.startsWith(target)) {
      return some({
        result: target,
        remaining: candidate.substring(target.length),
      });
    }
    return none;
  },
});

/**
 * Match if any of the given parsers matches, preferring those closer to the
 * start of the array ("left biased").
 */
export const oneOf = <T>(options: readonly Parser<T>[]): Parser<T> => ({
  run: (candidate: string) => {
    for (const p of options) {
      const r = p.run(candidate);
      if (isSome(r)) {
        return r;
      }
    }
    return none;
  },
});

/**
 * Match the given Parser zero or more times and produce an array of the results.
 */
export const zeroOrMore = <T>(p: Parser<T>): Parser<readonly T[]> => ({
  run: (candidate: string) => {
    const first = p.run(candidate);
    if (isSome(first)) {
      const rest = zeroOrMore(p).run(first.value.remaining);
      if (isSome(rest)) {
        return some({
          result: [first.value.result].concat(rest.value.result),
          remaining: rest.value.remaining,
        });
      } else {
        return some({
          result: [first.value.result],
          remaining: first.value.remaining,
        });
      }
    } else {
      return some({
        result: [],
        remaining: candidate,
      });
    }
  },
});

export const sequenceRight =
  <A, B>(left: Parser<A>) =>
  (right: Parser<B>): Parser<B> => ({
    run: (s: string) => {
      const first = left.run(s);
      if (isSome(first)) {
        return right.run(first.value.remaining);
      }
      return first;
    },
  });
