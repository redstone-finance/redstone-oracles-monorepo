# Turborepo cheatsheet
Documentation: https://turborepo.com/docs

Turborepo defines *tasks* (scripts in your `package.json` files) and dependencies between them in a global `turbo.json` file at the package root. Some packages may have their own specific `turbo.json` files in the package directory, extending the root `turbo.json`.

## Key concepts
 - Tasks outputs are cached by default (e.g `dist` directory)
 - Running a cached task will re-create outputs from cache instead of running the command (cache-hit)
 - Changing any of the task's *inputs* invalidates the cache for this task
 - If the dependency of the task is invalidated, this task is invalidated as well
 - Cache is stored in `.turbo` directory (delete it to wipe the cache)
 - Syntax: `yarn turbo build lint test` (run tasks in parallel along with their dependencies in the optimal order)
 - Running turbo at repo root will run tasks for *all* packages. To run for a single package, run from its directory or use `--filter` flag

## Gotchas
 - Use `yarn global:turbo` to access turbo binary from any subdirectory
 - Enjoyers of IDE superpowers can simply click an alias script in `package.json`: `"build:turbo"` (invokes `yarn global:turbo build` under the hood)
 - Environment variables are **NOT** passed through by default (see [Strict Env Mode](https://turborepo.com/docs/crafting-your-repository/using-environment-variables#environment-modes))
 - Some tasks may **NOT** be intended for caching (like a test that does a network call or does a blockchain lookup). In this case consider disabling the cache for this task in the local `turbo.json` for this package
 - Turborepo has a concept of *Remote Cache* (sharing the cache between machines, e.g in CI). The recommended approach is to use proprietary one, but the protocol is open and there are multiple open-source implementations. See [CI](#CI) section for more info
 - Turborepo collects telemetry by default (mostly stats without any sensitive data). The easiest way to opt out is `export TURBO_TELEMETRY_DISABLED=1` in your shell profile. See [docs on telemetry](https://turborepo.com/docs/telemetry) for more info.
 

## Developing a package
Run the command below before starting to work with the package. This is necessary for some tooling to work, because in some cases built dependencies are required (like `typescript-eslint` plugin).

If you forget to run it, `typescript-eslint` will scream at you about missing types for every dependency.

```bash
cd packages/my-package
 # Execute build-dev task in current package along with its deps
yarn global:turbo build-dev

# WRONG: Only runs tsc on current package, does not rebuild deps
yarn build-dev
```

Alternatively, you might run `yarn global:turbo build-dev` at the repo root to prepare *every* package for development.

## Tips and tricks
 - Consider installing turbo binary globally to avoid `yarn global:turbo` every time (`npm i -g turbo`)
 - Use `--force` flag to bypass all cache
 - Use `--only` flag to run the task *without* its dependencies
 - Use `--filter "@redstone-finance/my-package"` to scope the command to some package
 - Use `--filter "@redstone-finance/my-package...` to run the command for this package and *all* of it's dependencies (recursively)
 - Globs are supported `turbo build-dev --filter="@redstone-finance/lambda-*"`
 - [Continue](https://turborepo.com/docs/reference/run#--continueoption) when encountering errors `turbo build-dev --filter="@redstone-finance/*-connector" --continue=dependencies-successful` (useful when running for multiple packages)
 - See what's gonna happen before applying the command: `--dry-run=text` (useful to see why certain dependencies exist or why something was or was not cached)
 - Use interactive terminal UI: `--ui=tui`

## CI
In CI we use Github Actions Cache as key-value store for our cache entries. This is done via a [github action](https://github.com/rharkor/caching-for-turbo), which:
 - Spins up a tiny Remote Cache server in a CI runner (running on runner's `localhost:41230`)
 - Configures turbo to connect to this server via env variables
 - The server itself acts an adapter between `turbo` and Github Actions Cache, storing artifacts directly
 - Note that this **does not** (re)store `.turbo` directory, as far as `turbo` concerned we are using Remote Cache

## Analyzing and improving package graphs
Visually analyzing tasks:
 - Add `--summarize=true` flag to *any* turbo command
 - View the generated summary file (`.turbo/runs/*.json`) in [this app](https://turbo.nullvoxpopuli.com/view) (works offline)

Analyzing package graph (Graphviz has to be installed):
 - Add `--graph=graph.png` flag to *any* turbo command (command will act in dry-run mode, `graph.png` file will be generated)
 - Alternatively use `--graph=graph.dot` to get the raw DOT format and view/analyze the file elsewhere

## Yet-unexplored areas that might be useful
 - `turbo prune` command to prepare packages for deployment more easily
 - `turbo gen` for boilerplate generation for the new packages
