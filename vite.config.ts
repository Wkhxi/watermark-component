import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

import babel from "vite-plugin-babel";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import insertPlugin from "./babel-plugin/insert-plugin.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), // 处理 React 的 JSX 转换和热更新
    babel({
      babelConfig: {
        presets: [
          "@babel/preset-env", // 转译现代 JavaScript
          "@babel/preset-react",
          "@babel/preset-typescript", // 转译 TypeScript 代码
        ],
        plugins: [insertPlugin],
        include: path.resolve(__dirname, "src/**/*"), // 仅对 src 中的代码应用 Babel
      },
    }),
  ],
  esbuild: false,
});
