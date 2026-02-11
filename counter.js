const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const gitignorePath = path.join(rootDir, ".gitignore");

// ---- hard ignored directories (always skipped) ----
const HARD_IGNORED_DIRS = new Set([
  ".git",
  "migrations",
  "node_modules"
].map(s => s.toLowerCase()));

// ---- load .gitignore ----
let ignorePatterns = [];
if (fs.existsSync(gitignorePath)) {
  ignorePatterns = fs
    .readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"));
}

// ---- convert simple .gitignore patterns to regex ----
function patternToRegex(pattern) {
  const isDir = pattern.endsWith("/");
  const clean = pattern.replace(/\/$/, "");

  let regex = clean
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*");

  if (!clean.includes("/")) {
    regex = `(^|\\/)${regex}(\\/|$)`;
  }

  if (isDir) {
    regex += ".*";
  }

  return new RegExp(regex, "i"); // case-insensitive
}

const ignoreRegexes = ignorePatterns.map(patternToRegex);

// ---- check if a path should be ignored ----
function isIgnored(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  const parts = normalized.split("/");

  for (const part of parts) {
    if (HARD_IGNORED_DIRS.has(part)) {
      return true;
    }
  }

  return ignoreRegexes.some(rx => rx.test(normalized));
}

// ---- count lines and human-readable characters ----
function countFileStats(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  const lines = content.split(/\r\n|\r|\n/).length;

  // Count only ASCII 33-125 inclusive
  let humanChars = 0;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code >= 33 && code <= 125) {
      humanChars++;
    }
  }

  return { lines, humanChars };
}

// ---- recursive directory traversal ----
let totalLines = 0;
let totalHumanChars = 0;

function countLinesInDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (isIgnored(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      countLinesInDirectory(fullPath);
    } else if (entry.isFile()) {
      const { lines, humanChars } = countFileStats(fullPath);
      totalLines += lines;
      totalHumanChars += humanChars;
      console.log(`${relativePath} : ${lines} lines, ${humanChars} hrc`);
    }
  }
}

// ---- run ----
countLinesInDirectory(rootDir);

console.log("\n-----------------------");
console.log(`TOTAL LINES: ${totalLines}`);
console.log(`TOTAL HUMAN-READABLE CHARACTERS: ${totalHumanChars}`);
