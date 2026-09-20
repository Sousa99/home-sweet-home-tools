# Home Sweet Home — Tools

Shared tooling for Home Sweet Home modules.

| Package | Purpose |
|---------|---------|
| `@homesweethome/config` (`packages/config`) | Shared eslint / prettier / tsconfig presets |
| `homesweethome` CLI (`packages/cli`) | `homesweethome create <module>` — bootstrap a module from the template repo |

The presets and CLI are versioned together so a scaffolded module's tooling always matches
the config package it references.