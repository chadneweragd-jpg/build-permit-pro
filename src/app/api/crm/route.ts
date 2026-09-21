import { NextResponse } from 'next/server';
import { CRMRepository } from '@/lib/crm-repo';
import { PermitsRepository } from '@/lib/permits-repo';
import { DealStage } from '@/types';

/**
 * GET /api/crm
 * Returns all deals grouped by stage, ordered by updated_at DESC
 */
export async function GET() {
  try {
    const allDeals = await CRMRepository.fetchDealsFromSupabase();
    const grouped = CRMRepository.getDealsByStage(allDeals);
    const metrics = CRMRepository.getPipelineMetrics(allDeals);

    return NextResponse.json({
      success: true,
      deals: allDeals,
      grouped,
      metrics
    });
  } catch (error: any) {
    console.error('Error in GET /api/crm:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch deals' }, { status: 500 });
  }
}

/**
 * POST /api/crm
 * Creates a new deal from a permit or direct form payload
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { permitId, stage = 'watched', quoteAmount = 0, notes = '', dealData } = body;

    if (permitId) {
      const allPermits = PermitsRepository.getAllPermits();
      const permit = allPermits.find((p) => p.id === permitId || p.permit_number === permitId);
      if (!permit) {
        return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
      }

      const created = await CRMRepository.createDealFromPermit(
        permit,
        stage as DealStage,
        quoteAmount,
        notes
      );

      return NextResponse.json({
        success: true,
        deal: created
      });
    }

    if (dealData && dealData.address) {
      const newDeal = {
        id: `deal-${Date.now()}`,
        permit_number: dealData.permit_number || 'BP-CUSTOM',
        project_name: dealData.project_name || `${dealData.address} Scope`,
        address: dealData.address,
        city_region: dealData.city_region || 'Kelowna',
        general_contractor: dealData.general_contractor || 'General Contractor',
        contact_name: dealData.contact_name || '',
        contact_phone: dealData.contact_phone || '',
        contact_email: dealData.contact_email || '',
        subtrade_category: dealData.subtrade_category || 'General',
        stage: (dealData.stage as DealStage) || 'watched',
        quote_amount: Number(dealData.quote_amount || 0),
        follow_up_date: dealData.follow_up_date || null,
        notes: dealData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const deals = CRMRepository.getDeals();
      const updated = [newDeal, ...deals];
      if (typeof window !== 'undefined') {
        localStorage.setItem('bpp_crm_deals_v1', JSON.stringify(updated));
      }

      return NextResponse.json({
        success: true,
        deal: newDeal
      });
    }

    return NextResponse.json(
      { error: 'Either permitId or dealData with address is required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/crm:', error);
    return NextResponse.json({ error: error.message || 'Failed to create deal' }, { status: 500 });
  }
}
