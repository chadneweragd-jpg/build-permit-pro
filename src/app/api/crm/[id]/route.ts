import { NextResponse } from 'next/server';
import { CRMRepository } from '@/lib/crm-repo';
import { DealStage } from '@/types';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/crm/[id]
 * Updates deal stage, quote amount, follow-up date, or notes
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { stage, quoteAmount, followUpDate, notes, generalContractor, contactName, contactPhone, contactEmail } = body;

    const updates: any = {};
    if (stage) updates.stage = stage as DealStage;
    if (quoteAmount !== undefined) updates.quote_amount = Number(quoteAmount);
    if (followUpDate !== undefined) updates.follow_up_date = followUpDate;
    if (notes !== undefined) updates.notes = notes;
    if (generalContractor !== undefined) updates.general_contractor = generalContractor;
    if (contactName !== undefined) updates.contact_name = contactName;
    if (contactPhone !== undefined) updates.contact_phone = contactPhone;
    if (contactEmail !== undefined) updates.contact_email = contactEmail;

    const updated = await CRMRepository.updateDeal(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deal: updated
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/crm/[id]:', error);
    return NextResponse.json({ error: error.message || 'Failed to update deal' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/[id]
 * Archives or deletes a deal
 */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 });
    }

    const success = await CRMRepository.deleteDeal(id);
    return NextResponse.json({
      success,
      deletedId: id
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/crm/[id]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete deal' }, { status: 500 });
  }
}
