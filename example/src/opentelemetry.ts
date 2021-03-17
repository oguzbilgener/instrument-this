import { NodeTracerProvider } from '@opentelemetry/node';
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector';
import { SimpleSpanProcessor } from '@opentelemetry/tracing';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

export function initOpentelemetry(): NodeTracerProvider {
    const exporter = new CollectorTraceExporter({
        serviceName: 'example',
    });
    const provider = new NodeTracerProvider({
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
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    // provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    provider.register();
    return provider;
}
