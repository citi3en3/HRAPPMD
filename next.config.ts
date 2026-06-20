import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  /* config options here */
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const nextIntlConfig = withNextIntl(nextConfig) as NextConfig & {
  experimental?: NextConfig['experimental'] & {
    turbo?: {
      resolveAlias?: Record<string, string>;
    };
  };
};
const { turbo, ...experimental } = nextIntlConfig.experimental ?? {};

export default {
  ...nextIntlConfig,
  experimental,
  turbopack: {
    ...nextIntlConfig.turbopack,
    resolveAlias: {
      ...nextIntlConfig.turbopack?.resolveAlias,
      ...turbo?.resolveAlias,
    },
  },
} satisfies NextConfig;
