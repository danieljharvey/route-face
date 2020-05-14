import * as t from 'io-ts'
import { Push, pushTuple } from '../Tuple'
import * as Res from '../result/Result'
import * as E from 'fp-ts/lib/Either'
import { reporter } from 'io-ts-reporters'
import {
  NumberFromString,
  NumberFromStringC,
} from 'io-ts-types/lib/NumberFromString'
import {
  NonEmptyString,
  NonEmptyStringC,
} from 'io-ts-types/lib/NonEmptyString'
import {
  Route,
  AnyPieces,
  FromCodecTuple,
  Piece,
  PathError,
  ValidationError,
} from './Types'

export const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<ValidationError, A> =>
  E.fold<t.Errors, A, Res.Result<ValidationError, A>>(
    (left) =>
      Res.failure({
        value: left[0].value,
        expected: left[0].context[0].type.name,
      } as ValidationError),
    (right: A) => Res.success(right)
  )(either)

// do these url pieces satisfy the parts
export const validatePath = <Pieces extends AnyPieces>(
  path: Pieces,
  urlPieces: string[]
): Res.Result<PathError, FromCodecTuple<Pieces>> => {
  const results = path
    .map((piece, index) => piece.decode(urlPieces[index]))
    .map(eitherToResult)

  const all = Res.all(results)

  if (Res.isSuccess(all)) {
    return all as Res.Result<
      PathError,
      FromCodecTuple<Pieces>
    >
  }
  return Res.failure({
    type: 'PathError',
    matches: results.map((result) =>
      Res.map(result, (a) => String(a))
    ),
  })
}
// add any io-ts validator
export const add = <S extends Piece>(newPart: S) => <
  Pieces extends AnyPieces
>(
  pieces: Pieces
): Push<S, Pieces> => pushTuple(newPart, ...pieces)

// path item from string literal, ie "posts"
export const path = <
  Str extends string,
  Pieces extends AnyPieces
>(
  path: Str
): ((pieces: Pieces) => Push<t.LiteralC<Str>, Pieces>) =>
  add(t.literal(path))

// path item that accepts any number
export const number = <Pieces extends AnyPieces>(): ((
  pieces: Pieces
) => Push<NumberFromStringC, Pieces>) =>
  add(NumberFromString)

export const string = <Pieces extends AnyPieces>(): ((
  pieces: Pieces
) => Push<NonEmptyStringC, Pieces>) => add(NonEmptyString)
