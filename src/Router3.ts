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
  remainder: string[]
}

export const detailsFromRequest = (
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

export const emptyRouteDetails: RouteDetails<[]> = {
  values: [],
  remainder: [],
}

export const route = <
  Ctx,
  C extends t.Mixed,
  Values extends any[]
>(
  validator: C
): RouteFunc<Ctx, t.TypeOf<C>, Values> => (
  details: RouteDetails<Values>
) =>
  CRE.fromContext(() => {
    const [firstPath, ...restOfPath] = details.remainder
    if (!firstPath) {
      return R.failure('No path to match')
    }
    const result = validator.decode(firstPath)
    return isRight(result)
      ? R.success({
          remainder: restOfPath,
          values: consTuple(
            result.right,
            ...details.values
          ),
        })
      : R.failure(`Could not match ${firstPath}`)
  })

type Method = string // todo, sum type

const method = (method: Method) => <Values extends any[]>(
  details: RouteDetails<Values>
): CRE.Cont<Request, string, RouteDetails<Values>> =>
  CRE.fromContext((ctx) =>
    ctx.method === method
      ? R.success(details)
      : R.failure(`Did not match ${method}`)
  )

const router: CRE.Cont<
  Request,
  any,
  RouteDetails<[]>
> = CRE.fromContext((ctx) =>
  R.success(detailsFromRequest(ctx))
)

const withRouter = CRE.withCont(router)

// a function that takes RouteDetails
// and if it's a success, returns RouteDetails with A
// plonked on the front
type RouteFunc<Ctx, A, Values extends any[]> = (
  details: RouteDetails<Values>
) => CRE.Cont<Ctx, string, RouteDetails<Cons<A, Values>>>

const pathLit = <
  Ctx,
  S extends string,
  Values extends any[]
>(
  path: S
): RouteFunc<Ctx, S, Values> => route(t.literal(path))

const pathNumber = <Ctx, Values extends any[]>(): RouteFunc<
  Ctx,
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
  .and(method('get'))
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
  .and(method('get'))
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
