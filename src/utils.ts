import * as Writer from "fp-ts/Writer";
import * as String from "fp-ts/string";
import * as ReadonlyArray from "fp-ts/ReadonlyArray";
import { identity } from "fp-ts/lib/function";
import { Kind2, URItoKind2 } from "fp-ts/HKT";
import { Monad2C } from "fp-ts/lib/Monad";

const StringArrayWriterMonad = Writer.getMonad(
  ReadonlyArray.getMonoid<string>(),
);

const void_ =
  <F extends keyof URItoKind2<E, A>, E, A>(f: Monad2C<F, E>) =>
  (fa: Kind2<F, E, A>): Kind2<F, E, void> =>
    f.map(fa, () => undefined);

export const StringArrayWriter = {
  Monad: StringArrayWriterMonad,
  traverse: ReadonlyArray.traverse(StringArrayWriterMonad),
  sequence: ReadonlyArray.sequence(StringArrayWriterMonad),
  fold: ReadonlyArray.foldMap(String.Monoid)<string>(identity),
  void: void_(StringArrayWriterMonad),
};

export const uncurry =
  <A, B, C>(f: (a: A, b: B) => C): ((a: A) => (b: B) => C) =>
  (a) =>
  (b) =>
    f(a, b);
