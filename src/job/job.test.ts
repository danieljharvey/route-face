import * as J from './job'
import * as Res from '../result/Result'

describe('Job', () => {
  describe('pure', () => {
    it('Returns the value inside', done => {
      J.run(J.pure('dog'), a => {
        expect(a).toEqual(Res.success('dog'))
        done()
      })
    })
  })
  describe('map', () => {
    it('Runs length on our value', done => {
      J.run(
        J.map(a => a.length, J.pure('dog')),
        a => {
          expect(a).toEqual(Res.success(3))
          done()
        }
      )
    })
  })
  describe('catchError', () => {
    it('Catches the error and returns the new value', done => {
      J.run(
        J.catchError(
          e => Res.success('caught'),
          J.pureFail('oh no')
        ),
        a => {
          expect(a).toEqual(Res.success('caught'))
          done()
        }
      )
    })
  })
  describe('ap', () => {
    it('Runs the function in the first Job on the value in the second', done => {
      J.run(
        J.ap(
          J.pure((a: string) => a.toUpperCase()),
          J.pure('doggy')
        ),
        a => {
          expect(a).toEqual(Res.success('DOGGY'))
          done()
        }
      )
    })
  })

  describe('liftA2', () => {
    const myFunc = (name: string, age: number): string =>
      `Hello ${name} who is ${age} years old`

    it('Succeeds', async () => {
      const result = await J.runToResolvingPromise(
        J.liftA2(myFunc, J.pure('Bruce'), J.pure(100))
      )
      expect(result.value).toEqual(
        `Hello Bruce who is 100 years old`
      )
    })

    it('Returns the first failure', async () => {
      const result = await J.runToResolvingPromise(
        J.liftA2(
          myFunc,
          J.pureFail('oh no'),
          J.pureFail('not again')
        )
      )
      expect(result.value).toEqual('oh no')
    })
  })

  describe('liftA3', () => {
    const myFunc = (
      name: string,
      age: number,
      likesDogs: boolean
    ): string =>
      `Hello ${name} who is ${age} years old and ${
        likesDogs ? 'does' : 'does not'
      } like dogs`

    it('Succeeds', async () => {
      const result = await J.runToResolvingPromise(
        J.liftA3(
          myFunc,
          J.pure('Bruce'),
          J.pure(100),
          J.pure(true)
        )
      )
      expect(result.value).toEqual(
        `Hello Bruce who is 100 years old and does like dogs`
      )
    })
  })

  describe('bind', () => {
    it('Chains two Jobs', done => {
      J.run(
        J.bind(J.pure('dog'), a => J.pure(`Hello, ${a}`)),
        a => {
          expect(a).toEqual(Res.success('Hello, dog'))
          done()
        }
      )
    })
  })

  describe('alt', () => {
    it('Falls through the first failure and returns the success', done => {
      J.run(
        J.alt(J.pureFail('Oh no'), J.pure('yeah')),
        a => {
          expect(a).toEqual(Res.success('yeah'))
          done()
        }
      )
    })
  })

  describe('altCollect', () => {
    it('Falls through the first failure and returns the success', done => {
      J.run(
        J.altCollect(J.pureFail('Oh no'), J.pure('yeah')),
        a => {
          expect(a).toEqual(Res.success('yeah'))
          done()
        }
      )
    })
    it('Returns all errors if nothing succeeds', done => {
      J.run(
        J.altCollect(
          J.pureFail('Oh no'),
          J.pureFail('its'),
          J.pureFail('broken')
        ),
        a => {
          expect(a).toEqual(
            Res.failure(['Oh no', 'its', 'broken'])
          )
          done()
        }
      )
    })
  })

  describe('bimap', () => {
    it('Runs left function', done => {
      J.run(
        J.bimap(
          Res.matchResult(
            e => Res.success(`${e}${e}`),
            a => Res.failure(a)
          ),
          J.pureFail('Log')
        ),
        a => {
          expect(a).toEqual(Res.success('LogLog'))
          done()
        }
      )
    })

    it('Runs right function', done => {
      J.run(
        J.bimap(
          Res.matchResult(
            e => Res.success(e),
            a => Res.failure(`${a}${a}`)
          ),
          J.pure('Dog')
        ),
        a => {
          expect(a).toEqual(Res.failure('DogDog'))
          done()
        }
      )
    })
  })

  describe('race', () => {
    it('Horse wins again', done => {
      J.run(
        J.race(
          J.withDelay(120, J.pure('dog')),
          J.withDelay(110, J.pure('cat')),
          J.withDelay(100, J.pure('horse'))
        ),
        a => {
          expect(a).toEqual(Res.success('horse'))
          done()
        }
      )
    })
  })

  describe('timeout', () => {
    it('Times out', done => {
      J.run(
        J.withTimeout(
          100,
          'oh no',
          J.withDelay(200, J.pure('great job'))
        ),
        a => {
          expect(a).toEqual(Res.failure('oh no'))
          done()
        }
      )
    })
  })

  describe('list', () => {
    it('Returns the list in order, whether they pass or fail', done => {
      J.run(
        J.list(
          J.pure(1),
          J.pure(2),
          J.pure(3),
          J.pure(4),
          J.pureFail('oh no')
        ),
        res => {
          const expected = [1, 2, 3, 4]
            .map(Res.success)
            .concat([Res.failure('oh no')])
          expect((res as any).value).toStrictEqual(expected)
          done()
        }
      )
    })
  })

  const range = (max: number): number[] =>
    [...Array(Math.max(max, 2)).keys()].map(i => i)

  function shuffleArray<A>(array: A[]): A[] {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newArray[i], newArray[j]] = [
        newArray[j],
        newArray[i],
      ]
    }
    return newArray
  }

  describe('withFifoCache', () => {
    it('Fetches once, uses cache after', async () => {
      let fetchCount = 0
      const effectfulThing = (k: number) =>
        J.makeJob(success => {
          fetchCount = fetchCount + 1
          success(`Hello, ${k}`)
        })
      const job = J.withFifoCache(effectfulThing, 10)

      const result1 = await J.runToResolvingPromise(job(1))
      const result2 = await J.runToResolvingPromise(job(1))
      await J.runToResolvingPromise(job(1))

      expect(result1).toEqual(result2)
      expect(fetchCount).toEqual(1)
    })
    it('Hits cache when available', async () => {
      let fetchCount = 0
      const effectfulThing = (k: number) =>
        J.makeJob(success => {
          fetchCount = fetchCount + 1
          success(`Hello, ${k}`)
        })
      const job = J.withFifoCache(effectfulThing, 100)
      const all = range(20)
        .concat(range(20))
        .concat(range(20))
      all.map(
        async a => await J.runToResolvingPromise(job(a))
      )
      expect(fetchCount).toEqual(20)
    })

    it('Throws old items out of the cache', async () => {
      let fetchCount = 0
      const effectfulThing = (k: number) =>
        J.makeJob<string, string>(success => {
          fetchCount = fetchCount + 1
          success(`Hello, ${k}`)
        })
      const job = J.withFifoCache(effectfulThing, 5)
      const all = shuffleArray(range(10).concat(range(10)))
      all.map(
        async a => await J.runToResolvingPromise(job(a))
      )
      expect(fetchCount).toBeGreaterThanOrEqual(10)
      expect(fetchCount).toBeLessThanOrEqual(20)
    })
  })
})
