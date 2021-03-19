import type { Counter, Labels, Histogram, Summary, MetricsProvider } from './metrics';
import * as promClient from 'prom-client';

export class PromMetricsProvider implements MetricsProvider {
    private registry: promClient.Registry;

    constructor() {
        this.registry = new promClient.Registry();
    }

    createCounter(name: string, description: string | undefined, labels: Labels): Counter {
        return new PromCounter(name, description || '', labels, this.registry);
    }
    createHistogram(
        name: string,
        description: string | undefined,
        buckets: number[],
        labels: Labels
    ): Histogram {
        return new PromHistogram(name, description || '', buckets, labels, this.registry);
    }
    createSummary(
        name: string,
        description: string | undefined,
        quantiles: number[],
        labels: Labels
    ): Summary {
        return new PromSummary(name, description || '', quantiles, labels, this.registry);
    }

    getRegistry() {
        return this.registry;
    }
}

export class PromCounter implements Counter {
    // TODO: deal with the generics later
    private counter: promClient.Counter<string>;
    private labels: Labels;

    constructor(name: string, help: string, labels: Labels, registry: promClient.Registry) {
        this.labels = labels;
        this.counter = new promClient.Counter({
            name,
            help,
            labelNames: Object.keys(labels),
        });
        registry.registerMetric(this.counter);
    }

    increment(): void {
        this.counter.labels(this.labels).inc(1);
        // this.counter.inc(1);
    }
}

export class PromHistogram implements Histogram {
    private histogram: promClient.Histogram<string>;
    private labels: Labels;

    constructor(
        name: string,
        help: string,
        buckets: number[],
        labels: Labels,
        registry: promClient.Registry
    ) {
        this.labels = labels;
        this.histogram = new promClient.Histogram({
            name,
            help,
            labelNames: Object.keys(labels),
            buckets,
        });
        registry.registerMetric(this.histogram);
    }

    record(seconds: number): void {
        this.histogram.labels(this.labels).observe(seconds);
    }
}

export class PromSummary implements Summary {
    private summary: promClient.Summary<string>;
    private labels: Labels;

    constructor(
        name: string,
        help: string,
        percentiles: number[],
        labels: Labels,
        registry: promClient.Registry
    ) {
        this.labels = labels;
        this.summary = new promClient.Summary({
            name,
            help,
            labelNames: Object.keys(labels),
            percentiles,
            maxAgeSeconds: 600,
            ageBuckets: 5,
        });
        registry.registerMetric(this.summary);
    }

    record(value: number): void {
        this.summary.labels(this.labels).observe(value);
    }
}
