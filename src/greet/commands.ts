import { getGreeting } from "./domain";
import { Args, Command, Options } from "@effect/cli";
import { Console, Option } from "effect";

const name = Args.text({ name: "name" });
const greeting = Options.text("greeting").pipe(
  Options.optional,
  Options.withAlias("g"),
  Options.withDescription(
    'A template for the greeting, e.g. "Hello, :subject!"',
  ),
);

const greetOptions = {
  name,
  greeting,
};

type GreetOptions = {
  name: string,
  greeting: Option.Option<string>,
}

const greetImpl = (args: GreetOptions) => {
  const greeting = getGreeting(args.greeting)({ name: args.name });
  return Console.info(greeting);
}

export const greetCommand = Command.make("greet", greetOptions, greetImpl).pipe(
  Command.withDescription("the name of the person/subject to greet"),
);
