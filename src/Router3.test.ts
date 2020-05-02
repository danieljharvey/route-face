import * as R from './Router3'
import * as t from 'io-ts'
import * as C from './ContReaderEither'
import * as Res from './Result'

import * as fc from 'fast-check'
import { getArbitrary } from 'fast-check-io-ts'

const requestArb = getArbitrary(R.request)

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
    it('Appends two routes', done => {
      const routeDetails = R.detailsFromRequest({
        method: 'Get',
        path: '/horses/are/good',
      })
      const route = R.appendRoute(
        R.fromValidator(t.literal('horses')),
        R.fromValidator(t.literal('are'))
      )
      const cont = R.runRoute(route, routeDetails)
      C.run(cont, {}, result => {
        if (Res.isSuccess(result)) {
          expect(result.value.values).toEqual([
            'horses',
            'are',
          ])
        } else {
          expect(true).toBeFalsy()
        }
        done()
      })
    })
  })

  const runMany = <As extends any[], Bs extends any[]>(
    routes: R.Route<{}, As, Bs>[],
    details: R.RouteDetails<As>
  ): Promise<Res.Result<string, R.RouteDetails<Bs>>[]> =>
    C.runToPromise(
      C.list(
        routes.map(route => R.runRoute(route, details)),
        'The list is empty'
      ),
      {}
    )

  describe('makeRoute', () => {
    it('A wrapped single route has no effect', () => {
      fc.assert(
        fc.asyncProperty(requestArb, async req => {
          const pathA = R.makeRoute(R.pathLit('dog')).done()
          const pathB = R.pathLit('dog')
          const routeDetails = R.detailsFromRequest(req)
          const matches = await C.runToPromise(
            C.list(
              [pathA, pathB].map(route =>
                R.runRoute(route, routeDetails)
              ),
              'The list is empty'
            ),
            {}
          )

          expect(matches[0]).toEqual(matches[1])
        })
      )
    })

    it('Append is equivalent to binding Conts', () => {
      fc.assert(
        fc.asyncProperty(requestArb, async req => {
          const routeDetails = R.detailsFromRequest(req)
          const withRoute = R.runRoute(
            R.makeRoute(R.pathLit('dog'))
              .append(R.pathLit('time'))
              .done(),
            routeDetails
          )
          const withCont = C.bind<
            {},
            string,
            R.RouteDetails<['dog']>,
            R.RouteDetails<['dog', 'time']>
          >(
            R.runRoute(R.pathLit('dog'), routeDetails),
            rd =>
              R.runRoute<
                {},
                string,
                ['dog'],
                ['dog', 'time']
              >(R.pathLit('time'), rd)
          )

          const matches = await C.runToPromise(
            C.list([withRoute, withCont], 'Empty list'),
            {}
          )
          expect(matches[0]).toEqual(matches[1])
        })
      )
    })
  })
})
