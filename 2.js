import test from 'ava';
const exec = require('child_process').exec

test.cb('error-first callback with setTimeout', t => {
    setTimeout(() => {
      t.pass();
      t.end();
    }, 2000);
});

test.cb('error-first callback with exec', t => {
  exec('cat *.js bad_file | wc -l',
    function (error, stdout, stderr) {
      t.pass();
      t.end();
  });
});