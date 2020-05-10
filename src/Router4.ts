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
import * as HTTP from './domain/Methods'

// convert validators into output values
type FromCodec<T> = T extends t.Mixed ? t.TypeOf<T> : never
export type FromCodecTuple<T extends t.Mixed[]> = {
  [P in keyof T]: FromCodec<T[P]>
}
export type FromCodecObject<
  T extends { [key: string]: t.Mixed }
> = {
  [P in keyof T]: FromCodec<T[P]>
}

// get path params from route
export type RouteTypes<
  T extends Route<AnyPieces, AnyHeaders, AnyPostData>
> = FromCodecTuple<T['pieces']>

// get record of header types from route
export type HeaderTypes<
  T extends Route<AnyPieces, AnyHeaders, AnyPostData>
> = FromCodecObject<T['headers']>

// generic pieces we extend from
type Piece = t.Mixed
export type AnyPieces = Piece[]
export type AnyHeaders = { [key: string]: Piece }
export type AnyPostData = Piece

export type Route<
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  PostData extends Piece
> = {
  type: 'Route'
  pieces: Pieces
  headers: Headers
  method: Method<PostData>
}

//

type Method<PostData extends Piece> =
  | {
      method: 'get'
    }
  | { method: 'post'; validator: PostData }

const getMethod = (): Method<never> => ({ method: 'get' })

const postMethod = <PostData extends Piece>(
  validator: PostData
): Method<PostData> => ({ method: 'post', validator })

//

type AddHeader<
  Headers extends AnyHeaders,
  HeaderName extends string,
  Validator extends Piece
> = Headers & Record<HeaderName, Validator>

export const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<string, A> =>
  either._tag === 'Left'
    ? Res.failure(reporter(either).join('/n'))
    : Res.success(either.right)

export const validateMethod = <PostData extends Piece>(
  method: Method<PostData>,
  methodString: string,
  postData: object
): Res.Result<string, FromCodec<PostData>> => {
  return Res.failure(
    "Couldn't be arsed to write the function yet"
  )
}

// do these url pieces satisfy the parts
export const validatePath = <Pieces extends AnyPieces>(
  path: Pieces,
  urlPieces: string[]
): Res.Result<string, FromCodecTuple<Pieces>> =>
  Res.all(
    path
      .map((piece, index) => piece.decode(urlPieces[index]))
      .map(eitherToResult)
  ) as Res.Result<string, FromCodecTuple<Pieces>>

// do these url pieces satisfy the parts
export const validateHeaders = <Headers extends AnyHeaders>(
  headers: Headers,
  requestHeaders: { [key: string]: string }
): Res.Result<string, FromCodecObject<Headers>> =>
  Res.map(
    Res.all(
      Object.entries(headers).map(([key, piece]) => {
        // TODO - map failure to a more helpful error message
        const result = eitherToResult(
          piece.decode(requestHeaders[key])
        )
        return Res.map(result, a => [key, a])
      })
    ),
    as =>
      as.reduce<Headers>(
        (theseHeaders: Headers, [key, value]) => ({
          ...theseHeaders,
          [key]: value,
        }),
        {} as Headers
      )
  ) as Res.Result<string, FromCodecObject<Headers>>

export const route = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  PostData extends Piece
>(
  pieces: Pieces,
  headers: Headers,
  method: Method<PostData>
): Route<Pieces, Headers, PostData> => ({
  type: 'Route',
  pieces,
  headers,
  method,
})

/////

export const empty = route([], {}, getMethod())

export const pure = <S extends Piece>(
  newPart: S
): Route<[S], {}, never> =>
  route([newPart], {}, getMethod())

// map over route
const modifyRoutePath = <
  PiecesA extends AnyPieces,
  Headers extends AnyHeaders,
  PostData extends Piece,
  PiecesB extends AnyPieces
>(
  route: Route<PiecesA, Headers, PostData>,
  f: (a: PiecesA) => PiecesB
): Route<PiecesB, Headers, PostData> => ({
  ...route,
  pieces: f(route.pieces),
})

// add any io-ts validator
export const add = <S extends Piece>(newPart: S) => <
  Pieces extends AnyPieces
>(
  pieces: Pieces
): Push<S, Pieces> => pushTuple(newPart, ...pieces)

// path item from string literal, ie "posts"
export const path = <
  Str extends string,
  Pieces extends AnyPieces
>(
  path: Str
): ((pieces: Pieces) => Push<t.LiteralC<Str>, Pieces>) =>
  add(t.literal(path))

// path item that accepts any number
export const number = <Pieces extends AnyPieces>(): ((
  pieces: Pieces
) => Push<NumberFromStringC, Pieces>) =>
  add(NumberFromString)

export const string = <Pieces extends AnyPieces>(): ((
  pieces: Pieces
) => Push<NonEmptyStringC, Pieces>) => add(NonEmptyString)

////

export const addHeader = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  PostData extends Piece,
  HeaderName extends string,
  P extends Piece
>(
  oldRoute: Route<Pieces, Headers, PostData>,
  headerName: HeaderName,
  validator: P
): Route<
  Pieces,
  AddHeader<Headers, HeaderName, P>,
  PostData
> =>
  route(
    oldRoute.pieces,
    {
      ...oldRoute.headers,
      [headerName]: validator,
    },
    oldRoute.method
  )

export const stringHeader = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  PostData extends Piece,
  HeaderName extends string
>(
  oldRoute: Route<Pieces, Headers, PostData>,
  headerName: HeaderName
): Route<
  Pieces,
  AddHeader<Headers, HeaderName, typeof t.string>,
  PostData
> => addHeader(oldRoute, headerName, t.string)

export const numberHeader = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  PostData extends Piece,
  HeaderName extends string
>(
  oldRoute: Route<Pieces, Headers, PostData>,
  headerName: HeaderName
): Route<
  Pieces,
  AddHeader<Headers, HeaderName, typeof NumberFromString>,
  PostData
> => addHeader(oldRoute, headerName, NumberFromString)

///

export const extendRoute = <
  Start extends AnyPieces,
  Headers extends AnyHeaders,
  PostData extends Piece
>(
  route: Route<Start, Headers, PostData>
) => ({
  custom: <S extends Piece>(next: S) =>
    extendRoute(modifyRoutePath(route, add(next))),
  path: <Str extends string>(pathStr: Str) =>
    extendRoute(modifyRoutePath(route, path(pathStr))),
  number: () =>
    extendRoute(modifyRoutePath(route, number())),
  string: () =>
    extendRoute(modifyRoutePath(route, string())),
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
