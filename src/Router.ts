import * as CRE from './ContReaderEither'
import * as R from './Result'
import * as t from 'io-ts'
import { isRight } from 'fp-ts/lib/Either'
import { NumberFromString } from 'io-ts-types/lib/NumberFromString'
type Request = {
  method: string
  path: string
}

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
) => (details: RouteDetails<Values>) =>
  CRE.fromContext<
    Request,
    string,
    RouteDetails<Cons<t.TypeOf<C>, Values>>
  >(() => {
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
      : R.failure(`Could not match ${firstPath}`)
  })

const router: CRE.ContReaderEither<
  Request,
  any,
  RouteDetails<[]>
> = CRE.fromContext((ctx) =>
  R.success(emptyRouteDetails(ctx))
)

export type Prepend<Tuple extends any[], Addend> = ((
  _: Addend,
  ..._1: Tuple
) => any) extends (..._: infer Result) => any
  ? Result
  : never

export type Reverse<
  Tuple extends any[],
  Prefix extends any[] = []
> = {
  0: Prefix
  1: ((..._: Tuple) => any) extends (
    _: infer First,
    ..._1: infer Next
  ) => any
    ? Reverse<Next, Prepend<Prefix, First>>
    : never
}[Tuple extends [any, ...any[]] ? 1 : 0]

const reverseTuple = <A, As extends any[]>(
  a: A,
  ...as: As
) => [a, ...as].reverse() as Reverse<Cons<A, As>>

const nice = reverseTuple(1, 2, 'poo')

type Cons<H, T extends any[]> = ((
  h: H,
  ...t: T
) => void) extends (...u: infer U) => void
  ? U
  : never

const consTuple = <A, As extends any[]>(a: A, ...as: As) =>
  [a, ...as] as Cons<A, As>

const done = consTuple(100, 'loves', 'dogs')

const more = consTuple(200, ...done)

const testRoute = CRE.chain(router)
  .bind(route(t.literal('referral')))
  .bind(route(t.literal('stuff')))
  .bind(route(t.literal('good')))
  .bind(route(NumberFromString))
  .bind((details) => {
    const [_ref, _stuff, _good, _num] = reverseTuple(
      ...details.values
    )
    return CRE.pure(
      `${_ref} - ${_stuff} - ${_good} - ${_num}`
    )
  })
  .done()

export const testRouting = (req: Request) =>
  CRE.runContReaderEither(testRoute, req, console.log)
