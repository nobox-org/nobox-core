
export const allOfAIsInB = (a: any[], b: any[], { sendDiffArr = false }: { sendDiffArr: boolean }) => {
    const disAllowedFields = a.filter(f => !b.includes(f));
    return sendDiffArr ? disAllowedFields : disAllowedFields.length === 0;
}