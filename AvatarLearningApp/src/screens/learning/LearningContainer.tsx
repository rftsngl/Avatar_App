/**
 * LearningContainer.tsx
 * 
 * Simple container that directly shows the unified LearningScreen.
 * The LearningScreen itself contains 2 internal tabs (Learn/Practice).
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import React from 'react';
import { LearningScreen } from './LearningScreen';

/**
 * LearningContainer Component - Just a wrapper
 */
export const LearningContainer: React.FC = () => {
  return <LearningScreen />;
};
