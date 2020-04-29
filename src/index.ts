import * as Koa from 'koa'

import * as C from './ContReader'

const logger = <A>(
  value: A
): C.ContReader<Koa.Context, A> =>
  C.contReader((ctx, next) => {
    const rt = ctx.response.get('X-Response-Time')
    console.log(`${ctx.method} ${ctx.url} - ${rt}`)
    next(value)
  })

const responseTime = (): C.ContReader<
  Koa.Context,
  string
> => {
  const start = Date.now()
  return C.contReader((ctx, next) => {
    const ms = Date.now() - start
    ctx.set('X-Response-Time', `${ms}ms`)
    next('response time set')
  })
}

const middlewares = C.bindContReader(responseTime(), logger)

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

app.use(async (ctx: Koa.Context) => {
  const done = await C.runContReaderPromise(
    middlewares,
    ctx
  )
  ctx.body = done
})

app.listen(3000)
