const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const enhancedMiddleware = enhanceMiddleware ? enhanceMiddleware(middleware, metroServer) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return enhancedMiddleware(req, res, next);
  };
};

/**
 * Firebase JS SDK 13 publishes React Native builds, but the `firebase/auth`
 * and `firebase/firestore` export maps have no `react-native` condition.
 * Metro would otherwise bundle the browser builds, which do not include
 * `getReactNativePersistence` and are the wrong Firestore network stack.
 * Web keeps the default browser builds.
 */
const nativeFirebaseEntries = {
  'firebase/auth': path.resolve(__dirname, 'node_modules/@firebase/auth/dist/rn/index.js'),
  'firebase/firestore': path.resolve(
    __dirname,
    'node_modules/@firebase/firestore/dist/index.rn.js',
  ),
};

const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && nativeFirebaseEntries[moduleName]) {
    return { type: 'sourceFile', filePath: nativeFirebaseEntries[moduleName] };
  }
  if (upstreamResolve) {
    return upstreamResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
