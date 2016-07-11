import test from 'ava';

// promise
test('promise', t => {
  return Promise.resolve(3).then(n => {
      t.is(n, 3);
  });
});
