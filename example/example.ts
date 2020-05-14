import axios from 'axios'
import * as C from '../src/ContReaderEither'
import * as Res from '../src/Result'

// an Cont is a box in which you capture something effectful
// along with some error handling

/*
export type Cont<Ctx, E, A> = {
  type: 'Cont'
  body: (
    context: Ctx,
    success: (a: A) => void,
    failure: (e: E) => void
  ) => void
}
*/

// it has three type parameters:
// Ctx, the type of the context
// E, which is the type of the errors
// A, the type of the result

// we'll worry about the A first, and come back to the others
// let's make our first Cont

const myFirstCont: C.Cont<
  unknown,
  unknown,
  string
> = C.cont(success => success('Hello!'))

// what happens though?
// nothing!

// That's because our Cont is Lazy.
// it means we can run it whenever WE want.

// Let's do that

// C.run(myFirstCont, {}, console.log)

// console.log -> { type: 'Success', value: "Hello!" }

// this gives us our message as well as the type: "Success"
// to tell us everything went fine

// the whole deal is quite verbose though!
// fortunately we have a function that does this task that we often want to do, called pure
const myNiceQuickCont = C.pure(['Dogs', 'are', 'nice'])

// our whole endeavour becomes a little nicer now...

// C.run(myNiceQuickCont, {}, console.log)

// console.log -> { type: 'Success', value: [ 'Dogs', 'are', 'nice' ] }

// Success is all very well and good, but where there is light there must also be darkness
// We can also express failure too

const badCont = C.pureFail('Oh no!')

// this is the type of badCont,
// Ctx is unknown
// E is string
// A is unknown
type BadCont = C.Cont<unknown, string, unknown>

// let's run it...

// C.run(badCont, {}, console.log)

// console.log -> { type: 'Failure', value: 'Oh no!' }

// The difference between this and something like a Promise
// is that there are no Errors (as in the Javascript class)
// which means no throwing, and we know that control isn't
// going to jump out of our functions if something goes wrong

// We can express this using Cont
// here is a Cont that either succeeds or fails
// if it success, it returns the string array ["Dogs","are","nice"]
// if something goes wrong, it fails with "Something went very wrong"

const myLuckyCont: C.Cont<
  unknown, // Ctx, which we are ignoring for now
  string, // E, our error type (a string)
  string[] // A, our return type (an array of strings)
> = C.cont((success, failure) => {
  const goodNews = Math.random() > 0.5
  return goodNews
    ? success(['Dogs', 'are', 'nice'])
    : failure('Something went very wrong')
})

// C.run(myLuckyCont, {}, console.log)

// console.log -> { type: 'Failure', value: 'Something went very wrong' }
// or
// console.log -> { type: 'Success', value: ['Dogs', 'are', 'nice'] }

// let's talk about the Ctx variable
// it lets us pass around some static options
// and access them inside the environment

// we can use contRead to construct a Cont that cares about this

type Environment = 'dev' | 'staging' | 'prod'

const myReaderLoggerCont = (
  message: string
): C.Cont<Environment, unknown, string> =>
  C.contRead((env, success) => {
    if (env === 'dev' || env === 'staging') {
      console.log(`${env}: ${message}`)
    }
    success(message)
  })

// C.run(myReaderLoggerCont('hello'), 'dev', console.log)

// console.log -> dev: hello
// console.log -> { type: 'Success', value: 'hello' }

// in prod we don't want that logging though

// C.run(myReaderLoggerCont('hello'), 'prod', console.log)

// we just get the return value
// console.log -> { type: 'Success', value: 'hello' }

// Let's do something a little bit more Real World with a very real chance of failure
// - fetch dog pictures
type Env = {
  baseUrl: string
}

const defaultEnv: Env = {
  baseUrl: 'https://dog.ceo/api',
}

type DogResponse = { message: string; status: string }

const dogCont = C.fromPromise(
  (env: Env) =>
    axios
      .get<DogResponse>(
        `${env.baseUrl}/breed/samoyed/images/random`
      )
      .then(response => response.data as DogResponse),
  e => e.message || 'Unknown error'
)

