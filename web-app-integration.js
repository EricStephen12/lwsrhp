/**
 * Web App Integration Script for Single WebView Solution
 * 
 * Add this script to your web app to:
 * 1. Detect when running in the native app wrapper
 * 2. Hide PWA install prompts
 * 3. Handle OAuth flows properly
 * 4. Communicate with React Native
 * 
 * Include this in your web app's HTML:
 * <script src="web-app-integration.js"></script>
 */

(function() {
  'use strict';

  // ============================================================================
  // NATIVE APP DETECTION
  // ============================================================================
  
  /**
   * Detect if the web app is running inside the React Native WebView
   */
  function isRunningInNativeApp() {
    const userAgent = navigator.userAgent || '';
    
    return (
      // Check for React Native WebView bridge
      window.ReactNativeWebView !== undefined ||
      // Check for Android WebView indicator
      userAgent.includes('wv') ||
      // Check for our custom user agent string
      userAgent.includes('LWSRHPNativeApp') ||
      // Check for injected flag
      window.__SINGLE_WEBVIEW_INJECTED__ === true ||
      // Check localStorage flag
      localStorage.getItem('isNativeApp') === 'true' ||
      // Check for standalone PWA mode
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS standalone mode
      window.navigator.standalone === true
    );
  }

  // Set global flags
  window.isNativeApp = isRunningInNativeApp();
  window.isReactNativeWebView = window.ReactNativeWebView !== undefined;

  // ============================================================================
  // PWA INSTALL PROMPT HANDLING
  // ============================================================================
  
  if (window.isNativeApp) {
    console.log('[WebAppIntegration] Running in native app - hiding install prompts');
    
    // Prevent beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      console.log('[WebAppIntegration] Install prompt prevented');
      return false;
    });

    // Add CSS to hide install-related UI elements
    const hideInstallCSS = document.createElement('style');
    hideInstallCSS.id = 'native-app-styles';
    hideInstallCSS.textContent = `
      /* Hide common install prompt selectors */
      .install-prompt,
      .pwa-install,
      .pwa-install-prompt,
      .add-to-home,
      .add-to-homescreen,
      .install-banner,
      .install-button,
      .app-install,
      [class*="install-prompt"],
      [class*="pwa-install"],
      [id*="install-prompt"],
      [id*="pwa-install"],
      [data-install-prompt],
      [data-pwa-install] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    
    // Wait for head to be available
    if (document.head) {
      document.head.appendChild(hideInstallCSS);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        document.head.appendChild(hideInstallCSS);
      });
    }

    // Store flag in localStorage for persistence
    try {
      localStorage.setItem('isNativeApp', 'true');
    } catch (e) {
      console.warn('[WebAppIntegration] Could not set localStorage flag');
    }
  }

  // ============================================================================
  // OAUTH FLOW HELPERS
  // ============================================================================
  
  /**
   * Helper function to initiate OAuth in the single WebView
   * Use this instead of window.open() for OAuth flows
   */
  window.initiateOAuth = function(authUrl, options = {}) {
    console.log('[WebAppIntegration] Initiating OAuth:', authUrl);
    
    // Store current URL for return navigation
    try {
      sessionStorage.setItem('oauth_return_url', window.location.href);
      sessionStorage.setItem('oauth_started', Date.now().toString());
    } catch (e) {}
    
    // Notify React Native
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'OAUTH_STARTED',
        authUrl: authUrl,
        returnUrl: window.location.href,
        provider: options.provider || 'unknown'
      }));
    }
    
    // Navigate to OAuth URL in same window
    window.location.href = authUrl;
  };

  /**
   * Handle OAuth callback/redirect
   * Call this on your OAuth callback page
   */
  window.handleOAuthCallback = function(result) {
    console.log('[WebAppIntegration] OAuth callback received');
    
    // Notify React Native
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'OAUTH_CALLBACK',
        success: result.success,
        data: result.data,
        error: result.error
      }));
    }
    
    // Navigate back to original page if stored
    try {
      const returnUrl = sessionStorage.getItem('oauth_return_url');
      if (returnUrl && result.success) {
        sessionStorage.removeItem('oauth_return_url');
        sessionStorage.removeItem('oauth_started');
        // Small delay to ensure token is stored
        setTimeout(function() {
          window.location.href = returnUrl;
        }, 100);
      }
    } catch (e) {}
  };

  // ============================================================================
  // KINGSCHAT OAUTH SPECIFIC HANDLING
  // ============================================================================
  
  /**
   * KingsChat OAuth helper
   * Use this for KingsChat login integration
   */
  window.initiateKingsChatOAuth = function(clientId, redirectUri, options = {}) {
    const baseUrl = 'https://accounts.kingschat.online/oauth/authorize';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: options.responseType || 'code',
      scope: options.scope || 'profile',
      state: options.state || Math.random().toString(36).substring(7)
    });
    
    const authUrl = `${baseUrl}?${params.toString()}`;
    window.initiateOAuth(authUrl, { provider: 'kingschat' });
  };

  // ============================================================================
  // REACT NATIVE COMMUNICATION
  // ============================================================================
  
  /**
   * Send a message to React Native
   */
  window.sendToNative = function(type, data = {}) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: type,
        ...data,
        timestamp: Date.now()
      }));
      return true;
    }
    console.warn('[WebAppIntegration] ReactNativeWebView not available');
    return false;
  };

  /**
   * Request native app to go back
   */
  window.requestNativeBack = function() {
    return window.sendToNative('REQUEST_GO_BACK');
  };

  /**
   * Request native app to show a native alert
   */
  window.showNativeAlert = function(title, message) {
    return window.sendToNative('SHOW_ALERT', { title, message });
  };

  // ============================================================================
  // NAVIGATION HELPERS
  // ============================================================================
  
  /**
   * Safe navigation that works in both web and native contexts
   */
  window.safeNavigate = function(url, options = {}) {
    console.log('[WebAppIntegration] Safe navigate to:', url);
    
    // Resolve relative URLs
    const absoluteUrl = new URL(url, window.location.href).href;
    
    // Notify React Native
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'NAVIGATION_REQUEST',
        url: absoluteUrl,
        replace: options.replace || false
      }));
    }
    
    // Perform navigation
    if (options.replace) {
      window.location.replace(absoluteUrl);
    } else {
      window.location.href = absoluteUrl;
    }
  };

  // ============================================================================
  // DEBUGGING HELPERS
  // ============================================================================
  
  /**
   * Log debug info about the current environment
   */
  window.debugNativeApp = function() {
    const info = {
      isNativeApp: window.isNativeApp,
      isReactNativeWebView: window.isReactNativeWebView,
      hasWebViewBridge: window.ReactNativeWebView !== undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage_isNativeApp: localStorage.getItem('isNativeApp'),
      injectionFlag: window.__SINGLE_WEBVIEW_INJECTED__,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      iosStandalone: window.navigator.standalone
    };
    
    console.log('[WebAppIntegration] Debug Info:', info);
    
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'DEBUG_INFO',
        info: info
      }));
    }
    
    return info;
  };

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================
  
  // Log initialization
  console.log('[WebAppIntegration] Initialized', {
    isNativeApp: window.isNativeApp,
    isReactNativeWebView: window.isReactNativeWebView
  });

  // Notify React Native that web app integration is ready
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'WEB_APP_INTEGRATION_READY',
      version: '1.0.0',
      features: ['oauth', 'navigation', 'messaging', 'debug']
    }));
  }

})();
