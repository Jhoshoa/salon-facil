// Runs eslint --fix (and prettier for the frontend, since its eslint config doesn't wire
// prettier in as a rule the way the backend's does) only on the files actually staged for this
// commit -- not the whole project -- so this stays fast regardless of repo size.
//
// Each command does `cd <subdir> && <bin> ...` in one shell invocation. This requires
// lint-staged's own `--shell` flag (set in .husky/pre-commit): without it, lint-staged
// tokenizes the command string itself and execs the first token directly (no real shell),
// so `cd` -- a shell builtin, not a real executable -- fails with ENOENT. `--shell` makes
// lint-staged hand the whole string to a real shell (cmd.exe on Windows) instead.
//
// A `cd` is required (not just an absolute file path) because prettier resolves its plugins
// (prettier-plugin-tailwindcss) relative to its OWN process cwd, not relative to the target
// file the way eslint resolves .eslintrc -- running from the repo root instead of frontend/
// fails to find that plugin. File paths passed as args are relative + forward-slash (not
// JSON.stringify'd, which double-escapes backslashes on Windows into a path that no longer
// resolves) since both cmd.exe and the underlying tools accept forward slashes fine there --
// but the BINARY path needs the `.\` prefix and native backslashes, since cmd.exe only
// resolves a bare relative path like `node_modules/.bin/x` as a PATH-registered command name
// (and fails with "not recognized"), not as a file to execute, unless it starts with a
// `.\`/`\`/drive-letter prefix.
const path = require('node:path');

const binExt = process.platform === 'win32' ? '.cmd' : '';
const bin = (name) => `.${path.sep}node_modules${path.sep}.bin${path.sep}${name}${binExt}`;

const toRelative = (files, subdir) =>
  files
    .map((file) => path.relative(path.join(__dirname, subdir), file).split(path.sep).join('/'))
    .map((file) => `"${file}"`)
    .join(' ');

module.exports = {
  'backend/{src,test,tests}/**/*.ts': (files) =>
    `cd backend && ${bin('eslint')} --fix ${toRelative(files, 'backend')}`,

  'frontend/src/**/*.{ts,tsx}': (files) => [
    `cd frontend && ${bin('eslint')} --fix ${toRelative(files, 'frontend')}`,
    `cd frontend && ${bin('prettier')} --write ${toRelative(files, 'frontend')}`,
  ],
};
