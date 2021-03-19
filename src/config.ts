import type { Labels } from './metrics';

export interface TracingConfig {
    enabled: boolean;
    attributes: { [key: string]: number | string | undefined | null };
}

export interface MetricsConfig {
    enabled: boolean;
    labels?: Labels;
    summary: {
        enabled: boolean;
        quantiles: number[];
    };
    histogram: {
        buckets: number[];
    };
}

export type LogLevels = { [name: string]: number };

export interface LoggingConfig<L extends LogLevels> {
    enabled: boolean;
    levels: L;
    level: keyof L;
}

export interface GlobalConfig<L extends LogLevels> {
    tracing: TracingConfig;
    metrics: MetricsConfig;
    logging: LoggingConfig<L>;
}

export interface InstrumentConfig {
    /** Override this operation name, if the given function/method is anonymous or has an undesirable name */
    name?: string;
    tracing?: TracingConfig;
    metrics?: MetricsConfig;
    logging?: {
        enabled?: boolean;
        level: string;
        logArgs?: boolean;
    };
}

export type MergedConfig<L extends LogLevels> = {
    name: string;
} & GlobalConfig<L>;

export const DEFAULT_CONFIG: GlobalConfig<LogLevels> = Object.freeze({
    tracing: {
        enabled: true,
        attributes: {},
    },
    metrics: {
        enabled: true,
        summary: {
            enabled: true,
            quantiles: [0.01, 0.1, 0.5, 0.9, 0.95, 0.99],
        },
        histogram: {
            enabled: true,
            buckets: [0.01, 0.1, 0.25, 0.4, 0.5, 1],
        },
    },
    logging: {
        enabled: false,
        levels: {
            debug: 0,
            verbose: 1,
            info: 2,
            warn: 3,
            error: 4,
            fatal: 4,
        },
        level: 'info',
    },
});
