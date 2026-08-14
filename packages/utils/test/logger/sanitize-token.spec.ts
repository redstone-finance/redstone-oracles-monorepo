import { sanitizeLogMessage, sanitizeToken } from "../../src";

const SECRET = "aB3dE5fG7hJ9kL1mN3pQ5rS7";
const OTHER_SECRET = "zY9xW7vU5tS3rQ1pO9nM7lK5";
const PASSWORD = "SuperSecretPass123";
const NATS_SEED = "SAAGY7ZQKQJ4LMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX2";
const KEPT_CHARACTERS = 4;

describe("sanitizeToken", () => {
  it("should redact a high entropy path segment behind any scheme", () => {
    expectRedacted(`tls://nats.example.com:4222/${SECRET}`);
    expectRedacted(`mqtts://mqtt.example.com/${SECRET}`);
    expectRedacted(`https://hooks.slack.com/services/T01ABCDEF/B02GHIJKL/${SECRET}`);
  });

  it("should redact a secret query parameter whatever it is named", () => {
    expectRedacted(`https://rpc.example.com/v1?api_key=${SECRET}`);
    expectRedacted(`https://rpc.example.com/v1?token=${SECRET}&chain=1`);
    expectRedacted(`https://rpc.example.com/v1?apiKey=${SECRET}`);
    expectRedacted(`https://rpc.example.com/v1?whatever=${SECRET}`);
  });

  it("should redact a secret carried in the anchor", () => {
    expectRedacted(`https://fullnode.sui.io:443#type=grpc&token=${SECRET}`);
    expectRedacted(`https://sui.example/gql#type=graphql&apiKey=${SECRET}`);
    expectRedacted(`grpc://ledger.example.com:5001/v1#token=${SECRET}`);
    expectRedacted(`https://rpc.example.com/v1#${SECRET}`);
  });

  it("should redact a secret placed before the other anchor parts", () => {
    expectRedacted(`fullnode.sui.io:443#token=${SECRET}&type=grpc`);
    expectRedacted(`https://rpc.example.com/v1?token=${SECRET}&chain=1`);
  });

  it("should redact a secret in a schemeless url", () => {
    expectRedacted(`fullnode.sui.io:443#type=grpc&token=${SECRET}`);
    expectRedacted(`fullnode.sui.io:443/v1/${SECRET}`);
    expectRedacted(`fullnode.sui.io:443#${SECRET}`);
    expectRedacted(`fullnode.sui.io:443?${SECRET}`);
    expectRedacted(`Connecting to ledger.example.com/api/${SECRET} now`);
  });

  it("should redact a high entropy path segment followed by an anchor", () => {
    expectRedacted(`grpc://ledger.example.com:5001/${SECRET}#type=grpc`);
  });

  it("should redact a secret trailed by punctuation or followed by a fragment", () => {
    expectRedacted(`Failed for tls://nats.example.com/${SECRET}, retrying`);
    expectRedacted(`grpc://ledger.example.com/bar?b#c/${SECRET}`);
  });

  it("should redact database credentials", () => {
    expectRedacted(`mongodb+srv://reader:${PASSWORD}@cluster0.mongodb.net/db`, PASSWORD);
    expectRedacted(`redis://:${PASSWORD}@cache.example.com:6379`, PASSWORD);
    expectRedacted(`${SECRET}@rpc.example.com`);
  });

  it("should redact a nats seed wherever it appears", () => {
    expectRedacted(`NATS_NKEY_SEED=${NATS_SEED}`, NATS_SEED);
    expectRedacted(`connecting with seed ${NATS_SEED} now`, NATS_SEED);
  });

  it("should redact every secret in a message carrying many urls", () => {
    expectAllRedacted(
      [
        `all providers failed: https://rpc.example.com/v1?apiKey=${SECRET},`,
        `fullnode.sui.io:443#type=grpc&token=${OTHER_SECRET},`,
        `redis://:${PASSWORD}@cache.example.com:6379,`,
        `tls://nats.example.com:4222/${SECRET},`,
        `seed ${NATS_SEED} rejected`,
      ].join(" "),
      [SECRET, OTHER_SECRET, PASSWORD, NATS_SEED]
    );
  });

  it("should redact a bearer token outside any url", () => {
    expectRedacted(
      "sending Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    );
  });

  it("should mangle a long mail local part, which is the price of covering schemeless credentials", () => {
    expect(sanitizeToken("mail from firstname.lastname@redstone.finance")).toBe(
      "mail from ...name@redstone.finance"
    );
  });

  it("should keep the anchor parts that carry no secret", () => {
    expectUnchanged("https://mainnet.block-engine.jito.wtf#type=jito");
    expectUnchanged("https://fullnode.mainnet.sui.io:443#type=grpc");
  });

  it("should leave file paths, image tags and mail addresses alone", () => {
    expectUnchanged("/Users/someone/Devel/redstone-oracles-monorepo/worktree-connection");
    expectUnchanged("at Object.<anonymous> (/app/dist/src/logger/sanitize-token.js:42:5)");
    expectUnchanged("docker image redstonefinance/monitoring:0123456789abcdef0123");
    expectUnchanged("mail from lukasz@redstone.finance");
  });

  it("should leave a whitelisted host untouched, with or without a scheme", () => {
    expectUnchanged(
      "https://raw.githubusercontent.com/redstone-finance/redstone-monorepo/main/manifest.json"
    );
    expectUnchanged(
      "raw.githubusercontent.com/redstone-finance/redstone-monorepo/main/manifest.json"
    );
  });

  it("should leave a question mark in plain prose alone", () => {
    expectUnchanged("did it reconnect?ReconnectionHandler123 says yes");
  });

  it("should leave short segments and plain text alone", () => {
    expectUnchanged("tls://nats.example.com:4222/cluster");
    expectUnchanged("no secrets here");
  });
});

describe("sanitizeLogMessage", () => {
  it("should keep the last characters of a secret it collapses", () => {
    expect(sanitizeLogMessage(`https://rpc.example.com/v1/${SECRET}#type=jito`)).toBe(
      "https://rpc.example.com/...5rS7#type=jito"
    );
    expect(sanitizeLogMessage(`https://fullnode.sui.io:443#type=grpc&token=${SECRET}`)).toBe(
      "https://fullnode.sui.io/#type=grpc&token=...5rS7"
    );
  });

  it("should redact a token on a whitelisted host", () => {
    expect(
      sanitizeLogMessage(`https://raw.githubusercontent.com/org/repo/file.json?token=${SECRET}`)
    ).toBe("https://raw.githubusercontent.com/org/repo/file.json?token=...5rS7");
  });

  it("should redact urls the url parser rejects", () => {
    expect(sanitizeLogMessage(`https://[not a host]/v1?token=${SECRET}`)).toBe(
      "https://[not a host]/v1?token=...5rS7"
    );
    expect(sanitizeLogMessage(`https://rpc.example.com:notaport/v1?token=${SECRET}`)).toBe(
      "https://rpc.example.com:notaport/v1?token=...5rS7"
    );
    expect(sanitizeLogMessage(`rpc.example.com/v1?token=${SECRET}`)).toBe(
      "rpc.example.com/v1?token=...5rS7"
    );
  });

  it("should redact schemes the url pass does not understand", () => {
    expect(sanitizeLogMessage(`connecting to tls://nats.example.com:4222/${SECRET}`)).toBe(
      "connecting to tls://nats.example.com:4222/...5rS7"
    );
  });
});

function expectRedacted(message: string, secret = SECRET) {
  expect(sanitizeToken(message)).toBe(redact(message, secret));
}

function expectAllRedacted(message: string, secrets: string[]) {
  expect(sanitizeToken(message)).toBe(secrets.reduce(redact, message));
}

function expectUnchanged(message: string) {
  expect(sanitizeToken(message)).toBe(message);
}

function redact(message: string, secret: string) {
  return message.replaceAll(secret, `...${secret.slice(-KEPT_CHARACTERS)}`);
}
