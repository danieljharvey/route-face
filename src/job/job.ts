import * as R from '../result/Result'

type Func1<A, B> = (a: A) => B
type Func2<A, B, C> = (a: A, b: B) => C
type Func3<A, B, C, D> = (a: A, b: B, c: C) => D

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

// give it an error E, and it will give you a failing Job
export const pureFail = <E, A>(e: E): Job<E, A> =>
  makeJob((_success, failure) => failure(e))

// give me a Result that is either E or A, and this will turn that into a Job
export const fromResult = <E, A>(
  res: R.Result<E, A>
): Job<E, A> =>
  R.matchResult(
    (e: E) => pureFail<E, A>(e),
    (a: A) => pure<E, A>(a)
  )(res)

// take a Promise and turn it into a Job
// the catcher makes sure any error thrown is turned into an E
export const fromPromise = <E, A>(
  source: () => Promise<A>,
  catcher: (e: any) => E
): Job<E, A> =>
  makeJob((success, failure) =>
    source()
      .then(success)
      .catch(e => failure(catcher(e)))
  )

// run the Job and pass the result to the callback function
export const run = <E, A>(
  job: Job<E, A>,
  next: (result: R.Result<E, A>) => void
): void =>
  job.body(
    a => next(R.success(a)),
    e => next(R.failure(e))
  )

// run the job and return the result in a Promise that may resolve or reject
export const runToPromise = <E, A>(
  job: Job<E, A>
): Promise<A> =>
  new Promise((resolve, reject) =>
    job.body(resolve, reject)
  )

// run the job, resolving with a Result<E,A> rather than rejecting
// this is useful in async/await code to avoid wrapping in try/catch
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

// if the passed Job is an error, run this function over the error
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

// if JobF contains a function from A -> B
// and jobA contains an A
// return a Job with a B in it
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

// also called chain or flatMap
// given a Job that returns an A
// and a function that takes that A
// and returns another Job that returns a B
// chain them together
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

// As a Job has a Result inside, this let's you run a function over that Result
export const bimap = <E, G, A, B>(
  f: (val: R.Result<E, A>) => R.Result<G, B>,
  jobA: Job<E, A>
): Job<G, B> =>
  makeJob((success, failure) =>
    run(jobA, val =>
      R.matchResult(failure, success)(f(val))
    )
  )

// Combinators

// run all the jobs and return the first one that finishes
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

// run all the jobs, keeping all the results
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

// try each Job in the list, returning the first that succeeds
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

// helper
const curry2 = <A, B, C>(f: Func2<A, B, C>) => (a: A) => (
  b: B
) => f(a, b)

// take a function of (a:A, b:B) => C
// and Job<E,A> and Job<E,B>
// turns into Job<E,C>
export const liftA2 = <E, A, B, C>(
  f: Func2<A, B, C>,
  jobA: Job<E, A>,
  jobB: Job<E, B>
): Job<E, C> => ap(jobA.map(curry2(f)), jobB)

// helper
const curry3 = <A, B, C, D>(f: Func3<A, B, C, D>) => (
  a: A
) => (b: B) => (c: C) => f(a, b, c)

// take a function of (a:A,b:B,c:C) => D
// and Job<E,A> and Job<E,B> and Job<E,C>
// and turns into Job<E,D>
export const liftA3 = <E, A, B, C, D>(
  f: Func3<A, B, C, D>,
  jobA: Job<E, A>,
  jobB: Job<E, B>,
  jobC: Job<E, C>
): Job<E, D> => ap(ap(jobA.map(curry3(f)), jobB), jobC)

// Modifiers

// Delays the execution of the Job by a number of ms
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

// Runs the job, but returns the provided error if it does
// not finish in time
export const withTimeout = <E, A>(
  timeout: number,
  error: E,
  job: Job<E, A>
): Job<E, A> =>
  race(job, withDelay(timeout, pureFail(error)))

// retry the job X times
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

// helper
const range = (max: number): number[] =>
  [...Array(Math.max(max, 2)).keys()].map(i => i)

// given a function that turns a number into a Job
// retry it X times
// the number can be used for exponential backoff etc
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

const filterMap = <K, A>(
  map: Map<K, [number, A]>,
  cacheLimit: number
): Map<K, [number, A]> =>
  new Map(
    Array.from(map).filter(([_, [age]]) => age > cacheLimit)
  )

export const withFifoCache = <E, A, K>(
  jobFromKey: (key: K) => Job<E, A>,
  cacheLimit = 100
): ((k: K) => Job<E, A>) => {
  let entryNum = 0
  let cache: Map<K, [number, A]> = new Map()
  const addToCache = (k: K, a: A) => {
    entryNum = entryNum + 1
    cache = filterMap(
      cache.set(k, [entryNum, a]),
      entryNum - cacheLimit
    )
  }
  return (k: K) => {
    const cacheHit = cache.get(k)
    if (cacheHit) {
      return pure(cacheHit[1])
    }
    return jobFromKey(k).bind(a => {
      addToCache(k, a)
      return pure(a)
    })
  }
}
