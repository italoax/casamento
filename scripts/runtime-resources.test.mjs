import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

test("standalone carrega os limites antes do servidor e a preparação pode ser repetida", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "casamento-runtime-"));
    for (const dir of [".next/standalone", ".next/static", "public", "scripts"]) mkdirSync(path.join(root, dir), { recursive: true });
    cpSync(new URL("runtime-resources.cjs", import.meta.url), path.join(root, "scripts/runtime-resources.cjs"));
    const entry = path.join(root, ".next/standalone/server.js");
    writeFileSync(entry, 'console.log(JSON.stringify({ uv: process.env.UV_THREADPOOL_SIZE, rayon: process.env.RAYON_NUM_THREADS, vips: process.env.VIPS_CONCURRENCY }));');
    for (let i = 0; i < 2; i++) {
        const result = spawnSync(process.execPath, [fileURLToPath(new URL("prepare-standalone.mjs", import.meta.url))], { cwd: root, encoding: "utf8", timeout: 10000, windowsHide: true });
        assert.equal(result.status, 0, result.stderr);
    }
    assert.equal(readFileSync(entry, "utf8").match(/runtime-resources\.cjs/g).length, 1);
    const env = { ...process.env };
    for (const key of ["UV_THREADPOOL_SIZE", "RAYON_NUM_THREADS", "VIPS_CONCURRENCY"]) delete env[key];
    const result = spawnSync(process.execPath, [entry], { env, encoding: "utf8", timeout: 10000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { uv: "2", rayon: "1", vips: "1" });
    const custom = spawnSync(process.execPath, [entry], { env: { ...env, UV_THREADPOOL_SIZE: "3" }, encoding: "utf8", timeout: 10000, windowsHide: true });
    assert.equal(JSON.parse(custom.stdout).uv, "3");
});
