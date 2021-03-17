import { DEFAULT_INSTRUMENTATION, Instrumentation } from './instrumentation.js';

/** Symbol to mark wrapped functions with */
export const WRAPPED_KEY = Symbol.for('instrument-this.wrapped');
export const DEFINITION_KEY = Symbol.for('instrument-this.definition');

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
