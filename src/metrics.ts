export interface MetricsProvider {
    createCounter(name: string, description: string | undefined, labels: Labels): Counter;
    createHistogram(
        name: string,
        description: string | undefined,
        buckets: number[],
        labels: Labels
    ): Histogram;
    createSummary(
        name: string,
        description: string | undefined,
        quantiles: number[],
        labels: Labels
    ): Summary;
}

export interface Counter {
    increment(): void;
}

export interface Histogram {
    record(seconds: number): void;
}

export interface Summary {
    record(value: number): void;
}

export type Labels = {
    [key: string]: string;
};

export class NoopMetricsProvider implements MetricsProvider {
    createCounter(
        _name: string,
        _description: string | undefined,
        _labels: Labels,
    ): Counter {
        return new NoopCounter();
    }
    createHistogram(
        _name: string,
        _description: string | undefined,
        _buckets: number[],
        _labels: Labels
    ): Histogram {
        return new NoopHistogram();
    }
    createSummary(
        _name: string,
        _description: string | undefined,
        _quantiles: number[],
        _labels: Labels
    ): Summary {
        return new NoopSummary();
    }
}

export class NoopCounter implements Counter {
    increment(): void {}
}

export class NoopHistogram implements Histogram {
    record(_seconds: number): void {}
}

export class NoopSummary implements Summary {
    record(_value: number): void {}
}
