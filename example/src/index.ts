import { initTracing, initMetrics, TracerProvider } from './opentelemetry.js';
import { Instrument, initialize, PromMetricsProvider, wrapInstrument } from 'instrument-this';
import Koa, { Context, Next } from 'koa';
import KoaRouter from '@koa/router';
import { ItemService, FirstService, SecondService } from './services.js';
interface InjectionContext {
    itemService: ItemService;
    firstService: FirstService;
    secondService: SecondService;
}

const PORT = 8080;
class Router {
    private router: KoaRouter;
    private injectionContext: InjectionContext;

    constructor(injectionContext: InjectionContext) {
        this.injectionContext = injectionContext;
        this.router = new KoaRouter();
        this.router.get('/', (ctx) => this.getItemsRoute(ctx));
        this.router.get('/other', (ctx) => this.getOtherRoute(ctx));
    }

    @Instrument()
    async getItemsRoute(ctx: Context) {
        const mustFail = ctx.request.query.mustFail === 'true';
        ctx.body = await this.injectionContext.itemService.getItems(mustFail);
    }

    // Alternative method without TypeScript decorators
    getOtherRoute = wrapInstrument(async (ctx: Context) => {
        await this.injectionContext.firstService.doThat();
        await this.injectionContext.secondService.doOtherThing();
        ctx.body = {};
    }, { name: 'getOtherRoute' })

    routes() {
        return this.router.routes();
    }
}

async function main() {
    const tracerProvider = initTracing();
    const promMetricsProvider = new PromMetricsProvider();
    initInstrumentation(tracerProvider, promMetricsProvider);
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
    app.use(makeMetricsRouter(promMetricsProvider).routes());
    app.use(router.routes());

    app.listen(PORT, () => {
        console.log(`Server started at http://localhost:${PORT}`);
    });
}

function initInstrumentation(
    tracerProvider: TracerProvider,
    promMetricsProvider: PromMetricsProvider
) {
    initialize({
        processName: 'example',
        tracer: tracerProvider.getTracer('example'),
        metricsProvider: promMetricsProvider,
        config: {},
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

function makeMetricsRouter(provider: PromMetricsProvider): KoaRouter {
    const router = new KoaRouter();
    router.get('/metrics', async (ctx: Context) => {
        ctx.type = 'text';
        ctx.body = await provider.getRegistry().metrics();
    });
    return router;
}
