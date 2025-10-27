/**
 * Voice Clone Consent Constants
 * 
 * Contains consent phrases required by D-ID for voice cloning in different languages.
 * These phrases must be pronounced at the beginning of voice recordings.
 */

export interface ConsentPhrase {
  language: string;
  languageCode: string;
  text: string;
  flag: string;
}

/**
 * Consent phrases for voice cloning
 * Source: D-ID API Documentation
 */
export const VOICE_CLONE_CONSENT_PHRASES: ConsentPhrase[] = [
  {
    language: 'English',
    languageCode: 'en-US',
    flag: '🇺🇸',
    text: 'I hereby confirm that the voice recorded is mine, or that I have all the necessary rights to submit the voice recording, and I agree to the provisions in D-ID\'s Terms of Use for my user submissions',
  },
  {
    language: 'Turkish',
    languageCode: 'tr-TR',
    flag: '🇹🇷',
    text: 'İşbu belgeyle kaydedilen sesin benim olduğunu veya ses kaydını sunmak için gerekli tüm haklara sahip olduğumu onaylarım ve Gönderimim için D-ID Kullanım Koşulları\'ndaki hükümleri kabul ederim',
  },
];

/**
 * Voice cloning requirements
 */
export const VOICE_CLONE_REQUIREMENTS = {
  MIN_SAMPLE_DURATION: 30, // seconds
  RECOMMENDED_SAMPLE_DURATION: 60, // seconds (1 minute)
  MIN_TOTAL_DURATION: 30, // seconds
  RECOMMENDED_TOTAL_DURATION: 300, // seconds (5 minutes)
  MIN_SAMPLE_COUNT: 3,
  MAX_SAMPLE_COUNT: 5,
  RECOMMENDED_SAMPLE_COUNT: 3,
  AUDIO_FORMAT: 'm4a',
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
};

/**
 * Sample scripts for users to read during recording
 * These provide phonetic variety for better voice cloning
 */
export const SAMPLE_SCRIPTS = {
  'en-US': [
    'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.',
    'Education is the most powerful weapon which you can use to change the world. Learning never exhausts the mind.',
    'Technology has revolutionized the way we communicate, learn, and work in the modern world.',
  ],
  'tr-TR': [
    'Eğitim, dünyayı değiştirmek için kullanabileceğiniz en güçlü silahtır. Öğrenmek asla zihni yormaz.',
    'Teknoloji, modern dünyada iletişim kurma, öğrenme ve çalışma şeklimizde devrim yarattı.',
    'Türkçe dilinin güzelliği ve zenginliği, kültürümüzün en önemli parçalarından biridir.',
  ],
};

/**
 * Privacy notice for voice cloning
 */
export const VOICE_CLONE_PRIVACY_NOTICE = `
Voice Cloning Privacy Notice

By using the voice cloning feature, you understand and agree to the following:

1. Voice Data Collection:
   - You will record 3-5 voice samples (minimum 30 seconds each)
   - Voice samples are stored locally on your device
   - Voice samples are sent to D-ID/HeyGen API for voice cloning

2. Data Storage:
   - Voice samples are stored in your device's local storage
   - Voice profile metadata is stored in the app's local database
   - No voice data is shared with third parties except D-ID/HeyGen

3. Data Usage:
   - Voice samples are used solely to create your cloned voice
   - Cloned voice can be used to generate videos with your voice
   - D-ID/HeyGen may process your voice data according to their privacy policy

4. Data Deletion:
   - You can delete individual voice samples at any time
   - You can delete entire voice profiles at any time
   - Deleting a profile removes all associated voice samples from your device
   - You may need to contact D-ID/HeyGen to delete voice data from their servers

5. Consent:
   - You must pronounce the consent phrase at the beginning of your first recording
   - You confirm that the voice is yours or you have rights to use it
   - You agree to D-ID/HeyGen's Terms of Use

6. Quality Requirements:
   - Record in a quiet environment
   - Speak clearly and naturally
   - Minimum 30 seconds per sample (recommended: 1 minute)
   - Total recommended duration: 5 minutes

For more information, please review:
- D-ID Terms of Use: https://www.d-id.com/terms-of-use/
- HeyGen Terms of Service: https://www.heygen.com/terms-of-service
`;

/**
 * Consent version for tracking
 */
export const VOICE_CLONE_CONSENT_VERSION = '1.0.0';

