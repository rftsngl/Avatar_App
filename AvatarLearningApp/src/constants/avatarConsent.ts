/**
 * Avatar Creation Consent Constants
 * 
 * Contains consent text and requirements for custom avatar creation.
 */

/**
 * Avatar consent version
 */
export const AVATAR_CONSENT_VERSION = '1.0.0';

/**
 * Privacy section structure
 */
export interface PrivacySection {
  icon: string;
  title: string;
  content?: string;
  bullets?: string[];
}

/**
 * Avatar creation privacy notice sections
 */
export const AVATAR_PRIVACY_SECTIONS: PrivacySection[] = [
  {
    icon: '🔒',
    title: 'Your Privacy Matters',
    content: 'When you create a custom avatar, your photo is used to generate AI-powered videos. We take your privacy seriously and want you to understand how your photo is used.',
  },
  {
    icon: '📱',
    title: 'How Your Photo is Used',
    bullets: [
      'Local Storage: Your photo is stored locally on your device in the app\'s private storage',
      'API Upload: Photos are uploaded to D-ID servers only when creating an avatar',
      'Video Generation: D-ID uses your photo to create talking avatar videos',
      'No Permanent Storage: Photos are NOT permanently stored on D-ID servers',
    ],
  },
  {
    icon: '✅',
    title: 'Your Rights',
    bullets: [
      'Full Control: Delete your photos and avatars at any time',
      'No Sharing: Photos are never shared with third parties except D-ID',
      'Local First: All photos stored locally on your device first',
      'Delete Anytime: Remove custom avatars whenever you want',
    ],
  },
  {
    icon: '🛡️',
    title: 'Data Security',
    bullets: [
      'Encrypted Storage: Photos stored in secure app directory',
      'Secure Upload: Photos uploaded to D-ID using secure HTTPS connections',
      'No Cloud Backup: Photos are not automatically backed up to cloud services',
    ],
  },
  {
    icon: '⚠️',
    title: 'Important Notes',
    bullets: [
      'Only use photos of yourself or photos you have permission to use',
      'Do not use photos of minors without parental consent',
      'Do not use photos of other people without their explicit permission',
      'Ensure your photo clearly shows your face for best results',
    ],
  },
  {
    icon: '📋',
    title: 'D-ID\'s Terms of Use',
    content: 'By accepting this notice, you confirm that:',
    bullets: [
      'You have read and understood this privacy notice',
      'You have all necessary rights to use the photo',
      'You agree that the photo is of yourself or you have permission to use it',
      'You understand that D-ID will use the photo to generate avatar videos',
      'You agree to D-ID\'s privacy policy and terms of service',
    ],
  },
];

/**
 * Combined privacy notice text (for backward compatibility)
 */
export const AVATAR_PRIVACY_NOTICE = AVATAR_PRIVACY_SECTIONS.map(section => {
  let text = `\n## ${section.title}\n\n`;
  if (section.content) {
    text += `${section.content}\n\n`;
  }
  if (section.bullets) {
    text += section.bullets.map(bullet => `• ${bullet}`).join('\n') + '\n';
  }
  return text;
}).join('\n');

/**
 * Avatar creation requirements
 */
export const AVATAR_REQUIREMENTS = {
  // Photo requirements
  MIN_WIDTH: 512,
  MIN_HEIGHT: 512,
  RECOMMENDED_WIDTH: 1024,
  RECOMMENDED_HEIGHT: 1024,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png'],
  
  // Quality requirements
  MIN_FACE_SIZE: 256, // Minimum face size in pixels
  RECOMMENDED_LIGHTING: 'good', // Good lighting recommended
  RECOMMENDED_BACKGROUND: 'plain', // Plain background recommended
};

/**
 * Avatar creation tips
 */
export const AVATAR_CREATION_TIPS = [
  {
    icon: '📸',
    title: 'Use a Clear Photo',
    description: 'Choose a photo where your face is clearly visible and well-lit.',
  },
  {
    icon: '😊',
    title: 'Face the Camera',
    description: 'Make sure you are facing the camera directly with your full face visible.',
  },
  {
    icon: '💡',
    title: 'Good Lighting',
    description: 'Use a photo taken in good lighting conditions, avoid shadows on your face.',
  },
  {
    icon: '🎨',
    title: 'Plain Background',
    description: 'A plain, uncluttered background works best for avatar creation.',
  },
  {
    icon: '🙂',
    title: 'Neutral Expression',
    description: 'A neutral or slight smile works best. Avoid extreme expressions.',
  },
  {
    icon: '👤',
    title: 'Solo Photo',
    description: 'Use a photo with only one person (you) in the frame.',
  },
  {
    icon: '📏',
    title: 'High Resolution',
    description: 'Use a high-resolution photo (at least 1024x1024 pixels) for best results.',
  },
  {
    icon: '🚫',
    title: 'Avoid Accessories',
    description: 'Avoid sunglasses, hats, or anything that obscures your face.',
  },
];

/**
 * Sample avatar names (for inspiration)
 */
export const SAMPLE_AVATAR_NAMES = [
  'Professional Me',
  'Teacher Avatar',
  'Business Presenter',
  'Friendly Guide',
  'Expert Instructor',
  'My Digital Twin',
];

