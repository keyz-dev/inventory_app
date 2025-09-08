module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NativeWind Babel plugin is optional with Tailwind v4 + Expo
    // plugins: ['nativewind/babel'],
  };
};


