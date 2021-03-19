import { DEFAULT_INSTRUMENTATION, Instrumentation } from './instrumentation.js';
import type { LogLevels } from './config';

/** Symbol to mark wrapped functions with */
export const WRAPPED_KEY = Symbol.for('instrument-this.wrapped');
export const DEFINITION_KEY = Symbol.for('instrument-this.definition');

let _globalInstrumentation: Instrumentation<any> = DEFAULT_INSTRUMENTATION;

export function getInstrumentation(): Instrumentation<LogLevels> {
    return _globalInstrumentation;
}

export function setGlobalInstrumentation<L extends LogLevels>(instrumentation: Instrumentation<L>) {
    _globalInstrumentation = instrumentation;
}

// TODO: refactor this
export function hasSetInstrumentation() {
    return _globalInstrumentation != DEFAULT_INSTRUMENTATION;
}
