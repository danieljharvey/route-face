import {
  RouteErrors,
  HandlerError,
  APIError,
  PathError,
} from './Types'
import {
  mostRelevantRouteError,
  mostRelevantFromList,
} from './ClosestError'
import * as Res from '../result/Result'

const routeError: RouteErrors = {
  type: 'RouteErrors',
  method: 'match',
  path: 'match',
  headers: 'match',
  postData: 'match',
}

describe('mostRelevantRouteError', () => {
  it('No path errors is better than some path errors', () => {
    const pathError: RouteErrors = {
      ...routeError,
      path: {
        type: 'PathError',
        matches: [
          Res.success('dog'),
          Res.failure({ expected: 'log', value: 'lag' }),
          Res.failure({ expected: 'bog', value: 'bag' }),
        ],
      },
    }
    expect(
      mostRelevantRouteError(routeError, pathError)
    ).toEqual(routeError)
    expect(
      mostRelevantRouteError(pathError, routeError)
    ).toEqual(routeError)
  })
  it('Some path matches is better than less path matches', () => {
    const lessMatches: RouteErrors = {
      ...routeError,
      path: {
        type: 'PathError',
        matches: [
          Res.success('dog'),
          Res.failure({ expected: 'log', value: 'lag' }),
          Res.failure({ expected: 'bog', value: 'bag' }),
        ],
      },
    }

    const moreMatches: RouteErrors = {
      ...routeError,
      path: {
        type: 'PathError',
        matches: [
          Res.success('dog'),
          Res.success('log'),
          Res.failure({ expected: 'bog', value: 'bag' }),
        ],
      },
    }

    expect(
      mostRelevantRouteError(lessMatches, moreMatches)
    ).toEqual(moreMatches)
    expect(
      mostRelevantRouteError(moreMatches, lessMatches)
    ).toEqual(moreMatches)
  })
  it('A method error is less important', () => {
    const methodError: RouteErrors = {
      ...routeError,
      method: {
        type: 'MethodError',
        matches: {
          expected: 'post',
          value: 'GET',
        },
      },
    }
    expect(
      mostRelevantRouteError(methodError, routeError)
    ).toEqual(routeError)
    expect(
      mostRelevantRouteError(routeError, methodError)
    ).toEqual(routeError)
  })
})

describe('mostRelevantFromList', () => {
  it('A HandlerError still prevails', () => {
    const lessMatches: RouteErrors = {
      ...routeError,
      path: {
        type: 'PathError',
        matches: [
          Res.success('dog'),
          Res.failure({ expected: 'log', value: 'lag' }),
          Res.failure({ expected: 'bog', value: 'bag' }),
        ],
      },
    }

    expect(
      mostRelevantFromList(
        routeError,
        lessMatches,
        lessMatches,
        lessMatches
      )
    ).toEqual(routeError)
    expect(
      mostRelevantFromList(
        lessMatches,
        lessMatches,
        lessMatches,
        routeError
      )
    ).toEqual(routeError)
  })
})
