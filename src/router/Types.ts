import * as t from 'io-ts'

// convert validators into output values
export type FromCodec<T> = T extends t.Mixed
  ? t.TypeOf<T>
  : never
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
export type Piece = t.Mixed
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

export type GetMethod = {
  method: 'get'
}

export type PostMethod<PostData extends Piece> = {
  method: 'post'
  validator: PostData
}

export type Method<PostData extends Piece> =
  | GetMethod
  | PostMethod<PostData>

export type AddHeader<
  Headers extends AnyHeaders,
  HeaderName extends string,
  Validator extends Piece
> = Headers & Record<HeaderName, Validator>
