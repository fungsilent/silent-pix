import { z } from 'zod'

import { taskFilterFlag } from '#shared/contract/task'

/* MARK: primitives */

export const cursorQuery = z.string().max(512).optional()

export const searchQuery = z.string().trim().max(200).optional()

export const paginationLimitQuery = z.union([
    z.number(),
    z.string().regex(/^[0-9]+$/).transform(Number),
]).pipe(z.number().int().min(1).max(100)).default(30)

/* MARK: query */

export const taskFlagsQuery = z.union([
    z.array(taskFilterFlag),
    z.string().transform(value => value.split(',')),
]).pipe(
    z.array(taskFilterFlag)
        .min(1)
        .max(3)
        .refine(flags => new Set(flags).size === flags.length, 'Task flags must be unique.'),
).optional()
