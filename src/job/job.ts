import * as R from '../result/Result'

type Func1<A, B> = (a: A) => B

// type for a Job
// the type: "Job" is just to help Typescript recognise it
// the body says "give me a function that wants an A and I'll run it,
// passing it an A.

export class Job<E, A> {
  readonly body!: (
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
  constructor(
    readonly value: (
      success: Func1<A, void>,
      failure: Func1<E, void>
    ) => void
  ) {
    this.body = value
  }
  map<B>(f: (a: A) => B): Job<E, B> {
    return map<E, A, B>(f, this)
  }
  catch(g: (e: E) => R.Result<E, A>): Job<E, A> {
    return catchError<E, A>(g, this)
  }
  bind<B>(toJobB: (a: A) => Job<E, B>) {
    return bind<E, A, B>(this, toJobB)
  }
  list(jobs: Job<E, A>[]): Job<E, R.Result<E, A>[]> {
    return list(this, ...jobs)
  }
  alt(jobs: Job<E, A>[]) {
    return alt(this, ...jobs)
  }
  race(jobs: Job<E, A>[]) {
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
export const makeJob = <E, A>(
  body: (
    success: Func1<A, void>,
    failure: Func1<E, void>
  ) => void
): Job<E, A> => new Job(body)

// simplest constructor, give it an A, and it gives you a Job that will
// return that A on request
export const pure = <E, A>(a: A): Job<E, A> =>
  makeJob(success => success(a))

export const pureFail = <E, A>(e: E): Job<E, A> =>
  makeJob((_success, failure) => failure(e))

// take a Promise and turn it into a JobReaderEither
export const fromPromise = <E, A>(
  source: () => Promise<A>,
  catcher: (e: any) => E
): Job<E, A> =>
  makeJob((success, failure) =>
    source()
      .then(success)
      .catch(e => failure(catcher(e)))
  )

// run the Job, ie, pass it a Job with an A inside, and a callback function
// that wants that A, and it will pass the A to the callback
export const run = <E, A>(
  job: Job<E, A>,
  next: (result: R.Result<E, A>) => void
): void =>
  job.body(
    a => next(R.success(a)),
    e => next(R.failure(e))
  )

export const runToPromise = <E, A>(
  job: Job<E, A>
): Promise<A> =>
  new Promise((resolve, reject) =>
    job.body(resolve, reject)
  )

export const runToResolvingPromise = <E, A>(
  job: Job<E, A>
): Promise<R.Result<E, A>> =>
  new Promise(resolve =>
    job.body(
      a => resolve(R.success(a)),
      e => resolve(R.failure(e))
    )
  )

/* METHODS */

// takes a Job with an A in it, and a function that changes an A to a B, and
// returns a Job with a B in it.
export const map = <E, A, B>(
  f: (a: A) => B,
  thisJob: Job<E, A>
): Job<E, B> =>
  bimap(
    R.matchResult(
      (e: E) => R.failure(e),
      (a: A) => R.success(f(a))
    ),
    thisJob
  )

export const catchError = <E, A>(
  g: (e: E) => R.Result<E, A>,
  job: Job<E, A>
): Job<E, A> =>
  bimap(
    R.matchResult(
      e => g(e),
      a => R.success(a)
    ),
    job
  )

export const ap = <E, A, B>(
  jobF: Job<E, Func1<A, B>>,
  jobA: Job<E, A>
): Job<E, B> =>
  makeJob((success, failure) =>
    run(
      jobF,
      R.matchResult(failure, (f: Func1<A, B>) =>
        run(
          jobA,
          R.matchResult(failure, (a: A) => success(f(a)))
        )
      )
    )
  )

export const bind = <E, A, B>(
  jobA: Job<E, A>,
  toJobB: (a: A) => Job<E, B>
): Job<E, B> =>
  makeJob((success, failure) =>
    run(
      jobA,
      R.matchResult(failure, a =>
        run(toJobB(a), R.matchResult(failure, success))
      )
    )
  )

export const bimap = <E, G, A, B>(
  f: (val: R.Result<E, A>) => R.Result<G, B>,
  jobA: Job<E, A>
): Job<G, B> =>
  makeJob((success, failure) =>
    run(jobA, val =>
      R.matchResult(failure, success)(f(val))
    )
  )

// combinator types

export const race = <E, A>(
  jobA: Job<E, A>,
  ...jobs: Job<E, A>[]
): Job<E, A> =>
  makeJob((success, failure) => {
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
    ;[jobA, ...jobs].forEach(c =>
      run(c, R.matchResult(onFailure, onSuccess))
    )
  })

// run them all, return a list of passes or failure
export const list = <E, A>(
  job: Job<E, A>,
  ...jobs: Job<E, A>[]
): Job<E, R.Result<E, A>[]> =>
  makeJob((success, _) => {
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
      run(job, result => store(index, result))
    )
  })

// run list of alt values
export const alt = <E, A>(
  job: Job<E, A>,
  ...jobs: Job<E, A>[]
): Job<E, A> =>
  makeJob((success, failure) => {
    let mutableJobs = [...jobs]
    const tryJob = (job: Job<E, A>): void =>
      run(
        job,
        R.matchResult(e => {
          const nextItem = mutableJobs.shift()
          if (!nextItem) {
            return failure(e)
          }
          return tryJob(nextItem)
        }, success)
      )

    tryJob(job)
  })

// const liftA2 = ()

// modifiers

export const withDelay = <E, A>(
  delay: number,
  jobA: Job<E, A>
) =>
  makeJob<E, A>((success, failure) =>
    setTimeout(
      () => run(jobA, R.matchResult(failure, success)),
      delay
    )
  )

export const withTimeout = <E, A>(
  timeout: number,
  error: E,
  job: Job<E, A>
): Job<E, A> =>
  race(job, withDelay(timeout, pureFail(error)))

export const retry = <E, A>(
  retries: number,
  jobA: Job<E, A>
): Job<E, A> =>
  retries < 2
    ? alt(jobA, jobA)
    : range(retries).reduce(
        command => alt(command, jobA),
        jobA
      )

export const range = (max: number): number[] =>
  [...Array(Math.max(max, 2)).keys()].map(i => i)

export const retryWithCount = <E, A>(
  makeJobA: (attemptCount: number) => Job<E, A>,
  retries: number
): Job<E, A> =>
  retries < 2
    ? makeJobA(0)
    : range(retries).reduce(
        (command, index) => alt(command, makeJobA(index)),
        makeJobA(0)
      )
