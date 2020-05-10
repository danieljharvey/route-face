import * as t from 'io-ts'
import * as Res from './Result'
import * as E from 'fp-ts/lib/Either'
import { reporter } from 'io-ts-reporters'
import { NumberFromString } from 'io-ts-types/lib/NumberFromString'
import {
  Route,
  Method,
  Piece,
  AnyHeaders,
  AnyPieces,
} from './router/Types'
export {
  AnyPieces,
  AnyHeaders,
  RouteTypes,
  Route,
  FromCodecTuple,
  FromCodecObject,
} from './router/Types'
import { add, path, string, number } from './router/Path'
export { validatePath } from './router/Path'
import {
  addHeader,
  stringHeader,
  numberHeader,
} from './router/Headers'
export { validateHeaders } from './router/Headers'
import { getMethod, postMethod } from './router/Method'
export { validateMethod } from './router/Method'

export const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<string, A> =>
  either._tag === 'Left'
    ? Res.failure(reporter(either).join('/n'))
    : Res.success(either.right)

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

// map over headers
const modifyRouteHeaders = <
  Pieces extends AnyPieces,
  HeadersA extends AnyHeaders,
  PostData extends Piece,
  HeadersB extends AnyHeaders
>(
  route: Route<Pieces, HeadersA, PostData>,
  f: (a: HeadersA) => HeadersB
): Route<Pieces, HeadersB, PostData> => ({
  ...route,
  headers: f(route.headers),
})

// map over method
const modifyRouteMethod = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  PostDataA extends Piece,
  PostDataB extends Piece
>(
  route: Route<Pieces, Headers, PostDataA>,
  f: (a: Method<PostDataA>) => Method<PostDataB>
): Route<Pieces, Headers, PostDataB> => ({
  ...route,
  method: f(route.method),
})

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
  ) =>
    extendRoute(
      modifyRouteHeaders(
        route,
        addHeader(headerName, validator)
      )
    ),
  stringHeader: <HeaderName extends string>(
    headerName: HeaderName
  ) =>
    extendRoute(
      modifyRouteHeaders(route, stringHeader(headerName))
    ),
  numberHeader: <HeaderName extends string>(
    headerName: HeaderName
  ) =>
    extendRoute(
      modifyRouteHeaders(route, numberHeader(headerName))
    ),
  get: () =>
    extendRoute(modifyRouteMethod(route, _ => getMethod())),
  post: <PostDataB extends Piece>(validator: PostDataB) =>
    extendRoute(
      modifyRouteMethod(route, _ => postMethod(validator))
    ),

  done: () => route,
})

export const makeRoute = () => extendRoute(empty)
