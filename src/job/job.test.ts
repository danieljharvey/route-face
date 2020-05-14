import * as J from './job'
import * as Res from '../result/Result'

describe('JobReaderEither', () => {
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
})
