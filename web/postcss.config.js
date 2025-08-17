const plugins = {
  autoprefixer: {},
};

try {
  // Load Tailwind CSS only if it's installed; otherwise fall back to plain styles
  // so "pnpm dev" does not crash when tailwindcss is missing.
  // Projects should run `pnpm install` to enable Tailwind processing.
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  plugins.tailwindcss = require('tailwindcss');
} catch {
  // Tailwind CSS is optional in environments where dependencies cannot be installed.
  // A warning is printed to help developers debug missing styling.
  // eslint-disable-next-line no-console
  console.warn('tailwindcss module not found; skipping Tailwind processing');
}

module.exports = { plugins };
