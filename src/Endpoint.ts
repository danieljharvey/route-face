import * as R from './Router4'
import * as HTTP from './domain/Methods'
import * as Res from './Result'
import * as t from 'io-ts'
import { errors, APIError } from './Errors'

const splitUrl = (whole: string): string[] =>
  whole.split('/').filter(a => a.length > 0)

///////////////////////////////////////////////////

export type GetRequest = {
  url: string
  headers: { [key: string]: string }
  method: string
}

type GetHandler<
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  A
> = (data: {
  path: R.FromCodecTuple<Pieces>
  headers: R.FromCodecObject<Headers>
}) => Promise<A>

type GetEndpoint<
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  A
> = {
  method: HTTP.MethodGet
  route: R.Route<Pieces, Headers>
  handler: GetHandler<Pieces, Headers, A>
}

export const getEndpoint = <
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  A
>(
  route: R.Route<Pieces, Headers>,
  handler: GetHandler<Pieces, Headers, A>
): GetEndpoint<Pieces, Headers, A> => ({
  method: 'get',
  route,
  handler,
})

// excuse the inelegance, cba to make a nicer chaining thing right now
export const runGetEndpoint = <
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  A
>(
  endpoint: GetEndpoint<Pieces, Headers, A>,
  request: GetRequest
): Promise<A | APIError> => {
  const method = HTTP.methodGet.validate(request.method)
  if (Res.isFailure(method)) {
    return Promise.reject(method.value)
  }
  const path = R.validatePath(
    endpoint.route,
    splitUrl(request.url)
  )
  if (Res.isFailure(path)) {
    return Promise.reject(path.value)
  }
  const headers = R.validateHeaders(
    endpoint.route,
    request.headers
  )
  if (Res.isFailure(headers)) {
    return Promise.resolve(
      errors.headerMismatch(request.url, headers.value)
    )
  }
  return endpoint.handler({
    path: path.value,
    headers: headers.value,
  })
}

///////////////////////////////////////////////////////

export type PostRequest = {
  url: string
  headers: { [key: string]: string }
  method: string
  postData: object
}

type PostHandler<
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  A
> = (data: {
  path: R.FromCodecTuple<Pieces>
  headers: R.FromCodecObject<Headers>
  postData: t.TypeOf<PostData>
}) => Promise<A>

type PostEndpoint<
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  A
> = {
  method: HTTP.MethodPost
  route: R.Route<Pieces, Headers>
  validator: PostData
  handler: PostHandler<Pieces, Headers, PostData, A>
}

export const postEndpoint = <
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  A
>(
  route: R.Route<Pieces, Headers>,
  validator: PostData,
  handler: PostHandler<Pieces, Headers, PostData, A>
): PostEndpoint<Pieces, Headers, PostData, A> => ({
  method: 'post',
  route,
  validator,
  handler,
})

// excuse the inelegance, cba to make a nicer chaining thing right now
export const runPostEndpoint = <
  Pieces extends R.AnyPieces,
  Headers extends R.AnyHeaders,
  PostData extends t.Mixed,
  A
>(
  endpoint: PostEndpoint<Pieces, Headers, PostData, A>,
  request: PostRequest
): Promise<A | APIError> => {
  const method = HTTP.methodPost.validate(request.method)
  if (Res.isFailure(method)) {
    return Promise.reject(method.value)
  }
  const path = R.validatePath(
    endpoint.route,
    splitUrl(request.url)
  )
  if (Res.isFailure(path)) {
    return Promise.reject(path.value)
  }
  const headers = R.validateHeaders(
    endpoint.route,
    request.headers
  )
  if (Res.isFailure(headers)) {
    return Promise.resolve(
      errors.headerMismatch(request.url, headers.value)
    )
  }
  const postData = R.eitherToResult(
    endpoint.validator.decode(request.postData)
  )
  if (Res.isFailure(postData)) {
    return Promise.resolve(
      errors.bodyMismatch(request.url, postData.value)
    )
  }
  return endpoint
    .handler({
      path: path.value,
      headers: headers.value,
      postData: postData.value,
    })
    .catch(e => {
      return Promise.resolve(
        errors.handlerError(request.url, e)
      )
    })
}
