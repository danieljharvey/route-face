import * as Koa from 'koa'

import * as CRE from './ContReaderEither'
import * as R from './Result'
import * as Router from './Router3'

/*
const app = new Koa.default()

app.use(async (ctx: Koa.Context) => {
  const done = await CRE.runContReaderEitherPromise(
    appLogic,
    ctx
  )
  ctx.body = done
})

app.listen(3000)
*/
