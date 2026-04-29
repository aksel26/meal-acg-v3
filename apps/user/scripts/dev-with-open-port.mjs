import { spawn } from "node:child_process";
import net from "node:net";

const DEFAULT_PORT = 3000;
const MAX_PORT_OFFSET = 100;

const requestedPort = Number.parseInt(process.env.PORT ?? "", 10);
const startPort = Number.isFinite(requestedPort) ? requestedPort : DEFAULT_PORT;

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, "::");
  });
}

async function findOpenPort() {
  for (let offset = 0; offset <= MAX_PORT_OFFSET; offset += 1) {
    const port = startPort + offset;
    if (await canListen(port)) {
      return port;
    }
  }

  throw new Error(
    `No open port found between ${startPort} and ${startPort + MAX_PORT_OFFSET}.`,
  );
}

const port = await findOpenPort();

if (port !== startPort) {
  console.log(`Port ${startPort} is in use. Starting user app on ${port}.`);
}

const nextProcess = spawn("next", ["dev", "--port", String(port)], {
  env: {
    ...process.env,
    PORT: String(port),
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

nextProcess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
