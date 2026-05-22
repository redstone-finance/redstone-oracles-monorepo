import axios from "axios";

export class Fetcher {
  static get = <T>(url: string, timeout?: number, headers?: Record<string, string>) =>
    axios.get<T>(url, { timeout, headers });
}
