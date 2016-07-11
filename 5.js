import test from 'ava';

test('async function', async t => {
    const bar = Promise.resolve('bar');

    t.is(await bar, 'bar');
});