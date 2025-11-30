import { useRef, useState, useEffect } from 'react';
import { StyleSheet, BackHandler, View, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// KingsChat OAuth config
const KINGSCHAT_CLIENT_ID = '331c9eda-a130-4bb8-9a00-9231a817207d';
const KINGSCHAT_AUTH_URL = 'https://accounts.kingsch.at/oauth/authorize';
const KINGSCHAT_TOKEN_URL = 'https://accounts.kingsch.at/oauth/token';

// Web app URL
const WEB_APP_URL = 'https://www.loveworldsingersrehearsalhubportal.org/';

// JavaScript to inject before page loads
const injectedJavaScriptBeforeContentLoaded = `
(function() {
  // Mark as native app
  window.IS_NATIVE_APP = true;
  window.isNativeApp = true;
  
  // Prevent zoom on input focus (iOS)
  var meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  document.head.appendChild(meta);
  
  console.log('📱 Native app bridge initialized');
})();
true;
`;

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [canGoBack]);

  // Handle KingsChat OAuth natively
  const handleKingsChatOAuth = async (clientId, scopes) => {
    try {
      // Create OAuth request
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'lwsrhp',
        path: 'auth/callback'
      });

      const authRequest = new AuthSession.AuthRequest({
        clientId: clientId || KINGSCHAT_CLIENT_ID,
        scopes: scopes || ['profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
      });

      // Open browser for OAuth
      const result = await authRequest.promptAsync({
        authorizationEndpoint: KINGSCHAT_AUTH_URL,
      });

      if (result.type === 'success' && result.params.code) {
        // Exchange code for tokens
        const tokenResponse = await fetch(KINGSCHAT_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: result.params.code,
            client_id: clientId || KINGSCHAT_CLIENT_ID,
            redirect_uri: redirectUri,
          }).toString(),
        });

        const tokens = await tokenResponse.json();

        if (tokens.access_token) {
          // Inject tokens into WebView
          const tokenData = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresInMillis: tokens.expires_in * 1000,
          };

          webViewRef.current?.injectJavaScript(`
            (function() {
              // Store tokens in localStorage
              localStorage.setItem('kingschat_access_token', '${tokenData.accessToken}');
              localStorage.setItem('kingschat_refresh_token', '${tokenData.refreshToken}');
              localStorage.setItem('kingschat_token_expiry', '${Date.now() + tokenData.expiresInMillis}');
              
              // Call the callback function if it exists
              if (window.onNativeKingsChatAuth) {
                window.onNativeKingsChatAuth(${JSON.stringify(tokenData)});
              }
              console.log('📱 Native OAuth tokens injected');
            })();
            true;
          `);
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User cancelled - notify web app
        webViewRef.current?.injectJavaScript(`
          (function() {
            if (window.KingsChatAuthService && window.KingsChatAuthService.cancelNativeAuth) {
              window.KingsChatAuthService.cancelNativeAuth();
            }
            console.log('📱 Native OAuth cancelled');
          })();
          true;
        `);
      }
    } catch (error) {
      console.error('Native OAuth error:', error);
      // Notify web app of error
      webViewRef.current?.injectJavaScript(`
        (function() {
          if (window.KingsChatAuthService && window.KingsChatAuthService.cancelNativeAuth) {
            window.KingsChatAuthService.cancelNativeAuth();
          }
          console.log('📱 Native OAuth error');
        })();
        true;
      `);
    }
  };


  // Handle messages from WebView
  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('📱 Message from WebView:', message.type);

      switch (message.type) {
        case 'KINGSCHAT_LOGIN_REQUEST':
          handleKingsChatOAuth(
            message.data?.clientId || KINGSCHAT_CLIENT_ID,
            message.data?.scopes || ['profile', 'email']
          );
          break;
        case 'OPEN_EXTERNAL_URL':
          if (message.data?.url) {
            WebBrowser.openBrowserAsync(message.data.url);
          }
          break;
        case 'SHARE_REQUEST':
          // Handle native share - can use expo-sharing here
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        
        // Enable JavaScript and DOM storage
        javaScriptEnabled={true}
        domStorageEnabled={true}
        
        // Inject native app flag before page loads
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        
        // Handle messages from web app
        onMessage={handleMessage}
        
        // Track navigation state for back button
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        
        // Allow mixed content (if needed)
        mixedContentMode="compatibility"
        
        // Enable cookies
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        
        // Pull to refresh
        pullToRefreshEnabled={true}
        
        // Media playback
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        
        // File access (for uploads)
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        
        // User agent (helps identify native app on server)
        userAgent="LWSRH-NativeApp/1.0"
        
        // Keep everything in ONE webview
        setSupportMultipleWindows={false}
        
        // Cache
        cacheEnabled={true}
        
        // Allow all URLs
        originWhitelist={['*']}
        
        // Navigation gestures
        allowsBackForwardNavigationGestures={true}
        
        // Only show loader on FIRST load
        onLoadEnd={() => setFirstLoad(false)}
      />

      {/* Loader only on first load */}
      {firstLoad && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#800080" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 0 : 0, // SafeAreaView handles this
  },
  webview: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
