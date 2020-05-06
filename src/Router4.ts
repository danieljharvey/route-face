import * as t from 'io-ts'
import { Push, pushTuple } from './Tuple'
import * as Res from './Result'
import * as E from 'fp-ts/lib/Either'
import { reporter } from 'io-ts-reporters'

type FromCodec<T> = T extends t.Mixed ? T : never

type FromCodecToTypes<T extends t.Mixed[]> = {
  [P in keyof T]: FromCodec<T[P]>
}

export type RouteTypes<
  T extends Route<t.Mixed[]>
> = FromCodecToTypes<T['pieces']>

export type Route<Pieces extends t.Mixed[]> = {
  type: 'Route'
  pieces: Pieces
}

const eitherToResult = <A>(
  either: E.Either<t.Errors, A>
): Res.Result<string, A> =>
  either._tag === 'Left'
    ? Res.failure(reporter(either).join('/n'))
    : Res.success(either.right)

// do these url pieces satisfy the parts
export const validate = <Pieces extends t.Mixed[]>(
  route: Route<Pieces>,
  urlPieces: string[]
): Res.Result<string, RouteTypes<typeof route>> =>
  Res.all(
    route.pieces
      .map((piece, index) => piece.decode(urlPieces[index]))
      .map(eitherToResult)
  ) as Res.Result<string, RouteTypes<typeof route>>

export const route = <Pieces extends t.Mixed[]>(
  pieces: Pieces
): Route<Pieces> => ({
  type: 'Route',
  pieces,
})

export const empty = route([])

export const pure = <S extends t.Mixed>(
  newPart: S
): Route<[S]> => route([newPart])

export const add = <
  Pieces extends t.Mixed[],
  S extends t.Mixed
>(
  oldRoute: Route<Pieces>,
  newPart: S
): Route<Push<S, Pieces>> => ({
  ...oldRoute,
  pieces: pushTuple(newPart, ...oldRoute.pieces),
})

const createRoute = <Start extends t.Mixed[]>(
  route: Route<Start>
) => ({
  then: <S extends t.Mixed>(next: S) =>
    createRoute(add(route, next)),
  done: () => route,
})

export const makeRoute = createRoute(empty)
