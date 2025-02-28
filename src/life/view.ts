import { Effect } from "effect";
import { Board, CellState } from "./domain";
import { match } from "ts-pattern";
import { compose } from "effect/Function";
import * as Writer from "fp-ts/Writer";
import * as String from "fp-ts/string";
import * as ReadonlyArray from "fp-ts/ReadonlyArray";
import { range } from "effect/Array";
import { identity, pipe } from "fp-ts/lib/function";
import { Kind2, URItoKind2 } from "fp-ts/HKT";
import { Monad2C } from "fp-ts/lib/Monad";
import { replicate } from "./utils";

/**
 * Denote presentation of the given board state.
 */
export type Present = (board: Board) => Effect.Effect<void, Error, never>;

/**
 * Represent the visual presentation of an outer rectangular border.
 */
export type BorderDecorations = {
  horizontal: string;
  vertical: string;
  topLeftCorner: string;
  topRightCorner: string;
  bottomLeftCorner: string;
  bottomRightCorner: string;
};

export const simpleRectangleConsolePresenter = (
  width: number,
  height: number,
  decorations: BorderDecorations,
): Present => {
  const toString = boardToString(width, height, decorations);
  return (board: Board) =>
    Effect.sync(() => {
      ANSITerminal.home();
      ANSITerminal.write(toString(board));
    });
};

const ANSITerminal = {
  clear: () => process.stdout.write("\x1B[2J"),
  home: () => process.stdout.write("\x1B[H"),
  write: (s: string) => process.stdout.write(s),
};

const formatCell = (cell: CellState): string =>
  match(cell)
    .with(CellState.Dead, () => "  ")
    .with(CellState.Living, () => "● ")
    .exhaustive();

export const decorations = {
  simple: {
    horizontal: "--",
    vertical: "|",
    topLeftCorner: "/",
    topRightCorner: "\\",
    bottomLeftCorner: "\\",
    bottomRightCorner: "/",
  },
  fancy: {
    horizontal: "──",
    vertical: "│",
    topLeftCorner: "╭",
    topRightCorner: "╮",
    bottomLeftCorner: "╰",
    bottomRightCorner: "╯",
  },
};

const boardToString = (
  width: number,
  height: number,
  {
    horizontal,
    vertical,
    topLeftCorner,
    topRightCorner,
    bottomLeftCorner,
    bottomRightCorner,
  }: BorderDecorations,
) => {
  const nextLine = "\n";
  const topBorder = Writer.tell([
    topLeftCorner,
    replicate(horizontal, width),
    topRightCorner,
  ]);
  const bottomBorder = Writer.tell([
    nextLine,
    bottomLeftCorner,
    replicate(horizontal, width),
    bottomRightCorner,
    nextLine,
  ]);
  const sideBorder = vertical;
  const renderForWidth = renderRowString(nextLine, sideBorder, width);
  const ys = range(0, height - 1);

  return (board: Board): string =>
    pipe(
      [
        topBorder,
        pipe(ys, traverse(renderForWidth(board)), voidW),
        bottomBorder,
      ],
      sequence,
      Writer.execute,
      fold,
    );
};

const renderRowString = (
  nextLine: string,
  sideBorder: string,
  width: number,
) => {
  const xs = range(0, width - 1);
  return (board: Board) => {
    const getState = compose(formatCell)(board);
    return (y: number): Writer.Writer<readonly string[], void> =>
      Writer.tell([
        nextLine,
        sideBorder,
        ...ReadonlyArray.map((x: number) => getState({ x, y }))(xs),
        sideBorder,
      ]);
  };
};

const StringArrayWriterM = Writer.getMonad(ReadonlyArray.getMonoid<string>());
const traverse = ReadonlyArray.traverse(StringArrayWriterM);
const sequence = ReadonlyArray.sequence(StringArrayWriterM);
const fold = ReadonlyArray.foldMap(String.Monoid)<string>(identity);
const void_ =
  <F extends keyof URItoKind2<E, A>, E, A>(f: Monad2C<F, E>) =>
  (fa: Kind2<F, E, A>): Kind2<F, E, void> =>
    f.map(fa, () => undefined);
const voidW = void_(StringArrayWriterM);
