import { Instrument } from 'instrument-this';

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

async function main() {
    const thing = new Thing();
    const x = await thing.doStuff();
    const y = thing.doSyncStuff();
    const z = await thing.doPromiseStuff();
    console.log(x == y && y == z);
}

Promise.resolve()
    .then(main)
    .catch((err) => {
        console.log('Error: ', err);
        process.exit(1);
    });
