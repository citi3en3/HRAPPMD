import { NextRequest, NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth/require-auth';
import { parseRequestBody } from '@/lib/validations/parse';
import { GenerateRaciInputSchema } from '@/features/raci/schemas/raci.schemas';
import { generateRaciMatrix as generateRaciAiOutput } from '@/lib/ai/ai-service';
import { saveRaciMatrix } from '@/features/raci/services/raci-service';
import { track } from '@/lib/telemetry/events';

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireOrg();
    const parsed = await parseRequestBody(request, GenerateRaciInputSchema);
    if (!parsed.success) {
      return NextResponse.json(parsed.error, { status: 400 });
    }

    const input = parsed.data;
    const aiResult = await generateRaciAiOutput({
      processName: input.processName,
      roleIds: input.roleIds,
      activities: input.activities,
      organizationContext: `Organization: ${organizationId}`,
    });

    if (!aiResult.success) {
      track('raci.generation_failed', {
        reason: aiResult.error.code,
        processName: input.processName,
      });
      return NextResponse.json(aiResult.error, { status: 400 });
    }

    const roles = input.roleIds.map((id) => ({ id, title: '' }));
    const cells = aiResult.data.suggestedCells.map((cell) => ({
      roleId: cell.roleId,
      activity: cell.activity,
      value: cell.value,
    }));

    const saveResult = await saveRaciMatrix(
      { name: input.processName, roles, cells },
      organizationId,
    );
    if (!saveResult.success) {
      track('raci.generation_save_failed', { processName: input.processName });
      return NextResponse.json(saveResult.error, { status: 500 });
    }

    track('raci.generated_and_saved', {
      matrixId: saveResult.data.id,
      processName: input.processName,
      roleCount: input.roleIds.length,
      cellCount: cells.length,
    });

    return NextResponse.json(saveResult.data, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Internal server error';
    track('raci.generation_error', { error: message });
    return NextResponse.json({ code: 'INTERNAL_ERROR', message }, { status: 500 });
  }
}
