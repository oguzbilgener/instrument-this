import { NodeTracerProvider } from '@opentelemetry/node';
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { SimpleSpanProcessor } from '@opentelemetry/tracing';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { MeterProvider } from '@opentelemetry/metrics';
import { MeterProvider as ApiMeterProvider } from '@opentelemetry/api-metrics';
import { TracerProvider } from '@opentelemetry/api';
import { IncomingMessage, ServerResponse } from 'http';

export type { TracerProvider, ApiMeterProvider as MeterProvider };
export type MetricsHandler = (req: IncomingMessage, res: ServerResponse) => void;

export function initTracing(): TracerProvider {
    const exporter = new CollectorTraceExporter({
        serviceName: 'example',
    });
    const tracerProvider = new NodeTracerProvider({
        // Disable old plugins
        plugins: {
            http: { enabled: false, path: '@opentelemetry/plugin-http' },
        } as any,
    });
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
    });

    return [metricsProvider, metricsHandler];
}
