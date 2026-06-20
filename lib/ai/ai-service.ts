import { z } from 'zod';
import { openai, AI_MODEL } from './client';
import { parseAiResponse } from './parse-ai-response';
import { err, type ServiceResult } from '@/lib/errors/service-error';
import { track } from '@/lib/telemetry/events';

export const RaciOutputSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string(),
    }),
  ),
  suggestedCells: z.array(
    z.object({
      roleId: z.string().min(1),
      activity: z.string().min(1),
      value: z.enum(['R', 'A', 'C', 'I', '']),
    }),
  ),
});

export type RaciOutput = z.infer<typeof RaciOutputSchema>;

export interface GenerateRaciMatrixParams {
  processName: string;
  roleIds: string[];
  activities?: string[];
  organizationContext?: string;
}

function buildRaciGenerationPrompt(params: GenerateRaciMatrixParams): string {
  const context = [
    `Process Name: ${params.processName}`,
    `Number of Roles: ${params.roleIds.length}`,
    params.activities?.length ? `Key Activities: ${params.activities.join(', ')}` : null,
    params.organizationContext ? `Organization Context: ${params.organizationContext}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `You are an expert in RACI matrix design. Generate a RACI matrix for the following process.\n\n${context}\n\nGenerate key tasks/activities for this process and assign RACI responsibilities.\nReturn ONLY valid JSON with exactly these fields:\n- "tasks": array of {id, name, description}\n- "suggestedCells": array of {roleId, activity, value}\n\nRules:\n- Generate 5-10 meaningful tasks\n- Each task should have clear RACI assignments\n- At least one role should be 'A' per task\n- No markdown formatting\n- No explanation or commentary\n- No extra keys`;
}

export async function generateRaciMatrix(
  params: GenerateRaciMatrixParams,
  maxRetries = 1,
): Promise<ServiceResult<RaciOutput>> {
  const prompt = buildRaciGenerationPrompt(params);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return err('AI_EMPTY_RESPONSE', 'AI returned an empty response');
      }

      const result = await parseAiResponse(content, RaciOutputSchema);
      if (result.success) {
        track('raci.generated', {
          processName: params.processName,
          roleCount: params.roleIds.length,
        });
        return result;
      }

      if (attempt < maxRetries) {
        track('ai.validation_failure', { attempt, error: result.error.message });
        continue;
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown AI error';
      if (attempt < maxRetries) {
        track('ai.validation_failure', { attempt, error: message });
        continue;
      }
      return err('AI_REQUEST_ERROR', message);
    }
  }

  return err('AI_MAX_RETRIES', 'RACI generation failed after maximum retries');
}

export const JobDescriptionOutputSchema = z.object({
  responsibilities: z.array(z.string().min(1)).min(3),
  competencies: z.array(z.string().min(1)).min(3),
  kpis: z.array(z.string().min(1)).min(3),
});

export type JobDescriptionOutput = z.infer<typeof JobDescriptionOutputSchema>;

export interface GenerateJobDescriptionParams {
  roleTitle: string;
  level?: string;
  department?: string;
  responsibilities?: string[];
  industry?: string;
}

function buildJobDescriptionPrompt(params: GenerateJobDescriptionParams): string {
  const context = [
    `Role Title: ${params.roleTitle}`,
    params.level ? `Level: ${params.level}` : null,
    params.department ? `Department: ${params.department}` : null,
    params.industry ? `Industry: ${params.industry}` : null,
    params.responsibilities?.length
      ? `Existing Responsibilities: ${params.responsibilities.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `You are an expert HR consultant. Generate a structured job description based on the following information.

${context}

Return ONLY valid JSON with exactly these fields:
- "responsibilities": string[] (minimum 5 items, specific and measurable)
- "competencies": string[] (minimum 5 items, mix of technical and soft skills)
- "kpis": string[] (minimum 3 items, quantifiable where possible)

Rules:
- No markdown formatting
- No explanation or commentary
- No extra keys
- Each item should be a complete, professional sentence`;
}

export async function generateJobDescription(
  params: GenerateJobDescriptionParams,
  maxRetries = 1,
): Promise<ServiceResult<JobDescriptionOutput>> {
  const prompt = buildJobDescriptionPrompt(params);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return err('AI_EMPTY_RESPONSE', 'AI returned an empty response');
      }

      const result = await parseAiResponse(content, JobDescriptionOutputSchema);
      if (result.success) {
        return result;
      }

      if (attempt < maxRetries) {
        track('ai.validation_failure', { attempt, error: result.error.message });
        continue;
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown AI error';
      if (attempt < maxRetries) {
        track('ai.validation_failure', { attempt, error: message });
        continue;
      }
      return err('AI_REQUEST_ERROR', message);
    }
  }

  return err('AI_MAX_RETRIES', 'AI generation failed after maximum retries');
}
