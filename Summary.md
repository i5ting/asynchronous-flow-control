# asynchronous-flow-control

InfoQ 前端之巅分享专业《深入浅出js（Node.js）异步流程控制》

## 摘要

目前在js流程控制领域越来越乱，各种派系。。。比如promise，generator，async函数，各种混战，在百花齐放的今天，作为前端或Node.js沾边工程师或全栈工程师，你知道该学哪种么？

- 从下一代测试框架ava说起
- 流程控制发展的前世今生概览
- 从co引出的血案，到yieldable 5种，到aysnc函数，聊聊同步的流程控制
- 最后推导一下学习重点、未来趋势

## 个人介绍

i5ting（桑世龙），空弦科技 CTO，StuQ 明星讲师，开源项目 Moajs 作者，Node.js 技术布道者，即将出版《更了不起的 Node 4：将下一代 Web 框架 Koa 进行到底》

曾就职在新浪、网秦，曾做过前端、后端、数据分析、移动端负责人、做过首席架构师、技术总监，全栈技术实践者，目前主要关注技术架构和团队梯队建设方向。

![I5ting](images/i5ting.jpg)


# > > > > 这次分享的主题《深入浅出js（Node.js）异步流程控制》，为什么要从下一代测试框架ava开始呢？

看似无关，但实际上测试框架才是对流程控制提供最全的最简洁的集成的，如果通用性的测试框架都解决不好流程控制问题，那么，这样的东西不用也罢。

