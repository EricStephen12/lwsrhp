# Single WebView Solution - Debugging Guide

## Overview
This guide helps you test and debug the single WebView implementation for OAuth flows, popups, and session continuity.

## Quick Start

```bash
# Install dependencies
npm install

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## Testing OAuth Flows

### 1. KingsChat OAuth Testing
```javascript
// In your web app's browser console:
window.initiateKingsChatOAuth('YOUR_CLIENT_ID', 'YOUR_REDIRECT_URI');

// Or manually test:
window.initiateOAuth('https://accounts.kingschat.online/oauth/authorize?client_id=xxx');
```

### 2. Verify Single WebView Behavior
```javascript
// Check if running in native app
window.debugNativeApp();

// Test window.open override
window.open('https://example.com', '_blank');
// Should navigate in same WebView, NOT open new window
```

### 3. Test target="_blank" Interception
Create a test link in your web app:
```html
<a href="https://kingschat.online" target="_blank">Test Blank Link</a>
```
Click it - should stay in same WebView.

## Console Logging

All WebView console logs are forwarded to React Native. View them with:

```bash
# Android
npx react-native log-android

# iOS
npx react-native log-ios

# Or use Expo
npx expo start --dev-client
```

Look for logs prefixed with:
- `[SingleWebView]` - Injected JS logs
- `[WebAppIntegration]` - Web app integration logs
- `[App]` - React Native app logs
- `[WebView log/error/warn]` - Forwarded console logs

## Common Issues & Solutions

### Issue: OAuth popup opens in external browser
**Solution:** Ensure `setSupportMultipleWindows={false}` is set and JS injection is working.

### Issue: Session lost after OAuth redirect
**Solution:** Verify cookies are enabled:
- `sharedCookiesEnabled={true}`
- `thirdPartyCookiesEnabled={true}`

### Issue: Back button exits app instead of going back
**Solution:** Check `canGoBack` state is updating properly in `onNavigationStateChange`.

### Issue: Page not loading (blank screen)
**Solution:** Check network security config and Info.plist ATS settings.

## Debugging Tools

### Chrome DevTools (Android)
1. Enable USB debugging on device
2. Open `chrome://inspect` in Chrome
3. Find your WebView under "Remote Target"
4. Click "inspect"

### Safari Web Inspector (iOS)
1. Enable Web Inspector in Safari settings on device
2. Connect device to Mac
3. Open Safari > Develop > [Device Name] > [WebView]

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │                   WebView                        │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │         Injected JavaScript              │    │    │
│  │  │  - window.open() override               │    │    │
│  │  │  - target="_blank" interception         │    │    │
│  │  │  - Console log forwarding               │    │    │
│  │  │  - OAuth message handling               │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  │                      ↓                           │    │
│  │              Your Web App                        │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │      web-app-integration.js             │    │    │
│  │  │  - Native app detection                 │    │    │
│  │  │  - OAuth helpers                        │    │    │
│  │  │  - Install prompt hiding                │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
│                          ↕                               │
│              postMessage / onMessage                     │
│                          ↕                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │            React Native Handlers                 │    │
│  │  - Navigation state tracking                    │    │
│  │  - Hardware back button                         │    │
│  │  - Error handling                               │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Key WebView Props Explained

| Prop | Value | Purpose |
|------|-------|---------|
| `setSupportMultipleWindows` | `false` | Prevents new WebView instances |
| `sharedCookiesEnabled` | `true` | Shares cookies with native HTTP client |
| `thirdPartyCookiesEnabled` | `true` | Allows cross-domain cookies |
| `injectedJavaScript` | JS code | Runs after page load |
| `injectedJavaScriptBeforeContentLoaded` | JS code | Runs before page load |
| `originWhitelist` | `['*']` | Allows all URL schemes |
| `mixedContentMode` | `'always'` | Allows HTTP content in HTTPS pages |

## Adding New OAuth Providers

1. Add domain to `ALLOWED_DOMAINS` in App.js:
```javascript
const ALLOWED_DOMAINS = [
  // ... existing domains
  'newprovider.com',
  'auth.newprovider.com',
];
```

2. Add to network_security_config.xml (Android):
```xml
<domain-config cleartextTrafficPermitted="false">
  <domain includeSubdomains="true">newprovider.com</domain>
</domain-config>
```

3. Add to Info.plist (iOS):
```xml
<key>newprovider.com</key>
<dict>
  <key>NSIncludesSubdomains</key>
  <true/>
</dict>
```

## Production Checklist

- [ ] Test all OAuth providers
- [ ] Verify session persistence across app restarts
- [ ] Test hardware back button navigation
- [ ] Verify no popups open external browser
- [ ] Test offline behavior
- [ ] Remove debug console forwarding if not needed
- [ ] Test on multiple Android/iOS versions
