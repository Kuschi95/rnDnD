const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**', 'drizzle/**', 'coverage/**', '.agents/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/firebase/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-firebase-analytics',
              message:
                'Retired. Analytics waits for an EAS dev client and @react-native-firebase/analytics.',
            },
          ],
          patterns: [
            {
              regex: '^firebase($|/)',
              message:
                'Import Firebase only from @/firebase/client or @/firebase/firestore so the JS SDK can be swapped later.',
            },
            {
              regex: '^firebase/compat',
              message: 'Use the modular Firebase SDK through @/firebase/client.',
            },
            {
              regex: '^@react-native-firebase($|/)',
              message: 'Not part of this Expo Go setup. See AGENTS.md before adding a dev client.',
            },
          ],
        },
      ],
    },
  },
]);
