import * as Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import * as E from './Endpoint'
import * as R from './Router4'
import * as t from 'io-ts'

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

const getUser = E.getEndpoint(
  R.extendRoute(userRouteWithAuthToken).number().done(),
  ({ path: [_, userId], headers: { authtoken } }) => {
    if (authtoken !== 'secretpassword') {
      return Promise.reject('auth failure')
    }
    const user = userStore[userId]
    return user
      ? Promise.resolve(user)
      : Promise.reject(`User ${userId} not found!`)
  }
)

const postUser = E.postEndpoint(
  userRouteWithAuthToken,
  userValidator,
  ({ headers: { authtoken }, postData: user }) => {
    if (authtoken !== 'secretpassword') {
      return Promise.reject('auth failure')
    }
    userStore[user.id] = user
    return Promise.resolve('ok!')
  }
)

const app = new Koa.default()
app.use(bodyParser())

const koaContextToRequest = (
  ctx: Koa.Context
): E.PostRequest => ({
  url: ctx.request.url,
  headers: ctx.request.headers,
  method: ctx.request.method,
  postData: ctx.request.body,
})

app.use(async (ctx: Koa.Context) => {
  const req = koaContextToRequest(ctx)
  Promise.race([
    E.runPostEndpoint(postUser, req),
    E.runGetEndpoint(getUser, req),
  ])
    .then(response => {
      console.log('success', response)
      ctx.body = response
      ctx.status = 200
    })
    .catch(e => {
      console.log(e)
      ctx.body = e.toString()
      ctx.status = 400
      return
    })
})

app.listen(3000)
