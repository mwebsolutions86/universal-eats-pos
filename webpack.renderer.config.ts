import type { Configuration } from 'webpack';
import { DefinePlugin } from 'webpack'; // <--- 1. IMPORT INDISPENSABLE

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }, { loader: 'postcss-loader' }],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  // --- 2. LE FIX EST ICI ---
  plugins: [
    ...plugins, // On garde les plugins existants
    // On dit à Webpack : "Si tu vois __dirname, remplace-le par un point (.)"
    new DefinePlugin({
      '__dirname': JSON.stringify('.'),
      '__filename': JSON.stringify('renderer.js'),
    }),
  ],
  // -------------------------
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};