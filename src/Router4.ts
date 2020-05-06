import * as t from 'io-ts'
import { Push, pushTuple } from './Tuple'
import * as Res from './Result'
import * as E from 'fp-ts/lib/Either'
import { reporter } from 'io-ts-reporters'
import {
  NumberFromString,
  NumberFromStringC,
} from 'io-ts-types/lib/NumberFromString'
import {
  NonEmptyString,
  NonEmptyStringC,
} from 'io-ts-types/lib/NonEmptyString'

type FromCodec<T> = T extends t.Mixed ? T : never

type FromCodecToTypes<T extends t.Mixed[]> = {
  [P in keyof T]: FromCodec<T[P]>
}

export type RouteTypes<
  T extends Route<t.Mixed[]>
> = FromCodecToTypes<T['pieces']>

export type Route<Pieces extends t.Mixed[]> = {
  type: 'Route'
  pieces: Pieces
}

const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<string, A> =>
  either._tag === 'Left'
    ? Res.failure(reporter(either).join('/n'))
    : Res.success(either.right)

// do these url pieces satisfy the parts
export const validate = <Pieces extends t.Mixed[]>(
  route: Route<Pieces>,
  urlPieces: string[]
): Res.Result<string, RouteTypes<typeof route>> =>
  Res.all(
    route.pieces
      .map((piece, index) => piece.decode(urlPieces[index]))
      .map(eitherToResult)
  ) as Res.Result<string, RouteTypes<typeof route>>

export const route = <Pieces extends t.Mixed[]>(
  pieces: Pieces
): Route<Pieces> => ({
  type: 'Route',
  pieces,
})

/////

export const empty = route([])

export const pure = <S extends t.Mixed>(
  newPart: S
): Route<[S]> => route([newPart])

// add any io-ts validator
export const add = <
  Pieces extends t.Mixed[],
  S extends t.Mixed
>(
  oldRoute: Route<Pieces>,
  newPart: S
): Route<Push<S, Pieces>> => ({
  ...oldRoute,
  pieces: pushTuple(newPart, ...oldRoute.pieces),
})

// path item from string literal, ie "posts"
export const path = <
  Pieces extends t.Mixed[],
  Str extends string
>(
  oldRoute: Route<Pieces>,
  path: Str
): Route<Push<t.LiteralC<Str>, Pieces>> =>
  add(oldRoute, t.literal(path))

// path item that accepts any number
export const number = <Pieces extends t.Mixed[]>(
  oldRoute: Route<Pieces>
): Route<Push<NumberFromStringC, Pieces>> =>
  add(oldRoute, NumberFromString)

export const string = <Pieces extends t.Mixed[]>(
  oldRoute: Route<Pieces>
): Route<Push<NonEmptyStringC, Pieces>> =>
  add(oldRoute, NonEmptyString)

///

export const extendRoute = <Start extends t.Mixed[]>(
  route: Route<Start>
) => ({
  custom: <S extends t.Mixed>(next: S) =>
    extendRoute(add(route, next)),
  path: <Str extends string>(pathStr: Str) =>
    extendRoute(path(route, pathStr)),
  number: () => extendRoute(number(route)),
  string: () => extendRoute(string(route)),
  done: () => route,
})

export const makeRoute = extendRoute(empty)
