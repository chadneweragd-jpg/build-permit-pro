import { GET as dailyIngestGET, POST as dailyIngestPOST } from '../daily-ingest/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 300; // 5 min execution allowance for multi-city ingestion

export const GET = dailyIngestGET;
export const POST = dailyIngestPOST;
