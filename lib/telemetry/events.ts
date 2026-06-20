export type TelemetryEvent =
  | 'audit.started'
  | 'audit.completed'
  | 'jd.generated'
  | 'raci.created'
  | 'raci.saved'
  | 'raci.generated'
  | 'raci.generation_failed'
  | 'raci.generation_save_failed'
  | 'raci.generated_and_saved'
  | 'raci.generation_error'
  | 'export.requested'
  | 'export.completed'
  | 'export.created'
  | 'api.error'
  | 'ai.validation_failure';

export function track(event: TelemetryEvent, properties?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[telemetry] ${event}`, properties ?? '');
  }
  // TODO: integrate with analytics provider (PostHog, Mixpanel, etc.)
}
