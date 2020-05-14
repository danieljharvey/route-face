import * as R from './router/Router'
import * as HTTP from './domain/Methods'
import * as Res from './result/Result'
import * as t from 'io-ts'

const splitUrl = (whole: string): string[] =>
  whole.split('/').filter((a) => a.length > 0)

///////////////////////////////////////////////////

type Handler<
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  A
> = (
  data: R.RouteOutput<Pieces, Headers, PostData>
) => Promise<A>

type Endpoint<
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  A
> = {
  route: R.Route<Pieces, Headers, PostData>
  handler: Handler<Pieces, Headers, PostData, A>
}

export const endpoint = <
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  A
>(
  route: R.Route<Pieces, Headers, PostData>,
  handler: Handler<Pieces, Headers, PostData, A>
): Endpoint<Pieces, Headers, PostData, A> => ({
  route,
  handler,
})

// excuse the inelegance, cba to make a nicer chaining thing right now
export const runEndpoint = <
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  A
>(
  endpoint: Endpoint<Pieces, Headers, PostData, A>,
  request: R.Request
): Promise<A> => {
  const stuff = R.validateRequestWithRoute(
    endpoint.route,
    request
  )

  if (Res.isSuccess(stuff)) {
    return endpoint.handler(stuff.value)
  }
  const errors = stuff.value
  return Promise.reject(errors)
}
