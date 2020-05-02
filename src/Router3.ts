import * as CRE from './ContReaderEither'
import * as R from './Result'
import * as t from 'io-ts'
import { isRight } from 'fp-ts/lib/Either'
import { NumberFromString } from 'io-ts-types/lib/NumberFromString'

import { Push, pushTuple } from './Tuple2'

export const request = t.type({
  method: t.string,
  path: t.string,
})

export type Request = t.TypeOf<typeof request>

export type RouteDetails<Values extends any[]> = {
  values: Values
  path: string
}

const splitUrl = (whole: string): string[] =>
  whole.split('/').filter(a => a.length > 0)

export const detailsFromRequest = (
  request: Request
): RouteDetails<[]> => ({
  path: request.path,
  values: [],
})

export const emptyRouteDetails: RouteDetails<[]> = {
  values: [],
  path: '',
}

// Route newtype

export type RouteFn<
  Ctx,
  As extends any[],
  Bs extends any[]
> = (
  details: RouteDetails<As>
) => CRE.Cont<Ctx, string, RouteDetails<Bs>>

export type Route<
  Ctx,
  As extends any[],
  Bs extends any[]
> = {
  type: 'Route'
  body: RouteFn<Ctx, As, Bs>
}

export const route = <
  Ctx,
  As extends any[],
  Bs extends any[]
>(
  body: RouteFn<Ctx, As, Bs>
): Route<Ctx, As, Bs> => ({
  type: 'Route',
  body,
})

export const runRoute = <
  Ctx,
  E,
  As extends any[],
  Bs extends any[]
>(
  route: Route<Ctx, As, Bs>,
  details: RouteDetails<As>
): CRE.Cont<Ctx, string, RouteDetails<Bs>> =>
  route.body(details)

export const appendRoute = <
  Ctx,
  As extends any[],
  Bs extends any[],
  Cs extends any[]
>(
  routeA: Route<Ctx, As, Bs>,
  routeB: Route<Ctx, Bs, Cs>
): Route<Ctx, As, Cs> =>
  route(details =>
    CRE.bind(runRoute(routeA, details), details2 =>
      runRoute(routeB, details2)
    )
  )

// end of Route newtype

const urlPart = (
  whole: string,
  index: number
): string | null => splitUrl(whole)[index] || null

export const fromValidator = <
  Ctx,
  C extends t.Mixed,
  Values extends any[]
>(
  validator: C
): Route<Ctx, Values, Push<t.TypeOf<C>, Values>> =>
  route(details =>
    CRE.fromContext(() => {
      const matchPath = urlPart(
        details.path,
        details.values.length
      )
      if (!matchPath) {
        return R.failure('No path to match')
      }
      const result = validator.decode(matchPath)
      return isRight(result)
        ? R.success({
            ...details,
            remainder: [],
            values: pushTuple(
              result.right,
              ...details.values
            ),
          })
        : R.failure(`Could not match ${matchPath}`)
    })
  )

type Method = string // todo, sum type

export const method = <Values extends any[]>(
  method: Method
): Route<Request, Values, Values> =>
  route(details =>
    CRE.fromContext(ctx =>
      ctx.method === method
        ? R.success(details)
        : R.failure(`Did not match ${method}`)
    )
  )

const router: CRE.Cont<
  Request,
  any,
  RouteDetails<[]>
> = CRE.fromContext(ctx =>
  R.success(detailsFromRequest(ctx))
)

const withRouter = CRE.withCont(router)

// path item from string literal, ie "posts"
export const pathLit = <
  Ctx,
  S extends string,
  Values extends any[]
>(
  path: S
): Route<Ctx, Values, Push<S, Values>> =>
  fromValidator(t.literal(path))

// path item that accepts any number
export const pathNumber = <
  Ctx,
  Values extends any[]
>(): Route<Ctx, Values, Push<number, Values>> =>
  fromValidator(NumberFromString)

export const pathString = <
  Ctx,
  Values extends any[]
>(): Route<Ctx, Values, Push<string, Values>> =>
  fromValidator(t.string)

export const makeRoute = <
  Ctx,
  As extends any[],
  Bs extends any[]
>(
  routeAB: Route<Ctx, As, Bs>
) => ({
  append: <Cs extends any[]>(routeBC: Route<Ctx, Bs, Cs>) =>
    makeRoute(
      appendRoute<Ctx, As, Bs, Cs>(routeAB, routeBC)
    ),
  done: () => routeAB,
})

// now take a route, a function to get it's starting point from Ctx
// and the action cont, and make a working route
// then we just Alt together loads of these to get an API

//////// examples

/*
const referralsRoute = withRouter
  .and(pathLit('referral'))
  .and(pathLit('stuff'))
  .done()

const referralsGood = CRE.withCont(referralsRoute)
  .and(pathLit('good'))
  .and(pathNumber())
  .and(method('get'))
  .and(details => {
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
  .and(method('get'))
  .and(details => {
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
  .and(details => {
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
  */
