import * as t from 'io-ts'
import * as E from 'fp-ts/lib/Either'
import * as Res from './Result'
import { NumberFromString } from 'io-ts-types/lib/NumberFromString'

import { Push, pushTuple } from './Tuple'

// a basic route
type Route<
  ValuesIn extends any[],
  ValuesOut extends any[]
> = (
  input: RouteDetails<ValuesIn>
) => Res.Result<string, RouteDetails<ValuesOut>>

// a route that does not add new types
type SameRoute<Values extends any[]> = Route<Values, Values>

// a route that adds to our known path
type AddToRoute<Values extends any[], S> = Route<
  Values,
  Push<S, Values>
>

// for testing only, this would usually be a Koa or express request
export const request = t.type({
  method: t.string,
  path: t.string,
})

export type Request = t.TypeOf<typeof request>

// how we capture what we want, and what we have found
export type RouteDetails<Values extends any[]> = {
  found: {
    values: Values
  }
  search: {
    path: string
    method: string
  }
}

export const getFoundPath = <Values extends any[]>(
  routeDetails: RouteDetails<Values>
): Values => routeDetails.found.values

const splitUrl = (whole: string): string[] =>
  whole.split('/').filter(a => a.length > 0)

export const detailsFromRequest = (
  request: Request
): RouteDetails<[]> => ({
  search: {
    path: request.path,
    method: request.method,
  },
  found: { values: [] },
})

export const emptyRouteDetails: RouteDetails<[]> = {
  found: { values: [] },
  search: { path: '', method: '' },
}

// end of Route newtype

const urlPart = (
  whole: string,
  index: number
): string | null => splitUrl(whole)[index] || null

export const fromValidator = <
  C extends t.Mixed,
  Values extends any[]
>(
  validator: C
): AddToRoute<Values, t.TypeOf<C>> => input => {
  const matchPath = urlPart(
    input.search.path,
    input.found.values.length
  )
  if (!matchPath) {
    return Res.failure('No path to match')
  }
  const result = validator.decode(matchPath)
  return E.isLeft(result)
    ? Res.failure(`Could not match ${matchPath}`)
    : Res.success({
        ...input,
        found: {
          ...input.found,
          values: pushTuple(
            result.right,
            ...input.found.values
          ),
        },
      })
}

type Method = string // todo, sum type

export const method = <Values extends any[]>(
  method: Method
): SameRoute<Values> => input =>
  input.search.method === method
    ? Res.success(input)
    : Res.failure(`Did not match ${method}`)

// path item from string literal, ie "posts"
export const pathLit = <
  S extends string,
  Values extends any[]
>(
  path: S
): AddToRoute<Values, S> => fromValidator(t.literal(path))

// path item that accepts any number
export const pathNumber = <
  Values extends any[]
>(): AddToRoute<Values, number> =>
  fromValidator(NumberFromString)

export const pathString = <
  Values extends any[]
>(): AddToRoute<Values, string> => fromValidator(t.string)

// now take a route, a function to get it's starting point from Ctx
// and the action cont, and make a working route
// then we just Alt together loads of these to get an API

//////// examples

/*
const referralsRoute = makeRoute(pathLit('referral'))
  .append(pathLit('stuff'))
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
