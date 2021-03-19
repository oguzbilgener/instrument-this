import {
    Tracer,
    NoopTracer,
    Span,
    SpanStatusCode,
    context as opentelemetryContext,
    setSpan,
} from '@opentelemetry/api';
import { InstrumentConfig, GlobalConfig, DEFAULT_CONFIG, LogLevels } from './config.js';
import { getInstrumentation, DEFINITION_KEY } from './globals.js';
import type { FunctionDescriptor } from './decorator';
import { MetricsProvider, NoopMetricsProvider, Histogram, Summary, Counter } from './metrics.js';

export interface Instrumentation<L extends LogLevels> {
    // TODO: add wrappers for these for better pluggability
    processName: string;
    tracer: Tracer;
    metricsProvider: MetricsProvider;
    config: GlobalConfig<L>;
}

export const DEFAULT_INSTRUMENTATION: Instrumentation<LogLevels> = {
    processName: 'unknown',
    tracer: new NoopTracer(),
    metricsProvider: new NoopMetricsProvider(),
    config: DEFAULT_CONFIG,
};

export interface ExecutionContext {
    span?: Span;
    startTime: [number, number];
}

export interface Metrics {
    // Note: OpenTelemetry Metrics SDK does not yet support histograms
    readonly histogram?: Histogram;
    readonly summary?: Summary;
    readonly success?: Counter;
    readonly error?: Counter;
}

export interface DefinitionContext {
    readonly metrics: Metrics;
}

export function executeWithContext<T>(context: ExecutionContext, fn: () => T): T {
    const { span } = context;
    if (span) {
        return opentelemetryContext.with(setSpan(opentelemetryContext.active(), span), fn);
    } else {
        return fn();
    }
}

export function markFunctionStart(
    functionName: string,
    overrideConfig: InstrumentConfig | undefined
): ExecutionContext {
    const { tracer, config } = getInstrumentation();
    // TODO: log if log level is enough
    const name = overrideConfig?.name ?? functionName;
    const tracingEnabled = overrideConfig?.tracing?.enabled ?? config.tracing.enabled;
    const span = tracingEnabled ? tracer.startSpan(name) : undefined;
    const startTime = process.hrtime();
    return {
        span,
        startTime,
    };
}

export function markFunctionException(
    executionContext: ExecutionContext,
    _definitionContext: DefinitionContext,
    error: Error
) {
    const { span } = executionContext;
    if (span) {
        span.recordException(error);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
        });
    }
    // TODO: other things
}

export function markFunctionEnd(
    executionContext: ExecutionContext,
    definitionContext: DefinitionContext,
    _returnValue: unknown,
    success: boolean
) {
    // TODO: consider logging the returnValue only if it's allowed
    executionContext.span?.end();
    recordMetrics(executionContext, definitionContext, success);
}

export function lazyInitializeDefinitionContext(
    descriptor: FunctionDescriptor,
    functionName: string,
    overrideConfig: InstrumentConfig | undefined
): DefinitionContext {
    if (!descriptor[DEFINITION_KEY]) {
        descriptor[DEFINITION_KEY] = initializeDefinitionContext(functionName, overrideConfig);
    }
    return descriptor[DEFINITION_KEY]!;
}

export function initializeDefinitionContext(
    functionName: string,
    overrideConfig: InstrumentConfig | undefined
): DefinitionContext {
    const { processName, metricsProvider, config } = getInstrumentation();
    const name = overrideConfig?.name ?? functionName;
    return {
        metrics: initializeMetrics(name, processName, metricsProvider, config, overrideConfig),
    };
}

function initializeMetrics<L extends LogLevels>(
    name: string,
    processName: string,
    metrics: MetricsProvider,
    config: GlobalConfig<L>,
    overrideConfig: InstrumentConfig | undefined
): Metrics {
    if (!config.metrics.enabled && !overrideConfig?.metrics?.enabled) {
        return {};
    }
    const labels = {
        processName,
        name,
        ...config.metrics.labels,
        ...overrideConfig?.metrics?.labels,
    };
    return {
        histogram: metrics.createHistogram(
            `operation_histogram_${name}`,
            'Duration histogram',
            overrideConfig?.metrics?.histogram.buckets || config.metrics.histogram.buckets,
            labels
        ),
        summary: metrics.createSummary(
            `operation_summary_${name}`,
            'Duration summary',
            overrideConfig?.metrics?.summary.quantiles || config.metrics.summary.quantiles,
            labels
        ),
        success: metrics.createCounter(`operation_success_${name}`, 'Success count', labels),
        error: metrics.createCounter(`operation_error_${name}`, 'Error count', labels),
    };
}

function recordMetrics(
    executionContext: ExecutionContext,
    definitionContext: DefinitionContext,
    successful: boolean
) {
    const [seconds, nanoseconds] = process.hrtime(executionContext.startTime);
    const duration = seconds + nanoseconds / 1000000000;

    const { histogram, summary, success, error } = definitionContext.metrics;
    if (histogram) {
        histogram.record(duration);
    }
    if (summary) {
        summary.record(duration);
    }
    if (successful) {
        success?.increment();
    } else {
        error?.increment();
    }
}
