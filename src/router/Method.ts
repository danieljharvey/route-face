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

const validateGet = <PostData extends Piece>(
  methodString: string
): Res.Result<string, FromCodec<PostData>> =>
  Res.map(
    HTTP.methodGet.validate(methodString),
    _ => ({} as any)
  )

const validatePost = <PostData extends Piece>(
  method: PostMethod<PostData>,
  methodString: string,
  postData: object
): Res.Result<string, FromCodec<PostData>> =>
  Res.bind(HTTP.methodPost.validate(methodString), _ =>
    eitherToResult(method.validator.decode(postData))
  )

export const validateMethod = <PostData extends Piece>(
  method: Method<PostData>,
  methodString: string,
  postData: object
): Res.Result<string, FromCodec<PostData>> => {
  if (method.method === 'get') {
    return validateGet(methodString)
  }
  return validatePost(method, methodString, postData)
}
