import * as R from './router/Router'
import * as t from 'io-ts'
import * as J from './job/job'
import * as Res from './result/Result'
import { mostRelevantFromList } from './router/ClosestError'

///////////////////////////////////////////////////

export const fromRoute = <
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  E,
  A
>(
  route: R.Route<Pieces, Headers, PostData>,
  handler: (
    data: R.RouteOutput<Pieces, Headers, PostData>
  ) => J.Job<E, A>
) => (request: R.Request): J.Job<R.APIError<E>, A> =>
  J.fromResult<
    R.APIError<E>,
    R.RouteOutput<Pieces, Headers, PostData>
  >(R.validateRequestWithRoute(route, request)).bind(a =>
    handler(a).catch((e: E) =>
      Res.failure({
        type: 'HandlerError',
        value: e,
      })
    )
  )

export type Endpoint<
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  E,
  A
> = {
  type: 'Endpoint'
  route: R.Route<Pieces, Headers, PostData>
  handler: (
    data: R.RouteOutput<Pieces, Headers, PostData>
  ) => J.Job<E, A>
}

export type AnyEndpoint<E, A> = Endpoint<
  any,
  any,
  any,
  E,
  A
>

export const makeEndpoint = <
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  E,
  A
>(
  route: R.Route<Pieces, Headers, PostData>,
  handler: (
    data: R.RouteOutput<Pieces, Headers, PostData>
  ) => J.Job<E, A>
): Endpoint<Pieces, Headers, PostData, E, A> => ({
  type: 'Endpoint',
  route,
  handler,
})

// the whole API has one big E and one big A types
// presumably big unions of possible responses

export type API<E, A> = {
  type: 'API'
  endpoints: AnyEndpoint<E, A>[]
  errorToResponse: (e: R.APIError<E>) => R.Response
  successToResponse: (a: A) => R.Response
}

export const makeAPI = <E, A>(
  endpoints: AnyEndpoint<E, A>[],
  errorToResponse: (e: R.APIError<E>) => R.Response,
  successToResponse: (a: A) => R.Response
): API<E, A> => ({
  type: 'API',
  endpoints,
  errorToResponse,
  successToResponse,
})

// run api is:
// run all endpoints
// get all errors
// display the most relevant one
// bye
const getValidRoutes = <E, A>(
  api: API<E, A>,
  request: R.Request
): Res.Result<R.RouteErrors[], AnyEndpoint<E, A>[]> => {
  const [failures, successes] = Res.split(
    api.endpoints.map(endpoint =>
      Res.map(
        R.validateRequestWithRoute(endpoint.route, request),
        _ => endpoint
      )
    )
  )
  return successes.length > 0
    ? Res.success(successes)
    : Res.failure(failures)
}

export const runAPI = <E, A>(
  api: API<E, A>,
  request: R.Request
): J.Job<R.Response, R.Response> => {
  const validRoutes = getValidRoutes<E, A>(api, request)

  return Res.matchResult<
    R.RouteErrors[],
    AnyEndpoint<E, A>[],
    J.Job<R.Response, R.Response>
  >(
    routeErrors => {
      const [first, ...rest] = routeErrors
      const singleError = mostRelevantFromList(
        first,
        ...rest
      )
      return J.pureFail({ status: 400, body: singleError })
    },
    matches => {
      if (matches.length > 1) {
        return J.pureFail({
          status: 400,
          body: {
            error: 'Multiple routes match this request',
          },
        })
      }
      const endpoint = matches[0]
      return fromRoute(
        endpoint.route,
        endpoint.handler
      )(request).bimap(
        Res.matchResult(
          e => Res.failure(api.errorToResponse(e)),
          a => Res.success(api.successToResponse(a))
        )
      )
    }
  )(validRoutes)
}
