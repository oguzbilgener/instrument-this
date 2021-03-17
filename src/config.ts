export interface CommonConfig {
    logFields?: string[];
}

export interface GlobalConfig extends CommonConfig {}

export interface InstrumentConfig extends CommonConfig {
    /** Override this operation name, if the given function/method is anonymous or has an undesirable name */
    name?: string;
}

export const DEFAULT_CONFIG: CommonConfig = Object.freeze({});
