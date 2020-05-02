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

C.run(myFirstCont, {}, console.log)
// console.log -> { type: 'Success', value: "Hello!" }

// this gives us our message as well as the type: "Success"
// to tell us everything went fine

// the whole deal is quite verbose though!
// fortunately we have a function that does this task that we often want to do, called pure
const myNiceQuickCont = C.pure(['Dogs', 'are', 'nice'])

// our whole endeavour becomes a little nicer now...
C.run(myNiceQuickCont, {}, console.log)
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
C.run(badCont, {}, console.log)
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

C.run(myLuckyCont, {}, console.log)
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

C.run(myReaderLoggerCont('hello'), 'dev', console.log)
// console.log -> dev: hello
// console.log -> { type: 'Success', value: 'hello' }

// in prod we don't want that logging though
//
C.run(myReaderLoggerCont('hello'), 'prod', console.log)
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
C.run(dogCont, defaultEnv, console.log)
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
const manyBreeds = C.map(
  Res.all,
  C.list(
    (['pug', 'samoyed', 'shiba', 'whippet'] as Breed[]).map(
      dogByBreedCont
    ),
    'Empty list'
  )
)

C.run(manyBreeds, defaultEnv, console.log)
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
/*
// there is also the 'any' variety
const manyBreedsCont2 = A.listAnyCont(dogByBreedCont, [
  'pug',
  'samoyed',
  'shiba',
  'whippet',
])

A.runCont(manyBreedsCont2).then(console.log)
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

/*
let dogCache: { [key: string]: string } = {}

type DogValue = {
  fromCache: boolean
  value: string
}

// saves the cache, returns nothing
const saveCache = (
  breed: Breed,
  url: string
): A.Cont<string, void> =>
  A.createSimple({
    simpleAction: () => {
      dogCache[breed] = url
      return Promise.resolve()
    },
    simpleCatcher: _ =>
      `Error saving ${url} to breed ${breed}`,
  })

// reads the item from the cache if it exists
// we are using pureAction here as our function only reads
// and does no real actions
const readCache = (
  breed: Breed
): A.Cont<string, DogValue> =>
  A.createPure({
    pureAction:
      dogCache[breed] !== undefined
        ? A.success({
            fromCache: true,
            value: dogCache[breed],
          })
        : A.failure(`No cache for ${breed}`),
    catcher: _ =>
      A.failure(`Error fetching ${breed} from cache`),
  })

// saves the item in the cache, returns it regardless of whether it succeeded
// or not
const saveAndReturn = (breed: Breed, url: string) =>
  A.nextCont(saveCache(breed, url), A.pure(url))

// get dog, grab interesting part (the url), save it in cache, and mark as not from cache
const dogByBreed2 = (
  breed: Breed
): A.Cont<string, DogValue> =>
  A.mapCont(
    A.bindCont(dogByBreedCont(breed), url =>
      saveAndReturn(breed, url)
    ),
    url => ({
      fromCache: false,
      value: url,
    })
  )

// we can also use chain() to write the above in a slightly more readable
// fashion
const dogByBreed3 = (
  breed: Breed
): A.Cont<string, DogValue> =>
  A.chain(dogByBreedCont(breed))
    .bind(url => saveAndReturn(breed, url))
    .map(url => ({ fromCache: false, value: url }))
    .done()

const dogFromAPIOrCache = (
  breed: Breed
): A.Cont<string, DogValue> =>
  A.altCont(readCache(breed), dogByBreed3(breed))

// let's try it for a bunch of dogs
const fetchManyDogs = A.listAnyCont(dogFromAPIOrCache, [
  'pug',
  'samoyed',
  'shiba',
  'whippet',
])

console.log('dogCache', dogCache)

// and run it twice
A.runCont(fetchManyDogs)
  .then(a => console.log('first time', a))
  .then(() =>
    A.runCont(fetchManyDogs).then(a =>
      console.log('second time', a)
    )
  )

// what if we wish to find out which dog is fastest (at loading)?
const getFastestDog = A.chain(
  A.raceCont(
    dogFromAPIOrCache('greyhound/italian'),
    dogFromAPIOrCache('whippet')
  )
)
  .map(a => `The winner is ${a.value}`)
  .done()

// this time it was the Italian Greyhound
A.runCont(getFastestDog).then(console.log)
/*
{
  type: 'Success',
  value: `The winner is https://images.dog.ceo/breeds/greyhound-italian/n02091032_1933.jpg`
}
*/

/*
// The pug is going to struggle here, let's give it a 200ms headstart
const raceTwo = A.chain(
  A.raceCont(
    A.withDelay(
      dogFromAPIOrCache('greyhound/italian'),
      200
    ),
    dogFromAPIOrCache('pug')
  )
)
  .map(a => `The winner is ${a.value}`)
  .done()

// well done!
A.runCont(raceTwo).then(console.log)
/*
{
  type: 'Success',
  value: 'The winner is https://images.dog.ceo/breeds/puggle/IMG_151824.jpg'
}
*/

/*
// an action that mostly fails
const sometimesFail = A.create({
  action: () =>
    Promise.resolve(
      Math.random() > 0.8
        ? A.success('Good news')
        : A.failure('oh dear')
    ),
  catcher: _ =>
    A.failure('Something inexplicable went wrong'),
})

// an API that mostly fails
const flakyDogAPI = (breed: Breed) =>
  A.chain(sometimesFail)
    .bind(_ => dogByBreedCont(breed))
    .done()

// this mostly fails
A.runCont(flakyDogAPI('pug')).then(a =>
  console.log('Flaky API', a)
)
/*
{ 
  type: 'Failure',
  value: 'oh dear'
}
*/

// that's shit right?
// enter: retry
