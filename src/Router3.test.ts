import * as R from './Router3'
import * as t from 'io-ts'
import * as C from './ContReaderEither'
import * as Res from './Result'

describe('Router3', () => {
  describe('fromValidator', () => {
    it('Error message when no paths to match', done => {
      const route = R.fromValidator(t.literal('horses'))
      const cont = R.runRoute(route, R.emptyRouteDetails)
      C.run(cont, {}, result => {
        expect(result.value).toEqual('No path to match')
        done()
      })
    })
    it('Makes a match', done => {
      const routeDetails = R.detailsFromRequest({
        method: 'Get',
        path: '/horses/are/good/',
      })
      const route = R.fromValidator(t.literal('horses'))
      const cont = R.runRoute(route, routeDetails)
      C.run(cont, {}, result => {
        if (Res.isSuccess(result)) {
          expect(result.value.values).toEqual(['horses'])
          expect(result.value.remainder).toEqual([
            'are',
            'good',
          ])
        } else {
          expect(true).toBeFalsy()
        }

        done()
      })
    })

    it('Cannot make a match', done => {
      const routeDetails = R.detailsFromRequest({
        method: 'Get',
        path: '/horses/are/good/',
      })
      const route = R.fromValidator(t.literal('dogs'))
      const cont = R.runRoute(route, routeDetails)
      C.run(cont, {}, result => {
        expect(Res.isFailure(result)).toBeTruthy()
        done()
      })
    })
  })
})
