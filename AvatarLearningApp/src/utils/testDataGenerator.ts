/**
 * testDataGenerator.ts
 * 
 * Helper utilities for generating random test data.
 * Used to avoid hardcoded personal information in code.
 * 
 * PRIVACY NOTE: Never use real user data in development/testing.
 * Always use randomized, anonymized test data.
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

/**
 * Random name generator
 * Returns culturally diverse, fictional names
 */
export const generateRandomName = (): string => {
  const firstNames = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey',
    'Riley', 'Avery', 'Quinn', 'Sage', 'River',
    'Skylar', 'Rowan', 'Blake', 'Cameron', 'Peyton',
    'Finley', 'Emerson', 'Reese', 'Parker', 'Charlie'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
    'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Chen', 'Kim', 'Lee', 'Nguyen', 'Singh',
    'Patel', 'Ahmed', 'Silva', 'Santos', 'Müller'
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
};

/**
 * Random email generator
 * Returns fictional email addresses (not deliverable)
 */
export const generateRandomEmail = (): string => {
  const domains = [
    'example.com',
    'test.com',
    'demo.com',
    'sample.com',
    'placeholder.com'
  ];

  const username = `user${Math.floor(Math.random() * 10000)}`;
  const domain = domains[Math.floor(Math.random() * domains.length)];

  return `${username}@${domain}`;
};

/**
 * Random phone number generator (fictional format)
 * Returns: +1-XXX-XXX-XXXX format (US)
 */
export const generateRandomPhone = (): string => {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;

  return `+1-${areaCode}-${prefix}-${lineNumber}`;
};

/**
 * Random age generator (adult range)
 */
export const generateRandomAge = (): number => {
  return Math.floor(Math.random() * 50) + 18; // 18-67 years
};

/**
 * Random date generator (past dates only)
 */
export const generateRandomDate = (yearsBack: number = 5): string => {
  const now = new Date();
  const pastDate = new Date(
    now.getFullYear() - Math.floor(Math.random() * yearsBack),
    Math.floor(Math.random() * 12),
    Math.floor(Math.random() * 28) + 1
  );

  return pastDate.toISOString();
};

/**
 * Random UUID generator (v4 format)
 * Same algorithm as UserService.generateUUID
 */
export const generateRandomUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Random sentence generator (for testing)
 */
export const generateRandomSentence = (): string => {
  const sentences = [
    'The quick brown fox jumps over the lazy dog.',
    'Hello, how are you today?',
    'This is a test sentence.',
    'Learning new languages is fun!',
    'Practice makes perfect.',
    'Good morning, everyone!',
    'Have a nice day!',
    'Thank you very much.',
    'Where is the nearest station?',
    'I would like to order coffee, please.'
  ];

  return sentences[Math.floor(Math.random() * sentences.length)];
};

/**
 * Random score generator (0-100)
 */
export const generateRandomScore = (): number => {
  return Math.floor(Math.random() * 101); // 0-100
};

/**
 * Random boolean generator
 */
export const generateRandomBoolean = (): boolean => {
  return Math.random() >= 0.5;
};

/**
 * Random array element picker
 */
export const pickRandom = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Masked string (for logging sensitive data)
 * 
 * Example: "JohnDoe123" → "Joh*****23"
 */
export const maskString = (str: string, visibleChars: number = 3): string => {
  if (str.length <= visibleChars * 2) {
    return '*'.repeat(str.length);
  }

  const start = str.substring(0, visibleChars);
  const end = str.substring(str.length - visibleChars);
  const middle = '*'.repeat(str.length - visibleChars * 2);

  return `${start}${middle}${end}`;
};

/**
 * Generate sample user profile (for testing)
 */
export const generateTestUserProfile = () => {
  return {
    id: generateRandomUUID(),
    name: generateRandomName(),
    email: generateRandomEmail(),
    phone: generateRandomPhone(),
    age: generateRandomAge(),
    createdAt: generateRandomDate(2),
  };
};

/**
 * Generate sample practice result (for testing)
 */
export const generateTestPracticeResult = () => {
  return {
    id: generateRandomUUID(),
    sentence: generateRandomSentence(),
    score: generateRandomScore(),
    timestamp: generateRandomDate(1),
  };
};

/**
 * Privacy-safe console logger
 * Automatically masks sensitive information
 */
export const logSafely = (message: string, data?: any) => {
  if (data && typeof data === 'object') {
    const safeName = data.name ? maskString(data.name) : undefined;
    const safeEmail = data.email ? maskString(data.email, 2) : undefined;
    const safePhone = data.phone ? maskString(data.phone, 2) : undefined;

    console.log(message, {
      ...data,
      ...(safeName && { name: safeName }),
      ...(safeEmail && { email: safeEmail }),
      ...(safePhone && { phone: safePhone }),
    });
  } else {
    console.log(message, data);
  }
};
