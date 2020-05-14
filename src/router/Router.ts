import * as t from 'io-ts'
import * as Res from '../result/Result'
import * as E from 'fp-ts/lib/Either'
import { reporter } from 'io-ts-reporters'
import {
  Route,
  Method,
  Piece,
  AnyHeaders,
  AnyPieces,
  RouteOutput,
  Request,
  RouteErrors,
} from './Types'
export {
  AnyPieces,
  AnyHeaders,
  RouteTypes,
  Route,
  Request,
  FromCodecTuple,
  FromCodecObject,
  RouteOutput,
  ValidationError,
} from './Types'
import {
  add,
  path,
  string,
  number,
  validatePath,
} from './Path'
export { validatePath } from './Path'
import {
  addHeader,
  stringHeader,
  numberHeader,
  validateHeaders,
} from './Headers'
export { validateHeaders } from './Headers'
import {
  getMethod,
  postMethod,
  validateMethod,
} from './Method'
import { validatePostData } from './PostData'
export { validateMethod } from './Method'

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

const splitUrl = (whole: string): string[] =>
  whole.split('/').filter((a) => a.length > 0)

// excuse the inelegance, cba to make a nicer chaining thing right now
export const validateRequestWithRoute = <
  Pieces extends AnyPieces,
  Headers extends AnyHeaders,
  PostData extends t.Mixed,
  A
>(
  route: Route<Pieces, Headers, PostData>,
  request: Request
): Res.Result<
  RouteErrors,
  RouteOutput<Pieces, Headers, PostData>
> => {
  const method = validateMethod(
    route.method,
    request.method
  )
  const postData = validatePostData(
    route.method,
    request.postData
  )

  const path = validatePath(
    route.pieces,
    splitUrl(request.url)
  )
  const headers = validateHeaders(
    route.headers,
    request.headers
  )
  if (
    Res.isSuccess(method) &&
    Res.isSuccess(path) &&
    Res.isSuccess(postData) &&
    Res.isSuccess(headers)
  ) {
    return Res.success({
      path: path.value,
      headers: headers.value,
      postData: method.value,
    })
  }
  return Res.failure({
    method: failureOrNull(method),
    path: failureOrNull(path),
    headers: failureOrNull(headers),
    postData: failureOrNull(postData),
  })
}

const failureOrNull: <E, A>(
  result: Res.Result<E, A>
) => E | null = Res.matchResult(
  (e) => e,
  (_) => null
)

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
    extendRoute(
      modifyRouteMethod(route, (_) => getMethod())
    ),
  post: <PostDataB extends Piece>(validator: PostDataB) =>
    extendRoute(
      modifyRouteMethod(route, (_) => postMethod(validator))
    ),

  done: () => route,
})

export const makeRoute = () => extendRoute(empty)
