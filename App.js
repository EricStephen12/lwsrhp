import { useRef, useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, StatusBar, BackHandler, View, TouchableOpacity, Text, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';

export default function App() {
  const webViewRef = useRef(null);
  const externalWebViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showExternalBrowser, setShowExternalBrowser] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalCanGoBack, setExternalCanGoBack] = useState(false);
  const mainAppUrl = 'https://loveworld-singers-rehearsal-hub-por.vercel.app/';
  
  const isExternalSite = currentUrl && !currentUrl.startsWith(mainAppUrl);

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
      // If external browser modal is open, close it first
      if (showExternalBrowser) {
        closeExternalBrowser();
        return true;
      }
      
      // Otherwise handle main webview back navigation
      if (webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true; // Prevent default behavior (closing app)
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showExternalBrowser, canGoBack]);

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const handleReload = () => {
    setHasError(false);
    setIsLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const openExternalBrowser = (url) => {
    setExternalUrl(url);
    setShowExternalBrowser(true);
    setExternalLoading(true);
  };

  const closeExternalBrowser = () => {
    setShowExternalBrowser(false);
    setExternalUrl('');
    setExternalLoading(false);
    setExternalCanGoBack(false);
  };

  const handleExternalGoBack = () => {
    if (externalWebViewRef.current && externalCanGoBack) {
      externalWebViewRef.current.goBack();
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar
          backgroundColor="white"
          barStyle="dark-content"
          translucent={false}
        />
        {isExternalSite && (
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <Text style={styles.backButtonText}>← Back to App</Text>
            </TouchableOpacity>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://loveworld-singers-rehearsal-hub-por.vercel.app/' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          incognito={false}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mediaCapturePermissionGrantType="grant"
          setSupportMultipleWindows={false}
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          startInLoadingState={false}
          onShouldStartLoadWithRequest={(request) => {
            // Check if it's an external URL
            if (!request.url.startsWith(mainAppUrl) && request.url.startsWith('http')) {
              // Open in modal browser instead of navigating
              openExternalBrowser(request.url);
              return false; // Prevent navigation in main webview
            }
            return true;
          }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            setCurrentUrl(navState.url);
          }}
          onLoadStart={() => {
            setHasError(false);
          }}
          onLoadProgress={({ nativeEvent }) => {
            if (nativeEvent.progress === 1) {
              setIsLoading(false);
            }
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          onHttpError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#800080" />
          </View>
        )}
        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Connection Issue</Text>
            <Text style={styles.errorMessage}>
              Unable to load the page. Please check your internet connection.
            </Text>
            <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
              <Text style={styles.reloadButtonText}>Reload</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* External Browser Modal */}
        <Modal
          visible={showExternalBrowser}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeExternalBrowser}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalBackButton} 
                onPress={handleExternalGoBack}
                disabled={!externalCanGoBack}
              >
                <Text style={[styles.modalBackButtonText, !externalCanGoBack && styles.disabledText]}>
                  ← Back
                </Text>
              </TouchableOpacity>
              
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  External Site
                </Text>
              </View>
              
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeExternalBrowser}>
                <Text style={styles.modalCloseButtonText}>✕ Close</Text>
              </TouchableOpacity>
            </View>
            
            {externalUrl ? (
              <WebView
                ref={externalWebViewRef}
                source={{ uri: externalUrl }}
                style={styles.modalWebview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                thirdPartyCookiesEnabled={true}
                sharedCookiesEnabled={true}
                incognito={false}
                onNavigationStateChange={(navState) => {
                  setExternalCanGoBack(navState.canGoBack);
                }}
                onLoadStart={() => setExternalLoading(true)}
                onLoadEnd={() => setExternalLoading(false)}
                onError={() => setExternalLoading(false)}
              />
            ) : null}
            
            {externalLoading && (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#800080" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: '#800080',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  reloadButton: {
    backgroundColor: '#800080',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reloadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Browser Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#800080',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalBackButton: {
    paddingRight: 16,
  },
  modalBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    paddingLeft: 16,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalWebview: {
    flex: 1,
  },
  modalLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#800080',
  },
});
