
export class Upload {
    public promise: any;
    public resolve: any;
    public file: any;
    public reject: any;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = (file) => {
                this.file = file;

                resolve(file);
            };

            this.reject = reject;
        });
        this.promise.catch(() => { });
    }
}

