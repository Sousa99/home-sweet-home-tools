# 🏠 Home Sweet Home — Tools

The toolbelt for building **Home Sweet Home** modules. One CLI to stamp out a new module,
one shared config package so every module lints, formats, and typechecks the exact same way.

| Package | What it does |
|---------|--------------|
| `@sousa99/homesweethome` (`packages/cli`) | 🛠️ `homesweethome create <module>` — bootstrap a module repo from the template |
| `@sousa99/homesweethome-config` (`packages/config`) | 🎨 Shared eslint / prettier / tsconfig presets, used by every module |

The CLI and the config package are **versioned together**, so a scaffolded module's tooling
always matches the presets it references.

---

## 🛠️ Installing the CLI

The CLI is published to **GitHub Packages** (`npm.pkg.github.com`).

### 1. Authenticate (one time)

GitHub Packages requires auth even for public packages. Create a [PAT](https://github.com/settings/tokens)
with the **`read:packages`** scope (add `write:packages` if you'll ever publish), then add it
to your user-level `~/.npmrc`:

```ini
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
@sousa99:registry=https://npm.pkg.github.com/
```

> In **CI**, no PAT is needed — GitHub Actions provides `GITHUB_TOKEN`, which the module
> workflows wire automatically.

### 2. Install globally

```bash
pnpm add -g @sousa99/homesweethome
# or with npm:
npm i -g @sousa99/homesweethome
```

### 3. Create a module

```bash
homesweethome create my-module --repo sousa99/my-module
```

This clones the [module template](https://github.com/sousa99/home-sweet-home-module-template),
fills in `module.config.yaml` for you, and runs the scaffold — **locally, into the current
directory** (folder named after the `--repo` repo name, e.g. `./my-module`). Then:

```bash
cd my-module
node scripts/scaffold.mjs --check   # verify everything is in sync
```

The CLI does **not** create the GitHub repository. Create it from the shared template, then
push:

```bash
# create the repo from the template (or use the "Use this template" button on GitHub)
gh repo create sousa99/my-module --public --template sousa99/home-sweet-home-module-template

# then initialize + push the scaffolded module
cd my-module
git init && git add . && git commit -m "chore: scaffold my-module from the Home Sweet Home template"
git remote add origin https://github.com/sousa99/my-module.git
git push -u origin main
```

Use `--dir <path>` to scaffold into an explicit directory instead of the current one.

---

## 🎨 Installing the config package

Add the shared presets to any module:

```bash
pnpm add -D @sousa99/homesweethome-config
```

Then wire the presets with two tiny files:

```js
// eslint.config.mjs
import config from '@sousa99/homesweethome-config/eslint';
export default [...config];
```

```js
// prettier.config.mjs
import config from '@sousa99/homesweethome-config/prettier';
export default config;
```

Extend the TypeScript base from your `tsconfig.json`:

```json
{ "extends": "@sousa99/homesweethome-config/tsconfig.base", "compilerOptions": {} }
```

That's it — every module now shares the same lint, format, and typecheck behavior.

---

## 📦 Development

```bash
pnpm install
pnpm --filter @sousa99/homesweethome-config ...   # work on the presets
pnpm --filter @sousa99/homesweethome ...          # work on the CLI
```

Publishing happens automatically via the `Publish` workflow on push to `main` (or manual
dispatch) — see `.github/workflows/publish.yml`.