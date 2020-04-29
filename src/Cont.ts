type Func1<A, B> = (a: A) => B

// type for a Cont
// the type: "Cont" is just to help Typescript recognise it
// the body says "give me a function that wants an A and I'll run it,
// passing it an A.
export type Cont<R, A> = {
  type: 'Cont'
  body: (next: Func1<A, R>) => R
}

// constructor function for the above, takes the body function and wraps it up
export const cont = <R, A>(
  body: (next: Func1<A, R>) => R
): Cont<R, A> => ({
  type: 'Cont',
  body,
})

// simplest constructor, give it an A, and it gives you a Cont that will
// return that A on request
export const pure = <R, A>(a: A): Cont<R, A> =>
  cont(next => next(a))

// run the Cont, ie, pass it a Cont with an A inside, and a callback function
// that wants that A, and it will pass the A to the callback
export const runCont = <R, A>(
  cont: Cont<R, A>,
  next: Func1<A, R>
): R => cont.body(next)

// pure('dog') creates a Cont with 'dog' inside, which is then passed to
// console.log
export const pureTest = () =>
  runCont(pure('dog'), console.log)

// takes a Cont with an A in it, and a function that changes an A to a B, and
// returns a Cont with a B in it.
export const mapCont = <R, A, B>(
  f: Func1<A, B>,
  thisCont: Cont<R, A>
): Cont<R, B> =>
  cont(next => runCont(thisCont, (a: A) => next(f(a))))

// a => a.length is our A -> B function (string -> number), pure('dog') is our
// Cont with an A (string in this case) inside.
export const mapTest = () =>
  runCont(
    mapCont(a => a.length, pure('dog')),
    console.log
  )

export const apCont = <R, A, B>(
  contF: Cont<R, Func1<A, B>>,
  contA: Cont<R, A>
): Cont<R, B> =>
  cont(next =>
    runCont(contF, (f: Func1<A, B>) =>
      runCont(contA, (a: A) => next(f(a)))
    )
  )

export const apTest = () =>
  runCont(
    apCont(
      pure((a: string) => a.toUpperCase()),
      pure('doggy')
    ),
    console.log
  )

export const bindCont = <R, A, B>(
  contA: Cont<R, A>,
  toContB: (a: A) => Cont<R, B>
): Cont<R, B> =>
  cont(next =>
    runCont(contA, a => runCont(toContB(a), next))
  )

export const bindTest = () =>
  runCont(
    bindCont(pure('dog'), a => pure(`Hello, ${a}`)),
    console.log
  )
