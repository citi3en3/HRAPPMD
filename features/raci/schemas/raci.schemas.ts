import { z } from 'zod';

const RaciValueSchema = z.enum(['R', 'A', 'C', 'I', '']);

export const RoleStubSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
});

export const RaciCellSchema = z.object({
  roleId: z.string(),
  activity: z.string(),
  value: RaciValueSchema,
});

export const SaveRaciSchema = z.object({
  name: z.string().min(1, 'Matrix name is required'),
  roles: z.array(RoleStubSchema).optional(),
  cells: z.array(RaciCellSchema).min(1, 'At least one cell is required'),
});

export const GenerateRaciInputSchema = z.object({
  processName: z.string().min(1, 'Process name is required'),
  roleIds: z.array(z.string()).min(2, 'At least 2 roles required'),
  activities: z.array(z.string()).optional(),
});

export type RaciValue = z.infer<typeof RaciValueSchema>;
export type RaciCell = z.infer<typeof RaciCellSchema>;
export type RoleStub = z.infer<typeof RoleStubSchema>;
export type SaveRaciInput = z.infer<typeof SaveRaciSchema>;
export type GenerateRaciInput = z.infer<typeof GenerateRaciInputSchema>;
