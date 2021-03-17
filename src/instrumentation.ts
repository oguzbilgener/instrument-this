import {
    Tracer,
    NoopTracer,
    Span,
    SpanStatusCode,
    context as opentelemetryContext,
    setSpan,
} from '@opentelemetry/api';
import { Meter, NoopMeter, BoundCounter, BoundValueRecorder } from '@opentelemetry/api-metrics';
import { InstrumentConfig, GlobalConfig, DEFAULT_CONFIG } from './config.js';
import { getInstrumentation } from './globals.js';

export interface Instrumentation {
    // TODO: add wrappers for these for better pluggability
    tracer: Tracer;
    meter: Meter;
    config: GlobalConfig;
}

export const DEFAULT_INSTRUMENTATION: Instrumentation = {
    tracer: new NoopTracer(),
    meter: new NoopMeter(),
    config: DEFAULT_CONFIG,
};

export interface ExecutionContext {
    span: Span;
    startTime: bigint;
}

export interface Metrics {
    duration?: BoundValueRecorder;
    success?: BoundCounter;
    fail?: BoundCounter;
}

export interface DefinitionContext {
    metrics: Metrics;
}

export function executeWithContext<T>(context: ExecutionContext, fn: () => T): T {
    const { span } = context;
    return opentelemetryContext.with(setSpan(opentelemetryContext.active(), span), fn);
}

export function markFunctionStart(
    functionName: string,
    overrideConfig: InstrumentConfig | undefined
): ExecutionContext {
    // TODO: consider logging the function arguments only if they are allowed
    // TODO: do not create a span if override config span level too low
    const name = overrideConfig?.name ?? functionName;
    const span = getInstrumentation().tracer.startSpan(name);
    const startTime = process.hrtime.bigint();
    return {
        span,
        startTime,
    };
}

export function markFunctionException(
    executionContext: ExecutionContext,
    definitionContext: DefinitionContext,
    error: Error
) {
    executionContext.span.recordException(error);
    executionContext.span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
    });
    // TODO: other things
}

export function markFunctionEnd(
    executionContext: ExecutionContext,
    definitionContext: DefinitionContext,
    returnValue: unknown,
    success: boolean
) {
    // TODO: consider logging the returnValue only if it's allowed
    executionContext.span.end();
    recordMetrics(executionContext, definitionContext, success);
}

export function initializeDefinitionContext(
    functionName: string,
    overrideConfig: InstrumentConfig | undefined
): DefinitionContext {
    const { meter } = getInstrumentation();
    const name = overrideConfig?.name ?? functionName;
    // TODO: skip if metrics are disabled
    return {
        metrics: {
            duration: meter.createValueRecorder(`${name}_duration`).bind({ name }),
            success: meter.createCounter(`${name}_success`).bind({ name }),
            fail: meter.createCounter(`${name}_fail`).bind({ name }),
        },
    };
}

function recordMetrics(
    executionContext: ExecutionContext,
    definitionContext: DefinitionContext,
    success: boolean
) {
    const durationMetric = definitionContext.metrics.duration;
    const successMetric = definitionContext.metrics.success;
    const failMetric = definitionContext.metrics.fail;
    if (durationMetric) {
        const duration = process.hrtime.bigint() - executionContext.startTime;
        // TODO: fix this
        durationMetric.record(Number(duration / 1000000n));
    }
    if (success) {
        successMetric?.add(1);
    } else {
        failMetric?.add(1);
    }
}
