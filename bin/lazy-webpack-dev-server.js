#!/usr/bin/env node

/**
 * 开发服务器
 * @module
 * @author vega <vegawong@126.com>
 **/

/* eslint-disable no-underscore-dangle,no-console */

// Based on
// https://github.com/gaearon/react-transform-boilerplate/blob/master/devServer.js

const path = require('path');
const webpack = require('webpack');
const Dashboard = require('webpack-dashboard');
const DashboardPlugin = require('webpack-dashboard/plugin');
const WDS = require('webpack-dev-server');
const colors = require('colors');
const merge = require('webpack-merge');
const OpenBrowserPlugin = require('open-browser-webpack-plugin');
const debug = require('debug');


// const httpProxyMiddleware = require('http-proxy-middleware');

const configFile = process.argv[2] || 'webpack.config.js';
try {
  require.resolve(path.join(process.cwd(), configFile));
  // config = require(path.join(process.cwd(), configFile));
} catch (e) {
  console.log(colors.red(
    'Failed to load webpack config, please use like this\n' +
    'ewp-dev-server [webpack.config.js\'s path]\n'
  ));
  console.error(e.stack);
  process.exit(1);
}

let config = require(path.join(process.cwd(), configFile));
const serverConfig = config.devServer;
const https = serverConfig.https || false;

const port = serverConfig.port || 3000;
const hostname = serverConfig.hostname || 'localhost';
const protocol = https ? 'https' : 'http';


// console.log(config.plugins);
// hot-replace
if (typeof config.entry === 'string') {
  config.entry = [`${path.join(path.dirname(require.resolve('webpack-dev-server')), '..')}/client?${protocol}://${hostname}:${port}`,
    `${path.dirname(require.resolve('build-html-webpack-plugin'))}/client?${protocol}://${hostname}:${port}`,
    `${path.join(path.dirname(require.resolve('webpack')), '..')}/hot/dev-server`, config.entry];
} else {
  Object.keys(config.entry).forEach(v => {
    if (typeof config.entry[v] === 'string') {
      config.entry[v] = [`${path.join(path.dirname(require.resolve('webpack-dev-server')), '..')}/client?${protocol}://${hostname}:${port}`,
        `${path.dirname(require.resolve('build-html-webpack-plugin'))}/client?${protocol}://${hostname}:${port}`,
        `${path.join(path.dirname(require.resolve('webpack')), '..')}/hot/dev-server`, config.entry[v]];
    } else {
      config.entry[v] = [`${path.join(path.dirname(require.resolve('webpack-dev-server')), '..')}/client?${protocol}://${hostname}:${port}`,
        `${path.dirname(require.resolve('build-html-webpack-plugin'))}/client?${protocol}://${hostname}:${port}`,
        `${path.join(path.dirname(require.resolve('webpack')), '..')}/hot/dev-server`, ...config.entry[v]];
    }
  });
}

debug('lwds-entry')(config.entry);

config = merge({
  customizeArray: merge.unique(
    'plugins',
    ['HotModuleReplacementPlugin'],
    plugin => plugin.constructor && plugin.constructor.name
  )
})({
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
}, config);

debug('lwds-plugins')(config.plugins);

// console.log(config.plugins);

const compiler = webpack(config);

const wdsOptions = {
  // webpack-dev-server options

  contentBase: serverConfig.contentBase || process.cwd(),
  // Can also be an array, or: contentBase: "http://localhost/",

  hot: true,
  // Enable special support for Hot Module Replacement
  // Page is no longer updated, but a "webpackHotUpdate" message is sent to the content
  // Use "webpack/hot/dev-server" as additional module in your entry point
  // Note: this does _not_ add the `HotModuleReplacementPlugin` like the CLI option does.

  historyApiFallback: serverConfig.historyApiFallback || false,
  // Set this as true if you want to access dev server from arbitrary url.
  // This is handy if you are using a html5 router.

  // compress: true,
  // Set this if you want to enable gzip compression for assets

  proxy: serverConfig.proxy || false,
  // Set this if you want webpack-dev-server to delegate a single path to an arbitrary server.
  // Use "**" to proxy all paths to the specified server.
  // This is useful if you want to get rid of 'http://localhost:8080/' in script[src],
  // and has many other use cases (see https://github.com/webpack/webpack-dev-server/pull/127 ).

  // setup: function (app) {
  // Here you can access the Express app object and add your own custom middleware to it.
  // For example, to define custom handlers for some paths:
  // app.get('/some/path', function(req, res) {
  //   res.json({ custom: 'response' });
  // });
  // },

  // pass [static options](http://expressjs.com/en/4x/api.html#express.static) to inner express server
  staticOptions: {},

  clientLogLevel: 'info',
  // Control the console log messages shown in the browser when using inline mode.
  // Can be `error`, `warning`, `info` or `none`.
  // webpack-dev-middleware options
  quiet: true,
  noInfo: true,
  lazy: false,
  // filename: "bundle.js",
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000
  },
  // It's a required option.
  publicPath: config.output.publicPath,
  headers: { 'X-Custom-Header': 'yes' },
  stats: { colors: true },
  https
};


// no-dashboard
if (serverConfig.dashboard) {
  const dashboard = new Dashboard();
  compiler.apply(new DashboardPlugin(dashboard.setData));
} else {
  // wdsOptions.quiet = true;
  // wdsOptions.noInfo = false;
  wdsOptions.reporter = function (reporterOptions) {
    const state = reporterOptions.state;
    const stats = reporterOptions.stats;
    const options = reporterOptions.options;
    if (state) {
      if (stats.hasErrors() || stats.hasWarnings() || serverConfig.verbose) {
        options.log(stats.toString(options.stats));
      }
      options.log(colors.yellow(`webpack: bundle is now VALID.  + ${stats.endTime - stats.startTime}ms`));
    } else {
      options.log(colors.yellow('webpack: bundle is now INVALID.'));
    }
  };
  compiler.plugin('compile', () => {
    console.log(colors.yellow('webpack building...'));
  });
}


// auto-open
if (serverConfig.autoOpen) {
  compiler.apply(new OpenBrowserPlugin({
    url: `${protocol}://${hostname}:${port}`
  }));
}

const server = new WDS(compiler, wdsOptions);
compiler._server = server;


server.listen(port || 3000, hostname || 'localhost', err => {
  if (err) {
    console.log(colors.red(err));
    return;
  }

  console.log(colors.green(`Listening at ${protocol}://${hostname}:${port}`));
});
