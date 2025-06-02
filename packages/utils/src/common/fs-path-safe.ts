import { loggerFactory } from "../logger";

export type FsPartialInterface = {
  readFileSync: (path: string) => Buffer;
  readdirSync: (path: string) => string[];
};

export type PathInterface<ParsedPath, FormatInputPathObject, PlatformPath> = {
  normalize: (path: string) => string;
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
  isAbsolute: (path: string) => boolean;
  relative: (from: string, to: string) => string;
  dirname: (path: string) => string;
  basename: (path: string, suffix?: string) => string;
  extname: (path: string) => string;
  readonly sep: "\\" | "/";
  readonly delimiter: ";" | ":";
  parse: (path: string) => ParsedPath;
  format: (pathObject: FormatInputPathObject) => string;
  toNamespacedPath: (path: string) => string;
  readonly posix: PlatformPath;
  readonly win32: PlatformPath;
};

export let path: PathInterface<unknown, unknown, unknown>;
export let fs: FsPartialInterface;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  fs = require("fs") as FsPartialInterface;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  path = require("path") as PathInterface<unknown, unknown, unknown>;
} catch (_e) {
  loggerFactory("fs-path-safe").error(
    `Tried to import fs/path in non-node env (Gelato?)`
  );
}
