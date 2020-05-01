import * as CRE from './ContReaderEither'
import * as R from './Result'
import * as t from 'io-ts'
import { isRight } from 'fp-ts/lib/Either'
import { NumberFromString } from 'io-ts-types/lib/NumberFromString'

import {
  reverseTuple,
  consTuple,
  Reverse,
  Cons,
} from './Tuple'

import { Push } from './Tuple2'

export type Request = {
  method: string
  path: string
}

type RouteDetails<Values extends any[]> = {
  values: Values
  path: string
  remainder: string[]
}

export const detailsFromRequest = (
  request: Request
): RouteDetails<[]> => {
  const parts = request.path
    .split('/')
    .filter(a => a.length > 0)
  return {
    remainder: parts,
    path: request.path,
    values: [],
  }
}

export const emptyRouteDetails: RouteDetails<[]> = {
  values: [],
  path: '',
  remainder: [],
}

// Route newtype

export type RouteFn<
  Ctx,
  E,
  As extends any[],
  Bs extends any[]
> = (
  details: RouteDetails<As>
) => CRE.Cont<Ctx, E, RouteDetails<Bs>>

export type Route<
  Ctx,
  E,
  As extends any[],
  Bs extends any[]
> = {
  type: 'Route'
  body: RouteFn<Ctx, E, As, Bs>
}

export const route = <
  Ctx,
  E,
  As extends any[],
  Bs extends any[]
>(
  body: RouteFn<Ctx, E, As, Bs>
): Route<Ctx, E, As, Bs> => ({
  type: 'Route',
  body,
})

export const runRoute = <
  Ctx,
  E,
  As extends any[],
  Bs extends any[]
>(
  route: Route<Ctx, E, As, Bs>,
  details: RouteDetails<As>
): CRE.Cont<Ctx, E, RouteDetails<Bs>> => route.body(details)

export const appendRoute = <
  Ctx,
  E,
  As extends any[],
  Bs extends any[],
  Cs extends any[]
>(
  routeA: Route<Ctx, E, As, Bs>,
  routeB: Route<Ctx, E, Bs, Cs>
): Route<Ctx, E, As, Cs> =>
  route(details =>
    CRE.bind(runRoute(routeA, details), details2 =>
      runRoute(routeB, details2)
    )
  )

// end of Route newtype

export const fromValidator = <
  Ctx,
  C extends t.Mixed,
  Values extends any[]
>(
  validator: C
): Route<Ctx, string, Values, Cons<t.TypeOf<C>, Values>> =>
  route(details =>
    CRE.fromContext(() => {
      const [firstPath, ...restOfPath] = details.remainder
      if (!firstPath) {
        return R.failure('No path to match')
      }
      const result = validator.decode(firstPath)
      return isRight(result)
        ? R.success({
            ...details,
            remainder: restOfPath,
            values: consTuple(
              result.right,
              ...details.values
            ),
          })
        : R.failure(`Could not match ${firstPath}`)
    })
  )

type Method = string // todo, sum type

const method = <Values extends any[]>(
  method: Method
): Route<Request, string, Values, Values> =>
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
const pathLit = <
  Ctx,
  S extends string,
  Values extends any[]
>(
  path: S
): Route<Ctx, string, Values, Cons<S, Values>> =>
  fromValidator(t.literal(path))

// path item that accepts any number
const pathNumber = <Ctx, Values extends any[]>(): Route<
  Ctx,
  string,
  Values,
  Cons<number, Values>
> => fromValidator(NumberFromString)

const pathString = <Ctx, Values extends any[]>(): Route<
  Ctx,
  string,
  Values,
  Cons<string, Values>
> => fromValidator(t.string)

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
