/**
 * animationUtils.ts
 * 
 * Reusable animation utilities using React Native's Animated API.
 * Provides smooth, performant animations for UI transitions.
 * 
 * @author Avatar Learning App
 * @date 2025-11-02
 */

import { Animated, Easing } from 'react-native';

/**
 * Animation configuration presets
 */
export const AnimationConfig = {
  fast: { duration: 200, easing: Easing.out(Easing.ease) },
  normal: { duration: 300, easing: Easing.out(Easing.ease) },
  slow: { duration: 500, easing: Easing.out(Easing.ease) },
  spring: {
    useNativeDriver: true,
    tension: 40,
    friction: 7,
  },
};

/**
 * Fade in animation
 * @param animatedValue - Animated.Value to animate
 * @param config - Animation configuration (default: normal)
 * @returns Animated.CompositeAnimation
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  config = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: true,
  });
};

/**
 * Fade out animation
 * @param animatedValue - Animated.Value to animate
 * @param config - Animation configuration (default: normal)
 * @returns Animated.CompositeAnimation
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  config = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: true,
  });
};

/**
 * Scale in animation (zoom in from 0)
 * @param animatedValue - Animated.Value to animate
 * @param config - Animation configuration (default: spring)
 * @returns Animated.CompositeAnimation
 */
export const scaleIn = (
  animatedValue: Animated.Value,
  config = AnimationConfig.spring
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue: 1,
    ...config,
  });
};

/**
 * Scale out animation (zoom out to 0)
 * @param animatedValue - Animated.Value to animate
 * @param config - Animation configuration (default: fast)
 * @returns Animated.CompositeAnimation
 */
export const scaleOut = (
  animatedValue: Animated.Value,
  config = AnimationConfig.fast
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: true,
  });
};

/**
 * Scale press animation (button press effect: scale 1 → 0.95)
 * @param animatedValue - Animated.Value to animate
 * @returns Animated.CompositeAnimation
 */
export const scalePress = (
  animatedValue: Animated.Value
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0.95,
    duration: 100,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  });
};

/**
 * Scale release animation (button release effect: scale 0.95 → 1)
 * @param animatedValue - Animated.Value to animate
 * @returns Animated.CompositeAnimation
 */
export const scaleRelease = (
  animatedValue: Animated.Value
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue: 1,
    tension: 50,
    friction: 5,
    useNativeDriver: true,
  });
};

/**
 * Slide up animation (from bottom)
 * @param animatedValue - Animated.Value to animate
 * @param distance - Distance to slide (default: 50)
 * @param config - Animation configuration (default: normal)
 * @returns Animated.CompositeAnimation
 */
export const slideUp = (
  animatedValue: Animated.Value,
  distance: number = 50,
  config = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: -distance,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: true,
  });
};

/**
 * Slide down animation (to bottom)
 * @param animatedValue - Animated.Value to animate
 * @param distance - Distance to slide (default: 50)
 * @param config - Animation configuration (default: normal)
 * @returns Animated.CompositeAnimation
 */
export const slideDown = (
  animatedValue: Animated.Value,
  distance: number = 50,
  config = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: distance,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: true,
  });
};

/**
 * Slide in from left
 * @param animatedValue - Animated.Value to animate
 * @param config - Animation configuration (default: normal)
 * @returns Animated.CompositeAnimation
 */
export const slideInLeft = (
  animatedValue: Animated.Value,
  config = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: true,
  });
};

/**
 * Slide in from right
 * @param animatedValue - Animated.Value to animate
 * @param config - Animation configuration (default: normal)
 * @returns Animated.CompositeAnimation
 */
export const slideInRight = (
  animatedValue: Animated.Value,
  config = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: true,
  });
};

/**
 * Bounce animation (subtle bounce effect)
 * @param animatedValue - Animated.Value to animate
 * @returns Animated.CompositeAnimation
 */
export const bounce = (
  animatedValue: Animated.Value
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 1.1,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Shake animation (error feedback)
 * @param animatedValue - Animated.Value to animate
 * @returns Animated.CompositeAnimation
 */
export const shake = (
  animatedValue: Animated.Value
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Pulse animation (attention-grabbing effect)
 * @param animatedValue - Animated.Value to animate
 * @param config - Animation configuration (default: slow)
 * @returns Animated.CompositeAnimation
 */
export const pulse = (
  animatedValue: Animated.Value,
  config = AnimationConfig.slow
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 1.05,
      duration: config.duration / 2,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: config.duration / 2,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Rotate animation (360° rotation)
 * @param animatedValue - Animated.Value to animate (0 to 1)
 * @param config - Animation configuration (default: slow)
 * @returns Animated.CompositeAnimation
 */
export const rotate = (
  animatedValue: Animated.Value,
  config = AnimationConfig.slow
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration: config.duration,
    easing: Easing.linear,
    useNativeDriver: true,
  });
};

/**
 * Shimmer animation (loading effect)
 * Creates infinite shimmer animation
 * @param animatedValue - Animated.Value to animate (0 to 1)
 * @returns Animated.CompositeAnimation
 */
export const shimmer = (
  animatedValue: Animated.Value
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ])
  );
};

/**
 * Combined entrance animation (fade + slide)
 * @param fadeValue - Animated.Value for opacity
 * @param slideValue - Animated.Value for translateY
 * @param config - Animation configuration (default: normal)
 * @returns Animated.CompositeAnimation
 */
export const entranceAnimation = (
  fadeValue: Animated.Value,
  slideValue: Animated.Value,
  config = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return Animated.parallel([
    fadeIn(fadeValue, config),
    slideUp(slideValue, 30, config),
  ]);
};

/**
 * Combined exit animation (fade + slide)
 * @param fadeValue - Animated.Value for opacity
 * @param slideValue - Animated.Value for translateY
 * @param config - Animation configuration (default: fast)
 * @returns Animated.CompositeAnimation
 */
export const exitAnimation = (
  fadeValue: Animated.Value,
  slideValue: Animated.Value,
  config = AnimationConfig.fast
): Animated.CompositeAnimation => {
  return Animated.parallel([
    fadeOut(fadeValue, config),
    slideDown(slideValue, 30, config),
  ]);
};