// let's run it...
// we're passing defaultEnv which contains our paths

// C.run(dogCont, defaultEnv, console.log)

/*
 * console.log ->
 * { type: 'Success',
 *   value: {
 *     message: 'https://images.dog.ceo/breeds/samoyed/n02111889_3400.jpg',
 *     status: 'success'
 *   }
 * }
 */
// console.log -> { type: 'Failure', value: 'getaddrinfo ENOTFOUND dog.ceo' }

// Let's refine it a bit

type Breed =
  | 'samoyed'
  | 'shiba'
  | 'pug'
  | 'greyhound/italian'
  | 'whippet'

const getByBreed = (baseUrl: string, breed: Breed) =>
  `${baseUrl}/breed/${breed}/images/random`

const dogByBreedCont = (
  breed: Breed
): C.Cont<Env, string, string> =>
  C.fromPromise(
    env =>
      axios
        .get<DogResponse>(getByBreed(env.baseUrl, breed))
        .then(response =>
          response.data.status === 'success'
            ? Promise.resolve(response.data.message)
            : Promise.reject('Dog API did not succeed')
        ),
    e => e.message
  )

// Why stop at one dog?
// We can do a whole bunch of them!
const manyBreeds = C.list(
  dogByBreedCont('pug'),
  dogByBreedCont('samoyed'),
  dogByBreedCont('shiba'),
  dogByBreedCont('whippet')
).map(Res.all)

// C.run(manyBreeds, defaultEnv, console.log)

// if it goes wrong we get the first error:
/*
{ type: 'Failure', value: 'Dog API did not succeed'}
*/

// if not, a success with all the stuff inside
/*
{                   
  type: 'Success',  
  value: [          
      'https://images.dog.ceo/breeds/pug/n02110958_12260.jpg',
      'https://images.dog.ceo/breeds/samoyed/n02111889_3253.jpg', 
      'https://images.dog.ceo/breeds/shiba/shiba-10.jpg',       
      'https://images.dog.ceo/breeds/whippet/n02091134_3685.jpg',
  ]                                                                       
}*/

// there is also the 'any' variety
const manyBreedsCont2 = C.list(
  dogByBreedCont('pug'),
  dogByBreedCont('samoyed'),
  dogByBreedCont('shiba'),
  dogByBreedCont('whippet')
).map(Res.any)

//C.run(manyBreedsCont2, defaultEnv, console.log)
//
// this will return only the successful results

/*
{                                                                                                     
  type: 'Success',                                                                                  
  value: [                                                                                          
      'https://images.dog.ceo/breeds/pug/n02110958_12260.jpg',                             
      'https://images.dog.ceo/breeds/whippet/n02091134_3685.jpg',   
  ]                                                                          
}*/

// What if our dog API is slow or we're repeating ourselves? We might want a
// local cache of results

let dogCache: { [key: string]: string } = {}

type DogValue = {
  fromCache: boolean
  value: string
}

// saves the cache, returns nothing
const saveCache = <Ctx>(
  breed: Breed,
  url: string
): C.Cont<Ctx, string, void> =>
  C.cont(success => {
    dogCache[breed] = url
    success(undefined)
  })

// reads the item from the cache if it exists
// we are using pureAction here as our function only reads
// and does no real actions
const readCache = (breed: Breed) =>
  C.cont<Env, string, DogValue>((success, failure) =>
    dogCache[breed] !== undefined
      ? success({
          fromCache: true,
          value: dogCache[breed],
        })
      : failure(`No cache for ${breed}`)
  )

// saves the item in the cache, returns it regardless of whether it succeeded
// or not
const saveAndReturn = <Ctx>(
  breed: Breed,
  url: string
): C.Cont<Ctx, string, string> =>
  saveCache(breed, url).bind(_ => C.pure(url))

// fetch from API, save in cache
const dogByBreedWithCache = (breed: Breed) =>
  dogByBreedCont(breed)
    .bind(url => saveAndReturn(breed, url))
    .map(url => ({ fromCache: false, value: url }))

