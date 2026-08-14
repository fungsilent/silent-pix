import { Elysia } from 'elysia'

import { ComfyError } from '#/lib/comfy/comfy.client'

export const errorCatchMiddleware = new Elysia({ name: 'error-catch' })
    .onError(
        { as: 'global' },
        ({ code, error, status }) => {
            if (code === 'VALIDATION' || code === 'PARSE') {
                return status(422, {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid request.',
                    },
                })
            }

            if (code === 'NOT_FOUND') {
                return status(404, {
                    error: {
                        code: 'ROUTE_NOT_FOUND',
                        message: 'Route not found.',
                    },
                })
            }

            if (error instanceof ComfyError) {
                console.error(error)

                return status(500, {
                    error: {
                        code: error.code,
                        message: error.message,
                    },
                })
            }

            console.error(error)

            return status(500, {
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Internal server error.',
                },
            })
        },
    )