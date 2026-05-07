import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Read version from package.json at build time so APEX_VERSION can never
// drift from the published npm version (root cause of v0.1.0/0.1.1/0.1.2
// silent staleness on `apex --version`).
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  shims: true,
  external: ["cheerio"],
  define: {
    __APEX_VERSION__: JSON.stringify(pkg.version),
  },
});
