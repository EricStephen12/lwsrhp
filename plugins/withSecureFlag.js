const { withMainActivity } = require('@expo/config-plugins');

const withSecureFlag = (config) => {
  return withMainActivity(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    // Add FLAG_SECURE to prevent screenshots
    if (!contents.includes('WindowManager.LayoutParams.FLAG_SECURE')) {
      // Find onCreate method and add FLAG_SECURE
      const onCreatePattern = /(override fun onCreate\(savedInstanceState: Bundle\?\) \{[\s\S]*?super\.onCreate\(savedInstanceState\))/;
      
      if (onCreatePattern.test(contents)) {
        contents = contents.replace(
          onCreatePattern,
          `$1\n        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)`
        );
      }

      // Add import if not present
      if (!contents.includes('import android.view.WindowManager')) {
        contents = contents.replace(
          /(package .*\n)/,
          `$1\nimport android.view.WindowManager`
        );
      }
    }

    modResults.contents = contents;
    return config;
  });
};

module.exports = withSecureFlag;
