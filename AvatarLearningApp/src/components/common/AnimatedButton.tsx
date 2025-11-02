/**
 * AnimatedButton.tsx
 * 
 * Reusable animated button component with haptic feedback.
 * Supports multiple variants, loading states, and press animations.
 * 
 * @author Avatar Learning App
 * @date 2025-11-02
 */

import React, { useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { scalePress, scaleRelease } from '../../utils/animationUtils';
import { HapticUtils } from '../../utils/hapticUtils';
import Colors, { Shadows, BorderRadius, Spacing, FontSize, FontWeight } from '../../constants/colors';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    if (!disabled && !loading) {
      HapticUtils.light();
      scalePress(scaleAnim).start();
    }
  };
  
  const handlePressOut = () => {
    if (!disabled && !loading) {
      scaleRelease(scaleAnim).start();
    }
  };
  
  const handlePress = () => {
    if (!disabled && !loading) {
      HapticUtils.light();
      onPress();
    }
  };
  
  // Get variant-specific styles
  const getVariantStyle = (): ViewStyle => {
    const isDisabled = disabled || loading;
    
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isDisabled ? Colors.gray300 : Colors.primary,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: isDisabled ? Colors.gray300 : Colors.secondary,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: Colors.transparent,
          borderWidth: 2,
          borderColor: isDisabled ? Colors.gray300 : Colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: Colors.transparent,
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: isDisabled ? Colors.gray300 : Colors.error,
          borderWidth: 0,
        };
      default:
        return {};
    }
  };
  
  // Get size-specific styles
  const getSizeStyle = (): ViewStyle & { textSize: number } => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: Spacing.xs,
          paddingHorizontal: Spacing.md,
          textSize: FontSize.sm,
        };
      case 'medium':
        return {
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.lg,
          textSize: FontSize.md,
        };
      case 'large':
        return {
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.xl,
          textSize: FontSize.lg,
        };
      default:
        return {
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.lg,
          textSize: FontSize.md,
        };
    }
  };
  
  // Get text color based on variant
  const getTextColor = (): string => {
    const isDisabled = disabled || loading;
    
    if (isDisabled) {
      return variant === 'outline' || variant === 'ghost' ? Colors.gray400 : Colors.gray500;
    }
    
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return Colors.white;
      case 'outline':
      case 'ghost':
        return Colors.primary;
      default:
        return Colors.white;
    }
  };
  
  const variantStyle = getVariantStyle();
  const sizeStyle = getSizeStyle();
  const textColor = getTextColor();
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          styles.button,
          variantStyle,
          {
            paddingVertical: sizeStyle.paddingVertical,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            transform: [{ scale: scaleAnim }],
            width: fullWidth ? '100%' : undefined,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.white}
          />
        ) : (
          <>
            {icon && <Animated.View style={styles.icon}>{icon}</Animated.View>}
            <Animated.Text
              style={[
                styles.text,
                {
                  color: textColor,
                  fontSize: sizeStyle.textSize,
                },
                textStyle,
              ]}
            >
              {title}
            </Animated.Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  text: {
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  icon: {
    marginRight: Spacing.xs,
  },
});

export default AnimatedButton;
