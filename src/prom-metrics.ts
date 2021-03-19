import type { Counter, Labels, Histogram, Summary, MetricsProvider } from './metrics';
import * as promClient from 'prom-client';

export class PromMetricsProvider implements MetricsProvider {
    private registry: promClient.Registry;
    private counters: { [name: string]: promClient.Counter<string> };
    private summaries: { [name: string]: promClient.Summary<string> };
    private histograms: { [name: string]: promClient.Histogram<string> };

    constructor() {
        this.registry = new promClient.Registry();
        this.counters = {};
        this.summaries = {};
        this.histograms = {};
    }

    createCounter(name: string, description: string | undefined, labels: Labels): Counter {
        if (!this.counters[name]) {
            this.counters[name] = new promClient.Counter({
                name,
                help: description || '',
                labelNames: Object.keys(labels),
            });
            this.registry.registerMetric(this.counters[name]);
        }
        return new PromCounter(this.counters[name], labels)
    }
    createHistogram(
        name: string,
        description: string | undefined,
        buckets: number[],
        labels: Labels
    ): Histogram {
        if (!this.histograms[name]) {
            this.histograms[name] = new promClient.Histogram({
                name,
                help: description || '',
                labelNames: Object.keys(labels),
                buckets,
            });
            this.registry.registerMetric(this.histograms[name]);
        }
        return new PromHistogram(
            this.histograms[name],
            labels,
        );
    }
    createSummary(
        name: string,
        description: string | undefined,
        quantiles: number[],
        labels: Labels
    ): Summary {
        if (!this.summaries[name]) {
            this.summaries[name] = new promClient.Summary({
                name,
                help: description || '',
                labelNames: Object.keys(labels),
                percentiles: quantiles,
                maxAgeSeconds: 600,
                ageBuckets: 5,
            })
            this.registry.registerMetric(this.summaries[name]);
        }
        return new PromSummary(this.summaries[name], labels);
    }

    getRegistry() {
        return this.registry;
    }
}

export class PromCounter implements Counter {
    // TODO: deal with the generics later
    private counter: promClient.Counter<string>;
    private labels: Labels;

    constructor(counter: promClient.Counter<string>, labels: Labels) {
        this.labels = labels;
        this.counter = counter;
    }

    increment(): void {
        this.counter.labels(this.labels).inc(1);
    }
}

export class PromHistogram implements Histogram {
    private histogram: promClient.Histogram<string>;
    private labels: Labels;

    constructor(
        histogram: promClient.Histogram<string>,
        labels: Labels,
    ) {
        this.histogram = histogram;
        this.labels = labels;
    }

    record(seconds: number): void {
        this.histogram.labels(this.labels).observe(seconds);
    }
}

export class PromSummary implements Summary {
    private summary: promClient.Summary<string>;
    private labels: Labels;

    constructor(
        summary: promClient.Summary<string>,
        labels: Labels,
    ) {
        this.summary = summary;
        this.labels = labels;
    }

    record(value: number): void {
        this.summary.labels(this.labels).observe(value);
    }
}
