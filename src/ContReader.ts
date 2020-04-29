type Func1<A, B> = (a: A) => B

// type for a Cont
// the type: "Cont" is just to help Typescript recognise it
// the body says "give me a function that wants an A and I'll run it,
// passing it an A.
export type ContReader<Ctx, A> = {
  type: 'Cont'
  body: (ctx: Ctx, next: Func1<A, void>) => void
}

// constructor function for the above, takes the body function and wraps it up
export const contReader = <Ctx, A>(
  body: (ctx: Ctx, next: Func1<A, void>) => void
): ContReader<Ctx, A> => ({
  type: 'Cont',
  body,
})

// simplest constructor, give it an A, and it gives you a Cont that will
// return that A on request
export const pure = <Ctx, A>(a: A): ContReader<Ctx, A> =>
  contReader((_, next) => next(a))

// run the Cont, ie, pass it a Cont with an A inside, and a callback function
// that wants that A, and it will pass the A to the callback
export const runContReader = <Ctx, A>(
  cont: ContReader<Ctx, A>,
  ctx: Ctx,
  next: Func1<A, void>
): void => cont.body(ctx, next)

export const runContReaderPromise = <Ctx, A>(
  cont: ContReader<Ctx, A>,
  ctx: Ctx
): Promise<A> =>
  new Promise((resolve, _) =>
    cont.body(ctx, (a: A) => resolve(a))
  )

// pure('dog') creates a Cont with 'dog' inside, which is then passed to
// console.log
export const pureTest = () =>
  runContReader(pure('dog'), {}, console.log)

// takes a Cont with an A in it, and a function that changes an A to a B, and
// returns a Cont with a B in it.
export const mapContReader = <Ctx, A, B>(
  f: Func1<A, B>,
  thisCont: ContReader<Ctx, A>
): ContReader<Ctx, B> =>
  contReader((ctx, next) =>
    runContReader(thisCont, ctx, (a: A) => next(f(a)))
  )

// a => a.length is our A -> B function (string -> number), pure('dog') is our
// Cont with an A (string in this case) inside.
export const mapTest = () =>
  runContReader(
    mapContReader(a => a.length, pure('dog')),
    {},
    console.log
  )

export const apContReader = <Ctx, A, B>(
  contF: ContReader<Ctx, Func1<A, B>>,
  contA: ContReader<Ctx, A>
): ContReader<Ctx, B> =>
  contReader((ctx, next) =>
    runContReader(contF, ctx, (f: Func1<A, B>) =>
      runContReader(contA, ctx, (a: A) => next(f(a)))
    )
  )

export const apTest = () =>
  runContReader(
    apContReader(
      pure((a: string) => a.toUpperCase()),
      pure('doggy')
    ),
    {},
    console.log
  )

export const bindContReader = <Ctx, A, B>(
  contA: ContReader<Ctx, A>,
  toContB: (a: A) => ContReader<Ctx, B>
): ContReader<Ctx, B> =>
  contReader((ctx, next) =>
    runContReader(contA, ctx, a =>
      runContReader(toContB(a), ctx, next)
    )
  )

export const bindTest = () =>
  runContReader(
    bindContReader(pure('dog'), a => pure(`Hello, ${a}`)),
    {},
    console.log
  )
