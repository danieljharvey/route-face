import * as CRE from './ContReaderEither'
import * as Res from './Result'

describe('ContReaderEither', () => {
  describe('List', () => {
    it('Returns error on empty list', done => {
      CRE.run(
        CRE.list([], 'this list is empty, my dude'),
        {},
        res => {
          expect((res as any).value).toEqual(
            'this list is empty, my dude'
          )
          done()
        }
      )
    })
    it('Returns the list in order, whether they pass or fail', done => {
      const items = [1, 2, 3, 4]
        .map(CRE.pure)
        .concat([CRE.pureFail('oh no')])
      CRE.run(
        CRE.list(items, 'The list is empty'),
        {},
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
