import { defineConfig } from "vite";
import { resolve } from "path";

const host = process.env.TAURI_DEV_HOST;

export default {
  build: {
    target: "es2018"
  }
}
