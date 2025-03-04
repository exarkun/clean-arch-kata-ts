/**
 * Text-based animations.
 */

import { ReadonlyNonEmptyArray } from "fp-ts/lib/ReadonlyNonEmptyArray";
import * as ReadonlyArray from "fp-ts/lib/ReadonlyArray";
import { Point } from "src/cartesian/domain";
import { pipe } from "fp-ts/lib/function";

/**
 * An image is a function a two dimensional point
 * to a value of some type.
 *
 * ⟦Image<T>⟧ ⇒ ℝ² → T
 */
export type Image<T> = (p: Point) => T;

/**
 * A constant image is an image with the same value everywhere.
 */
export const constantImage =
  <T>(blank: T): Image<T> =>
  () =>
    blank;

/**
 * A proportion is a number in [0..1] where 0 denotes none of a
 * thing, 1 denotes all of a thing, and values in between denote
 * a linearly proportional quantity of the thing.
 */
export type Proportion = number;

/**
 * An animation is a time-varying image.
 *
 * The time-varying value is given as a Proportion of the completeness
 * of the animation (i.e., given 0 the result is the start of the
 * animation, given 0.5 the result is the exact middle of the animation,
 * and given 1 the result is the end of the animation).
 *
 * ⟦Animation<T>⟧ ⇒ Proportion -> ⟦Image<T>⟧
 */
export type Animation<T> = (t: Proportion) => {
  // The image for the animation at the given completeness proportion.
  image: T;
  // The next proportion greater than 't' where the animation could have
  // a new image.  For simple animations this can help avoid unnecessary
  // re-renders when nothing has changed.
  nextChange: Proportion;
};

/**
 * Construct an animation out of a finite sequence of images and
 * corresponding animation completeness proportions where that image
 * begins.
 *
 * The frames should be given in the order in which they appear in
 * the animation.
 */
export const fromFrames = <T>(
  frames: ReadonlyNonEmptyArray<readonly [Proportion, T]>,
): Animation<T> => {
  return (t: Proportion) => {
    if (t < 0 || t > 1) {
      throw new TypeError(`Proportion out of bounds: ${t}`);
    }
    const { init, rest } = pipe(
      frames,
      ReadonlyArray.spanLeft(([p]) => p <= t),
    );
    return {
      // There may not be a next change if this is the last frame.
      // We can say the next change is at the end of the animation.
      nextChange: rest?.[0]?.[0] ?? 1,
      // There will always be some elements in init if 'frames'
      // was constructed correctly.
      image: init[init.length - 1][1],
    };
  };
};

export const imageFromText =
  (s: string): Image<string> =>
  (p: Point) => {
    if (p.x >= 0 && p.x < s.length && p.y >= 0 && p.y < 1) {
      return s[Math.floor(p.x)];
    } else {
      return " ";
    }
  };

export const textBoundingBox = (s: string) => ({
  topLeft: { x: 0, y: 0 },
  bottomRight: { x: s.length, y: 1 },
});

/**
 * Perform a linear transformation of an image by the given amount.
 */
export const translate =
  (amount: Point) =>
  <T>(i: Image<T>): Image<T> =>
  (p: Point): T =>
    i({ x: p.x - amount.x, y: p.y - amount.y });

export const overlay =
  <T>(blend: (bottom: T, top: T) => T) =>
  (bottom: Image<T>) =>
  (top: Image<T>) =>
  (p: Point) =>
    blend(bottom(p), top(p));
