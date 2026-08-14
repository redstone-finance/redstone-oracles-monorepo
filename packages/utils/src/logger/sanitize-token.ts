const WHITELISTED_HOSTNAMES = new Set([
  "github.com",
  "raw.githubusercontent.com",
  "api.github.com",
]);

const URL_MARKER = "://";
const CREDENTIALS_MARKER = "@";
const PATH_SEPARATOR = "/";
const BEARER_MARKER = "Bearer ";
const NATS_SEED_LENGTH = 58;
const KEPT_CHARACTERS = 4;
const MIN_SECRET_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 8;

const SECRET_CHARACTERS = "[A-Za-z0-9_-]";
const NON_SECRET_CHARACTERS = "[^A-Za-z0-9_-]";
const PARAM_NAME_CHARACTERS = "[A-Za-z0-9_.-]";
const HOST_CHARACTERS = "[A-Za-z0-9-]";
const PASSWORD_CHARACTERS = `[^\\s"'@/:]`;
const PARAM_DELIMITERS = "[?#&]";
const URL_TAIL_START = "[/?#]";
const TEXT_BOUNDARY = `(^|[\\s"'([{,=])`;
const PATH_BOUNDARY = `(^|[\\s"'/([{,=])`;
const SECRET = `(${SECRET_CHARACTERS}{${MIN_SECRET_LENGTH},})`;

const ANY_URL_PATTERN = /[a-z][a-z0-9+.-]*:\/\/[^\s"']+/g;
const HTTP_URL_PATTERN = /(https?|wss):\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g;
const NATS_SEED_PATTERN = /(?:^|[^A-Z2-7])(S[A-Z2-7]{57})(?![A-Z2-7])/g;
const PARAMS_START_PATTERN = /[?#]/;
const PARAM_DELIMITERS_PATTERN = new RegExp(PARAM_DELIMITERS);
const URL_TAIL_START_PATTERN = new RegExp(URL_TAIL_START);

const SCHEMELESS_URL_PATTERN = new RegExp(
  `${TEXT_BOUNDARY}(${HOST_CHARACTERS}+(?:\\.${HOST_CHARACTERS}+)+(?::\\d+)?)(${URL_TAIL_START}[^\\s"']*)`,
  "g"
);
const SECRET_PARAM_PATTERN = new RegExp(
  `(${PARAM_DELIMITERS}${PARAM_NAME_CHARACTERS}+=)${SECRET}`,
  "g"
);
const CREDENTIALS_PATTERN = new RegExp(
  `${PATH_BOUNDARY}(${PASSWORD_CHARACTERS}*:)?(${PASSWORD_CHARACTERS}{${MIN_PASSWORD_LENGTH},})@`,
  "g"
);
const HIGH_ENTROPY_SEGMENT = new RegExp(
  `^(${PARAM_DELIMITERS}?)${SECRET}(${NON_SECRET_CHARACTERS}*)$`
);
const BEARER_TOKEN_PATTERN = new RegExp(`(${BEARER_MARKER})([A-Za-z0-9_\\-.=+/]{16,})`, "g");

export function sanitizeToken(message: string): string {
  let sanitized = message;

  if (PARAM_DELIMITERS_PATTERN.test(message)) {
    sanitized = sanitized.replace(
      SECRET_PARAM_PATTERN,
      (_, name: string, value: string) => name + keepLastCharacters(value)
    );
  }
  if (message.includes(CREDENTIALS_MARKER)) {
    sanitized = sanitized.replace(
      CREDENTIALS_PATTERN,
      (_, boundary: string, user: string | undefined, secret: string) =>
        `${boundary}${user ?? ""}${keepLastCharacters(secret)}@`
    );
  }
  if (message.includes(URL_MARKER)) {
    sanitized = sanitized.replace(ANY_URL_PATTERN, redactUrlSecrets);
  }
  if (URL_TAIL_START_PATTERN.test(message)) {
    sanitized = sanitized.replace(
      SCHEMELESS_URL_PATTERN,
      (match, boundary: string, host: string, tail: string) =>
        isWhitelisted(host) ? match : boundary + host + redactPath(tail)
    );
  }
  if (message.includes(BEARER_MARKER)) {
    sanitized = sanitized.replace(
      BEARER_TOKEN_PATTERN,
      (_, marker: string, token: string) => marker + keepLastCharacters(token)
    );
  }
  if (message.length >= NATS_SEED_LENGTH) {
    sanitized = sanitized.replace(NATS_SEED_PATTERN, (match, seed: string) =>
      match.replace(seed, keepLastCharacters(seed))
    );
  }

  return sanitized;
}

export function sanitizeLogMessage(message: string): string {
  if (!message.includes(URL_MARKER)) {
    return sanitizeToken(message);
  }

  const withSanitizedUrls = message.replace(HTTP_URL_PATTERN, (match) => {
    try {
      const parsedUrl = new URL(match);
      if (WHITELISTED_HOSTNAMES.has(parsedUrl.hostname)) {
        return match;
      }
      parsedUrl.password = "";
      parsedUrl.username = "";
      parsedUrl.pathname = parsedUrl.search
        ? keepLastCharacters(parsedUrl.search)
        : keepLastCharacters(parsedUrl.pathname);
      parsedUrl.search = "";

      return parsedUrl.toString().replace(/\/+$/, "");
    } catch {
      return match;
    }
  });

  return sanitizeToken(withSanitizedUrls);
}

function redactUrlSecrets(url: string) {
  const schemeEnd = url.indexOf(URL_MARKER) + URL_MARKER.length;
  const rest = url.slice(schemeEnd);
  const paramsStart = rest.search(PARAMS_START_PATTERN);
  const splitAt = paramsStart === -1 ? rest.length : paramsStart;
  const path = rest.slice(0, splitAt);

  return (
    url.slice(0, schemeEnd) +
    (isWhitelisted(path) ? path : redactPath(path)) +
    redactPath(rest.slice(splitAt))
  );
}

function isWhitelisted(hostWithPath: string) {
  return WHITELISTED_HOSTNAMES.has(hostWithPath.split(PATH_SEPARATOR)[0].split(":")[0]);
}

function redactPath(path: string) {
  return path
    .split(PATH_SEPARATOR)
    .map((segment) => {
      const highEntropy = HIGH_ENTROPY_SEGMENT.exec(segment);

      return highEntropy
        ? highEntropy[1] + keepLastCharacters(highEntropy[2]) + highEntropy[3]
        : segment;
    })
    .join(PATH_SEPARATOR);
}

function keepLastCharacters(value: string) {
  return value.length > KEPT_CHARACTERS ? `...${value.slice(-KEPT_CHARACTERS)}` : value;
}
