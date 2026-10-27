import React, { useMemo } from 'react';
import { View, PanResponder } from 'react-native';

// Claim only deliberate, single-finger horizontal gestures; leave vertical scrolling alone.
export default function SwipeBackToIA({ navigation, children }) {
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_event, gesture) => gesture.numberActiveTouches === 1
      && gesture.dx < -28 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2.5,
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx < -85 && Math.abs(gesture.dy) < 55) navigation.navigate('Herramientas');
    },
    onPanResponderTerminationRequest: () => true,
  }), [navigation]);
  return <View style={{ flex: 1 }} {...responder.panHandlers}>{children}</View>;
}
