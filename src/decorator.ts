type AsyncFunction = (...args: unknown[]) => Promise<any>;
type SyncFunction = (...args: unknown[]) => any;

type AsyncFunctionDescriptor = TypedPropertyDescriptor<AsyncFunction>;
type SyncFunctionDescriptor = TypedPropertyDescriptor<SyncFunction>;

type FunctionDescriptor = SyncFunctionDescriptor | AsyncFunctionDescriptor;

function isAsyncFunctionDescriptor(
    descriptor: FunctionDescriptor
): descriptor is AsyncFunctionDescriptor {
    return descriptor.value?.constructor.name === 'AsyncFunction';
}

function markFunctionStart() {
    // TODO: consider logging the function arguments only if they are allowed
}

function markFunctionException(error: Error) {
    // TODO
}

function markFunctionEnd(returnValue: unknown) {
    // TODO: consider logging the returnValue only if it's allowed
}

function instrumentFunctionPriv(
    target: unknown,
    functionName: string,
    descriptor: FunctionDescriptor
) {
    if (descriptor.value === undefined) {
        return;
    }
    if (isAsyncFunctionDescriptor(descriptor)) {
        return instrumentAsyncFunctionPriv(target, functionName, descriptor);
    }
    const unwrapped = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
        markFunctionStart();
        const result: unknown = unwrapped.apply(this, args);
        if (result instanceof Promise) {
            let returnValue: unknown;
            return result
                .then((value) => {
                    returnValue = value;
                    return value;
                })
                .catch((err) => {
                    markFunctionException(err);
                })
                .finally(() => {
                    markFunctionEnd(returnValue);
                });
        } else {
            let result;
            try {
                result = unwrapped.apply(this, args);
                return result;
            } catch (err) {
                markFunctionException(err);
                throw err;
            } finally {
                markFunctionEnd(result);
            }
        }
    };
}

function instrumentAsyncFunctionPriv(
    target: unknown,
    functionName: string,
    descriptor: AsyncFunctionDescriptor
) {
    const unwrapped = descriptor.value!;
    descriptor.value = async function (...args: unknown[]) {
        markFunctionStart();
        let result;
        try {
            result = await unwrapped.apply(this, args);
            return result;
        } catch (err) {
            markFunctionException(err);
            throw err;
        } finally {
            markFunctionEnd(result);
        }
    };
}

export function Instrument() {
    return instrumentFunctionPriv;
}

export function InstrumentAsync() {
    return instrumentAsyncFunctionPriv;
}
