import { InstrumentConfig } from './config.js';
import { GLOBAL_WRAPPED_KEY } from './globals.js';
import {
    executeWithContext,
    markFunctionStart,
    markFunctionException,
    markFunctionEnd,
} from './instrumentation.js';

type AsyncFunction = (...args: any[]) => Promise<any>;
type SyncFunction = (...args: any[]) => any;

type DescriptorExtension = {
    [GLOBAL_WRAPPED_KEY]?: boolean;
};

type AsyncFunctionDescriptor = TypedPropertyDescriptor<AsyncFunction> & DescriptorExtension;
type SyncFunctionDescriptor = TypedPropertyDescriptor<SyncFunction> & DescriptorExtension;

type FunctionDescriptor = SyncFunctionDescriptor | AsyncFunctionDescriptor;

function isAsyncFunctionDescriptor(
    descriptor: FunctionDescriptor
): descriptor is AsyncFunctionDescriptor {
    return descriptor.value?.constructor.name === 'AsyncFunction';
}

function instrumentFunctionPriv(overrideConfig?: InstrumentConfig) {
    return (target: unknown, functionName: string, descriptor: FunctionDescriptor): void => {
        if (descriptor.value === undefined) {
            return;
        }
        // Avoid wrapping the function more than once
        if (descriptor[GLOBAL_WRAPPED_KEY]) {
            return;
        }
        if (isAsyncFunctionDescriptor(descriptor)) {
            return instrumentAsyncFunctionPriv(overrideConfig)(target, functionName, descriptor);
        }
        const unwrapped = descriptor.value;
        descriptor.value = function (...args: unknown[]) {
            const context = markFunctionStart(functionName, overrideConfig);
            const result: unknown = executeWithContext(context, () => unwrapped.apply(this, args));
            if (result instanceof Promise) {
                let returnValue: unknown;
                return result
                    .then((value) => {
                        returnValue = value;
                        return value;
                    })
                    .catch((err) => {
                        markFunctionException(context, err);
                    })
                    .finally(() => {
                        markFunctionEnd(context, returnValue);
                    });
            } else {
                try {
                    return result;
                } catch (err) {
                    markFunctionException(context, err);
                    throw err;
                } finally {
                    markFunctionEnd(context, result);
                }
            }
        };
        descriptor[GLOBAL_WRAPPED_KEY] = true;
    };
}

function instrumentAsyncFunctionPriv(overrideConfig?: InstrumentConfig) {
    return (_target: unknown, functionName: string, descriptor: AsyncFunctionDescriptor): void => {
        const unwrapped = descriptor.value!;
        // Avoid wrapping the function more than once
        if (descriptor[GLOBAL_WRAPPED_KEY]) {
            return;
        }
        descriptor.value = async function (...args: unknown[]) {
            const context = markFunctionStart(functionName, overrideConfig);
            let result;
            try {
                result = await executeWithContext(context, () => unwrapped.apply(this, args));
                return result;
            } catch (err) {
                markFunctionException(context, err);
                throw err;
            } finally {
                markFunctionEnd(context, result);
            }
        };
        descriptor[GLOBAL_WRAPPED_KEY] = true;
    };
}

export function Instrument(overrideConfig?: InstrumentConfig) {
    return instrumentFunctionPriv(overrideConfig);
}

export function InstrumentAsync(overrideConfig?: InstrumentConfig) {
    return instrumentAsyncFunctionPriv(overrideConfig);
}
