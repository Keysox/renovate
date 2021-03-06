import urlApi from 'url';
import { logger } from '../../logger';
import { GetReleasesConfig, ReleaseResult } from '../common';
import * as v2 from './v2';
import * as v3 from './v3';

export { id } from './common';

export const defaultRegistryUrls = [v3.getDefaultFeed()];
export const registryStrategy = 'merge';

function parseRegistryUrl(
  registryUrl: string
): { feedUrl: string; protocolVersion: number } {
  try {
    const parsedUrl = urlApi.parse(registryUrl);
    let protocolVersion = 2;
    const protolVersionRegExp = /#protocolVersion=(2|3)/;
    const protocolVersionMatch = protolVersionRegExp.exec(parsedUrl.hash);
    if (protocolVersionMatch) {
      parsedUrl.hash = '';
      protocolVersion = Number.parseInt(protocolVersionMatch[1], 10);
    } else if (parsedUrl.pathname.endsWith('.json')) {
      protocolVersion = 3;
    }
    return { feedUrl: urlApi.format(parsedUrl), protocolVersion };
  } catch (e) {
    logger.debug({ e }, `nuget registry failure: can't parse ${registryUrl}`);
    return { feedUrl: registryUrl, protocolVersion: null };
  }
}

export async function getReleases({
  lookupName,
  registryUrl,
}: GetReleasesConfig): Promise<ReleaseResult> {
  logger.trace(`nuget.getReleases(${lookupName})`);
  const { feedUrl, protocolVersion } = parseRegistryUrl(registryUrl);
  if (protocolVersion === 2) {
    return v2.getReleases(feedUrl, lookupName);
  }
  if (protocolVersion === 3) {
    const queryUrl = await v3.getResourceUrl(feedUrl);
    if (queryUrl !== null) {
      return v3.getReleases(feedUrl, queryUrl, lookupName);
    }
  }
  return null;
}
