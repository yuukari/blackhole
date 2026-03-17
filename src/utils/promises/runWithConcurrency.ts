export type Task<T> = () => Promise<T>;

export type TaskResult<T> =
    | {status: 'fulfilled'; value: T}
    | {status: 'rejected'; error: unknown};

export async function runWithConcurrency<T>(
    tasks: Task<T>[],
    concurrency: number,
): Promise<TaskResult<T>[]> {
    if (tasks.length == 0) {
        return []
    }

    const results: TaskResult<T>[] = []
    let taskIndex = 0
    let tasksCompleted = 0

    return new Promise((resolve) => {
        const run = async (index: number) => {
            try {
                if (tasks[index] != undefined) {
                    const result = await tasks[index]()
                    results[index] = {status: 'fulfilled', value: result}
                }
            } catch (error) {
                results[index] = {status: 'rejected', error: error}
            } finally {
                tasksCompleted++
                if (tasksCompleted == tasks.length) {
                    resolve(results);
                } else if (taskIndex < tasks.length) {
                    await run(taskIndex++);
                }
            }
        }

        const initialCount = Math.min(concurrency, tasks.length)
        for (let i = 0; i < initialCount; i++) {
            run(taskIndex++)
        }
    })
}