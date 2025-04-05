import {
    fromFrames,
    Image,
    imageFromText,
    overlay,
    translate,
} from "@/animation/domain";
import { ANSITerminal, present } from "@/animation/view";
import { Point } from "@/cartesian/domain";
import { Effect } from "effect";
import { compose } from "effect/Function";
import { pipe } from "fp-ts/lib/function";
import { match } from "ts-pattern";
import { Iterated } from "../iterated";
import { Board, CellDifference, CellState, subtractBoard } from "./domain";

/**
 * Give the ratio of size of rows to columns of the display so we can
 * make sure that a square board is presented as visually square.
 */
const aspectRatio = 2;

/**
 * Correct an image for the aspect ratio of text common on most terminals.
 *
 * This differs from `scale` in that text (on a terminal) is not *easily* scalable
 * so we make the correction by inserting a fill character instead of resizing any
 * individual image elements.
 *
 * Note only integer aspect ratios are actually supported.
 */
const stretch =
  (aspectRatio: number) =>
  (fill: string) =>
  (b: Image<string>): Image<string> =>
  ({ x, y }: Point) =>
    Math.floor(x) % aspectRatio === 0 ? b({ x: x / aspectRatio, y }) : fill;

/**
 * Correct an image for the expected aspect ratio using space as the fill
 * character.
 */
const fixAspectRatio = stretch(aspectRatio)(" ");

/**
 * Make a rectangular bounding box, accounting for the aspect ratio, with
 * its top-left corner at the origin.
 */
const rectangle = ({
  aspectRatio,
  width,
  height,
}: {
  aspectRatio: number;
  width: number;
  height: number;
}) => ({
  topLeft: { x: 0, y: 0 },
  bottomRight: { x: width * aspectRatio, y: height },
});

/**
 * Denote an Effect which presents the given board state.
 */
export type Animator<A> = {
  setup: Effect.Effect<void, Error, never>;
  step: <E, C>(
    prev: Iterated<A>,
    next: Iterated<A>,
  ) => Effect.Effect<void, E, C>;
  cleanup: Effect.Effect<void, Error, never>;
};

export const managedTerminal = <T>(a: Animator<T>): Animator<T> => ({
  setup: Effect.sync(() => {
    ANSITerminal.clear();
    ANSITerminal.hideCursor();
  }),
  cleanup: Effect.sync(() => {
    ANSITerminal.showCursor();
  }),
  step: a.step,
});

export const makeStatic = (
  width: number,
  height: number,
  makeOverlay: (iteration: number) => Image<string>,
  timePerGeneration: number,
): Animator<Board> => {
  const boundingBox = rectangle({ aspectRatio, width, height });
  return managedTerminal({
    setup: Effect.succeed(null),
    cleanup: Effect.succeed(null),
    step: (_: Iterated<Board>, next: Iterated<Board>) => {
      const img = fromFrames([
        [0, fixAspectRatio(boardToImage(formatLiving, next.value))],
      ]);
      return pipe(
        present(boundingBox, img, timePerGeneration),
        Effect.andThen(next),
      );
    },
  });
};

export const makeAnimator = (
  width: number,
  height: number,
  // TODO: Animator should be a Functor?  Or perhaps Animation?
  // To overlay something, you should fmap flip(over)(something)...
  // For now, manual.
  makeOverlay: (iteration: number) => Image<string>,
  timePerGeneration: number,
): Animator<Board> => {
  const boundingBox = rectangle({ aspectRatio, width, height });
  return managedTerminal({
    setup: Effect.succeed(null),
    cleanup: Effect.succeed(null),
    step: <E, C>(
      prev: Iterated<Board>,
      next: Iterated<Board>,
    ): Effect.Effect<Iterated<Board>, E, C> => {
      const deaths = subtractBoard(next.value, prev.value);
      const label = translate({ x: 10, y: 0 })(
        imageFromText(`Generation ${next.iteration.toString().padStart(5)}`),
      );
      const overlay = over(makeOverlay(next.iteration))(label);
      const prevImage = fixAspectRatio(boardToImage(formatLiving, prev.value));
      const deathImage = fixAspectRatio(boardToImage(formatDeath, deaths));
      const nextImage = fixAspectRatio(boardToImage(formatLiving, next.value));
      const transitionImage = over(deathImage)(nextImage);
      const animation = fromFrames([
        [0.0, over(prevImage)(overlay)],
        [0.5, over(transitionImage)(overlay)],
      ]);
      return pipe(
        present(boundingBox, animation, timePerGeneration),
        Effect.map(() => next),
      );
    },
  });
};

const transparentSpace = (bottom: string, top: string) =>
  top === " " ? bottom : top;
const over = overlay(transparentSpace);

export const boardToImage = <T>(
  formatter: (t: T) => string,
  board: (p: Point) => T,
): Image<string> => compose(board, formatter);

/**
 * Represent the visual presentation of an outer rectangular border.
 */
export type BorderDecorations<T> = {
  horizontal: T;
  vertical: T;
  topLeftCorner: T;
  topRightCorner: T;
  bottomLeftCorner: T;
  bottomRightCorner: T;
  nothing: T;
};

/**
 * Make a pretty rectangular border.
 *
 * For maximum image fidelity, this internally accounts for the aspect ratio
 * rather than requiring it be transformed afterwards.  This is something of
 * an abstraction violation.  How could it be better?
 */
export const borderImage =
  <T>(
    width: number,
    height: number,
    decorations: BorderDecorations<T>,
  ): Image<T> =>
  ({ x, y }: Point) => {
    type X = "Left" | "Center" | "Right";
    type Y = "Top" | "Center" | "Bottom";

    const classify = <T>(
      limit: number,
      low: T,
      center: T,
      high: T,
      a: number,
    ): T => {
      if (Math.floor(a) === 0) {
        return low;
      } else if (Math.floor(a) === limit - 1) {
        return high;
      } else {
        return center;
      }
    };
    const cx = classify<X>(width * aspectRatio, "Left", "Center", "Right", x);
    const cy = classify<Y>(height, "Top", "Center", "Bottom", y);
    return match([cx, cy])
      .with(["Left", "Top"], () => decorations.topLeftCorner)
      .with(["Left", "Center"], () => decorations.vertical)
      .with(["Left", "Bottom"], () => decorations.bottomLeftCorner)
      .with(["Center", "Top"], () => decorations.horizontal)
      .with(["Center", "Center"], () => decorations.nothing)
      .with(["Center", "Bottom"], () => decorations.horizontal)
      .with(["Right", "Top"], () => decorations.topRightCorner)
      .with(["Right", "Center"], () => decorations.vertical)
      .with(["Right", "Bottom"], () => decorations.bottomRightCorner)
      .exhaustive();
  };

export const formatLiving = (cell: CellState): string =>
  match(cell)
    .with(CellState.Living, () => "●")
    .otherwise(() => " ");

export const formatDeath = (d: CellDifference) =>
  match(d)
    .with(CellDifference.Death, () => "◌")
    .otherwise(() => " ");

export const decorations = {
  simple: {
    horizontal: "-",
    vertical: "|",
    topLeftCorner: "/",
    topRightCorner: "\\",
    bottomLeftCorner: "\\",
    bottomRightCorner: "/",
    nothing: " ",
  },
  fancy: {
    horizontal: "─",
    vertical: "│",
    topLeftCorner: "╭",
    topRightCorner: "╮",
    bottomLeftCorner: "╰",
    bottomRightCorner: "╯",
    nothing: " ",
  },
};
