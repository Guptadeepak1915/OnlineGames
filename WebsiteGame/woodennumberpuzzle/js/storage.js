import { PREFIX } from "./config.js";

export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(val));
    } catch (error) {}
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (error) {}
  },
};
