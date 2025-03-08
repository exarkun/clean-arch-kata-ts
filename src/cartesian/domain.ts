import * as Eq from "fp-ts/Eq";
import * as Number from "fp-ts/number";

/**
 * Denote a point in two dimensions (eg in ℕ² or ℝ²).
 *
 * TypeScript's only numeric type is 'number' so this
 * is somewhat imprecisely represented.
 */
export type Point = Readonly<{ x: number; y: number }>;

export const eqPoint = Eq.struct({
  x: Number.Eq,
  y: Number.Eq,
});

/**
 * Denote vector addition in two dimensions.
 */
export const addPoint = (p1: Point) => (p2: Point): Point => ({
  x: p1.x + p2.x,
  y: p1.y + p2.y,
});

/**
 * Denote a subset of a two dimensional space.
 */
export type Region = (p: Point) => boolean;

/**
 * Denote a rectangle defined by two opposite corners.
 */
export type Rectangle = {
  topLeft: Point;
  bottomRight: Point;
};

/**
 * Define a rectangular Region of finite extent anchored at the origin.
 */
export const rectangle = (width: number, height: number): Region => {
  return ({ x, y }: Point) => {
    return x >= 0 && x < width && y >= 0 && y < height;
  };
};
