# redstone-oracles-monorepo

This is an experimental repository with redstone oracles monorepo. It will be used to quickly verify if monorepo works out.

## Useful commands

### Install new dependency on the root level

```sh
# Install as devDependencies
pnpm add -w -D <pkg>

# Install as regular dependencies
pnpm add -w <pkg>

# Install as peer dependencies
pnpm add --save-peer -w
```

### Remove dependency on the root level

```sh
# Remove from root level
pnpm rm <pkg>

# Remove from every workspace package
pnpm rm -r <pkg>
```
