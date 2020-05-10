import * as Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import * as E from './Endpoint'
import * as R from './Router4'
import * as t from 'io-ts'
import { apiSuccess, apiFailure } from './Response'

const userValidator = t.type({
  id: t.number,
  name: t.string,
  age: t.number,
})

type User = t.TypeOf<typeof userValidator>

let userStore: User[] = []

const userRouteWithAuthToken = R.makeRoute
  .path('users')
  .stringHeader('authtoken')
  .done()

const getUser = E.endpoint(
  R.extendRoute(userRouteWithAuthToken).number().done(),
  ({ path: [_, userId], headers: { authtoken } }) => {
    if (authtoken !== 'secretpassword') {
      return Promise.resolve(apiFailure('auth failure'))
    }
    const user = userStore[userId]
    return Promise.resolve(
      user
        ? apiSuccess(user)
        : apiFailure(`User ${userId} not found!`)
    )
  }
)

const postUser = E.endpoint(
  userRouteWithAuthToken,
  ({ headers: { authtoken }, postData: user }) => {
    if (authtoken !== 'secretpassword') {
      return Promise.resolve(apiFailure('auth failure'))
    }
    userStore[user.id] = user
    return Promise.resolve(apiSuccess('ok!'))
  }
)

const app = new Koa.default()
app.use(bodyParser())

const koaContextToRequest = (
  ctx: Koa.Context
): E.Request => ({
  url: ctx.request.url,
  headers: ctx.request.headers,
  method: ctx.request.method,
  postData: ctx.request.body,
})

app.use(async (ctx: Koa.Context) => {
  const req = koaContextToRequest(ctx)
  const success = (response: any) => {
    console.log('success', response)
    ctx.body = response.body || response
    ctx.status = response.status || 200
  }

  E.runEndpoint(postUser, req)
    .then(success)
    .catch(_ =>
      E.runEndpoint(getUser, req)
        .then(success)
        .catch((e: any) => {
          console.log(e)
          ctx.body = e.toString()
          ctx.status = 400
          return
        })
    )
})

app.listen(3000)
