import * as Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import * as E from './Endpoint'
import * as R from './router/Router'
import * as t from 'io-ts'
import { apiSuccess, apiFailure } from './Response'

// validator for data in our POST request
const userValidator = t.type({
  id: t.number,
  name: t.string,
  age: t.number,
})

// type, derived from the validator
type User = t.TypeOf<typeof userValidator>

// very 1x data store
let userStore: User[] = []

// get user from store if available
const getUser = E.endpoint(
  R.makeRoute()
    .path('users')
    .number()
    .path('details')
    .get()
    .stringHeader('authtoken')
    .done(),
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

// save a user in the store
const postUser = E.endpoint(
  R.makeRoute()
    .path('users')
    .stringHeader('authtoken')
    .post(userValidator)
    .done(),
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

// grab the stuff from the Koa context that we need
const koaContextToRequest = (
  ctx: Koa.Context
): R.Request => ({
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

  // the next step will be to provide a less manual way of combining endpoints
  E.runEndpoint(postUser, req)
    .then(success)
    .catch((_) =>
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
