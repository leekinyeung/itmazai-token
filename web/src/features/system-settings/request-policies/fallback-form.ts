import { z } from 'zod'

import type { FallbackDocument } from './fallback-api'

type Translate = (key: string) => string

export const createFallbackFormSchema = (t: Translate) =>
  z
    .object({
      enabled: z.boolean(),
      targets: z
        .array(
          z.object({
            channel_id: z.number().int().nonnegative(),
            model: z.string().trim(),
          })
        )
        .max(20, t('The fallback target pool may contain at most 20 targets')),
    })
    .superRefine((values, context) => {
      if (values.enabled && values.targets.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['targets'],
          message: t('At least one fallback target is required'),
        })
      }
      const seen = new Set<string>()
      values.targets.forEach((target, index) => {
        const hasChannel = target.channel_id > 0
        const hasModel = target.model.length > 0
        if (!hasChannel) {
          context.addIssue({
            code: 'custom',
            path: ['targets', index, 'channel_id'],
            message: t('Select a fallback channel'),
          })
        }
        if (!hasModel) {
          context.addIssue({
            code: 'custom',
            path: ['targets', index, 'model'],
            message: t('Select a fallback model'),
          })
        }
        if (!hasChannel || !hasModel) return
        const identity = `${target.channel_id}\u0000${target.model}`
        if (seen.has(identity)) {
          context.addIssue({
            code: 'custom',
            path: ['targets', index, 'model'],
            message: t('Fallback targets must not contain duplicates'),
          })
        }
        seen.add(identity)
      })
    })

export type FallbackFormInput = z.input<
  ReturnType<typeof createFallbackFormSchema>
>
export type FallbackFormValues = z.output<
  ReturnType<typeof createFallbackFormSchema>
>

export function fallbackDocumentToForm(
  document: FallbackDocument
): FallbackFormInput {
  return {
    enabled: document.settings.enabled,
    targets: document.targets.map((target) => ({ ...target })),
  }
}

export function fallbackFormToDocument(
  values: FallbackFormValues
): FallbackDocument {
  return {
    settings: { enabled: values.enabled },
    targets: values.targets.map((target) => ({ ...target })),
  }
}
