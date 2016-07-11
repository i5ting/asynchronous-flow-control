import test from 'ava';

var exec = require('co-exec');

test('generatorFn with exec()', function * (t) {
    let commit = yield exec('ls -alt|grep .gitignore|wc -l');
    t.true(commit == 1);
});