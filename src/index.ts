import * as Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'

import * as EP from './Endpoint'
import * as R from './router/Router'
import * as t from 'io-ts'
import * as Res from './result/Result'

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

type APIReturn = User | string

// get user from store if available
const getUser = E.makeEndpoint(
  R.makeRoute()
    .path('users')
    .number()
    .path('details')
    .get()
    .stringHeader('authtoken')
    .done(),

  ({ path: [_, userId], headers: { authtoken } }) => {
    if (authtoken !== 'secretpassword') {
      return TE.left('auth failure')
    }
    const user = userStore[userId]
    user
      ? TE.right(user)
      : TE.left(`User ${userId} not found!`)
  }
)

// save a user in the store
const postUser = E.makeEndpoint(
  R.makeRoute()
    .path('users')
    .stringHeader('authtoken')
    .post(userValidator)
    .done(),
  ({ headers: { authtoken }, postData: user }) => {
    if (authtoken !== 'secretpassword') {
      return TE.left('auth failure')
    }
    userStore[user.id] = user
    return TE.right('ok!')
  }
)

// grab the stuff from the Koa context that we need
const koaContextToRequest = (
  ctx: Koa.Context
): R.Request => ({
  url: ctx.request.url,
  headers: ctx.request.headers,
  method: ctx.request.method,
  postData: ctx.request.body,
})

const api = E.makeAPI<string, APIReturn>(
  [getUser, postUser],
  e => ({
    status: 400,
    body: e as object,
  }),
  a => ({
    status: 200,
    body: a as object,
  })
)

const app = new Koa.default()
app.use(bodyParser())

app.use(async (ctx: Koa.Context) => {
  const req = koaContextToRequest(ctx)

  const result = Res.flatten(await E.runAPI(api, req)())

  ctx.body = result.body
  ctx.status = result.status
})

app.listen(3000)
