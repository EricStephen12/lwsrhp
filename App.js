import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, StatusBar, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';

export default function App() {
  const webViewRef = useRef(null);

  useEffect(() => {
    // Prevent screenshots and screen recording
    const preventScreenCapture = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (error) {
        console.log('Screen capture prevention not supported on this device');
      }
    };

    preventScreenCapture();

    // Cleanup: allow screen capture when app unmounts (optional)
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true; // Prevent default behavior (closing app)
      }
      return false;
    });

    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar
          backgroundColor="white"
          barStyle="dark-content"
          translucent={false}
        />
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://loveworld-singers-rehearsal-hub-aq5.vercel.app/' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mediaCapturePermissionGrantType="grant"
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(request) => {
            // Allow all URLs to open within the WebView
            return true;
          }}
          onNavigationStateChange={(navState) => {
            // This helps track if we can go back
            webViewRef.current.canGoBack = navState.canGoBack;
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  webview: {
    flex: 1,
  },
});
