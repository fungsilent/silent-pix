import { taskImages } from '@silent-pix/db'

import type { Database } from '@silent-pix/db'
import type { TaskImageModel } from '#/module/task/task.model'

type NewTaskImage = Pick<
    TaskImageModel,
    | 'taskId'
    | 'imageId'
    | 'type'
    | 'sortIndex'
>

export const taskImageService = {
    /* 呼叫端必須持有 withImageMutation lock 直到 reference commit；這些 helper 不會重新取得 lock。 */
    async addReference(
        database: Pick<Database, 'insert'>,
        relation: NewTaskImage,
    ): Promise<void> {
        await taskImageService.addReferences(database, [relation])
    },

    async addReferences(
        database: Pick<Database, 'insert'>,
        relations: NewTaskImage[],
    ): Promise<void> {
        if (!relations.length) {
            return
        }

        const createdAt = Date.now()
        await database
            .insert(taskImages)
            .values(relations.map(relation => ({
                ...relation,
                createdAt,
            })))
            .run()
    },
}
