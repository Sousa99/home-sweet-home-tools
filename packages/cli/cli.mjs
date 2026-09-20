#!/usr/bin/env node
// homesweethome — create a Home Sweet Home module repository from the shared template.
//
// Contract: specs/005-module-docs-templatization/contracts/scaffold.md
//   This CLI is a THIN WRAPPER over the template repo's scripts/scaffold.mjs — all rendering
//   logic lives in the template repo so the CLI can never drift from the template.
//
//   The CLI scaffolds LOCALLY into the current working directory (never /tmp). It does NOT
//   create the GitHub repository; it prints the follow-up to create it via "Use this template"
//   or `gh repo create --template`.
//
// Usage:
//   homesweethome create <module-name> [--repo <owner/repo>] [--dir <path>] [--dry-run]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const TEMPLATE_REPO =
  "https://github.com/Sousa99/home-sweet-home-module-template.git";
const TEMPLATE_NAME = "sousa99/home-sweet-home-module-template";
const CONFIG_FILE = "module.config.yaml";
const SCAFFOLD = "scripts/scaffold.mjs";

const USAGE = `Usage: homesweethome create <module-name> [--repo <owner/repo>] [--dir <path>] [--dry-run]

create      Bootstrap a new Home Sweet Home module from the shared template repo.
  <module-name>   Module display name (kebab-cased to derive the slug).
  --repo          Target repository as <owner>/<name>. The local folder is named after
                  <name> and created in the current directory (or --dir).
  --dir           Explicit target directory (default: ./<repo-name> in the current dir).
  --dry-run       Clone + collect identity, but do not run the scaffold.

Exit codes:
  0  success
  1  failure (clone/collect/scaffold error)
  2  usage error`;

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...opts });
}

function kebab(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\.\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collectIdentity(moduleName, repo) {
  const slug = kebab(moduleName);
  let owner = "";
  let repoName = "";
  if (repo) {
    const parts = repo.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`--repo must be <owner>/<name>, got '${repo}'`);
    }
    [owner, repoName] = parts;
  } else if (process.stdin.isTTY) {
    process.stdout.write("GitHub owner (e.g. sousa99): ");
    owner = run("sh", ["-c", 'read line; printf "%s" "$line"'], {
      stdio: ["inherit", "pipe", "inherit"],
    }).trim();
    process.stdout.write("Repository name (default: " + slug + "): ");
    const name = run("sh", ["-c", 'read line; printf "%s" "$line"'], {
      stdio: ["inherit", "pipe", "inherit"],
    }).trim();
    repoName = name || slug;
  } else {
    throw new Error("--repo is required in non-interactive environments");
  }

  return {
    module_name: moduleName,
    module_slug: slug,
    module_description: `A Home Sweet Home module (${slug})`,
    npm_scope: owner,
    repo_owner: owner,
    repo_name: repoName,
    ghcr_org: `ghcr.io/${owner}`,
    packages: ["backend", "frontend"],
    stack: {
      backend: "Node 24, TypeScript",
      frontend: "Vite, React 19, Tailwind CSS v4",
      tooling: "pnpm 11, TypeScript, ESLint, Prettier, Vitest",
    },
    umbrella_link: "https://github.com/",
  };
}

function writeConfig(targetDir, config) {
  const file = resolve(targetDir, CONFIG_FILE);
  const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
  // Preserve the template's example comments; overwrite only the identity keys.
  if (existing.trim()) {
    const current = parseYaml(existing) ?? {};
    const merged = { ...current, ...config };
    writeFileSync(file, stringifyYaml(merged));
  } else {
    writeFileSync(file, stringifyYaml(config));
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(USAGE);
    process.exit(args.length === 0 ? 2 : 0);
  }
  if (args[0] !== "create") {
    console.error(`error: unknown command '${args[0]}'`);
    console.error(USAGE);
    process.exit(2);
  }

  const rest = args.slice(1);
  let moduleName = "";
  let repo = "";
  let dir = "";
  let dryRun = false;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--repo") {
      repo = rest[++i];
      if (!repo) {
        console.error("error: --repo requires a value <owner>/<name>");
        process.exit(2);
      }
    } else if (arg === "--dir") {
      dir = rest[++i];
      if (!dir) {
        console.error("error: --dir requires a value <path>");
        process.exit(2);
      }
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--")) {
      console.error(`error: unknown option '${arg}'`);
      process.exit(2);
    } else if (!moduleName) {
      moduleName = arg;
    } else {
      console.error(`error: unexpected argument '${arg}'`);
      process.exit(2);
    }
  }
  if (!moduleName) {
    console.error("error: <module-name> is required");
    console.error(USAGE);
    process.exit(2);
  }

  const identity = collectIdentity(moduleName, repo);
  const targetDir = resolve(process.cwd(), dir || identity.repo_name);

  if (existsSync(targetDir) && !dryRun) {
    console.error(`error: target directory already exists: ${targetDir}`);
    process.exit(1);
  }

  try {
    console.log(`[homesweethome] cloning template repo...`);
    run("git", ["clone", "--quiet", TEMPLATE_REPO, targetDir]);
    rmSync(join(targetDir, ".git"), { recursive: true, force: true });

    writeConfig(targetDir, identity);
    console.log(`[homesweethome] wrote ${CONFIG_FILE}`);

    if (dryRun) {
      console.log(
        `[homesweethome] dry-run: scaffold not executed. Target: ${targetDir}`,
      );
      process.exit(0);
    }

    console.log(`[homesweethome] installing scaffold tooling...`);
    run("pnpm", ["install", "--silent"], { cwd: targetDir });

    console.log(`[homesweethome] running scaffold render...`);
    run("node", [join(targetDir, SCAFFOLD)], { cwd: targetDir });

    console.log(`\n[homesweethome] module scaffolded at ${targetDir}`);
    console.log(`  Next steps:`);
    console.log(
      `  1. Edit ${targetDir}/${CONFIG_FILE} (runtime defaults live in the app source).`,
    );
    console.log(
      `  2. Verify: cd ${targetDir} && node scripts/scaffold.mjs --check`,
    );
    console.log(
      `  3. Create the GitHub repository (from the shared template):`,
    );
    console.log(
      `       gh repo create ${identity.repo_owner}/${identity.repo_name} \\`,
    );
    console.log(`         --public --template ${TEMPLATE_NAME}`);
    console.log(
      `     or use the "Use this template" button on github.com/${TEMPLATE_NAME}`,
    );
    console.log(
      `  4. Push: cd ${targetDir} && git init && git add . && git commit && \\`,
    );
    console.log(
      `     git remote add origin https://github.com/${identity.repo_owner}/${identity.repo_name}.git`,
    );
    console.log(`     git push -u origin main`);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
}

main();
