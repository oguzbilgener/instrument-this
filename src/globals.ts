import { DEFAULT_INSTRUMENTATION, Instrumentation } from './instrumentation.js';

// export const GLOBAL_CONFIG_KEY = Symbol.for('instrument-this.global.config');

/** Symbol to mark wrapped functions with */
export const GLOBAL_WRAPPED_KEY = Symbol.for('instrument-this.global.wrapped');

let _globalInstrumentation: Instrumentation = DEFAULT_INSTRUMENTATION;

export function getInstrumentation(): Instrumentation {
    return _globalInstrumentation;
}

export function setGlobalInstrumentation(instrumentation: Instrumentation) {
    _globalInstrumentation = instrumentation;
}

// TODO: refactor this
export function hasSetInstrumentation() {
    return _globalInstrumentation != DEFAULT_INSTRUMENTATION;
}
