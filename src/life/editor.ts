import { addPoint, eqPoint, Point } from "@/cartesian/domain";
import { Array, Chunk, Effect, Option, pipe, Sink, Stream } from "effect";
import readline from "readline";
import { match } from "ts-pattern";
import * as Iterated from "../iterated";
import { Board, CellState, emptyBoard } from "./domain";
import { Animator } from "./view";

/**
 * An effect which accepts user interactions to specify the initial state of a
 * board.
 */
export const manuallySpecifiedBoard = (
  width: number,
  height: number,
  renderer: Animator<Board>,
): Effect.Effect<Board, never, never> => {
  const s: Effect.Effect<Board, never, never> = pipe(
    // Create a stream of user input commands
    consoleInputStream(),
    
    Stream.map(parseKeypress),
    Stream.filter(Option.isSome),
    Stream.map(Option.getOrThrow),

    // Fold over the stream updating the state based on the input
    //   - The state is a board and a cursor position
    //   - The board is initially blank, cursor is initially 0, 0
    //   - arrow keys move the cursor, bounded within the width / height
    //   - spacebar toggles the board state at the current position
    //   - q is the completion command
    Stream.mapAccum(newEditor, applyCommand),

    // Render the new board state
    Stream.tap(({ living }) => {
      // We could count the edits made in an Iterated but not bothering for
      // now.
      const it = Iterated.Applicative.of<Board>(boardOfArray(living));
      return renderer.step<never, never>(it, it);
    }),

    // Drop non-complete editor states
    Stream.dropWhile(({ done }) => !done),

    // Produce the first complete final board state as the result of the
    // Effect.
    Stream.map(({ living }) => boardOfArray(living)),
    Stream.run(Sink.head()),

    // The stream shouldn't be able to end until it has produced one element
    // but we don't know this at the type level.  Go from Option<Board> to
    // Board by just making the empty board the default, but this shouldn't
    // ever really happen.
    Effect.map(Option.getOrElse(() => emptyBoard)),
  );

  return pipe(
    renderer.setup,
    Effect.flatMap(() => s),
    Effect.tap(renderer.cleanup),
  );
};

type EditorState = {
  done: boolean;
  living: readonly Point[];
  cursor: Point;
};

const newEditor: EditorState = {
  done: false,
  living: [],
  cursor: { x: 0, y: 0 },
};

type Move = { tag: "move"; x: number; y: number };
const move = ({ x, y }: { x: number; y: number }): Move => ({
  tag: "move",
  x,
  y,
});

type Toggle = { tag: "toggle" };
const toggle: Toggle = { tag: "toggle" };

type Quit = { tag: "quit" };
const quit: Quit = { tag: "quit" };

type EditorCommand = Move | Toggle | Quit;

const applyCommand = (
  state: EditorState,
  command: EditorCommand,
): [EditorState, EditorState] =>
  pipe(
    match(command)
      .with({ tag: "move" }, ({ x, y }) => ({
        ...state,
        cursor: addPoint(state.cursor)({ x, y }),
      }))
      .with({ tag: "toggle" }, () => ({
        ...state,
        living: togglePosition(state.cursor)(state.living),
      }))
      .with({ tag: "quit" }, () => ({ ...state, done: true }))
      .exhaustive(),
    (s) => [s, s] as [EditorState, EditorState],
  );

const togglePosition =
  (p: Point) =>
  (ps: readonly Point[]): readonly Point[] => {
    const removed = pipe(
      ps,
      Array.filter((pc) => !eqPoint.equals(pc, p)),
    );
    if (removed.length !== ps.length) {
      // Something was removed, so the point was in the array, so return the
      // array with it removed.
      return removed;
    } else {
      // Nothing was removed so the point wasn't in the array so add it.
      return Array.append(p)(ps);
    }
  };

const parseKeypress = (press: Keypress): Option.Option<EditorCommand> =>
  match(press)
    .with({ key: { name: "left" } }, () => Option.some(move({ x: -1, y: 0 })))
    .with({ key: { name: "right" } }, () => Option.some(move({ x: 1, y: 0 })))
    .with({ key: { name: "up" } }, () => Option.some(move({ x: 0, y: -1 })))
    .with({ key: { name: "down" } }, () => Option.some(move({ x: 0, y: 1 })))
    .with({ key: { name: "space" } }, () => Option.some(toggle))
    .with({ key: { name: "q" } }, () => Option.some(quit))
    .otherwise(() => Option.none());

type Key /* I hope */ = {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
};

type Keypress = { str: string; key: Key };

const consoleInputStream = (): Stream.Stream<Keypress> => {
  return Stream.acquireRelease(acquireKeypresses(), releaseKeypresses).pipe(
    Stream.flatMap((stdin) => {
      return Stream.async((emit) => {
        stdin.on(
          "keypress",
          (str: string /* I hope */, key: Key /* I hope */) => {
            emit(
              match({ str, key })
                .with({ key: { name: "c", ctrl: true } }, () =>
                  Effect.fail(Option.none()),
                )
                .otherwise(() => Effect.succeed(Chunk.of({ str, key }))),
            );
          },
        );
      });
    }),
  );
};

const acquireKeypresses = () => {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  return Effect.succeed(process.stdin);
};

const releaseKeypresses = (stream: typeof process.stdin) => {
  // https://stackoverflow.com/questions/59220095/node-doesnt-exit-automatically-once-a-listener-is-set-on-stdin
  // Pause at least leaves the possibility that some other part of the
  // program might resume it if it wants more stdin
  stream.pause();
  stream.setRawMode(false);
  return Effect.succeed(null);
};

const boardOfArray = (ps: readonly Point[]) => (p: Point) =>
  Array.containsWith(eqPoint.equals)(p)(ps) ? CellState.Living : CellState.Dead;
