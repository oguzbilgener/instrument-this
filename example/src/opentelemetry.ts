import { NodeTracerProvider } from '@opentelemetry/node';
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { SimpleSpanProcessor } from '@opentelemetry/tracing';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import {
    MeterProvider,
    MetricDescriptor,
    HistogramAggregator,
    UngroupedProcessor,
    Aggregator,
} from '@opentelemetry/metrics';
import { MeterProvider as ApiMeterProvider } from '@opentelemetry/api-metrics';
import { TracerProvider } from '@opentelemetry/api';
import { IncomingMessage, ServerResponse } from 'http';

export type { TracerProvider, ApiMeterProvider as MeterProvider };
export type MetricsHandler = (req: IncomingMessage, res: ServerResponse) => void;

export function initTracing(): TracerProvider {
    // default url is `http://otelcol:55681/v1/trace`
    const url = process.env.OTLP_COLLECTOR_URL || undefined;
    const exporter = new CollectorTraceExporter({
        serviceName: 'example',
        url,
    });
    const tracerProvider = new NodeTracerProvider();
    const httpInstrumentation = new HttpInstrumentation({
        enabled: true,
        path: '@opentelemetry/instrumentation-http',
        ignoreIncomingPaths: ['/metrics'],
    });
    httpInstrumentation.enable();
    tracerProvider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    tracerProvider.register();

    return tracerProvider;
}

export function initMetrics(): [ApiMeterProvider, MetricsHandler] {
    const metricsExporter = new PrometheusExporter({
        preventServerStart: true,
    });

    const metricsHandler = metricsExporter.getMetricsRequestHandler.bind(metricsExporter);

    const metricsProvider = new MeterProvider({
        exporter: metricsExporter,
        interval: 1000,
        // processor: new CustomHistogramProcessor(() => [0.01, 0.1, 0.5, 1.0, 2, 5, 10, 11, 21, 30]),
    });

    return [metricsProvider, metricsHandler];
}

type GetBoundaries = (name: string) => number[];

export class CustomHistogramProcessor extends UngroupedProcessor {
    private getBoundariesFor: GetBoundaries;

    constructor(getboundaries: GetBoundaries) {
        super();
        this.getBoundariesFor = getboundaries;
    }

    aggregatorFor(descriptor: MetricDescriptor): Aggregator {
        if (descriptor.boundaries !== undefined) {
            return new HistogramAggregator(descriptor.boundaries);
        }
        // if (/_histogram$/.test(descriptor.name)) {
        //     const boundaries = this.getBoundariesFor(descriptor.name);
        //     return new HistogramAggregator(boundaries);
        // }
        return super.aggregatorFor(descriptor);
    }
}
