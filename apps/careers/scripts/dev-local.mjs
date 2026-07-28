import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";

function readLocalSupabaseConfig() {
  try {
    return JSON.parse(
      execFileSync("supabase", ["status", "--output", "json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    throw new Error(
      "로컬 Supabase가 실행 중이 아닙니다. `supabase start` 후 다시 실행해주세요.",
    );
  }
}

const config = readLocalSupabaseConfig();
const required = ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"];
const missing = required.filter((key) => !config[key]);

if (missing.length) {
  throw new Error(`로컬 Supabase 설정 누락: ${missing.join(", ")}`);
}

const sessionSecret =
  process.env.CAREERS_SESSION_SECRET ||
  createHash("sha256")
    .update(`careers-local-session:${config.SERVICE_ROLE_KEY}`)
    .digest("hex");

if (new TextEncoder().encode(sessionSecret).byteLength < 32) {
  throw new Error("CAREERS_SESSION_SECRET은 32바이트 이상이어야 합니다.");
}

const env = {
  ...process.env,
  ADMIN_APP_URL: process.env.ADMIN_APP_URL || "http://localhost:3001",
  CAREERS_APP_URL: process.env.CAREERS_APP_URL || "http://localhost:3014",
  CAREERS_SESSION_SECRET: sessionSecret,
  NEXT_PUBLIC_SUPABASE_URL: config.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: config.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: config.SERVICE_ROLE_KEY,
};

if (process.argv.includes("--check")) {
  console.log("Careers local OrbStack environment: ready");
  process.exit(0);
}

const result = spawnSync("next", ["dev", "--port", "3014", "--turbopack"], {
  env,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
