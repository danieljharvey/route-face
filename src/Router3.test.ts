import * as R from './Router3'
import * as t from 'io-ts'
import * as Res from './Result'
import * as fc from 'fast-check'
import { getArbitrary } from 'fast-check-io-ts'

const requestArb = getArbitrary(R.request)

describe('Router3', () => {
  describe('fromValidator', () => {
    it('Error message when no paths to match', () => {
      const route = R.fromValidator(t.literal('horses'))

      expect(route(R.emptyRouteDetails)).toEqual(
        Res.failure('No path to match')
      )
    })
    it('Makes a match', () => {
      const routeDetails = R.detailsFromRequest({
        method: 'Get',
        path: '/horses/are/good/',
      })
      const route = R.fromValidator(t.literal('horses'))

      expect(route(routeDetails).found.values).toEqual(
        E.right(['horses'])
      )
    })

    it('Cannot make a match', () => {
      const routeDetails = R.detailsFromRequest({
        method: 'Get',
        path: '/horses/are/good/',
      })
      const route = R.fromValidator(t.literal('dogs'))

      expect(E.isLeft(route(routeDetails))).toBeTruthy()
    })
    it('Appends two routes', () => {
      const routeDetails = R.detailsFromRequest({
        method: 'Get',
        path: '/horses/are/good',
      })
      const route = pipe(
        E.right(routeDetails),
        E.chain(R.fromValidator(t.literal('horses'))),
        E.chain(R.fromValidator(t.literal('are')))
      )

      const result = E.fold(
        (_) => [],
        (a: R.RouteDetails<any>) => a.found.values
      )(route)
      expect(result).toEqual(['horses', 'are'])
    })
  })

  const requestAndTextArb = fc.record({
    name: fc.string(),
    request: requestArb,
  })
})
