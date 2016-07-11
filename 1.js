import test from 'ava';

test('synchronization', t => {
  const a = /foo/;
  const b = 'bar';
  const c = 'baz';
  t.false(a.test(b) || b === c);
});

