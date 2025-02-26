import { Arguments, BuilderCallback, CamelCaseKey, CommandModule } from "yargs";

/**
 * A stricter version of the @types/yargs `ArgumentsCamelCase` type. The `Arguments` and
 * `ArgumentsCamelCase` types allow arbitrary fields. This type allows only those which are
 * explicitly defined.
 */
export type StrictArguments<T = object> = {
  [key in keyof T as key | CamelCaseKey<key>]: T[key];
} & {
  /** Non-option arguments */
  _: Array<string | number>;
  /** The script name or node command */
  $0: string;
};

/**
 * Convenience conditional type for strictly typing a command given the type of its builder.
 */
export type StrictCommandType<T> =
  T extends BuilderCallback<object, infer R>
    ? CommandModule<object, Arguments<R>> & {
        handler: (args: StrictArguments<R>) => void | Promise<void>;
      }
    : never;

/**
 * Convenience conditional type for strictly typing the `args` parameter of a handler.
 */
export type StrictArgsType<T> =
  T extends BuilderCallback<object, infer R> ? StrictArguments<R> : never;
