import { describe, expect, it } from "@jest/globals";
import {
  fromFrames,
  imageFromText,
  overlay,
  textBoundingBox,
  translate,
} from "./domain";
import { renderToLines } from "./view";

/*
const traceImage =
  <T>(i: Image<T>) =>
  (p: Point) => {
    const r = i(p);
    console.log(`${p.x}, ${p.y}: ${JSON.stringify(r)}`);
    return r;
  };
*/

describe("images", () => {
  const image = imageFromText("hello");
  const spaceIsTransparent = (bottom: string, top: string) =>
    top !== " " ? top : bottom;
  describe("imageFromText", () => {
    it("makes an image from the text", () => {
      expect(image({ x: 0, y: 0 })).toStrictEqual("h");
      expect(image({ x: 1, y: 0 })).toStrictEqual("e");
      expect(image({ x: 2, y: 0 })).toStrictEqual("l");
      expect(image({ x: 3, y: 0 })).toStrictEqual("l");
      expect(image({ x: 4, y: 0 })).toStrictEqual("o");
    });
    it("returns space for positions without a character", () => {
      expect(image({ x: 10, y: 0 })).toStrictEqual(" ");
      expect(image({ x: 0, y: 10 })).toStrictEqual(" ");
    });
  });
  describe("translate", () => {
    it("moves an image around", () => {
      const translated = translate({ x: 1, y: 2 })(image);

      expect(translated({ x: 0, y: 0 })).toStrictEqual(" ");
      expect(translated({ x: 1, y: 0 })).toStrictEqual(" ");
      expect(translated({ x: 2, y: 0 })).toStrictEqual(" ");
      expect(translated({ x: 3, y: 0 })).toStrictEqual(" ");
      expect(translated({ x: 4, y: 0 })).toStrictEqual(" ");

      expect(translated({ x: 1, y: 2 })).toStrictEqual("h");
      expect(translated({ x: 2, y: 2 })).toStrictEqual("e");
      expect(translated({ x: 3, y: 2 })).toStrictEqual("l");
      expect(translated({ x: 4, y: 2 })).toStrictEqual("l");
      expect(translated({ x: 5, y: 2 })).toStrictEqual("o");
    });
  });
  describe("overlay", () => {
    it("puts on image on top of another", () => {
      const another = imageFromText("world");
      const overlayed = overlay((a, b) => b)(image)(another);
      expect(overlayed({ x: 0, y: 0 })).toStrictEqual("w");
      expect(overlayed({ x: 1, y: 0 })).toStrictEqual("o");
      expect(overlayed({ x: 2, y: 0 })).toStrictEqual("r");
      expect(overlayed({ x: 3, y: 0 })).toStrictEqual("l");
      expect(overlayed({ x: 4, y: 0 })).toStrictEqual("d");
    });
  });
  describe("renderToLines", () => {
    it("renders an image of a single row", () => {
      const boundingBox = {
        topLeft: { x: 0, y: 0 },
        bottomRight: { x: 5, y: 1 },
      };
      expect(renderToLines(image, boundingBox)).toStrictEqual(["hello"]);
    });
    it("renders an image of two rows", () => {
      const boundingBox = {
        topLeft: { x: 0, y: 0 },
        bottomRight: { x: 5, y: 2 },
      };
      const tallImage = overlay(spaceIsTransparent)(
        translate({ x: 0, y: 1 })(imageFromText("world")),
      )(image);
      expect(renderToLines(tallImage, boundingBox)).toStrictEqual([
        "hello",
        "world",
      ]);
    });
  });
});

describe("animations", () => {
  describe("fromFrames", () => {
    const animation = fromFrames([
      [0, imageFromText("Hello")],
      [0.5, imageFromText("World")],
    ]);
    it("makes an animation consisting of the given frames", () => {
      expect(
        renderToLines(animation(0.25).image, textBoundingBox("Hello")),
      ).toStrictEqual(["Hello"]);
      expect(
        renderToLines(animation(0.75).image, textBoundingBox("World")),
      ).toStrictEqual(["World"]);
    });
    it("gives the correct completion proportion for the next frame", () => {
      expect(animation(0.25).nextChange).toStrictEqual(0.5);
      expect(animation(0.75).nextChange).toStrictEqual(1.0);
    });
  });
});
