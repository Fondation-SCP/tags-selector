import { toText } from "./message.js";

export class LoadError extends Error
{
    constructor(title, message, cause)
    {
        super(toText(message), { cause: cause });

        this.name = "LoadError";
        this.title = title;
        this.popup = message;
    }
}
