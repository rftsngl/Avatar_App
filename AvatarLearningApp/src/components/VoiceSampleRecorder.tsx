/**
 * Voice Sample Recorder Component
 * 
 * Reusable component for recording individual voice samples.
 * Displays recording controls, timer, and sample script.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { AudioRecordingService } from '../services/audio';
import { HapticUtils } from '../utils/hapticUtils';
import { Logger } from '../utils/Logger';

interface VoiceSampleRecorderProps {
  sampleNumber: number;
  sampleScript: string;
  minDuration: number; // in seconds
  onRecordingComplete: (filePath: string, duration: number) => void;
  onRecordingCancelled?: () => void;
}

/**
 * Voice Sample Recorder Component
 */
export const VoiceSampleRecorder: React.FC<VoiceSampleRecorderProps> = ({
  sampleNumber,
  sampleScript,
  minDuration,
  onRecordingComplete,
  onRecordingCancelled,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0); // in milliseconds
  const [pulseAnim] = useState(new Animated.Value(1));

  /**
   * Start pulse animation when recording
   */
  useEffect(() => {
    if (isRecording && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused]);

  /**
   * Initialize audio recording service
   */
  useEffect(() => {
    AudioRecordingService.initialize({
      onProgress: (currentDuration) => {
        setDuration(currentDuration);
      },
      onError: (error) => {
        Logger.error('VoiceSampleRecorder: Recording error', error);
        HapticUtils.error();
        handleCancel();
      },
    });

    return () => {
      // Cleanup on unmount
      if (AudioRecordingService.isRecording()) {
        AudioRecordingService.cancelRecording();
      }
    };
  }, []);

  /**
   * Handle start recording
   */
  const handleStartRecording = async () => {
    try {
      const fileName = `voice_sample_${sampleNumber}_${Date.now()}.m4a`;
      await AudioRecordingService.startRecording(fileName);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      HapticUtils.medium();
      Logger.info('VoiceSampleRecorder: Recording started', { sampleNumber });
    } catch (error) {
      Logger.error('VoiceSampleRecorder: Failed to start recording', error);
      HapticUtils.error();
    }
  };

  /**
   * Handle pause recording
   */
  const handlePauseRecording = async () => {
    try {
      await AudioRecordingService.pauseRecording();
      setIsPaused(true);
      HapticUtils.light();
      Logger.info('VoiceSampleRecorder: Recording paused');
    } catch (error) {
      Logger.error('VoiceSampleRecorder: Failed to pause recording', error);
      HapticUtils.error();
    }
  };

  /**
   * Handle resume recording
   */
  const handleResumeRecording = async () => {
    try {
      await AudioRecordingService.resumeRecording();
      setIsPaused(false);
      HapticUtils.light();
      Logger.info('VoiceSampleRecorder: Recording resumed');
    } catch (error) {
      Logger.error('VoiceSampleRecorder: Failed to resume recording', error);
      HapticUtils.error();
    }
  };

  /**
   * Handle stop recording
   */
  const handleStopRecording = async () => {
    try {
      const { filePath, duration: recordingDuration } = await AudioRecordingService.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      HapticUtils.success();
      Logger.info('VoiceSampleRecorder: Recording stopped', {
        sampleNumber,
        duration: recordingDuration,
      });
      onRecordingComplete(filePath, recordingDuration);
    } catch (error) {
      Logger.error('VoiceSampleRecorder: Failed to stop recording', error);
      HapticUtils.error();
    }
  };

  /**
   * Handle cancel recording
   */
  const handleCancel = async () => {
    try {
      await AudioRecordingService.cancelRecording();
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      HapticUtils.light();
      Logger.info('VoiceSampleRecorder: Recording cancelled');
      if (onRecordingCancelled) {
        onRecordingCancelled();
      }
    } catch (error) {
      Logger.error('VoiceSampleRecorder: Failed to cancel recording', error);
    }
  };

  /**
   * Format duration for display
   */
  const formatDuration = (ms: number): string => {
    return AudioRecordingService.formatDuration(ms);
  };

  /**
   * Check if minimum duration is met
   */
  const isMinDurationMet = (): boolean => {
    return duration >= minDuration * 1000;
  };

  return (
    <View style={styles.container}>
      {/* Sample Script */}
      <View style={styles.scriptContainer}>
        <Text style={styles.scriptLabel}>Sample {sampleNumber} - Please read:</Text>
        <Text style={styles.scriptText}>{sampleScript}</Text>
      </View>

      {/* Recording Timer */}
      {isRecording && (
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.recordingIndicator, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.recordingDot} />
          </Animated.View>
          <Text style={styles.timerText}>{formatDuration(duration)}</Text>
          {!isMinDurationMet() && (
            <Text style={styles.minDurationText}>
              (min: {minDuration}s)
            </Text>
          )}
        </View>
      )}

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        {!isRecording ? (
          <TouchableOpacity style={styles.recordButton} onPress={handleStartRecording}>
            <View style={styles.recordButtonInner} />
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControls}>
            {/* Pause/Resume Button */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={isPaused ? handleResumeRecording : handlePauseRecording}
            >
              <Text style={styles.controlButtonText}>{isPaused ? '▶' : '⏸'}</Text>
            </TouchableOpacity>

            {/* Stop Button */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                styles.stopButton,
                !isMinDurationMet() && styles.stopButtonDisabled,
              ]}
              onPress={handleStopRecording}
              disabled={!isMinDurationMet()}
            >
              <Text style={[
                styles.controlButtonText,
                !isMinDurationMet() && styles.controlButtonTextDisabled,
              ]}>
                ⏹
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.controlButton, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.controlButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Instructions */}
      {!isRecording && (
        <Text style={styles.instructionText}>
          Tap "Start Recording" and read the text above clearly. Minimum {minDuration} seconds required.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 16,
  },
  scriptContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scriptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 8,
  },
  scriptText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  recordingIndicator: {
    marginRight: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
  },
  minDurationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  controlsContainer: {
    marginBottom: 12,
  },
  recordButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  recordButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  stopButton: {
    backgroundColor: '#10B981',
  },
  stopButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  controlButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  controlButtonTextDisabled: {
    color: '#9CA3AF',
  },
  instructionText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

