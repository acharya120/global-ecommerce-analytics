import { getConfig, publicSettings } from '../../../lib/config.js';
import { getUsage } from '../../../lib/usage.js';
import { providerStatus } from '../../../services/scrapingService.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getConfig();
  return Response.json({ status: 'ok', time: new Date().toISOString(), settings: publicSettings(config), scrapingProviders: providerStatus(config), usage: getUsage() });
}
