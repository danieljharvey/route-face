import * as R from './Result'

type Func1<A, B> = (a: A) => B

// type for a Cont
// the type: "Cont" is just to help Typescript recognise it
// the body says "give me a function that wants an A and I'll run it,
// passing it an A.
export type ContReaderEither<Ctx, E, A> = {
  type: 'ContReaderEither'
  body: (
    context: Ctx,
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
}

// constructor function for the above, takes the body function and wraps it up
export const contReaderEither = <Ctx, E, A>(
  body: (
    context: Ctx,
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
): ContReaderEither<Ctx, E, A> => ({
  type: 'ContReaderEither',
  body,
})

// simplest constructor, give it an A, and it gives you a Cont that will
// return that A on request
export const pure = <Ctx, E, A>(
  a: A
): ContReaderEither<Ctx, E, A> =>
  contReaderEither((_, success) => success(a))

export const pureFail = <Ctx, E, A>(
  e: E
): ContReaderEither<Ctx, E, A> =>
  contReaderEither((_ctx, _success, failure) => failure(e))

// take a Promise and turn it into a ContReaderEither
export const fromPromise = <Ctx, E, A>(
  source: (ctx: Ctx) => Promise<A>,
  catcher: (e: any) => E
): ContReaderEither<Ctx, E, A> =>
  contReaderEither((ctx, success, failure) =>
    source(ctx)
      .then(success)
      .catch(e => failure(catcher(e)))
  )

//
export const fromContext = <Ctx, E, A>(
  f: (ctx: Ctx) => R.Result<E, A>
): ContReaderEither<Ctx, E, A> =>
  contReaderEither((ctx, success, failure) =>
    R.matchResult(failure, success)(f(ctx))
  )

// run the Cont, ie, pass it a Cont with an A inside, and a callback function
// that wants that A, and it will pass the A to the callback
export const runContReaderEither = <Ctx, E, A>(
  cont: ContReaderEither<Ctx, E, A>,
  ctx: Ctx,
  next: (result: R.Result<E, A>) => void
): void =>
  cont.body(
    ctx,
    a => next(R.success(a)),
    e => next(R.failure(e))
  )

export const runContReaderEitherPromise = <Ctx, E, A>(
  cont: ContReaderEither<Ctx, E, A>,
  ctx: Ctx
): Promise<A> =>
  new Promise((resolve, reject) =>
    cont.body(ctx, resolve, reject)
  )

// pure('dog') creates a Cont with 'dog' inside, which is then passed to
// console.log
export const pureTest = () =>
  runContReaderEither(pure('dog'), {}, console.log)

// takes a Cont with an A in it, and a function that changes an A to a B, and
// returns a Cont with a B in it.
export const mapContReaderEither = <Ctx, E, A, B>(
  f: (a: A) => B,
  thisCont: ContReaderEither<Ctx, E, A>
): ContReaderEither<Ctx, E, B> =>
  bimapContReaderEither(
    R.matchResult(
      (e: E) => R.failure(e),
      (a: A) => R.success(f(a))
    ),
    thisCont
  )

// a => a.length is our A -> B function (string -> number), pure('dog') is our
// Cont with an A (string in this case) inside.
export const mapTest = () =>
  runContReaderEither(
    mapContReaderEither(a => a.length, pure('dog')),
    {},
    console.log
  )

export const catchContReaderEither = <Ctx, E, A>(
  g: (e: E) => R.Result<E, A>,
  cont: ContReaderEither<Ctx, E, A>
): ContReaderEither<Ctx, E, A> =>
  bimapContReaderEither(
    R.matchResult(
      e => g(e),
      a => R.success(a)
    ),
    cont
  )

// a => a.length is our A -> B function (string -> number), pure('dog') is our
// Cont with an A (string in this case) inside.
export const catchTest = () =>
  runContReaderEither(
    catchContReaderEither(
      e => R.success('caught'),
      pureFail('oh no')
    ),
    {},
    console.log
  )

export const apContReaderEither = <Ctx, E, A, B>(
  contF: ContReaderEither<Ctx, E, Func1<A, B>>,
  contA: ContReaderEither<Ctx, E, A>
): ContReaderEither<Ctx, E, B> =>
  contReaderEither((ctx, success, failure) =>
    runContReaderEither(
      contF,
      ctx,
      R.matchResult(failure, (f: Func1<A, B>) =>
        runContReaderEither(
          contA,
          ctx,
          R.matchResult(failure, (a: A) => success(f(a)))
        )
      )
    )
  )

export const apTest = () =>
  runContReaderEither(
    apContReaderEither(
      pure((a: string) => a.toUpperCase()),
      pure('doggy')
    ),
    {},
    console.log
  )

export const bindContReaderEither = <Ctx, E, A, B>(
  contA: ContReaderEither<Ctx, E, A>,
  toContB: (a: A) => ContReaderEither<Ctx, E, B>
): ContReaderEither<Ctx, E, B> =>
  contReaderEither((ctx, success, failure) =>
    runContReaderEither(
      contA,
      ctx,
      R.matchResult(failure, a =>
        runContReaderEither(
          toContB(a),
          ctx,
          R.matchResult(failure, success)
        )
      )
    )
  )

export const bindTest = () =>
  runContReaderEither(
    bindContReaderEither(pure('dog'), a =>
      pure(`Hello, ${a}`)
    ),
    {},
    console.log
  )

const altContReaderEither = <Ctx, E, A>(
  contA: ContReaderEither<Ctx, E, A>,
  contB: ContReaderEither<Ctx, E, A>
): ContReaderEither<Ctx, E, A> =>
  contReaderEither((ctx, success, failure) =>
    runContReaderEither(
      contA,
      ctx,
      R.matchResult(
        _ =>
          runContReaderEither(
            contB,
            ctx,
            R.matchResult(failure, success)
          ),
        success
      )
    )
  )

export const altTest = () =>
  runContReaderEither(
    altContReaderEither(pureFail('Oh no'), pure('yeah')),
    {},
    console.log
  )

const bimapContReaderEither = <Ctx, E, G, A, B>(
  f: (val: R.Result<E, A>) => R.Result<G, B>,
  cont: ContReaderEither<Ctx, E, A>
): ContReaderEither<Ctx, G, B> =>
  contReaderEither((ctx, success, failure) =>
    runContReaderEither(cont, ctx, val =>
      R.matchResult(failure, success)(f(val))
    )
  )

export const bimapTest = () =>
  runContReaderEither(
    bimapContReaderEither(
      R.matchResult(
        e => R.success(e),
        a => R.failure(a)
      ),
      pure('Dog')
    ),
    {},
    console.log
  )

export const raceContReaderEither = <Ctx, E, A>(
  cont: ContReaderEither<Ctx, E, A>,
  ...conts: ContReaderEither<Ctx, E, A>[]
): ContReaderEither<Ctx, E, A> =>
  contReaderEither((ctx, success, failure) => {
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
    ;[cont, ...conts].forEach(c =>
      runContReaderEither(
        c,
        ctx,
        R.matchResult(onFailure, onSuccess)
      )
    )
  })

export const withDelay = <Ctx, E, A>(
  delay: number,
  cont: ContReaderEither<Ctx, E, A>
) =>
  contReaderEither<Ctx, E, A>((ctx, success, failure) =>
    setTimeout(
      () =>
        runContReaderEither(
          cont,
          ctx,
          R.matchResult(failure, success)
        ),
      delay
    )
  )

export const raceTest = () =>
  runContReaderEither(
    raceContReaderEither(
      withDelay(102, pure('dog')),
      withDelay(101, pure('cat')),
      withDelay(100, pure('horse'))
    ),
    {},
    console.log
  )

export const withTimeout = <Ctx, E, A>(
  timeout: number,
  error: E,
  cont: ContReaderEither<Ctx, E, A>
): ContReaderEither<Ctx, E, A> =>
  raceContReaderEither(
    cont,
    withDelay(timeout, pureFail(error))
  )

export const timeoutTest = () =>
  runContReaderEither(
    withTimeout(
      100,
      'oh no',
      withDelay(200, pure('great job'))
    ),
    {},
    console.log
  )
