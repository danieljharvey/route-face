import * as E from './Endpoint'
import * as R from './Router4'
import * as t from 'io-ts'

describe('Endpoint', () => {
  describe('get', () => {
    // posts/100/view/
    const getRoute = R.makeRoute
      .path('posts')
      .number()
      .path('view')
      .stringHeader('secret-token')
      .done()

    const getSample = E.endpoint(
      getRoute,
      ({ headers }) => {
        if (
          headers['secret-token'] === 'costanza' ||
          headers['secret-token'] === 'elaine'
        ) {
          return Promise.resolve('good')
        }
        return Promise.reject('bad')
      }
    )

    it('Fails when method does not match', done => {
      E.runEndpoint(getSample, {
        method: 'got',
        headers: { 'secret-token': 'poo' },
        url: '/posts/100/view/',
        postData: {},
      }).catch(e => {
        expect(typeof e).toEqual('string')
        done()
      })
    })
    it('Fails when url does not match', done => {
      E.runEndpoint(getSample, {
        method: 'get',
        headers: { 'secret-token': 'poo' },
        url: '/posts/100d/view/',
        postData: {},
      }).catch(e => {
        expect(typeof e).toEqual('string')
        done()
      })
    })
    it('Fails when header does not match', done => {
      E.runEndpoint(getSample, {
        method: 'get',
        headers: {},
        url: '/posts/100/view/',
        postData: {},
      }).catch(e => {
        expect(typeof e).toEqual('string')
        done()
      })
    })

    it('Runs a get endpoint but fluffs the password', done => {
      E.runEndpoint(getSample, {
        method: 'get',
        headers: { 'secret-token': 'jery' },
        url: '/posts/100/view/',
        postData: {},
      }).catch(e => {
        expect(e).toEqual('bad')
        done()
      })
    })

    it('Runs a get endpoint and totally nails the password', done => {
      E.runEndpoint(getSample, {
        method: 'get',
        headers: { 'secret-token': 'costanza' },
        url: '/posts/100/view/',
        postData: {},
      }).then(a => {
        expect(a).toEqual('good')
        done()
      })
    })
  })

  describe('post', () => {
    // posts/100/view/
    const postRoute = R.makeRoute
      .path('posts')
      .number()
      .path('view')
      .stringHeader('secret-token')
      .done()

    const samplePostData = t.type({
      name: t.string,
      age: t.number,
    })

    const postSample = E.endpoint(
      postRoute,
      //      samplePostData,
      ({ headers }) => {
        if (
          headers['secret-token'] === 'costanza' ||
          headers['secret-token'] === 'elaine'
        ) {
          return Promise.resolve('good')
        }
        return Promise.reject('bad')
      }
    )

    it('Fails when method does not match', done => {
      E.runEndpoint(postSample, {
        method: 'got',
        headers: { 'secret-token': 'poo' },
        url: '/posts/100/view/',
        postData: {},
      }).catch(e => {
        expect(typeof e).toEqual('string')
        done()
      })
    })
    it('Fails when url does not match', done => {
      E.runEndpoint(postSample, {
        method: 'post',
        headers: { 'secret-token': 'poo' },
        url: '/posts/100d/view/',
        postData: {},
      }).catch(e => {
        expect(typeof e).toEqual('string')
        done()
      })
    })
    it('Fails when header does not match', done => {
      E.runEndpoint(postSample, {
        method: 'post',
        headers: {},
        url: '/posts/100/view/',
        postData: {},
      }).catch(e => {
        expect(typeof e).toEqual('string')
        done()
      })
    })

    it('Runs a post endpoint but postData is wrong', done => {
      E.runEndpoint(postSample, {
        method: 'post',
        headers: { 'secret-token': 'jery' },
        url: '/posts/100/view/',
        postData: {},
      }).catch(e => {
        expect(typeof e).toEqual('string')
        done()
      })
    })

    it('Runs a post endpoint but fluffs the password', done => {
      E.runEndpoint(postSample, {
        method: 'post',
        headers: { 'secret-token': 'jery' },
        url: '/posts/100/view/',
        postData: { name: 'jery', age: 100 },
      }).catch(e => {
        expect(e).toEqual('bad')
        done()
      })
    })

    it('Runs a post endpoint and totally nails the password', done => {
      E.runEndpoint(postSample, {
        method: 'post',
        headers: { 'secret-token': 'costanza' },
        url: '/posts/100/view/',
        postData: { name: 'kramer', age: 200 },
      }).then(a => {
        expect(a).toEqual('good')
        done()
      })
    })
  })
})
