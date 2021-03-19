import { InstrumentConfig } from './config.js';
import { WRAPPED_KEY, DEFINITION_KEY } from './globals.js';
import {
    executeWithContext,
    markFunctionStart,
    markFunctionException,
    markFunctionEnd,
    DefinitionContext,
    lazyInitializeDefinitionContext,
} from './instrumentation.js';

type AsyncFunction = (...args: any[]) => Promise<any>;
type SyncFunction = (...args: any[]) => any;

type DescriptorExtension = {
    [WRAPPED_KEY]?: boolean;
    [DEFINITION_KEY]?: DefinitionContext;
};

type AsyncFunctionDescriptor = TypedPropertyDescriptor<AsyncFunction> & DescriptorExtension;
type SyncFunctionDescriptor = TypedPropertyDescriptor<SyncFunction> & DescriptorExtension;

export type FunctionDescriptor = SyncFunctionDescriptor | AsyncFunctionDescriptor;

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
        if (descriptor[WRAPPED_KEY]) {
            return;
        }
        if (isAsyncFunctionDescriptor(descriptor)) {
            return instrumentAsyncFunctionPriv(overrideConfig)(target, functionName, descriptor);
        }
        const unwrapped = descriptor.value;
        // Wrap the method
        descriptor.value = function (...args: unknown[]) {
            const definitionContext = lazyInitializeDefinitionContext(
                descriptor,
                functionName,
                overrideConfig
            );
            const executionContext = markFunctionStart(functionName, overrideConfig);
            const result: unknown = executeWithContext(executionContext, () =>
                unwrapped.apply(this, args)
            );
            let success = true;
            if (result instanceof Promise) {
                let returnValue: unknown;
                return result
                    .then((value) => {
                        returnValue = value;
                        return value;
                    })
                    .catch((err) => {
                        markFunctionException(executionContext, definitionContext, err);
                        success = false;
                        return Promise.reject(err);
                    })
                    .finally(() => {
                        markFunctionEnd(executionContext, definitionContext, returnValue, success);
                    });
            } else {
                try {
                    return result;
                } catch (err) {
                    markFunctionException(executionContext, definitionContext, err);
                    success = false;
                    throw err;
                } finally {
                    markFunctionEnd(executionContext, definitionContext, result, success);
                }
            }
        };
        descriptor[WRAPPED_KEY] = true;
    };
}

function instrumentAsyncFunctionPriv(overrideConfig?: InstrumentConfig) {
    return (_target: unknown, functionName: string, descriptor: AsyncFunctionDescriptor): void => {
        const unwrapped = descriptor.value!;
        // Avoid wrapping the function more than once
        if (descriptor[WRAPPED_KEY]) {
            return;
        }
        // Wrap the method
        descriptor.value = async function (...args: unknown[]) {
            const definitionContext = lazyInitializeDefinitionContext(
                descriptor,
                functionName,
                overrideConfig
            );
            const context = markFunctionStart(functionName, overrideConfig);
            let result;
            let success = true;
            try {
                result = await executeWithContext(context, () => unwrapped.apply(this, args));
                return result;
            } catch (err) {
                markFunctionException(context, definitionContext, err);
                success = false;
                throw err;
            } finally {
                markFunctionEnd(context, definitionContext, result, success);
            }
        };
        descriptor[WRAPPED_KEY] = true;
    };
}

export function Instrument(overrideConfig?: InstrumentConfig) {
    return instrumentFunctionPriv(overrideConfig);
}

export function InstrumentAsync(overrideConfig?: InstrumentConfig) {
    return instrumentAsyncFunctionPriv(overrideConfig);
}


export function wrapInstrument<T, F extends (...args: any[]) => T>(
    fn: F,
    overrideConfig?: InstrumentConfig
): F {
    return ((...args: any[]) => {
        const descriptor = {
            value: fn,
        };
        instrumentFunctionPriv(overrideConfig)(null, fn.name, descriptor);
        return descriptor.value(...args);
    }) as any;
}
