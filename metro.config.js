const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo Go has no native LevelPlay module; swap in a no-op mock (npm run start:go).
if (process.env.EXPO_GO === '1') {
  const upstreamResolve = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'unity-levelplay-mediation') {
      return { type: 'sourceFile', filePath: path.join(__dirname, 'mocks/levelplay.js') };
    }
    return (upstreamResolve ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
