import type { Configuration } from 'webpack';
import { DefinePlugin } from 'webpack'; 
import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const tailwindcss = require('tailwindcss');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const autoprefixer = require('autoprefixer');

rules.push({
  test: /\.css$/,
  use: [
    { loader: 'style-loader' },
    { 
      loader: 'css-loader',
      options: {
        importLoaders: 1, 
      }
    },
    { 
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: [
            tailwindcss('./tailwind.config.js'), 
            autoprefixer,
          ],
        },
      },
    },
  ],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins: [
    ...plugins,
    new DefinePlugin({
      '__dirname': JSON.stringify('.'),
      '__filename': JSON.stringify('renderer.js'),
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};