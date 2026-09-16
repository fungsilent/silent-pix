import { taskImages } from '@silent-pix/db'

import type { DatabaseClient } from '@silent-pix/db'
import type { TaskImageModel } from '#/module/task/task.model'

type NewTaskImage = Pick<
    TaskImageModel,
    | 'taskId'
    | 'imageId'
    | 'type'
    | 'sortIndex'
>

type TaskImageReferenceDatabase = DatabaseClient | Pick<DatabaseClient['db'], 'insert'>

export const taskImageService = {
    /* 呼叫端必須持有 withImageMutation lock 直到 reference commit；這些 helper 不會重新取得 lock。 */
    async addReference(
        databaseOrTransaction: TaskImageReferenceDatabase,
        relation: NewTaskImage,
    ): Promise<void> {
        await taskImageService.addReferences(databaseOrTransaction, [relation])
    },

    async addReferences(
        databaseOrTransaction: TaskImageReferenceDatabase,
        relations: NewTaskImage[],
    ): Promise<void> {
        if (!relations.length) {
            return
        }

        const createdAt = Date.now()
        const executor = 'db' in databaseOrTransaction
            ? databaseOrTransaction.db
            : databaseOrTransaction

        await executor
            .insert(taskImages)
            .values(relations.map(relation => ({
                ...relation,
                createdAt,
            })))
            .run()
    },
}
