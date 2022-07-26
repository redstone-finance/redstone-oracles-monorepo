import axios from "axios";

export const fetchIp = async () => {
  try {
    const response = await axios.get("https://api.ipify.org/?format=json");
    const data = response.data as { ip: string };
    return data.ip;
  } catch {
    return "Problem with fetching Node's IP address";
  }
};
