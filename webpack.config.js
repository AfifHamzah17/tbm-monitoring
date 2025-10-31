const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new webpack.DefinePlugin({
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyB75X3CyuZU1EzL0s8IpuZ9cf597RrKDGk')
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
  },
};