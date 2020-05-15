import * as Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import * as E from './Endpoint'
import * as R from './router/Router'
import * as t from 'io-ts'
import * as J from './job/job'

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
const getUser = E.fromRoute(
  R.makeRoute()
    .path('users')
    .number()
    .path('details')
    .get()
    .stringHeader('authtoken')
    .done(),
  ({ path: [_, userId], headers: { authtoken } }) =>
    J.makeJob((success, failure) => {
      if (authtoken !== 'secretpassword') {
        return failure('auth failure')
      }
      const user = userStore[userId]
      user
        ? success(user)
        : failure(`User ${userId} not found!`)
    })
)

// save a user in the store
const postUser = E.fromRoute(
  R.makeRoute()
    .path('users')
    .stringHeader('authtoken')
    .post(userValidator)
    .done(),
  ({ headers: { authtoken }, postData: user }) =>
    J.makeJob((success, failure) => {
      if (authtoken !== 'secretpassword') {
        return failure('auth failure')
      }
      userStore[user.id] = user
      return success('ok!')
    })
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
  J.runToPromise(postUser(req))
    .then(success)
    .catch(_ =>
      J.runToPromise(getUser(req))
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
