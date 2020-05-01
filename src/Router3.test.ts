import * as R from './Router3'
import * as t from 'io-ts'
import * as C from './ContReaderEither'
import * as Res from './Result'

describe('Router3', () => {
  describe('route', () => {
    it('Error message when no paths to match', (done) => {
      const route = R.route(t.literal('horses'))

      C.run(route(R.emptyRouteDetails), {}, (result) => {
        expect(result.value).toEqual('No path to match')
        done()
      })
    })
    it('Makes a match', (done) => {
      const routeDetails = R.detailsFromRequest({
        method: 'Get',
        path: '/horses/are/good/',
      })
      const route = R.route(t.literal('horses'))

      C.run(route(routeDetails), {}, (result) => {
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

    it('Cannot make a match', (done) => {
      const routeDetails = R.detailsFromRequest({
        method: 'Get',
        path: '/horses/are/good/',
      })
      const route = R.route(t.literal('dogs'))

      C.run(route(routeDetails), {}, (result) => {
        expect(Res.isFailure(result)).toBeTruthy()
        done()
      })
    })
  })
})
