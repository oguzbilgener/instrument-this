import { Instrument } from '../src/decorator';

describe('Instrument', () => {
    it('should wrap the given function', async () => {
        class Stuff {
            @Instrument({ metrics: { enabled: false }, tracing: { enabled: false } })
            async myMethod() {
                return 42;
            }
        }

        const instance = new Stuff();
        const result = await instance.myMethod();
        expect(result).toEqual(42);
    });
});
