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

type AsyncFunction<T> = (...args: any[]) => Promise<T>;
type SyncFunction<T> = (...args: any[]) => T;

type DescriptorExtension = {
    [WRAPPED_KEY]?: boolean;
    [DEFINITION_KEY]?: DefinitionContext;
};

type AsyncFunctionDescriptor<T> = TypedPropertyDescriptor<AsyncFunction<T>> & DescriptorExtension;
type SyncFunctionDescriptor<T> = TypedPropertyDescriptor<SyncFunction<T>> & DescriptorExtension;

export type FunctionDescriptor<T> = SyncFunctionDescriptor<T> | AsyncFunctionDescriptor<T>;

function isAsyncFunctionDescriptor<T>(
    descriptor: FunctionDescriptor<T>
): descriptor is AsyncFunctionDescriptor<T> {
    return descriptor.value?.constructor.name === 'AsyncFunction';
}

function instrumentFunctionPriv(overrideConfig?: InstrumentConfig) {
    return <T>(target: unknown, functionName: string, descriptor: FunctionDescriptor<T>): void => {
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
    return <T>(
        _target: unknown,
        functionName: string,
        descriptor: AsyncFunctionDescriptor<T>
    ): void => {
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

export function wrapInstrument<T>(
    fn: SyncFunction<T> | AsyncFunction<T>,
    overrideConfig?: InstrumentConfig
): T extends Promise<infer I> ? Promise<T> : T {
    return instrumentFunctionPriv(overrideConfig)(null, fn.name, {
        value: fn,
    });
}
