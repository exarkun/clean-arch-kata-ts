import * as E from "fp-ts/Either";
import { Functor1 } from "fp-ts/Functor";
import { isNone, Option, some } from "fp-ts/Option";
import { Applicative1 } from "fp-ts/lib/Applicative";
import { Monad1 } from "fp-ts/lib/Monad";
import { isSome, none } from "fp-ts/lib/Option";

// A generic type (or polymorphic type, or type function) of values which can parse a string somehow.
// It is parameterized on the type of values it can parse.
export type Parser<T> = {
  run: (s: string) => ParseResult<T>;
};

// The result of a parse: if the parse succeeds, some parsed value and any leftover string;
// if the parse fails, none.
export type ParseResult<T> = Option<{
  result: T;
  remaining: string;
}>;

// fp-ts boilerplate for making thoroughly type-checked Functor and Applicative instances for
// our Parser type.
export const URI = "Parser";

export type URI = typeof URI;
declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly Parser: Parser<A>;
  }
}

// The Functor for a Parser maps a function over the *result* of the parse.
//
// map(intParser, (n: number) => n + 1) parses to a value one greater than
// whatever value the string would typically represent.
export const parserFunctor: Functor1<URI> = {
  URI,
  map: <A, B>(p: Parser<A>, f: (a: A) => B): Parser<B> => ({
    run: (s: string): ParseResult<B> => {
      const parsed = p.run(s);
      if (isSome(parsed)) {
        return some({
          result: f(parsed.value.result),
          remaining: parsed.value.remaining,
        });
      }
      return none;
    },
  }),
};

// The Applicative for a Parser extends the Functor so we can use arbitrary n-ary functions
// during the parse.
//
// const fbc = map(intParser, (n: number) => (m: number) => n + m))
// This leaves us with an f of type Parser<(m: number) => number>.
//
// The Applicative lets us do something further with this:
//
// const fc = ap(fbc, intParser)
//
// This gives us fc of type Parser<number> with a behavior that it parses two integers and
// its result is their sum.
export const parserAp: Applicative1<URI> = {
  ...parserFunctor,
  of: <A>(a: A): Parser<A> => ({
    run: (s: string) =>
      some({
        result: a,
        remaining: s,
      }),
  }),
  ap: <A, B>(fab: Parser<(a: A) => B>, fa: Parser<A>): Parser<B> => ({
    run: (s: string) => {
      const ab = fab.run(s);
      if (isSome(ab)) {
        const a = fa.run(ab.value.remaining);
        if (isSome(a)) {
          return some({
            result: ab.value.result(a.value.result),
            remaining: a.value.remaining,
          });
        }
      }
      return none;
    },
  }),
};

export const parserMonad: Monad1<URI> = {
  ...parserAp,
  chain: <A, B>(ma: Parser<A>, f: (a: A) => Parser<B>): Parser<B> => ({
    run: (s: string): ParseResult<B> => {
      const first = ma.run(s);
      if (isSome(first)) {
        const next = f(first.value.result);
        return next.run(first.value.remaining);
      }
      return none;
    },
  }),
};

/**
 * Run a parser on a string and return the result.
 *
 * This is a convenience function on top of Parser.run which turns left-over input
 * into an error.
 */
export const parse = <T>(p: Parser<T>, s: string): E.Either<string, T> => {
  const runResult = p.run(s);
  if (isNone(runResult)) {
    return E.left("input not matched");
  } else if (runResult.value.remaining !== "") {
    return E.left(
      "some content unmatched: " + JSON.stringify(runResult.value.remaining),
    );
  } else {
    return E.right(runResult.value.result);
  }
};
