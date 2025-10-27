/**
 * Photo Avatar Creation Modal
 * 
 * Form for creating HeyGen Photo Avatars with AI parameters.
 * Users describe the avatar they want, and AI generates it.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  PhotoAvatarParams,
  PhotoAvatarAge,
  PhotoAvatarGender,
  PhotoAvatarEthnicity,
  PhotoAvatarStyle,
  PhotoAvatarOrientation,
  PhotoAvatarPose,
} from '../types';

interface PhotoAvatarCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: PhotoAvatarParams) => Promise<void>;
}

const AGE_OPTIONS: PhotoAvatarAge[] = [
  'Young Adult',
  'Early Middle Age',
  'Late Middle Age',
  'Senior',
  'Unspecified',
];

const GENDER_OPTIONS: PhotoAvatarGender[] = ['Woman', 'Man', 'Unspecified'];

const ETHNICITY_OPTIONS: PhotoAvatarEthnicity[] = [
  'Asian',
  'African',
  'Caucasian',
  'Hispanic',
  'Middle Eastern',
  'South Asian',
  'Pacific Islander',
  'Native American',
  'Mixed',
  'Unspecified',
];

const STYLE_OPTIONS: PhotoAvatarStyle[] = [
  'Realistic',
  'Pixar',
  'Cinematic',
  'Vintage',
  'Noir',
  'Cyberpunk',
  'Unspecified',
];

const ORIENTATION_OPTIONS: PhotoAvatarOrientation[] = ['square', 'horizontal', 'vertical'];

const POSE_OPTIONS: PhotoAvatarPose[] = ['half_body', 'close_up', 'full_body'];

export const PhotoAvatarCreationModal: React.FC<PhotoAvatarCreationModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState<PhotoAvatarAge>('Young Adult');
  const [gender, setGender] = useState<PhotoAvatarGender>('Unspecified');
  const [ethnicity, setEthnicity] = useState<PhotoAvatarEthnicity>('Unspecified');
  const [style, setStyle] = useState<PhotoAvatarStyle>('Realistic');
  const [appearance, setAppearance] = useState('');
  const [orientation, setOrientation] = useState<PhotoAvatarOrientation>('square');
  const [pose, setPose] = useState<PhotoAvatarPose>('half_body');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for your avatar');
      return;
    }

    if (!appearance.trim()) {
      Alert.alert('Error', 'Please describe how your avatar should look');
      return;
    }

    if (appearance.length > 1000) {
      Alert.alert('Error', 'Description must be less than 1000 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const params: PhotoAvatarParams = {
        name: name.trim(),
        age,
        gender,
        ethnicity,
        style,
        appearance: appearance.trim(),
        orientation,
        pose,
      };

      await onSubmit(params);
      
      // Reset form
      setName('');
      setAge('Young Adult');
      setGender('Unspecified');
      setEthnicity('Unspecified');
      setStyle('Realistic');
      setAppearance('');
      setOrientation('square');
      setPose('half_body');
      
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDropdown = <T extends string>(
    label: string,
    value: T,
    options: readonly T[],
    onChange: (value: T) => void
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              value === option && styles.optionButtonSelected,
            ]}
            onPress={() => onChange(option)}
            disabled={isSubmitting}
          >
            <Text
              style={[
                styles.optionText,
                value === option && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Photo Avatar</Text>
          <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Avatar Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Professional John"
              editable={!isSubmitting}
            />
          </View>

          {/* Age */}
          {renderDropdown('Age', age, AGE_OPTIONS, setAge)}

          {/* Gender */}
          {renderDropdown('Gender', gender, GENDER_OPTIONS, setGender)}

          {/* Ethnicity */}
          {renderDropdown('Ethnicity', ethnicity, ETHNICITY_OPTIONS, setEthnicity)}

          {/* Style */}
          {renderDropdown('Style', style, STYLE_OPTIONS, setStyle)}

          {/* Appearance Description */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Appearance Description * ({appearance.length}/1000)
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={appearance}
              onChangeText={setAppearance}
              placeholder="Describe the avatar's appearance, clothing, expression, etc.&#10;Example: Professional businessman in navy suit, confident smile, friendly expression, modern office background"
              multiline
              numberOfLines={6}
              maxLength={1000}
              editable={!isSubmitting}
            />
            <Text style={styles.hint}>
              Be detailed! Describe clothing, expression, background, and style.
            </Text>
          </View>

          {/* Orientation */}
          {renderDropdown('Orientation', orientation, ORIENTATION_OPTIONS, setOrientation)}

          {/* Pose */}
          {renderDropdown('Pose', pose, POSE_OPTIONS, setPose)}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Creating...' : 'Create Avatar'}
            </Text>
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              💡 This will generate an AI avatar based on your description.
            </Text>
            <Text style={styles.infoText}>
              ⏱️ Generation may take 1-3 minutes.
            </Text>
            <Text style={styles.infoText}>
              💰 Cost: ~5 API credits per avatar.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    fontSize: 28,
    color: '#666666',
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  optionsScroll: {
    flexDirection: 'row',
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
});
