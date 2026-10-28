import React from 'react';
import { Keyboard, Platform, TouchableWithoutFeedback } from 'react-native';

// A web input already owns its focus. A parent press handler would blur it
// on the very click that focuses it, preventing normal keyboard entry.
export default function KeyboardDismissArea({ children }) {
  if (Platform.OS === 'web') return children;
  return <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>{children}</TouchableWithoutFeedback>;
}
