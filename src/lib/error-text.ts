type ErrorLike = { message?: string; status?: number } | string | null | undefined;

const knownMessages: Array<[RegExp, string]> = [
  [/not authenticated|unauthorized|missing authorization/i, 'Deine Sitzung ist abgelaufen – bitte melde dich kurz neu an.'],
  [/ai.*not enabled|settings not configured|invalid ai settings/i, 'Die KI ist gerade noch nicht startklar – bitte prüfe die KI-Konfiguration.'],
  [/weekly ai usage limit/i, 'Die KI braucht kurz eine Pause – dein Wochenlimit ist erreicht.'],
  [/invalid request|request body|unsupported action/i, 'Die Anfrage hatte einen kleinen Knoten – bitte versuch es nochmal.'],
  [/unable to reach|network|fetch|failed to fetch/i, 'Der Server ist gerade auf Tauchstation – bitte versuch es gleich nochmal.'],
  [/timeout|timed out/i, 'Die KI lässt noch auf sich warten – bitte versuch es gleich nochmal.'],
  [/ai (returned|response).*invalid|json|provider/i, 'Die KI hat sich gerade verhaspelt – bitte versuch es gleich nochmal.'],
  [/permission|row level|rls|forbidden/i, 'Dafür fehlen gerade die nötigen Rechte.'],
];

export function userError(error: ErrorLike, fallback = 'Irgendwas ist schiefgelaufen – bitte versuch es gleich nochmal.') {
  const message = typeof error === 'string' ? error : error?.message;
  if (!message) return fallback;
  return knownMessages.find(([pattern]) => pattern.test(message))?.[1] || fallback;
}
