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

import { Method } from './domain/Methods'

// convert validators into output values
type FromCodec<T> = T extends t.Mixed ? t.TypeOf<T> : never
type FromCodecTuple<T extends t.Mixed[]> = {
  [P in keyof T]: FromCodec<T[P]>
}
type FromCodecObject<
  T extends { [key: string]: t.Mixed }
> = {
  [P in keyof T]: FromCodec<T[P]>
}

// get path params from route
export type RouteTypes<
  T extends Route<AnyPieces, AnyHeaders>
> = FromCodecTuple<T['pieces']>

// get record of header types from route
export type HeaderTypes<
  T extends Route<AnyPieces, AnyHeaders>
> = FromCodecObject<T['headers']>

// generic pieces we extend from
type Piece = t.Mixed
type AnyPieces = Piece[]
type AnyHeaders = { [key: string]: Piece }

export type Route<
  Pieces extends AnyPieces,
  Headers extends AnyHeaders
> = {
  type: 'Route'
  pieces: Pieces
  headers: Headers
}

type AddHeader<
  Headers extends AnyHeaders,
  HeaderName extends string,
  Validator extends Piece
> = Headers & Record<HeaderName, Validator>

const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<string, A> =>
  either._tag === 'Left'
    ? Res.failure(reporter(either).join('/n'))
    : Res.success(either.right)

// do these url pieces satisfy the parts
export const validatePath = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders
>(
  route: Route<Pieces, Headers>,
  urlPieces: string[]
): Res.Result<string, RouteTypes<typeof route>> =>
  Res.all(
    route.pieces
      .map((piece, index) => piece.decode(urlPieces[index]))
      .map(eitherToResult)
  ) as Res.Result<string, RouteTypes<typeof route>>

// do these url pieces satisfy the parts
export const validateHeaders = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders
>(
  route: Route<Pieces, Headers>,
  headers: { [key: string]: string }
): Res.Result<string, HeaderTypes<typeof route>> =>
  Res.map(
    Res.all(
      Object.entries(route.headers).map(([key, piece]) => {
        const result = eitherToResult(
          piece.decode(headers[key])
        )
        return Res.map(result, a => [key, a])
      })
    ),
    as =>
      as.reduce<Headers>(
        (headers: Headers, [key, value]) => ({
          ...headers,
          [key]: value,
        }),
        {} as Headers
      )
  ) as Res.Result<string, HeaderTypes<typeof route>>

export const route = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders
>(
  pieces: Pieces,
  headers: Headers
): Route<Pieces, Headers> => ({
  type: 'Route',
  pieces,
  headers,
})

/////

export const empty = route([], {})

export const pure = <S extends Piece>(
  newPart: S
): Route<[S], {}> => route([newPart], {})

// add any io-ts validator
export const add = <
  Pieces extends AnyPieces,
  S extends Piece,
  Headers extends AnyHeaders
>(
  oldRoute: Route<Pieces, Headers>,
  newPart: S
): Route<Push<S, Pieces>, Headers> => ({
  ...oldRoute,
  pieces: pushTuple(newPart, ...oldRoute.pieces),
})

// path item from string literal, ie "posts"
export const path = <
  Pieces extends AnyPieces,
  Str extends string,
  Headers extends AnyHeaders
>(
  oldRoute: Route<Pieces, Headers>,
  path: Str
): Route<Push<t.LiteralC<Str>, Pieces>, Headers> =>
  add(oldRoute, t.literal(path))

// path item that accepts any number
export const number = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders
>(
  oldRoute: Route<Pieces, Headers>
): Route<Push<NumberFromStringC, Pieces>, Headers> =>
  add(oldRoute, NumberFromString)

export const string = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders
>(
  oldRoute: Route<Pieces, Headers>
): Route<Push<NonEmptyStringC, Pieces>, Headers> =>
  add(oldRoute, NonEmptyString)

////

export const addHeader = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  HeaderName extends string,
  P extends Piece
>(
  oldRoute: Route<Pieces, Headers>,
  headerName: HeaderName,
  validator: P
): Route<Pieces, AddHeader<Headers, HeaderName, P>> =>
  route(oldRoute.pieces, {
    ...oldRoute.headers,
    [headerName]: validator,
  })

export const stringHeader = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  HeaderName extends string
>(
  oldRoute: Route<Pieces, Headers>,
  headerName: HeaderName
): Route<
  Pieces,
  AddHeader<Headers, HeaderName, typeof t.string>
> => addHeader(oldRoute, headerName, t.string)

export const numberHeader = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  HeaderName extends string
>(
  oldRoute: Route<Pieces, Headers>,
  headerName: HeaderName
): Route<
  Pieces,
  AddHeader<Headers, HeaderName, typeof NumberFromString>
> => addHeader(oldRoute, headerName, NumberFromString)

///

export const extendRoute = <
  Start extends AnyPieces,
  Headers extends AnyHeaders
>(
  route: Route<Start, Headers>
) => ({
  custom: <S extends Piece>(next: S) =>
    extendRoute(add(route, next)),
  path: <Str extends string>(pathStr: Str) =>
    extendRoute(path(route, pathStr)),
  number: () => extendRoute(number(route)),
  string: () => extendRoute(string(route)),
  header: <HeaderName extends string, P extends Piece>(
    headerName: HeaderName,
    validator: P
  ) => extendRoute(addHeader(route, headerName, validator)),
  stringHeader: <HeaderName extends string>(
    headerName: HeaderName
  ) => extendRoute(stringHeader(route, headerName)),
  numberHeader: <HeaderName extends string>(
    headerName: HeaderName
  ) => extendRoute(numberHeader(route, headerName)),
  done: () => route,
})

export const makeRoute = extendRoute(empty)
