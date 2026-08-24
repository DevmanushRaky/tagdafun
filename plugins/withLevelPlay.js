const { withAppBuildGradle, withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

const PLAY_SERVICES_DEPS = [
  "implementation 'com.google.android.gms:play-services-ads-identifier:18.0.1'",
  "implementation 'com.google.android.gms:play-services-basement:18.3.0'",
  "implementation 'com.google.android.gms:play-services-appset:16.0.2'",
];

function withLevelPlayAndroidGradle(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const marker = 'dependencies {';
    const alreadyAdded = PLAY_SERVICES_DEPS.every((dep) => contents.includes(dep));
    if (!alreadyAdded && contents.includes(marker)) {
      const injected = PLAY_SERVICES_DEPS.map((dep) => `    ${dep}`).join('\n');
      config.modResults.contents = contents.replace(
        marker,
        `${marker}\n${injected}`
      );
    }
    return config;
  });
}

function withLevelPlayAndroidManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const hasAdIdPermission = manifest['uses-permission'].some(
      (item) => item.$['android:name'] === 'com.google.android.gms.permission.AD_ID'
    );
    if (!hasAdIdPermission) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'com.google.android.gms.permission.AD_ID' },
      });
    }
    return config;
  });
}

function withLevelPlayInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    const skAdNetworkIds = config.modResults.SKAdNetworkItems || [];
    const identifier = 'su67r6k2v3.skadnetwork';
    const alreadyAdded = skAdNetworkIds.some(
      (item) => item.SKAdNetworkIdentifier === identifier
    );
    if (!alreadyAdded) {
      skAdNetworkIds.push({ SKAdNetworkIdentifier: identifier });
    }
    config.modResults.SKAdNetworkItems = skAdNetworkIds;
    config.modResults.NSAdvertisingAttributionReportEndpoint = 'https://postbacks-is.com';
    return config;
  });
}

module.exports = function withLevelPlay(config) {
  config = withLevelPlayAndroidGradle(config);
  config = withLevelPlayAndroidManifest(config);
  config = withLevelPlayInfoPlist(config);
  return config;
};
