import { hasSetInstrumentation, setGlobalInstrumentation } from './globals.js';
import { Instrumentation } from './instrumentation.js';

/**
 * Initialize the global instrumentation.
 * Note: this function causes side effects by setting the global configs.
 * Calling this function more than once will do nothing.
 */
export function initialize(instrumentation: Instrumentation) {
    if (hasSetInstrumentation()) {
        return;
    }
    setGlobalInstrumentation(instrumentation);
}
