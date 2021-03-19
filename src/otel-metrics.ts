import type { Counter, Labels, Histogram, Summary, MetricsProvider } from './metrics';
import { BoundCounter, BoundValueRecorder, Meter, MetricOptions } from '@opentelemetry/api-metrics';

export class OtelMetricsProvider implements MetricsProvider {
    private meter: Meter;

    constructor(meter: Meter) {
        this.meter = meter;
    }

    createCounter(name: string, description: string | undefined, labels: Labels): Counter {
        return new OtelCounter(this.meter, name, { description }, labels);
    }
    createHistogram(
        name: string,
        description: string | undefined,
        buckets: number[],
        labels: Labels
    ): Histogram {
        return new OtelHistogram(this.meter, name, { description, boundaries: buckets }, labels);
    }
    createSummary(
        name: string,
        description: string | undefined,
        _quantiles: number[],
        labels: Labels
    ): Summary {
        return new OtelSummary(this.meter, name, { description }, labels);
    }
}

export class OtelCounter implements Counter {
    private counter: BoundCounter;

    constructor(meter: Meter, name: string, options: MetricOptions, labels: Labels) {
        this.counter = meter.createCounter(name, options).bind(labels);
    }

    increment(): void {
        this.counter.add(1);
    }
}

export class OtelHistogram implements Histogram {
    private recorder: BoundValueRecorder;

    constructor(meter: Meter, name: string, options: MetricOptions, labels: Labels) {
        this.recorder = meter.createValueRecorder(name, options).bind(labels);
    }

    record(seconds: number) {
        this.recorder.record(seconds);
    }
}

export class OtelSummary implements Summary {
    constructor(_meter: Meter, _name: string, _options: MetricOptions, _labels: Labels) {
        // No-op, opentelemetry metrics does not seem to support summaries in an easy way
    }

    record(_value: number) {}
}
