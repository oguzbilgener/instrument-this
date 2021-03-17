import {
    Tracer,
    NoopTracer,
    Span,
    SpanStatusCode,
    context as opentelemetryContext,
    setSpan,
} from '@opentelemetry/api';
import { InstrumentConfig } from './config.js';
import { getInstrumentation } from './globals.js';

export interface Instrumentation {
    // TODO: add wrappers for these for better pluggability
    tracer: Tracer;
}

export const DEFAULT_INSTRUMENTATION: Instrumentation = {
    tracer: new NoopTracer(),
};

export interface Context {
    span: Span;
}

export function executeWithContext<T>(context: Context, fn: () => T): T {
    const { span } = context;
    return opentelemetryContext.with(setSpan(opentelemetryContext.active(), span), fn);
}

export function markFunctionStart(
    autoName: string,
    overrideConfig: InstrumentConfig | undefined
): Context {
    // TODO: consider logging the function arguments only if they are allowed
    // TODO: do not create a span if override config span level too low
    const name = overrideConfig?.name ?? autoName;
    const span = getInstrumentation().tracer.startSpan(name);
    return {
        span,
    };
}

export function markFunctionException(context: Context, error: Error) {
    context.span.recordException(error);
    context.span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
    });
    // TODO: other things
}

export function markFunctionEnd(context: Context, returnValue: unknown) {
    // TODO: consider logging the returnValue only if it's allowed
    context.span.end();
}
