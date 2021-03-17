import { Instrument } from '../src/decorator';

class Thing {
    item: number;

    constructor() {
        this.item = Math.random();
    }

    @Instrument()
    async doStuff() {
        return this.item;
    }

    @Instrument()
    doSyncStuff() {
        return this.item;
    }

    @Instrument()
    doPromiseStuff() {
        return Promise.resolve().then(() => this.item);
    }
}

// const thing = new Thing();
// const x = await thing.doStuff();
// const y = thing.doSyncStuff();
// const z = await thing.doPromiseStuff();
// console.log(x == y && y == z);
