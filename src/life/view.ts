import { Effect } from "effect";
import { Board, CellState } from "./domain";
import { match } from "ts-pattern";
import { compose } from "effect/Function";

/**
 * Denote presentation of the given board state.
 */
export type Present = (board: Board) => Effect.Effect<void, Error, never>;

const replicate = (s: string, n: number): string =>
  n <= 0 ? "" : s + replicate(s, n - 1);

const formatCell = (cell: CellState): string =>
  match(cell)
    .with(CellState.Dead, () => "  ")
    .with(CellState.Living, () => "● ")
    .exhaustive();

export const simpleRectangleConsolePresenter =
  (width: number, height: number): Present =>
  (board: Board) => {
    const topBorder = "/" + replicate("--", width) + "\\";
    const bottomBorder = "\n\\" + replicate("--", width) + "/\n";
    const sideBorder = "|";
    const nextLine = "\n";

    return Effect.sync(() => {
      process.stdout.write(topBorder);
      for (let y = 0; y < height; ++y) {
        process.stdout.write(nextLine + sideBorder);
        for (let x = 0; x < width; ++x) {
          process.stdout.write(compose(formatCell)(board)({ x, y }));
        }
        process.stdout.write(sideBorder);
      }
      process.stdout.write(bottomBorder);
    });
  };
