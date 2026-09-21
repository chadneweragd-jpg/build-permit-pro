import { NextResponse } from 'next/server';
import { MileageRepository } from '@/lib/mileage-repo';
import { TripType, PurposeTag } from '@/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as TripType | null;
  const purpose = searchParams.get('purpose') as PurposeTag | null;
  const format = searchParams.get('format');

  const legs = await MileageRepository.fetchAllLegs();

  let filtered = legs;
  if (type) {
    filtered = filtered.filter(l => l.trip_type === type);
  }
  if (purpose) {
    filtered = filtered.filter(l => l.purpose_tag === purpose);
  }

  if (format === 'csv') {
    const csv = MileageRepository.generateCRAExportCSV(filtered);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="cra_mileage_logbook.csv"'
      }
    });
  }

  const stats = MileageRepository.getStats(filtered);

  return NextResponse.json({
    total: filtered.length,
    stats,
    legs: filtered
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.origin_address || !body.destination_address || body.distance_km === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: origin_address, destination_address, distance_km' },
        { status: 400 }
      );
    }

    const created = await MileageRepository.logTripLeg({
      origin_address: body.origin_address,
      destination_address: body.destination_address,
      distance_km: Number(body.distance_km),
      duration_min: Number(body.duration_min || 0),
      trip_type: body.trip_type || 'business',
      purpose_tag: body.purpose_tag || 'Sales Call',
      permit_id: body.permit_id,
      permit_number: body.permit_number,
      route_id: body.route_id,
      notes: body.notes
    });

    return NextResponse.json({ success: true, leg: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
