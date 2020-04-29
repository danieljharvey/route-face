import * as Koa from 'koa'

import * as C from './ContReader'
import * as CP from './ContPipe'
import * as CRE from './ContReaderEither'

CRE.pureTest()
CRE.mapTest()
CRE.catchTest()
CRE.apTest()
CRE.bindTest()
CRE.altTest()

type Context = {
  env: 'test' | 'prod'
  user: string
}

// CP.runContPipePromise(CP.bindContPipe(checkUserName, CP.mapContPipe(a => a `mod` 3 ===0, doubleIt)))

const responseTime = C.pure('time')
const logger = () => C.pure('poo')

const middlewares = C.bindContReader(responseTime, logger)

const app = new Koa.default()

/*
// logger

app.use(async (ctx: Koa.Context, next: Koa.Next) => {
  await next();
  const rt = ctx.response.get('X-Response-Time');
  console.log(`${ctx.method} ${ctx.url} - ${rt}`);
});

// x-response-time

app.use(async (ctx: Koa.Context, next: Koa.Next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});
*/
// response

/*
app.use(async (ctx: Koa.Context) => {
  const done = await C.runContReaderPromise(
    middlewares,
    ctx
  )
  ctx.body = done
})
*/

// app.listen(3000)
