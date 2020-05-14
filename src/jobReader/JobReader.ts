import * as R from '../result/Result'

type Func1<A, B> = (a: A) => B

// type for a Job
// the type: "Job" is just to help Typescript recognise it
// the body says "give me a function that wants an A and I'll run it,
// passing it an A.

export class Job<Ctx, E, A> {
  readonly body!: (
    context: Ctx,
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
  readonly type!: 'Job'
  constructor(
    readonly value: (
      context: Ctx,
      success: Func1<A, void>,
      failure: Func1<E, void>
    ) => void
  ) {
    this.body = value
  }
  map<B>(f: (a: A) => B): Job<Ctx, E, B> {
    return map<Ctx, E, A, B>(f, this)
  }
  catch(g: (e: E) => R.Result<E, A>): Job<Ctx, E, A> {
    return catchError<Ctx, E, A>(g, this)
  }
  bind<CtxB, B>(toJobB: (a: A) => Job<CtxB, E, B>) {
    return bind<Ctx, CtxB, E, A, B>(this, toJobB)
  }
  list(
    jobs: Job<Ctx, E, A>[]
  ): Job<Ctx, E, R.Result<E, A>[]> {
    return list(this, ...jobs)
  }
  alt(jobs: Job<Ctx, E, A>[]) {
    return alt(this, ...jobs)
  }
  race(jobs: Job<Ctx, E, A>[]) {
    return race(this, ...jobs)
  }
  delay(delayMs: number) {
    return withDelay(delayMs, this)
  }
  timeout(delayMs: number, error: E) {
    return withTimeout(delayMs, error, this)
  }
  retry(retries: number) {
    return retry(retries, this)
  }
}

/* CONSTUCTORS */

// constructor function for the above, takes the body function and wraps it up
export const job = <Ctx, E, A>(
  body: (
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
): Job<Ctx, E, A> =>
  new Job((_, suc, fail) => body(suc, fail))

// constructor function for the above, takes the body function and wraps it up
export const jobRead = <Ctx, E, A>(
  body: (
    context: Ctx,
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
): Job<Ctx, E, A> => new Job(body)

// simplest constructor, give it an A, and it gives you a Job that will
// return that A on request
export const pure = <Ctx, E, A>(a: A): Job<Ctx, E, A> =>
  job((success) => success(a))

export const pureFail = <Ctx, E, A>(e: E): Job<Ctx, E, A> =>
  job((_success, failure) => failure(e))

// take a Promise and turn it into a JobReaderEither
export const fromPromise = <Ctx, E, A>(
  source: (ctx: Ctx) => Promise<A>,
  catcher: (e: any) => E
): Job<Ctx, E, A> =>
  jobRead((ctx, success, failure) =>
    source(ctx)
      .then(success)
      .catch((e) => failure(catcher(e)))
  )

//
export const fromContext = <Ctx, E, A>(
  f: (ctx: Ctx) => R.Result<E, A>
): Job<Ctx, E, A> =>
  jobRead((ctx, success, failure) =>
    R.matchResult(failure, success)(f(ctx))
  )

// run the Job, ie, pass it a Job with an A inside, and a callback function
// that wants that A, and it will pass the A to the callback
export const run = <Ctx, E, A>(
  job: Job<Ctx, E, A>,
  ctx: Ctx,
  next: (result: R.Result<E, A>) => void
): void =>
  job.body(
    ctx,
    (a) => next(R.success(a)),
    (e) => next(R.failure(e))
  )

export const runToPromise = <Ctx, E, A>(
  job: Job<Ctx, E, A>,
  ctx: Ctx
): Promise<A> =>
  new Promise((resolve, reject) =>
    job.body(ctx, resolve, reject)
  )

export const runToResolvingPromise = <Ctx, E, A>(
  job: Job<Ctx, E, A>,
  ctx: Ctx
): Promise<R.Result<E, A>> =>
  new Promise((resolve) =>
    job.body(
      ctx,
      (a) => resolve(R.success(a)),
      (e) => resolve(R.failure(e))
    )
  )

/* METHODS */

// takes a Job with an A in it, and a function that changes an A to a B, and
// returns a Job with a B in it.
export const map = <Ctx, E, A, B>(
  f: (a: A) => B,
  thisJob: Job<Ctx, E, A>
): Job<Ctx, E, B> =>
  bimap(
    R.matchResult(
      (e: E) => R.failure(e),
      (a: A) => R.success(f(a))
    ),
    thisJob
  )

export const catchError = <Ctx, E, A>(
  g: (e: E) => R.Result<E, A>,
  job: Job<Ctx, E, A>
): Job<Ctx, E, A> =>
  bimap(
    R.matchResult(
      (e) => g(e),
      (a) => R.success(a)
    ),
    job
  )

export const ap = <Ctx, E, A, B>(
  jobF: Job<Ctx, E, Func1<A, B>>,
  jobA: Job<Ctx, E, A>
): Job<Ctx, E, B> =>
  jobRead((ctx, success, failure) =>
    run(
      jobF,
      ctx,
      R.matchResult(failure, (f: Func1<A, B>) =>
        run(
          jobA,
          ctx,
          R.matchResult(failure, (a: A) => success(f(a)))
        )
      )
    )
  )

export const bind = <Ctx, CtxB, E, A, B>(
  jobA: Job<Ctx, E, A>,
  toJobB: (a: A) => Job<CtxB, E, B>
): Job<Ctx & CtxB, E, B> =>
  jobRead((ctx, success, failure) =>
    run(
      jobA,
      ctx,
      R.matchResult(failure, (a) =>
        run(toJobB(a), ctx, R.matchResult(failure, success))
      )
    )
  )

export const bimap = <Ctx, E, G, A, B>(
  f: (val: R.Result<E, A>) => R.Result<G, B>,
  jobA: Job<Ctx, E, A>
): Job<Ctx, G, B> =>
  jobRead((ctx, success, failure) =>
    run(jobA, ctx, (val) =>
      R.matchResult(failure, success)(f(val))
    )
  )

// combinator types

export const race = <Ctx, E, A>(
  jobA: Job<Ctx, E, A>,
  ...jobs: Job<Ctx, E, A>[]
): Job<Ctx, E, A> =>
  jobRead((ctx, success, failure) => {
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
    ;[jobA, ...jobs].forEach((c) =>
      run(c, ctx, R.matchResult(onFailure, onSuccess))
    )
  })

// run them all, return a list of passes or failure
export const list = <Ctx, E, A>(
  job: Job<Ctx, E, A>,
  ...jobs: Job<Ctx, E, A>[]
): Job<Ctx, E, R.Result<E, A>[]> =>
  jobRead((ctx, success, _) => {
    let results: R.Result<E, A>[] = []
    const store = (
      index: number,
      result: R.Result<E, A>
    ) => {
      results[index] = result
      if (results.length === jobs.length + 1) {
        return success(results)
      }
    }
    ;[job, ...jobs].forEach((job, index) =>
      run(job, ctx, (result) => store(index, result))
    )
  })

// run list of alt values
export const alt = <Ctx, E, A>(
  job: Job<Ctx, E, A>,
  ...jobs: Job<Ctx, E, A>[]
): Job<Ctx, E, A> =>
  jobRead((ctx, success, failure) => {
    let mutableJobs = [...jobs]
    const tryJob = (job: Job<Ctx, E, A>) => {
      run(
        job,
        ctx,
        R.matchResult((e) => {
          const nextItem = mutableJobs.shift()
          if (!nextItem) {
            return failure(e)
          }
          return tryJob(nextItem)
        }, success)
      )
    }
    tryJob(job)
  })

// const liftA2 = ()

// modifiers

export const withDelay = <Ctx, E, A>(
  delay: number,
  jobA: Job<Ctx, E, A>
) =>
  jobRead<Ctx, E, A>((ctx, success, failure) =>
    setTimeout(
      () => run(jobA, ctx, R.matchResult(failure, success)),
      delay
    )
  )

export const withTimeout = <Ctx, E, A>(
  timeout: number,
  error: E,
  job: Job<Ctx, E, A>
): Job<Ctx, E, A> =>
  race(job, withDelay(timeout, pureFail(error)))

export const retry = <Ctx, E, A>(
  retries: number,
  jobA: Job<Ctx, E, A>
): Job<Ctx, E, A> =>
  retries < 2
    ? alt(jobA, jobA)
    : range(retries).reduce(
        (command) => alt(command, jobA),
        jobA
      )

export const range = (max: number): number[] =>
  [...Array(Math.max(max, 2)).keys()].map((i) => i)

export const retryWithCount = <Ctx, E, A>(
  makeJobA: (attemptCount: number) => Job<Ctx, E, A>,
  retries: number
): Job<Ctx, E, A> =>
  retries < 2
    ? makeJobA(0)
    : range(retries).reduce(
        (command, index) => alt(command, makeJobA(index)),
        makeJobA(0)
      )
