import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Windows release archive uses formal portable package naming", () => {
  const workflow = fs.readFileSync(
    path.join(process.cwd(), ".github", "workflows", "windows-portable.yml"),
    "utf8",
  );
  const packager = fs.readFileSync(
    path.join(process.cwd(), "scripts", "package-windows.mjs"),
    "utf8",
  );

  assert.match(workflow, /CodexBridge-Windows-x64-Portable\.zip/);
  assert.match(workflow, /releases\/latest\/download\/CodexBridge-Windows-x64-Portable\.zip/);
  assert.doesNotMatch(workflow, /CodexBridge-windows-portable/);
  assert.match(packager, /CODEXBRIDGE_RELEASE_VERSION/);
  assert.match(packager, /CodexBridge-Windows-x64-Portable-/);
});
