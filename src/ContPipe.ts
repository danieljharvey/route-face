type Func1<A, B> = (a: A) => B
type Func2<A, B, C> = (a: A, b: B) => C

// type for a Cont
// the type: "Cont" is just to help Typescript recognise it
export type ContPipe<Ctx, A, B> = {
  type: 'Cont'
  body: (value: A, ctx: Ctx, next: Func1<B, void>) => void
}

// constructor function for the above, takes the body function and wraps it up
export const contPipe = <Ctx, A, B>(
  body: (value: A, ctx: Ctx, next: Func1<B, void>) => void
): ContPipe<Ctx, A, B> => ({
  type: 'Cont',
  body,
})

// simplest constructor, give it an A, and it gives you a Cont that will
// return that A on request
export const pureConst = <Ctx, B>(
  b: B
): ContPipe<Ctx, unknown, B> =>
  contPipe((_value, _ctx, next) => next(b))

export const pureFunc = <Ctx, A, B>(
  f: Func1<A, B>
): ContPipe<Ctx, A, B> =>
  contPipe((value, _ctx, next) => next(f(value)))

export const withContext = <Ctx, A, B>(
  f: (ctx: Ctx, value: A) => B
): ContPipe<Ctx, A, B> =>
  contPipe((value, ctx, next) => next(f(ctx, value)))

// run the Cont, ie, pass it a Cont with an A inside, and a callback function
// that wants that A, and it will pass the A to the callback
export const runContPipe = <Ctx, A, B>(
  cont: ContPipe<Ctx, A, B>,
  ctx: Ctx,
  startingValue: A,
  next: Func1<B, void>
): void => cont.body(startingValue, ctx, next)

export const runContPipePromise = <Ctx, A, B>(
  cont: ContPipe<Ctx, A, B>,
  ctx: Ctx,
  startingValue: A
): Promise<B> =>
  new Promise((resolve, _) =>
    cont.body(startingValue, ctx, (b: B) => resolve(b))
  )

// pure('dog') creates a Cont with 'dog' inside, which is then passed to
// console.log
export const pureTest = () =>
  runContPipe(pureConst('dog'), {}, {}, console.log)

// takes a Cont with an A in it, and a function that changes an A to a B, and
// returns a Cont with a B in it.
export const mapContPipe = <Ctx, A, B, C>(
  f: Func1<B, C>,
  thisCont: ContPipe<Ctx, A, B>
): ContPipe<Ctx, A, C> =>
  contPipe((value, ctx, next) =>
    runContPipe(thisCont, ctx, value, (b: B) => next(f(b)))
  )

// a => a.length is our A -> B function (string -> number), pure('dog') is our
// Cont with an A (string in this case) inside.
export const mapTest = () =>
  runContPipe(
    mapContPipe(
      a => a.length,
      pureFunc((a: number) => `dog${a}`)
    ),
    {},
    100,
    console.log
  )

export const apContPipe = <Ctx, A, B, C>(
  contF: ContPipe<Ctx, A, Func1<B, C>>,
  contA: ContPipe<Ctx, A, B>
): ContPipe<Ctx, A, C> =>
  contPipe((value, ctx, next) =>
    runContPipe(contF, ctx, value, (f: Func1<B, C>) =>
      runContPipe(contA, ctx, value, (b: B) => next(f(b)))
    )
  )

export const apTest = () =>
  runContPipe(
    apContPipe(
      pureConst((a: string) => a.toUpperCase()),
      pureConst('doggy')
    ),
    {},
    {},
    console.log
  )

export const bindContPipe = <Ctx, A, B, C>(
  contA: ContPipe<Ctx, A, B>,
  contB: ContPipe<Ctx, B, C>
): ContPipe<Ctx, A, C> =>
  contPipe((value, ctx, next) =>
    runContPipe(contA, ctx, value, (b: B) =>
      runContPipe(contB, ctx, b, next)
    )
  )

export const bindTest = () =>
  runContPipe(
    bindContPipe(
      pureConst('dog'),
      pureFunc(a => `Hello, ${a}`)
    ),
    {},
    {},
    console.log
  )
