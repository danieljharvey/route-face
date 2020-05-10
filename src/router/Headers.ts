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
} from './Types'

export const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<string, A> =>
  either._tag === 'Left'
    ? Res.failure(reporter(either).join('/n'))
    : Res.success(either.right)

// do these url pieces satisfy the parts
export const validateHeaders = <Headers extends AnyHeaders>(
  headers: Headers,
  requestHeaders: { [key: string]: string }
): Res.Result<string, FromCodecObject<Headers>> =>
  Res.map(
    Res.all(
      Object.entries(headers).map(([key, piece]) => {
        // TODO - map failure to a more helpful error message
        const result = eitherToResult(
          piece.decode(requestHeaders[key])
        )
        return Res.map(result, a => [key, a])
      })
    ),
    as =>
      as.reduce<Headers>(
        (theseHeaders: Headers, [key, value]) => ({
          ...theseHeaders,
          [key]: value,
        }),
        {} as Headers
      )
  ) as Res.Result<string, FromCodecObject<Headers>>

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
