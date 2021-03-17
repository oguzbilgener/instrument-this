import { Instrument } from 'instrument-this';

interface Item {
    value: number;
}

export class ItemService {
    private first: FirstService;
    private second: SecondService;

    constructor(injected: { firstService: FirstService; secondService: SecondService }) {
        this.first = injected.firstService;
        this.second = injected.secondService;
    }

    @Instrument()
    async getItems(mustFail: boolean): Promise<Item[]> {
        const base = this._getBase();
        await this.first.doThis();
        await Promise.all([this.second.doConcurrentOne(), this.second.doConcurrentTwo()]);
        const length = await this.first.doThat(mustFail);

        return Array.from({ length }).map((_, i) => ({
            value: base + i,
        }));
    }

    @Instrument({ name: 'secretSauce' })
    private _getBase() {
        return 50 + Math.floor(Math.random() * 50);
    }
}

export class FirstService {
    @Instrument()
    async doThis() {
        await delayRandom(25, 50);
    }

    @Instrument()
    async doThat(mustFail?: boolean) {
        await delayRandom(25, 50);
        if (mustFail) {
            throw new Error('Something went wrong');
        }
        return this._getItemCount();
    }

    @Instrument({ name: 'calculateItemCount' })
    private _getItemCount() {
        return 1 + Math.floor(Math.random() * 10);
    }
}

export class SecondService {
    @Instrument()
    async doConcurrentOne() {
        await delayRandom(4, 8);
    }

    @Instrument()
    async doConcurrentTwo() {
        await delayRandom(10, 20);
    }
}

async function delay(ms: number) {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function delayRandom(min: number, max: number) {
    await delay(min + Math.random() * (max - min));
}