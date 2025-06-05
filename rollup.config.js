import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import { terser } from "rollup-plugin-terser";
import visualizer from "rollup-plugin-visualizer";

export default {
  input: "src/package/index.ts",
  output: [
    {
      dir: "dist",
      format: "es",
      preserveModules: true,
      sourcemap: false,
      entryFileNames: "[name].js",
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      exclude: ["**/*.test.ts"],
    }),
    terser({
      compress: {
        pure_funcs: ["console.log"],
        passes: 2,
      },
    }),
    visualizer({
      filename: "bundle-analysis.html",
      open: true,
    }),
  ],
};
