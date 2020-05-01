import * as Koa from 'koa'

import * as CRE from './ContReaderEither'
import * as R from './Result'
import * as Router from './Router2'

Router.testRouting({
  method: 'get',
  path: '/referral/stuff/good/1',
})
Router.testRouting({
  method: 'post',
  path: '/referral/stuff/bad/1',
})
Router.testRouting({
  method: 'get',
  path: '/referral/stuff/bad/1',
})
Router.testRouting({
  method: 'get',
  path: '/something/else',
})
Router.testRouting({
  method: 'get',
  path: '/posts/bad/1000000',
})
Router.testRouting({
  method: 'get',
  path: '/posts/good/22',
})

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
