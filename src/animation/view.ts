import { Effect, pipe } from "effect";
import { range } from "effect/Array";
import * as ReadonlyArray from "fp-ts/ReadonlyArray";
import * as Writer from "fp-ts/Writer";
import { Rectangle } from "cartesian/domain";
import { StringArrayWriter as SAW } from "../utils";
import { Animation, Image } from "./domain";

type Seconds = number;

/**
 * Create an Effect that executes the given animation over the given duration
 * and completes when the animation completes.
 */
export const present = (
  animationBoundingBox: Rectangle,
  a: Animation<Image<string>>,
  duration: Seconds,
): Effect.Effect<undefined, never, never> =>
  presentFromTime(animationBoundingBox, a, duration, 0);

export const presentFromTime = (
  animationBoundingBox: Rectangle,
  a: Animation<Image<string>>,
  duration: Seconds,
  elapsed: Seconds,
): Effect.Effect<undefined, never, never> => {
  // Get a frame
  const p = elapsed / duration;
  const { image, nextChange } = a(p);

  // Draw it to something
  ANSITerminal.home();
  ANSITerminal.write(renderToLines(image, animationBoundingBox).join("\n"));

  // Compute time to next frame
  const ms = nextChange * duration;

  // process.stdout.write(`${JSON.stringify({elapsed, duration, nextChange, p, ms})}\n`)

  return pipe(
    // Sleep
    Effect.sleep(ms),
    Effect.flatMap(() =>
      nextChange < 1
        ? // If not yet done, recurse
          presentFromTime(animationBoundingBox, a, duration, ms)
        : // Else, complete
          Effect.succeed(undefined),
    ),
  );
};

export const renderToLines = (
  image: Image<string>,
  imageBoundingBox: Rectangle,
): readonly string[] => {
  const x = pipe(
    range(imageBoundingBox.topLeft.y, imageBoundingBox.bottomRight.y - 1),
    ReadonlyArray.map((y) =>
      pipe(
        range(imageBoundingBox.topLeft.x, imageBoundingBox.bottomRight.x - 1),
        SAW.traverse((x) => Writer.tell([image({ x, y })])),
      ),
    ),
    ReadonlyArray.map(Writer.execute),
    ReadonlyArray.map((xs) => xs.join("")),
  );
  return x;
};

export const ANSITerminal = {
  clear: () => process.stdout.write("\x1B[2J"),
  home: () => process.stdout.write("\x1B[H"),
  write: (s: string) => process.stdout.write(s),
  showCursor: () => process.stdout.write("\x1b[?25h"),
  hideCursor: () => process.stdout.write("\x1b[?25l"),
};
