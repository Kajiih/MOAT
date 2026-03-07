import { NextResponse } from 'next/server';

import { registry } from '@/lib/database/registry';
import '@/lib/database/providers'; // Ensure providers are registered in the Node environment
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('providerId');
  const entityId = searchParams.get('entityId');
  const dbId = searchParams.get('dbId');
  
  if (!providerId || !entityId || !dbId) {
    return NextResponse.json({ error: 'Missing providerId, entityId, or dbId' }, { status: 400 });
  }

  try {
    const entity = registry.getEntity(providerId, entityId);
    if (!entity) {
      return NextResponse.json({ error: `Entity ${providerId}:${entityId} not found` }, { status: 404 });
    }

    await registry.waitUntilReady();

    const result = await entity.getDetails(dbId, { signal: request.signal });
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ error, providerId, entityId, dbId }, 'V2 Details API Error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
