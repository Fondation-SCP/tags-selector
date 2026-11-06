export function toText(message)
{
    return message.map(part => typeof part == "string" ? part : part.italic).join("");
}
