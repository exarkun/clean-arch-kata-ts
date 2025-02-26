import { Argv } from "yargs";
import { StrictCommandType } from "../lib/cli";
import { getGreeting } from "./domain";

const builder = (yargs: Argv) =>
  yargs
    .positional("name", {
      type: "string",
      demandOption: true,
    })
    .options({
      greeting: {
        alias: "g",
        type: "string",
        desc: 'A template for the greeting, e.g. "Hello, :subject!"',
      },
    });

export const greetCommand: StrictCommandType<typeof builder> = {
  command: "greet <name>",
  describe: "the name of the person/subject to greet",
  builder: builder,
  handler: (args) => {
    const greeting = getGreeting({ name: args.name }, args.greeting);
    console.info(greeting);
  },
};
