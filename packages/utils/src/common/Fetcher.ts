import axios from "axios";

export class Fetcher {
  static get = <T>(url: string, timeout?: number) => axios.get<T>(url, { timeout });
}
