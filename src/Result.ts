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

// takes list of eithers, returns A[] if all successes or E if not
export const all = <E, A>(
  results: Result<E, A>[]
): Result<E, A[]> =>
  results.reduce((total, val) => {
    if (isFailure(total)) {
      return total
    }
    return matchResult<E, A, Result<E, A[]>>(
      (e) => failure(e),
      (a: A) => success([...total.value, a])
    )(val)
  }, success<E, A[]>([]))

// stolen and modified from fp-ts not to take an opening value
// thus the output is also a pipe, as such
export function pipe<A, B>(ab: (a: A) => B): B
export function pipe<A, B, C>(
  ab: (a: A) => B,
  bc: (b: B) => C
): C
export function pipe<A, B, C, D>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D
): D
export function pipe<A, B, C, D, E>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E
): E
export function pipe<A, B, C, D, E, F>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F
): F
export function pipe<A, B, C, D, E, F, G>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G
): G
export function pipe<A, B, C, D, E, F, G, H>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H
): H
export function pipe<A, B, C, D, E, F, G, H, I>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I
): I
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J
): J
export function pipe(
  ab?: Function,
  bc?: Function,
  cd?: Function,
  de?: Function,
  ef?: Function,
  fg?: Function,
  gh?: Function,
  hi?: Function,
  ij?: Function
): unknown {
  switch (arguments.length) {
    case 1:
      return <A>(a: A) => ab!(a)
    case 2:
      return <A>(a: A) => bc!(ab!(a))
    case 3:
      return <A>(a: A) => cd!(bc!(ab!(a)))
    case 4:
      return <A>(a: A) => de!(cd!(bc!(ab!(a))))
    case 5:
      return <A>(a: A) => ef!(de!(cd!(bc!(ab!(a)))))
    case 6:
      return <A>(a: A) => fg!(ef!(de!(cd!(bc!(ab!(a))))))
    case 7:
      return <A>(a: A) =>
        gh!(fg!(ef!(de!(cd!(bc!(ab!(a)))))))
    case 8:
      return <A>(a: A) =>
        hi!(gh!(fg!(ef!(de!(cd!(bc!(ab!(a))))))))
    case 9:
      return <A>(a: A) =>
        ij!(hi!(gh!(fg!(ef!(de!(cd!(bc!(ab!(a)))))))))
  }
  return
}
