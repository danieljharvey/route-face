import * as t from 'io-ts'
import * as Res from '../result/Result'
import * as E from 'fp-ts/lib/Either'
import { reporter } from 'io-ts-reporters'
import {
  Method,
  Piece,
  FromCodec,
  PostDataError,
} from './Types'

export const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<string[], A> =>
  either._tag === 'Left'
    ? Res.failure(reporter(either))
    : Res.success(either.right)

export const validatePostData = <PostData extends Piece>(
  method: Method<PostData>,
  postData: object
): Res.Result<PostDataError, FromCodec<PostData>> => {
  if (method.method === 'get') {
    return Res.success({} as FromCodec<PostData>)
  }
  return Res.mapError(
    eitherToResult(method.validator.decode(postData)),
    (errors) => ({ type: 'PostDataError', errors })
  )
}
