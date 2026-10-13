import { type Context, type NextFunction } from 'grammy'

export default class AllowListMiddleware {
    private readonly allowedUsers: string[]

    public constructor(allowedUsers: string[]) {
        this.allowedUsers = allowedUsers
    }

    public do = async (ctx: Context, next: NextFunction) => {
        if (ctx.from && this.allowedUsers.includes(ctx.from.id.toString())) {
            await next()
        }
    }
}