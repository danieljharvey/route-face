type Failure<E> = { type: 'Failure'; value: E }
type Success<A> = { type: 'Success'; value: A }

export type Result<E, A> = Failure<E> | Success<A>

export const failure = <E, A>(value: E): Result<E, A> => ({
  type: 'Failure',
  value,
})

export const success = <E, A>(value: A): Result<E, A> => ({
  type: 'Success',
  value,
})

export const isFailure = <E, A>(
  value: Result<E, A>
): value is Failure<E> => value.type === 'Failure'

export const isSuccess = <E, A>(
  value: Result<E, A>
): value is Success<A> => value.type === 'Success'

export const combineResults = <E, A, B>(
  value1: Result<E, A>,
  value2: Result<E, B>
): Result<E, [A, B]> =>
  isFailure(value1)
    ? value1
    : isFailure(value2)
    ? value2
    : success([value1.value, value2.value])

const id = <A>(a: A): A => a

export const matchResult = <E, A, B>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => B
) => (value: Result<E, A>): B =>
  value.type === 'Failure'
    ? onFailure(value.value)
    : onSuccess(value.value)

export const flatten = matchResult(id, id)
