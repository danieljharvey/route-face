import * as R from './Router'
import * as HTTP from './domain/Methods'
import * as Res from './Result'
import * as t from 'io-ts'
import { errors, APIError } from './Errors'

const splitUrl = (whole: string): string[] =>
  whole.split('/').filter(a => a.length > 0)

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
): Promise<A | APIError> => {
  const method = R.validateMethod(
    endpoint.route.method,
    request.method
  )
  if (Res.isFailure(method)) {
    return Promise.reject(method.value)
  }
  const path = R.validatePath(
    endpoint.route.pieces,
    splitUrl(request.url)
  )
  if (Res.isFailure(path)) {
    return Promise.reject(path.value)
  }
  const headers = R.validateHeaders(
    endpoint.route.headers,
    request.headers
  )
  if (Res.isFailure(headers)) {
    return Promise.resolve(
      errors.headerMismatch(request.url, headers.value)
    )
  }
  return endpoint
    .handler({
      path: path.value,
      headers: headers.value,
      postData: method.value,
    })
    .catch(e => {
      return Promise.resolve(
        errors.handlerError(request.url, e)
      )
    })
}
