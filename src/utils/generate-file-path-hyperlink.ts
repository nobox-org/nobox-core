export function generateFileOpeningLink(filePath: string, linkName: string): string {
    const isWindows = process.platform === "win32";
    const isMac = process.platform === "darwin";

    let command: string;
    switch (true) {
        case isWindows:
            command = `start ${filePath}`;
            break;
        case isMac:
            command = `open ${filePath}`;
            break;
        default:
            command = `xdg-open ${filePath}`;
    }

    const clickableLink = `\x1B]8;;${command}\x07${linkName}\x1B]8;;\x07`;

    return clickableLink;
}