import * as R from './Result'

type Func1<A, B> = (a: A) => B

// type for a Cont
// the type: "Cont" is just to help Typescript recognise it
// the body says "give me a function that wants an A and I'll run it,
// passing it an A.
export type Cont<Ctx, E, A> = {
  type: 'Cont'
  body: (
    context: Ctx,
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
}

// constructor function for the above, takes the body function and wraps it up
export const cont = <Ctx, E, A>(
  body: (
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
): Cont<Ctx, E, A> => ({
  type: 'Cont',
  body: (_, suc, fail) => body(suc, fail),
})

// constructor function for the above, takes the body function and wraps it up
export const contRead = <Ctx, E, A>(
  body: (
    context: Ctx,
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
): Cont<Ctx, E, A> => ({
  type: 'Cont',
  body,
})

// simplest constructor, give it an A, and it gives you a Cont that will
// return that A on request
export const pure = <Ctx, E, A>(a: A): Cont<Ctx, E, A> =>
  cont(success => success(a))

export const pureFail = <Ctx, E, A>(
  e: E
): Cont<Ctx, E, A> =>
  cont((_success, failure) => failure(e))

// take a Promise and turn it into a ContReaderEither
export const fromPromise = <Ctx, E, A>(
  source: (ctx: Ctx) => Promise<A>,
  catcher: (e: any) => E
): Cont<Ctx, E, A> =>
  contRead((ctx, success, failure) =>
    source(ctx)
      .then(success)
      .catch(e => failure(catcher(e)))
  )

//
export const fromContext = <Ctx, E, A>(
  f: (ctx: Ctx) => R.Result<E, A>
): Cont<Ctx, E, A> =>
  contRead((ctx, success, failure) =>
    R.matchResult(failure, success)(f(ctx))
  )

// run the Cont, ie, pass it a Cont with an A inside, and a callback function
// that wants that A, and it will pass the A to the callback
export const run = <Ctx, E, A>(
  cont: Cont<Ctx, E, A>,
  ctx: Ctx,
  next: (result: R.Result<E, A>) => void
): void =>
  cont.body(
    ctx,
    a => next(R.success(a)),
    e => next(R.failure(e))
  )

export const runToPromise = <Ctx, E, A>(
  cont: Cont<Ctx, E, A>,
  ctx: Ctx
): Promise<A> =>
  new Promise((resolve, reject) =>
    cont.body(ctx, resolve, reject)
  )

// takes a Cont with an A in it, and a function that changes an A to a B, and
// returns a Cont with a B in it.
export const map = <Ctx, E, A, B>(
  f: (a: A) => B,
  thisCont: Cont<Ctx, E, A>
): Cont<Ctx, E, B> =>
  bimap(
    R.matchResult(
      (e: E) => R.failure(e),
      (a: A) => R.success(f(a))
    ),
    thisCont
  )

export const catchError = <Ctx, E, A>(
  g: (e: E) => R.Result<E, A>,
  cont: Cont<Ctx, E, A>
): Cont<Ctx, E, A> =>
  bimap(
    R.matchResult(
      e => g(e),
      a => R.success(a)
    ),
    cont
  )

export const ap = <Ctx, E, A, B>(
  contF: Cont<Ctx, E, Func1<A, B>>,
  contA: Cont<Ctx, E, A>
): Cont<Ctx, E, B> =>
  contRead((ctx, success, failure) =>
    run(
      contF,
      ctx,
      R.matchResult(failure, (f: Func1<A, B>) =>
        run(
          contA,
          ctx,
          R.matchResult(failure, (a: A) => success(f(a)))
        )
      )
    )
  )

export const bind = <Ctx, CtxB, E, A, B>(
  contA: Cont<Ctx, E, A>,
  toContB: (a: A) => Cont<CtxB, E, B>
): Cont<Ctx & CtxB, E, B> =>
  contRead((ctx, success, failure) =>
    run(
      contA,
      ctx,
      R.matchResult(failure, a =>
        run(
          toContB(a),
          ctx,
          R.matchResult(failure, success)
        )
      )
    )
  )

// run them all, return a list of passes or failure
export const list = <Ctx, E, A>(
  conts: Cont<Ctx, E, A>[],
  onEmpty: E
): Cont<Ctx, E, R.Result<E, A>[]> =>
  contRead((ctx, success, failure) => {
    if (conts.length === 0) {
      return failure(onEmpty)
    }
    let results: R.Result<E, A>[] = []
    const store = (
      index: number,
      result: R.Result<E, A>
    ) => {
      results[index] = result
      if (results.length === conts.length) {
        return success(results)
      }
    }
    conts.forEach((cont, index) =>
      run(cont, ctx, result => store(index, result))
    )
  })

export const alt = <Ctx, E, A>(
  contA: Cont<Ctx, E, A>,
  contB: Cont<Ctx, E, A>
): Cont<Ctx, E, A> =>
  contRead((ctx, success, failure) =>
    run(
      contA,
      ctx,
      R.matchResult(
        _ =>
          run(contB, ctx, R.matchResult(failure, success)),
        success
      )
    )
  )

// run list of alt values
export const altList = <Ctx, E, A>(
  conts: Cont<Ctx, E, A>[],
  onEmpty: E
): Cont<Ctx, E, A> =>
  contRead((ctx, success, failure) => {
    let mutableConts = [...conts]
    const firstOne = mutableConts.shift()
    if (!firstOne) {
      return failure(onEmpty)
    }
    const tryCont = (cont: Cont<Ctx, E, A>) => {
      run(
        cont,
        ctx,
        R.matchResult(e => {
          const nextItem = mutableConts.shift()
          if (!nextItem) {
            return failure(e)
          }
          return tryCont(nextItem)
        }, success)
      )
    }
    tryCont(firstOne)
  })

export const bimap = <Ctx, E, G, A, B>(
  f: (val: R.Result<E, A>) => R.Result<G, B>,
  contA: Cont<Ctx, E, A>
): Cont<Ctx, G, B> =>
  contRead((ctx, success, failure) =>
    run(contA, ctx, val =>
      R.matchResult(failure, success)(f(val))
    )
  )

export const race = <Ctx, E, A>(
  contA: Cont<Ctx, E, A>,
  ...conts: Cont<Ctx, E, A>[]
): Cont<Ctx, E, A> =>
  contRead((ctx, success, failure) => {
    let hasFinished = false
    const onSuccess = (a: A) => {
      if (!hasFinished) {
        hasFinished = true
        success(a)
      }
    }
    const onFailure = (e: E) => {
      if (!hasFinished) {
        hasFinished = true
        failure(e)
      }
    }
    ;[contA, ...conts].forEach(c =>
      run(c, ctx, R.matchResult(onFailure, onSuccess))
    )
  })

export const withDelay = <Ctx, E, A>(
  delay: number,
  contA: Cont<Ctx, E, A>
) =>
  contRead<Ctx, E, A>((ctx, success, failure) =>
    setTimeout(
      () =>
        run(contA, ctx, R.matchResult(failure, success)),
      delay
    )
  )

export const withTimeout = <Ctx, E, A>(
  timeout: number,
  error: E,
  cont: Cont<Ctx, E, A>
): Cont<Ctx, E, A> =>
  race(cont, withDelay(timeout, pureFail(error)))

export const withCont = <Ctx, E, A>(
  cont: Cont<Ctx, E, A>
) => ({
  map: <B>(f: (a: A) => B) => withCont(map(f, cont)),
  and: <B, CtxB>(f: (a: A) => Cont<CtxB, E, B>) =>
    withCont<Ctx & CtxB, E, B>(bind(cont, f)),
  alt: (contB: Cont<Ctx, E, A>) =>
    withCont(alt(cont, contB)),
  done: () => cont,
})
