import { getRequestConfig } from 'next-intl/server';

export const timeZone = 'America/New_York';

export default getRequestConfig(async () => {
  // Provide a static locale, fetch a user setting,
  // read from `cookies()`, `headers()`, etc.
  const locale = 'en';

  return {
    locale,
    timeZone,
    now: new Date(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
