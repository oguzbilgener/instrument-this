import { Instrument, initialize } from 'instrument-this';
import Koa, { Context, Next } from 'koa';
import KoaRouter from '@koa/router';
import { initOpentelemetry } from './opentelemetry.js';
import { ItemService, FirstService, SecondService } from './services.js';
import { NodeTracerProvider } from '@opentelemetry/node';

interface InjectionContext {
    itemService: ItemService;
    firstService: FirstService;
    secondService: SecondService;
}

const PORT = 8000;
class Router {
    private router: KoaRouter;
    private injectionContext: InjectionContext;

    constructor(injectionContext: InjectionContext) {
        this.injectionContext = injectionContext;
        this.router = new KoaRouter();
        this.router.get('/', (ctx) => this.getItems(ctx));
    }

    @Instrument()
    async getItems(ctx: Context) {
        const mustFail = ctx.request.query.mustFail === 'true';
        ctx.body = await this.injectionContext.itemService.getItems(mustFail);
    }

    routes() {
        return this.router.routes();
    }
}

async function main() {
    // Initialize OpenTelemetry, enable the HTTP instrumentation and the Otel collector exporter
    const provider = initOpentelemetry();
    // Initialize instrumentation config to set log levels, argument names allowed to log etc.
    initInstrumentation(provider);

    const firstService = new FirstService();
    const secondService = new SecondService();
    const injectionContext: InjectionContext = {
        itemService: new ItemService({ firstService, secondService }),
        firstService,
        secondService,
    };

    const app = new Koa();
    app.use(errorHandlerMiddleware);
    const router = new Router(injectionContext);
    app.use(router.routes());

    app.listen(PORT, () => {
        console.log(`Server started at http://localhost:${PORT}`);
    });
}

function initInstrumentation(provider: NodeTracerProvider) {
    initialize({
        tracer: provider.getTracer('example'),
    });
}

Promise.resolve()
    .then(main)
    .catch((err) => {
        console.log('Fatal error: ', err);
        process.exit(1);
    });

async function errorHandlerMiddleware(ctx: Context, next: Next) {
    try {
        await next();
    } catch (err) {
        console.error(err);
        ctx.status = err.statusCode || err.status || 500;
        ctx.body = {
            message: err.message,
        };
    }
}
