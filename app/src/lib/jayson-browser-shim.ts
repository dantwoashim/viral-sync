type JsonRpcId = number;
type JsonRpcCallback = (error: Error | null, response?: unknown) => void;
type Transport = (request: string, callback: (error: Error | null, response?: unknown) => void) => void;

type JsonRpcRequest = {
    jsonrpc: '2.0';
    id: JsonRpcId;
    method: string;
    params: unknown[];
};

let requestId = 1;

function nextRequestId(): JsonRpcId {
    requestId += 1;
    return requestId;
}

function parseResponsePayload(payload: unknown): unknown {
    if (typeof payload !== 'string') {
        return payload;
    }
    return JSON.parse(payload);
}

export default class RpcClient {
    private readonly transport: Transport;

    constructor(transport: Transport) {
        this.transport = transport;
    }

    request(methodOrBatch: string | JsonRpcRequest[], paramsOrCallback?: unknown[] | JsonRpcCallback, callbackArg?: JsonRpcCallback): JsonRpcRequest | void {
        if (Array.isArray(methodOrBatch)) {
            const callback = typeof paramsOrCallback === 'function' ? paramsOrCallback : undefined;
            if (!callback) {
                return;
            }
            this.sendPayload(methodOrBatch, callback);
            return;
        }

        const params = Array.isArray(paramsOrCallback) ? paramsOrCallback : [];
        const callback = (typeof callbackArg === 'function' ? callbackArg : undefined)
            ?? (typeof paramsOrCallback === 'function' ? paramsOrCallback : undefined);
        const payload: JsonRpcRequest = {
            jsonrpc: '2.0',
            id: nextRequestId(),
            method: methodOrBatch,
            params,
        };

        if (!callback) {
            return payload;
        }

        this.sendPayload(payload, callback);
    }

    private sendPayload(payload: JsonRpcRequest | JsonRpcRequest[], callback: JsonRpcCallback): void {
        this.transport(JSON.stringify(payload), (error, responsePayload) => {
            if (error) {
                callback(error);
                return;
            }

            try {
                callback(null, parseResponsePayload(responsePayload));
            } catch (parseError) {
                callback(parseError as Error);
            }
        });
    }
}
