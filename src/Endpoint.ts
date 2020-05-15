import * as R from './router/Router'
import * as t from 'io-ts'
import * as J from './job/job'
import * as Res from './result/Result'

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
