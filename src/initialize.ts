import { hasSetInstrumentation, setGlobalInstrumentation } from './globals.js';
import { Instrumentation } from './instrumentation.js';
import { DEFAULT_CONFIG } from './config.js';
import type { LogLevels, GlobalConfig } from './config';

export interface InitializeParams<L extends LogLevels> {
    processName: string;
    tracer: Instrumentation<L>['tracer'];
    metricsProvider: Instrumentation<L>['metricsProvider'];
    config: Partial<GlobalConfig<L>>;
}

/**
 * Initialize the global instrumentation.
 * Note: this function causes side effects by setting the global configs.
 * Calling this function more than once will do nothing.
 */
export function initialize<L extends LogLevels>(initializeParams: InitializeParams<L>) {
    if (hasSetInstrumentation()) {
        return;
    }
    const instrumentation: Instrumentation<L> = {
        ...initializeParams,
        config: {
            tracing: {
                ...DEFAULT_CONFIG.tracing,
                ...initializeParams.config.tracing,
            },
            metrics: {
                ...DEFAULT_CONFIG.metrics,
                ...initializeParams.config.metrics,
            },
            logging: {
                ...((DEFAULT_CONFIG as unknown) as GlobalConfig<L>).logging,
                ...initializeParams.config?.logging,
            },
        },
    };
    setGlobalInstrumentation(instrumentation);
}
