import * as t from 'io-ts'
import { Push, pushTuple } from '../Tuple'
import * as Res from '../Result'
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
} from './Types'

export const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<string, A> =>
  either._tag === 'Left'
    ? Res.failure(reporter(either).join('/n'))
    : Res.success(either.right)

// do these url pieces satisfy the parts
export const validatePath = <Pieces extends AnyPieces>(
  path: Pieces,
  urlPieces: string[]
): Res.Result<string, FromCodecTuple<Pieces>> =>
  Res.all(
    path
      .map((piece, index) => piece.decode(urlPieces[index]))
      .map(eitherToResult)
  ) as Res.Result<string, FromCodecTuple<Pieces>>

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
