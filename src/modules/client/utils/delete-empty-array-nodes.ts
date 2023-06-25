export const deleteEmptyArrayNodes = (obj: Record<any, any>, nodes: any[]) => {
    const cobj = JSON.parse(JSON.stringify(obj));
    for (let n = 0; n < nodes.length; n++) {
        const node = nodes[n];
        if (!cobj[node]) {
            continue;
        }
        if (cobj[node].length === 0) {
            delete cobj[node];
        }
    }

    return cobj;
}
