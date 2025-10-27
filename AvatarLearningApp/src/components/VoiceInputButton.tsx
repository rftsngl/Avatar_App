/**
 * Voice Input Button Component
 * 
 * A reusable button component for voice input with recording indicator,
 * animated microphone icon, and recording duration display.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SpeechRecognitionState } from '../services/speech';

/**
 * Voice Input Button Props
 */
interface VoiceInputButtonProps {
  onPress: () => void;
  state: SpeechRecognitionState;
  duration?: number;
  disabled?: boolean;
}

/**
 * Voice Input Button Component
 */
const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onPress,
  state,
  duration = 0,
  disabled = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [displayDuration, setDisplayDuration] = useState(0);

  // Pulse animation for recording state
  useEffect(() => {
    if (state === 'listening') {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop pulse animation
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  // Update display duration
  useEffect(() => {
    setDisplayDuration(duration);
  }, [duration]);

  /**
   * Get button style based on state
   */
  const getButtonStyle = () => {
    switch (state) {
      case 'listening':
        return [styles.button, styles.buttonListening];
      case 'processing':
        return [styles.button, styles.buttonProcessing];
      case 'error':
        return [styles.button, styles.buttonError];
      default:
        return [styles.button, styles.buttonIdle];
    }
  };

  /**
   * Get button text based on state
   */
  const getButtonText = () => {
    switch (state) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
      default:
        return 'Tap to Speak';
    }
  };

  /**
   * Format duration as MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        disabled={disabled || state === 'processing'}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {state === 'processing' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.microphoneIcon}>
              <View style={styles.microphoneBody} />
              <View style={styles.microphoneStand} />
            </View>
          )}
        </Animated.View>

        <Text style={styles.buttonText}>{getButtonText()}</Text>
      </TouchableOpacity>

      {state === 'listening' && (
        <View style={styles.durationContainer}>
          <View style={styles.recordingIndicator} />
          <Text style={styles.durationText}>{formatDuration(displayDuration)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 160,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonIdle: {
    backgroundColor: '#6366F1', // Indigo-500
  },
  buttonListening: {
    backgroundColor: '#EF4444', // Red-500
  },
  buttonProcessing: {
    backgroundColor: '#F59E0B', // Amber-500
  },
  buttonError: {
    backgroundColor: '#DC2626', // Red-600
  },
  iconContainer: {
    marginRight: 8,
  },
  microphoneIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  microphoneBody: {
    width: 10,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    marginBottom: 2,
  },
  microphoneStand: {
    width: 14,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});

export default VoiceInputButton;

