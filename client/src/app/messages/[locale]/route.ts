import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { join } from 'path';

import { Language } from '@/api/model/language';

const VALID_LOCALES = new Set<string>(Object.values(Language));
const cache = new Map<string, string>();

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale.replace(/\.json$/, '');

  if (!VALID_LOCALES.has(lang)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  let json = cache.get(lang);
  if (!json) {
    json = await readFile(join(process.cwd(), 'messages', `${lang}.json`), 'utf-8');
    cache.set(lang, json);
  }

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