const dogFromAPIOrCache = (breed: Breed) =>
  readCache(breed).alt([dogByBreedWithCache(breed)])

// let's try it for a bunch of dogs
const fetchManyDogs = C.list(
  dogFromAPIOrCache('pug'),
  dogFromAPIOrCache('samoyed'),
  dogFromAPIOrCache('shiba'),
  dogFromAPIOrCache('whippet')
).map(Res.all)

// console.log('dogCache before', dogCache)

// and run it twice

/*C.runToPromise(fetchManyDogs, defaultEnv)
  .then(a => console.log('first response', a))
  .then(() =>
    C.runToPromise(fetchManyDogs, defaultEnv).then(a => {
      console.log('second response', a)
      console.log('dogCache after', dogCache)
    })
  )
*/

// what if we wish to find out which dog is fastest (at loading)?
const getFastestDog = dogFromAPIOrCache('greyhound/italian')
  .race([dogFromAPIOrCache('whippet')])
  .map(a => `The winner is ${a.value}`)

// this time it was the Italian Greyhound

// C.run(getFastestDog, defaultEnv, console.log)

/*
{
  type: 'Success',
  value: `The winner is https://images.dog.ceo/breeds/greyhound-italian/n02091032_1933.jpg`
}
*/

// The pug is going to struggle here, let's give it a 200ms headstart
const raceTwo = dogFromAPIOrCache('greyhound/italian')
  .delay(200)
  .race([dogFromAPIOrCache('pug')])
  .map(a => `The winner is ${a.value}`)

// well done!

// C.run(raceTwo, defaultEnv, console.log)

/*
{
  type: 'Success',
  value: 'The winner is https://images.dog.ceo/breeds/puggle/IMG_151824.jpg'
}
*/

// an action that mostly fails
const sometimesFail = C.cont((success, failure) =>
  Math.random() > 0.8
    ? success('Good news')
    : failure('oh dear')
)

// an API that mostly fails
const flakyDogAPI = (breed: Breed) =>
  sometimesFail.bind(_ => dogByBreedCont(breed))

// this mostly fails

/*C.run(flakyDogAPI('pug'), defaultEnv, a =>
  console.log('Flaky API', a)
)*/

/*
{ 
  type: 'Failure',
  value: 'oh dear'
}
*/

// that's shit right?
// enter: retry

// this will try 5 times before giving up

/*
C.run(flakyDogAPI('pug').retry(4), defaultEnv, a =>
  console.log('Flaky API with retries', a)
)
*/

// alternatively though, we might want to implement stuff like back off

// retryWithCount gives a count so we can change our approach each time
// attemptNum starts at 0 so we'll get delays of 0ms, 10ms, 40ms, 90ms, 160ms

const withBackoff = C.retryWithCount(
  attemptNum =>
    flakyDogAPI('pug').delay(attemptNum * attemptNum * 10),
  5
)

/*
C.run(withBackoff, defaultEnv, a =>
  console.log('Flaky API with backoff', a)
)
*/

// some APIs are so flaky that they just stall and don't time out for ages
// this is easy to tame

const withTimeout = flakyDogAPI('pug').timeout(
  20,
  'Request timed out'
)

// if the action takes longer than 20ms, we get the error instead
/*
C.run(
  withTimeout,
  defaultEnv,
  a => console.log('Flaky API with timeout', a)
)
*/

// we don't need to return a callback
// runToPromise returns a Promise with our result A in it,
// or fails with the error value E in it
const promise = C.runToPromise(withTimeout, defaultEnv)
  .then(a => {
    console.log('our success value', a)
  })
  .catch(e => {
    console.log('our failure value', e)
  })

// or runToResolvingPromise returns a resolving promise that contains a Result
// which contains either success A or error E.
const resolvingPromise = C.runToResolvingPromise(
  withTimeout,
  defaultEnv
).then(
  Res.matchResult(
    e => console.log('failure value', e),
    a => console.log('success value', a)
  )
)
