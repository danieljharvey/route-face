import * as CRE from './ContReaderEither'
import * as R from './Result'
import * as t from 'io-ts'
import { isRight } from 'fp-ts/lib/Either'
import { NumberFromString } from 'io-ts-types/lib/NumberFromString'
import {
  reverseTuple,
  consTuple,
  Reverse,
  Tail,
  tailTuple,
  Cons,
} from './Tuple'

type Request = {
  method: string
  path: string
}

const httpMethod = t.union([
  t.literal('GET'),
  t.literal('HEAD'),
  t.literal('POST'),
  t.literal('PUT'),
  t.literal('DELETE'),
  t.literal('CONNECT'),
  t.literal('TRACE'),
])

type HttpMethod = t.TypeOf<typeof httpMethod>

type Route<Fragments extends t.Mixed[]> = {
  method: HttpMethod | null
  path: Fragments
}

const emptyRoute: Route<[]> = {
  method: null,
  path: [],
}

const pathFragment = <
  C extends t.Mixed,
  Fragments extends t.Mixed[]
>(
  route: Route<Fragments>,
  validator: C
): Route<Cons<C, Fragments>> => ({
  ...route,
  path: consTuple(validator, ...route.path),
})

const myPath = pathFragment(
  pathFragment(
    pathFragment(emptyRoute, t.literal('nice')),
    t.literal('api')
  ),
  t.literal('bozo')
)

// console.log(myPath)

/*
function matchPath<Fragments extends t.Mixed[]>(
  pathString: string[],
  route: Route<Fragments>
): R.Result<string, Route<Tail<Fragments>>>
function matchPath(
  pathString: string[],
  route: Route<[]>
): R.Result<string, Route<[]>> {
  const validator =
    route.path.length > 0 ? route.path[0] : null
  if (!validator) {
    return R.failure('oh no')
  }
  const [value] = pathString

  const result = validator.decode(value)
  return isRight(result)
    ? R.success({ ...route, path: tailTuple(route.path) })
    : R.failure('oh no')
}

const matched = matchPath(['bozo', 'api', 'nice'], myPath)

console.log(matched)
*/

const doRoute = <C extends t.Mixed, Values extends any[]>(
  validator: C
): RouteFunc<t.TypeOf<C>, Values> => (
  details: RouteDetails<Values>
) =>
  CRE.fromContext(() => {
    const [firstPath, ...restOfPath] = details.remainder
    const result = validator.decode(firstPath)
    return isRight(result)
      ? R.success({
          remainder: restOfPath,
          values: consTuple(
            result.right,
            ...details.values
          ),
        })
      : R.failure(
          failedMatchMessage(details.values, firstPath)
        )
  })

type RouteDetails<Values extends any[]> = {
  values: Values
  remainder: string[]
}

const emptyRouteDetails = (
  request: Request
): RouteDetails<[]> => {
  const parts = request.path
    .split('/')
    .filter((a) => a.length > 0)
  return {
    remainder: parts,
    values: [],
  }
}

const route = <C extends t.Mixed, Values extends any[]>(
  validator: C
): RouteFunc<t.TypeOf<C>, Values> => (
  details: RouteDetails<Values>
) =>
  CRE.fromContext(() => {
    const [firstPath, ...restOfPath] = details.remainder
    const result = validator.decode(firstPath)
    return isRight(result)
      ? R.success({
          remainder: restOfPath,
          values: consTuple(
            result.right,
            ...details.values
          ),
        })
      : R.failure(
          failedMatchMessage(details.values, firstPath)
        )
  })

const failedMatchMessage = (
  values: any[],
  currentItem: string
): string => {
  const matchStr =
    values.length > 0
      ? `. Matched /${values.reverse().join('/')}/`
      : ''
  return `Could not match ${currentItem}${matchStr}`
}

const method = (method: HttpMethod) => <
  Values extends any[]
>(
  details: RouteDetails<Values>
): CRE.Cont<Request, string, RouteDetails<Values>> =>
  CRE.fromContext((ctx) =>
    ctx.method.toUpperCase() === method
      ? R.success(details)
      : R.failure(`Did not match ${method}`)
  )

const router: CRE.Cont<
  Request,
  any,
  RouteDetails<[]>
> = CRE.fromContext((ctx) =>
  R.success(emptyRouteDetails(ctx))
)

const withRouter = CRE.withCont(router)
// a function that takes RouteDetails
// and if it's a success, returns RouteDetails with A
// plonked on the front
type RouteFunc<A, Values extends any[]> = (
  details: RouteDetails<Values>
) => CRE.Cont<
  Request,
  string,
  RouteDetails<Cons<A, Values>>
>

const pathLit = <S extends string, Values extends any[]>(
  path: S
): RouteFunc<S, Values> => route(t.literal(path))

const pathNumber = <Values extends any[]>(): RouteFunc<
  number,
  Values
> => route(NumberFromString)

const referralsRoute = withRouter
  .and(pathLit('referral'))
  .and(pathLit('stuff'))
  .done()

const referralsGood = CRE.withCont(referralsRoute)
  .and(pathLit('good'))
  .and(pathNumber())
  .and(method('GET'))
  .and((details) => {
    const [_ref, _stuff, _good, _num] = reverseTuple(
      ...details.values
    )
    return CRE.pure(
      `${_ref} - ${_stuff} - ${_good} - ${_num}`
    )
  })
  .done()

const referralsBad = CRE.withCont(referralsRoute)
  .and(pathLit('bad'))
  .and(pathNumber())
  .and(method('GET'))
  .and((details) => {
    const [_ref, _stuff, _bad, _num] = reverseTuple(
      ...details.values
    )
    return CRE.pure(
      `${_ref} - ${_stuff} - ${_bad} - ${_num}`
    )
  })
  .done()

const alt = <Ctx, E, A>(
  contA: CRE.Cont<Ctx, E, A>,
  contB: CRE.Cont<Ctx, E, A>
) => CRE.alt(contA, contB)

const altRoute = withRouter
  .and(pathLit('posts'))
  .and(pathLit('bad'))
  .and(pathNumber())
  .and((details) => {
    const [_posts, _bad, _num] = reverseTuple(
      ...details.values
    )
    return CRE.pure(
      `Looks like we've found ${_num} ${_bad} posts`
    )
  })
  .done()

export const testRouting = (req: Request) =>
  CRE.run<Request, string, string>(
    alt(referralsGood, alt(referralsBad, altRoute)),
    req,
    console.log
  )