[AVA](https://github.com/avajs/ava)是面向未来的测试运行器，简单的说ava是mocha的替代品，对es6语法支持更好，对aysnc/await有支持，执行效率更高，使用io并发，就必须保证测试的原子性，语义上更简单，集众家之长。

举个例子

```
test('synchronization', t => {})
test.cb('callback', t => {})
test('promise', t => {})
test('generator function',  function * (t) {})
test('async function', async t => {})
```

各位了解这几种写法的区别么？总结一下

- test和test.cb是2种，同步和callback处理
- test里，第二个参数有3种写法，普通函数，generator函数，async函数

它们就是我们的主角，几乎所有的流程控制都在里面了。看一个模块或者框架，如果能这样比较，就非常容易看到它们的本质，一般都是写的人比用的人精，但用的人也可以变成写的人，是不是？

# > > > > 流程控制的6个演进步骤

js流程控制的演进过程，分以下6部分

1. 同步代码
2. 异步JavaScript: callbackhell
3. Thunk
4. Promise/a+
5. 生成器Generators/yield
6. Async函数/await（以前说是es7 stage-3）

![Fc](fc.png)

看起来挺简单的，作为*js[沾边]工程师的各位自测一下，当前是哪个阶段？是否有不了解的呢？

下面一一介绍

## 同步 vs 异步

测试一节说过：test和test.cb是2种，同步和callback处理


js语言里除了ajax、setTimeout等大部分都是同步，写同步代码是一种幸福，稍后你就懂了

1.js

```
import test from 'ava';

test('synchronization', t => {
  const a = /foo/;
  const b = 'bar';
  const c = 'baz';
  t.false(a.test(b) || b === c);
});

```

但是我们习惯回调，无论事件还是ajax，都是异步的。另外Node.js里又为了性能而异步，即所谓的天生异步，每个api都是异步的。

以Node.js为例

- error-first callback（错误优先的回调机制）
- EventEmitter （事件发射机制）

总结，callback是用的最多的，是绝大部分的api遵守的约定，而EventEmitter是辅助机制，通过继承EventEmitter，来解耦业务逻辑。

2.js

```
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
```

test.cb必须和t.end结合，才能完成测试。这其实是理解异步的比较好的。异步就好比是你丢石头砸别人家的窗户，调用t.end的时候是人家发现的时候，至于如何处理，看着办吧。

## 普通函数，generator函数，async函数

- test里，第二个参数有3种写法，普通函数，generator函数，async函数

### 普通函数

callbackhell译为回调地狱，回调都有地狱，可见大家对callback的厌恶程度，诚然过多嵌套回调的代码是非常难于维护，可读性极差。

```
step1(function (value1) {
    step2(value1, function(value2) {
        step3(value2, function(value3) {
            step4(value3, function(value4) {
                // Do something with value4
            });
        });
    });
});
```

我要说的是

- 前端如ajax，后端如Node.js，回调是躲不过去的
- 回调不止js有，其他语言也有

把callback转成普通函数，主要有2种解决方式：Thunk 和 Promise

#### Thunk

thunk是什么?

- thunk 是一个被封装了同步或异步任务的函数；
- thunk 有唯一一个参数 callback，是 CPS 函数；
- thunk 运行后返回新的 thunk 函数，形成链式调用；
- thunk 自身执行完毕后，结果进入 callback 运行；
- callback 的返回值如果是 thunk 函数，则等该 thunk 执行完毕将结果输入新 thunk 函数运行；如果是其它值，则当做正确结果进入新的 thunk 函数运行；

在 JavaScript 语言中，Thunk 函数替换的不是表达式，而是多参数函数，将其替换成单参数的版本，且只接受回调函数作为参数。

```
// 正常版本的readFile（多参数版本）
fs.readFile(fileName, callback);

// Thunk版本的readFile（单参数版本）
var readFileThunk = Thunk(fileName);
readFileThunk(callback);

var Thunk = function (fileName){
  return function (callback){
    return fs.readFile(fileName, callback); 
  };
};
```

上面代码中，fs 模块的 readFile 方法是一个多参数函数，两个参数分别为文件名和回调函数。经过转换器处理，它变成了一个单参数函数，只接受回调函数作为参数。这个单参数版本，就叫做 Thunk 函数。

曾经大家都如此钟爱函数式，高阶函数，cps等，但Promise目前基本已经成为默认标准了，thunk用的会越来越少，但函数式的一些好的有点还是值得学的。

#### Promise/a+

顺序执行的代码和错误有限的回调方式都是js引擎默认支持的，这部分大家会调用接口，无太多变化，而Promise是对callback的思考，或者说改良方案，目前使用非常普遍，这里详细讲解一下。

promise最早是在commonjs社区提出来的，当时提出了很多规范。比较接受的是promise/A规范。后来人们在这个基础上。提出了promise/A+规范，也就是实际上的业内推行的规范。es6也是采用的这种规范。

Promise对象用于异步技术中。Promise意味着一个还没有完成的操作（许愿），但在未来会完成的（实现）。

Promise表示一个异步操作的最终结果。与Promise最主要的交互方法是通过将函数传入它的then方法从而获取得Promise最终的值或Promise最终最拒绝（reject）的原因。

- 递归，每个异步操作返回的都是promise对象
- 状态机：三种状态（pending, fulfilled 或 rejected）转换，只在promise对象内部可以控制，外部不能改变状态
- 全局异常处理
- 每个函数的返回值都是Promise对象
- 和jQuery一样的链式的thenable写法


给出一个gif演示，便于大家学习

![2222](images/2222.gif)


标准的Promise只有5个核心api，所以还是比较容易学的。

![](images/promise-methods.png)

先掌握着5个api，然后再熟悉bluebird，q这样的promise库，它们做了大量的扩展而已，但核心本质还是这些的。


更多参考 《Node.js最新技术栈之Promise篇》 https://cnodejs.org/topic/560dbc826a1ed28204a1e7de

### 生成器Generators/yield

Generator Function（生成器函数）和Generator（生成器）是ES6引入的新特性，该特性早就出现在了Python、C#等其他语言中。生成器本质上是一种特殊的[迭代器](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/The_Iterator_protocol)。

Generator函数本意是iterator生成器，函数运行到yield时退出，并保留上下文，在下次进入时可以继续运行。

生成器函数也是一种函数，语法上仅比普通function多了个星号* ，即function* ，在其函数体内部可以使用yield和yield* 关键字。

简单理解，这是ES6的新feature，function 后面带 * 的叫做generator。

```
function* doSomething() {
  ....
}
```

先看一下generator如何执行

```
function* doSomething() {
    console.log('1');
    yield; // Line (A)
    console.log('2');
}

var gen1 = doSomething();

gen1.next(); // Prints 1 then pauses at line (A)
gen1.next(); // resumes execution at line (A), then prints 2
```

说明

- gen1是产生出来的generator对象
- 第一个next，会打印出1，之后悬停在 yield所在行，即Line (A)
- 第二个next，恢复line (A)点的执行，之后打印出2

如果有多个yield呢？无穷无尽的next。。。

于是tj就写[co](https://github.com/tj/co)这个著名的generator执行器，co目前已经是v4了，彻底的面向Promise了，个中曲折也是够八卦的了。

### Async函数/await（以前说是es7 stage-3）

generator的弊病是没有执行器，它本身就不是为流程控制而生的，所以co的出现只是解决了这个问题。

可是，你不觉得怪么？非要加个co，才能好好的玩耍，这是不是有点脱裤子放屁的感觉？最好是直接就可以执行，并且效果和Yieldable一样。

async/await 就是这样被搞出来的，很多人认为它是异步操作的终极解决方案。


await

- await + async函数
- await + Promise
- await + co（co会返回Promise，这样可以Yieldable，但难度较大，适合老手）


```
async function a2() {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, 1000);
  })
}

async function a1() {
  console.log("hello a1 and start a2");
  await a2();
  console.log("hello end a2");
}

async function a0() {
  console.log("hello a0 and start a1");
  await a1();
  console.log("hello end a1");
}

a0()
```

执行

```
$ runkoa async.js
async.js
3babel presets path = /Users/sang/.nvm/versions/node/v4.4.5/lib/node_modules/runkoa/node_modules/
hello a0 and start a1
hello a1 and start a2
hello end a2
hello end a1
```

异常处理

Node.js里关于异常处理有一个约定，即同步代码采用try/catch，非同步代码采用error-first方式。对于async函数俩说，它的await语句是同步执行的，所以最正常的流程处理是采用try/catch语句捕获，和generator/yield是一样的。

```
try {
  console.log(await asyncFn());
} catch (err) {
  console.error(err);
}
```

这是通用性的做法，很多时候，我们需要把异常做的更细致一些，这时只要把Promise的异常处理好就好了。

- then(onFulfilled, onRejected)里的onRejected
- catch

async函数总结

- async函数语义上非常好
- async不需要执行器，它本身具备执行能力，不像generator
- async函数的异常处理采用try/catch和promise的错误处理，非常强大
- await接Promise，Promise自身就足够应对所有流程了
- await释放Promise的组合能力，外加Promise的then，基本无敌

# > > > > co引出的“血案”

es6的generator本意是为了计算而设计的迭代器，但tj觉得它可以用于流程控制，于是就有了co，co的历史可以说经历了目前所有的流程控制方案，而且由于支持generator和yield就导致yieldable。

实际上co和generator是把双刃剑，给了我们强大便利的同时，也增加了非常多的概念，可能是过渡性的，也可能是过时的。

可是，你真的需要了解这么多么？从学习的角度，当然是多多意义，如果从实用的角度看，你可能不需要。

存在即合理，那么我们就看看这“血案”吧。

- 学习es6的generator
- 了解es6的迭代器和迭代器相关的2中协议，了解for-of
- 了解co和co的2种用法，源码
- 了解yieldable 5种（包括不常用thunk）
- 如果是koa，还需要了解convert和compose

## yieldable 5种

yieldable本来是没有这个词的，因为在generator里可以是yield关键词，而yield后面接的有6种可能，故而把这些可以yield接的方式成为yieldable，即可以yield接的。

- promises
- thunks (functions)
- array (parallel execution)
- objects (parallel execution)
- generators and generatorFunctions

![Co](images/co.png)

- 顺序执行
  - promises
  - thunks
- 并行
  - array
  - objects

无论是哪种，它们其实都可以是Promise（thunks会慢慢的废弃，后面讲），既然是Promise对象，它们就可以thenable，而co v4.6版本的执行的返回值就是Promise，至此完成了左侧闭环。

至于generator和generatorFunction就要从yield和yield*讲起，在koa 1.x和2.x里有明显的应用。

最关键的，generator是用来计算的迭代器，它是过渡性的产物。yiedable足够强大，只是学习成本稍高，理解起来也有些难度。

# > > > > 推导出学习重点

![All](all.png)

- async函数是趋势，如果[Chrome 52. v8 5.1已经支持async函数](https://github.com/nodejs/CTC/issues/7)了，Node.js支持还会远么？
- async和generator函数里都支持promise，所以promise是必须会的
- generator和yield异常强大，不过不会成为主流，所以学会基本用法和promise就好了，没必要所有的都必须会。
- co作为generator执行器是不错的，它更好的是当做Promise 包装器，通过generator支持yieldable，最后返回Promise，是不是有点无耻？

结论：Promise是必须会的，那你为啥不顺势而为呢？

推荐：使用async函数 + Promise组合

![Suggest](suggest.png)

实践

- promise更容易做promisefyAll
- async函数无法批量操作

那么，在常见的web应用里，dao层使用promise比较好，而service层，使用async/await更好

dao层使用promise

- crud
- 单一模型的方法多
- 库自身支持promise

这种用promisefyAll基本几行代码就够了，一般单一模型的操作，不会特别复杂，应变的需求基本不大。

而service层一般是多个model组合操作，多模型操作就可以拆分成多个小的操作，然后使用await来组合，看起来会更加清晰，另外对需求应变也是非常容易的。


谢谢大家~

# 联系我

![Sang](images/sang.jpg)