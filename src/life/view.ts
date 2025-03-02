import { Effect } from "effect";
import { Board, CellState, Iterated } from "./domain";
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
 * Denote an Effect which presents the given board state.
 */
export type Present<A> = {
  setup: Effect.Effect<void, Error, never>;
  present: (value: A) => Effect.Effect<void, Error, never>;
  cleanup: Effect.Effect<void, Error, never>;
};

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

/**
 * Create a rectangular Board Presenter with the given dimensions and decorations.
 */
export const simpleRectangleConsolePresenter = (
  width: number,
  height: number,
  decorations: BorderDecorations,
): Present<Iterated<Board>> => {
  const toString = boardToString(width, height, decorations);
  return {
    setup: Effect.sync(() => {
      ANSITerminal.clear();
      ANSITerminal.hideCursor();
    }),
    present: (board: Iterated<Board>) =>
      Effect.sync(() => {
        ANSITerminal.home();
        ANSITerminal.write(toString(board));
      }),
    cleanup: Effect.sync(() => {
      ANSITerminal.showCursor();
    }),
  };
};

const ANSITerminal = {
  clear: () => process.stdout.write("\x1B[2J"),
  home: () => process.stdout.write("\x1B[H"),
  write: (s: string) => process.stdout.write(s),
  showCursor: () => process.stdout.write("\x1b[?25h"),
  hideCursor: () => process.stdout.write("\x1b[?25l"),
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

/**
 * Define a rendering of a Board to a string.
 *
 * Only the part of the board that falls within (0,0) - (width - 1,height - 1) will be rendered.
 */
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
  const makeTopBorder = (label: string) => {
    const fillSize = (width - 2 - label.length / 2) / 2;
    const prefix = replicate(horizontal, Math.floor(fillSize));
    const suffix = replicate(horizontal, Math.ceil(fillSize));
    return Writer.tell([
      topLeftCorner,
      prefix,
      "┤ ",
      label,
      " ├",
      suffix,
      topRightCorner,
    ]);
  };
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

  return ({ iteration, value }: Iterated<Board>): string =>
    pipe(
      [
        makeTopBorder(`Generation ${iteration.toString().padStart(5)}`),
        pipe(ys, traverse(renderForWidth(value)), voidW),
        bottomBorder,
      ],
      sequence,
      Writer.execute,
      fold,
    );
};

/**
 * Render one row of a Board as a string.
 *
 * Only cells that fall within (0, width - 1) will be rendered.
 */
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
