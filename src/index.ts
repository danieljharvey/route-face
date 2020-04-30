import * as Koa from 'koa'

import * as CRE from './ContReaderEither'
import * as R from './Result'

// returns the path from the request, split into an array of pieces
const getSplitPath = CRE.fromContext((ctx: Koa.Context) => {
  return R.success(ctx.request.path.split('/'))
})

// log the entire context
const logContext = CRE.fromContext(ctx => {
  console.log(ctx)
  return R.success(true)
})

const appLogic = CRE.bindContReaderEither(
  logContext,
  _ => getSplitPath
)

const app = new Koa.default()

app.use(async (ctx: Koa.Context) => {
  const done = await CRE.runContReaderEitherPromise(
    appLogic,
    ctx
  )
  ctx.body = done
})

app.listen(3000)
