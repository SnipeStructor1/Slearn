export type AppLanguage = 'de' | 'en';

const translations = {
  de: {
    workspace: 'Workspace', profile: 'Profil & Fortschritt', signIn: 'Anmelden', signOut: 'Abmelden',
    analyze: 'Workspace analysieren', analyzing: 'Analyse läuft ...', questions: 'Offene Rückfragen',
    later: 'Später klären', answer: 'Eigene Antwort', submit: 'Antwort bestätigen', languageSettings: 'Spracheinstellungen',
    appLanguage: 'App-Sprache', learningLanguage: 'Lernsprache', saved: 'Gespeichert',
  },
  en: {
    workspace: 'Workspace', profile: 'Profile & progress', signIn: 'Sign in', signOut: 'Sign out',
    analyze: 'Analyze workspace', analyzing: 'Analysis running ...', questions: 'Open questions',
    later: 'Clarify later', answer: 'Your answer', submit: 'Confirm answer', languageSettings: 'Language settings',
    appLanguage: 'App language', learningLanguage: 'Learning language', saved: 'Saved',
  },
} as const;

export function t(language: AppLanguage | undefined, key: keyof typeof translations.de): string {
  return translations[language || 'de'][key];
}
