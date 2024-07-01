export class NotificationError extends Error {
    constructor(
        message?: string,
        // @ts-expect-error: Variables already assigned
        private code: number,
        private status: number,
    ) {
        super(message);
    }
}
