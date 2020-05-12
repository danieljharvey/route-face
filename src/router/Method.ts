import * as t from 'io-ts'
import * as Res from '../Result'
import * as E from 'fp-ts/lib/Either'
import { reporter } from 'io-ts-reporters'
import {
  Method,
  GetMethod,
  PostMethod,
  Piece,
  FromCodec,
  ValidationError,
} from './Types'
import * as HTTP from '../domain/Methods'

export const getMethod = (): GetMethod => ({
  method: 'get',
})

export const postMethod = <PostData extends Piece>(
  validator: PostData
): PostMethod<PostData> => ({ method: 'post', validator })

export const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<string, A> =>
  either._tag === 'Left'
    ? Res.failure(reporter(either).join('/n'))
    : Res.success(either.right)

export const validateMethod = <PostData extends Piece>(
  method: Method<PostData>,
  methodString: string
): Res.Result<ValidationError, true> => {
  if (method.method === 'get') {
    return Res.map(
      HTTP.methodGet.validate(methodString),
      _ => true
    )
  }
  return Res.map(
    HTTP.methodPost.validate(methodString),
    _ => true
  )
}
