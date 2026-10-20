// Fake SMTP server for e2e tests: keeps received emails in memory and serves the latest one
// per recipient over HTTP (GET /last?to=<email>), so tests can follow the links they contain.
import { createServer } from "node:http";
import { simpleParser } from "mailparser";
import { SMTPServer } from "smtp-server";

const SMTP_PORT = Number(process.env.MAIL_SINK_SMTP_PORT ?? 2525);
const HTTP_PORT = Number(process.env.MAIL_SINK_HTTP_PORT ?? 3199);
const inbox = new Map();

new SMTPServer({
  disabledCommands: ["STARTTLS", "AUTH"],
  logger: false,
  async onData(stream, _session, done) {
    try {
      const mail = await simpleParser(stream);
      const message = { from: mail.from?.text, subject: mail.subject, text: mail.text, html: mail.html || "" };
      for (const to of [mail.to].flat()) for (const { address } of to?.value ?? []) inbox.set(address.toLowerCase(), message);
      done();
    } catch (err) {
      done(err);
    }
  },
}).listen(SMTP_PORT, "127.0.0.1");

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") return res.end("ok");
  const message = url.pathname === "/last" && inbox.get((url.searchParams.get("to") ?? "").toLowerCase());
  res.writeHead(message ? 200 : 404, { "content-type": "application/json" });
  res.end(JSON.stringify(message || null));
}).listen(HTTP_PORT, "127.0.0.1");
