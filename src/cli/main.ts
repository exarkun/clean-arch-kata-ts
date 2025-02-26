import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { db } from "../data/db";
import { greetCommand } from "../greet/commands";
import { rollCommand } from "../roll/commands";

const program = yargs(hideBin(process.argv))
  .command(greetCommand)
  .command(rollCommand);

const run = async () => {
  await db.migrate.latest();
  await program.parseAsync();
};

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.destroy());
