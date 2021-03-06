import * as CRE from './JobReader'
import * as Res from '../result/Result'

describe('JobReaderEither', () => {
  describe('pure', () => {
    it('Returns the value inside', (done) => {
      CRE.run(CRE.pure('dog'), {}, (a) => {
        expect(a).toEqual(Res.success('dog'))
        done()
      })
    })
  })
  describe('map', () => {
    it('Runs length on our value', (done) => {
      CRE.run(
        CRE.map((a) => a.length, CRE.pure('dog')),
        {},
        (a) => {
          expect(a).toEqual(Res.success(3))
          done()
        }
      )
    })
  })
  describe('catchError', () => {
    it('Catches the error and returns the new value', (done) => {
      CRE.run(
        CRE.catchError(
          (e) => Res.success('caught'),
          CRE.pureFail('oh no')
        ),
        {},
        (a) => {
          expect(a).toEqual(Res.success('caught'))
          done()
        }
      )
    })
  })
  describe('ap', () => {
    it('Runs the function in the first Job on the value in the second', (done) => {
      CRE.run(
        CRE.ap(
          CRE.pure((a: string) => a.toUpperCase()),
          CRE.pure('doggy')
        ),
        {},
        (a) => {
          expect(a).toEqual(Res.success('DOGGY'))
          done()
        }
      )
    })
  })

  describe('bind', () => {
    it('Chains two Jobs', (done) => {
      CRE.run(
        CRE.bind(CRE.pure('dog'), (a) =>
          CRE.pure(`Hello, ${a}`)
        ),
        {},
        (a) => {
          expect(a).toEqual(Res.success('Hello, dog'))
          done()
        }
      )
    })
  })

  describe('alt', () => {
    it('Falls through the first failure and returns the success', (done) => {
      CRE.run(
        CRE.alt(CRE.pureFail('Oh no'), CRE.pure('yeah')),
        {},
        (a) => {
          expect(a).toEqual(Res.success('yeah'))
          done()
        }
      )
    })
  })
  describe('bimap', () => {
    it('Runs left function', (done) => {
      CRE.run(
        CRE.bimap(
          Res.matchResult(
            (e) => Res.success(`${e}${e}`),
            (a) => Res.failure(a)
          ),
          CRE.pureFail('Log')
        ),
        {},
        (a) => {
          expect(a).toEqual(Res.success('LogLog'))
          done()
        }
      )
    })

    it('Runs right function', (done) => {
      CRE.run(
        CRE.bimap(
          Res.matchResult(
            (e) => Res.success(e),
            (a) => Res.failure(`${a}${a}`)
          ),
          CRE.pure('Dog')
        ),
        {},
        (a) => {
          expect(a).toEqual(Res.failure('DogDog'))
          done()
        }
      )
    })
  })

  describe('race', () => {
    it('Horse wins again', (done) => {
      CRE.run(
        CRE.race(
          CRE.withDelay(120, CRE.pure('dog')),
          CRE.withDelay(110, CRE.pure('cat')),
          CRE.withDelay(100, CRE.pure('horse'))
        ),
        {},
        (a) => {
          expect(a).toEqual(Res.success('horse'))
          done()
        }
      )
    })
  })

  describe('timeout', () => {
    it('Times out', (done) => {
      CRE.run(
        CRE.withTimeout(
          100,
          'oh no',
          CRE.withDelay(200, CRE.pure('great job'))
        ),
        {},
        (a) => {
          expect(a).toEqual(Res.failure('oh no'))
          done()
        }
      )
    })
  })

  describe('list', () => {
    it('Returns the list in order, whether they pass or fail', (done) => {
      CRE.run(
        CRE.list(
          CRE.pure(1),
          CRE.pure(2),
          CRE.pure(3),
          CRE.pure(4),
          CRE.pureFail('oh no')
        ),
        {},
        (res) => {
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
