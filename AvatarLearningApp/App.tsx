/**
 * Avatar Learning App
 *
 * Main application entry point with Error Boundary
 */

import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Ignore known warnings from native modules
LogBox.ignoreLogs([
  'new NativeEventEmitter',
  'EventEmitter.removeListener',
  'EventEmitter.addListener',
  'removeListeners',
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  "Image source \"null\" doesn't exist",
]);

// Suppress console warnings for specific patterns (development only)
if (__DEV__) {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('new NativeEventEmitter') ||
       message.includes('EventEmitter') ||
       message.includes('addListener') ||
       message.includes('removeListeners'))
    ) {
      return;
    }
    originalWarn(...args);
  };
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
        <RootNavigator />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default App;
