# clean-arch-kata-ts-template

A template repository for clean architecture katas with TypeScript, including a few useful features:

1. Uses `pnpm`.
2. Lints with `eslint` and formats with `prettier`.
3. Git hooks with `husky` and `lint-staged`.
4. Enforces code boundaries with `eslint-plugin-boundaries`.
5. `yargs` and `knex` for CLI commands and storing data.

## The sample app

The sample app is not intended to offer guidance on best practices for organising code. It simply demonstrates some capabilities for a basic CLI app with code and unit tests.

Some of the added libraries (`yargs`, `seedrandom`, 'knex') are intended to assist with the katas in [clean architecture katas](https://github.com/jbrunton/clean-arch-katas).

Usage:

```bash
$ pnpm install

$ pnpm cli greet
> Hello, World!

$ pnpm cli roll
> 4
```

Options:

```bash
$ pnpm cli greet World
> Hello, World!

$ pnpm cli greet 'le Monde' --greeting 'Bonjour, :subject!'
> Bonjour, le Monde!

$ pnpm cli roll -n 4 --dice-size 12 --seed abc
> 9, 8, 9, 8
```

## Running tests

```bash
$ pnpm test

# Or, to watch for changes
$ pnpm test:watch
```

## Code organisation

(Outdated)

The eslint configuration defines strict dependency rules that can be used to enforce a clean architecture. By default:

1. `domain/entities` cannot import from any other module.
2. `domain/usecases` may import from `domain/entities`.
3. `data` may import from the domain modules.
4. `app` may import from any of the above modules.
5. External boundaries are configured so that the domain modules may only import from `remeda` and `fp-ts` (e.g. disallowing dependencies for I/O).

These boundaries are configured in [.eslintrc.js](https://github.com/jbrunton/node-typescript-template/blob/main/.eslintrc.js). See [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) for more on the configuration options.

## Database

This repo is configured with `knex` and `sqlite3`.

To create a migration, run `db:migrate:make my-migration`. Migrations are automatically run when the program runs.
