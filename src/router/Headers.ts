import * as t from 'io-ts'
import * as Res from '../Result'
import * as E from 'fp-ts/lib/Either'
import { reporter } from 'io-ts-reporters'
import { NumberFromString } from 'io-ts-types/lib/NumberFromString'
import {
  Piece,
  AddHeader,
  AnyHeaders,
  FromCodecObject,
  HeaderError,
  HeaderMiss,
  ValidationError,
} from './Types'

export const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<ValidationError, A> =>
  E.fold<t.Errors, A, Res.Result<ValidationError, A>>(
    left =>
      Res.failure({
        value: left[0].value,
        expected: left[0].context[0].type.name,
      } as ValidationError),
    (right: A) => Res.success(right)
  )(either)

// do these url pieces satisfy the parts
export const validateHeaders = <Headers extends AnyHeaders>(
  headers: Headers,
  requestHeaders: { [key: string]: string }
): Res.Result<HeaderError, FromCodecObject<Headers>> => {
  // turn into list of matches/fails
  const results = Object.entries(headers).map(
    ([key, piece]) => {
      const result = Res.mapError(
        eitherToResult(piece.decode(requestHeaders[key])),
        e => ({ name: key, value: e })
      )
      return Res.map(result, a => [key, a] as const)
    }
  )

  const allSucceeds = Res.all(results)
  if (Res.isSuccess(allSucceeds)) {
    return Res.map(allSucceeds, as =>
      as.reduce<Headers>(
        (theseHeaders: Headers, [key, value]) => ({
          ...theseHeaders,
          [key]: value,
        }),
        {} as Headers
      )
    ) as Res.Result<HeaderError, FromCodecObject<Headers>>
  }
  const tidiedErrors = results.map(res =>
    Res.map(res, ([name, value]) => ({ name, value }))
  )
  return Res.failure({
    type: 'HeaderError',
    matches: tidiedErrors,
  })
}

export const addHeader = <
  HeaderName extends string,
  P extends Piece
>(
  headerName: HeaderName,
  validator: P
) => <Headers extends AnyHeaders>(
  headers: Headers
): AddHeader<Headers, HeaderName, P> => ({
  ...headers,
  [headerName]: validator,
})

export const stringHeader = <
  Headers extends AnyHeaders,
  HeaderName extends string
>(
  headerName: HeaderName
): ((
  headers: Headers
) => AddHeader<Headers, HeaderName, typeof t.string>) =>
  addHeader(headerName, t.string)

export const numberHeader = <
  Headers extends AnyHeaders,
  HeaderName extends string
>(
  headerName: HeaderName
): ((
  headers: Headers
) => AddHeader<
  Headers,
  HeaderName,
  typeof NumberFromString
>) => addHeader(headerName, NumberFromString)
