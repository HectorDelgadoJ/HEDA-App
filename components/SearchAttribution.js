import React from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function SearchAttribution({ html }) {
  if (!html) return null;
  function navigate(request) {
    if (request.url === 'about:blank') return true;
    if (request.url.startsWith('https://')) Linking.openURL(request.url).catch(() => {});
    return false;
  }
  return <View style={{ height: 180, marginTop: 12 }}>
    <WebView source={{ html: '<meta name="viewport" content="width=device-width, initial-scale=1">' + html }}
      style={{ backgroundColor: 'transparent' }} originWhitelist={['*']}
      javaScriptEnabled={false} domStorageEnabled={false} allowFileAccess={false}
      mixedContentMode="never" setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={navigate} accessibilityLabel="Sugerencias de Google Search" />
  </View>;
}
