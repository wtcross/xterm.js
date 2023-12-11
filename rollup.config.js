const resolve = require("@rollup/plugin-node-resolve").nodeResolve;
const alias = require("@rollup/plugin-alias");
const path = require("path");

const config = [
  // Browser
  {
    input: path.join(__dirname, "out-es6/browser/public/Terminal.js"),
    output: {
      file: "./dist/xterm.mjs",
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      resolve(),
      alias({
        entries: [
          { find: /^common\/(.*)/, replacement: "./out-es6/common/$1.js" },
          { find: /^browser\/(.*)/, replacement: "./out-es6/browser/$1.js" },
        ],
      }),
    ],
  },

  // Headless
  {
    input: path.join(__dirname, "out-es6/headless/public/Terminal.js"),
    output: {
      file: "./dist/xterm-headless.mjs",
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      resolve(),
      alias({
        entries: [
          { find: /^common\/(.*)/, replacement: "./out-es6/common/$1.js" },
          { find: /^headless\/(.*)/, replacement: "./out-es6/headless/$1.js" },
        ],
      }),
    ],
  }
];

const addons = [
  "attach", "canvas", "fit", "image", "ligatures",
  "search","serialize", "unicode-graphemes",
  "unicode11", "web-links", "webgl",
]

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camelizeSnakeCase(str) {
  return str.split("-").map(capitalize).join("");
}

// Addons
addons.forEach((addon) => {
  const addonCamelized = camelizeSnakeCase(addon);

  config.push(
    {
      input: path.join(__dirname, `addons/addon-${addon}/out-es6/${addonCamelized}Addon.js`),
      output: {
        file: `./addons/addon-${addon}/dist/${addonCamelized}Addon.mjs`,
        format: "esm",
        sourcemap: true,
      },
      plugins: [resolve()],
    })
});

export default config;
