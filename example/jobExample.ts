import axios from 'axios'
import * as J from '../src/job/job'
import * as Res from '../src/result/Result'

// an Job is a box in which you capture something effectful
// along with some error handling

// it has two type parameters:
// E, which is the type of the errors
// A, the type of the result

// we'll worry about the A first, and come back to the others
// let's make our first Job

const myFirstJob = J.makeJob(success => success('Hello!'))

// what happens though?
// nothing!

// That's because our Job is Lazy.
// it means we can run it whenever WE want.

// Let's do that

J.run(myFirstJob, console.log)

// console.log -> { type: 'Success', value: "Hello!" }

// this gives us our message as well as the type: "Success"
// to tell us everything went fine

// the whole deal is quite verbose though!
// fortunately we have a function that does this task that we often want to do, called pure
const myNiceQuickJob = J.pure(['Dogs', 'are', 'nice'])

// our whole endeavour becomes a little nicer now...

J.run(myNiceQuickJob, console.log)

// console.log -> { type: 'Success', value: [ 'Dogs', 'are', 'nice' ] }

// Success is all very well and good, but where there is light there must also be darkness
// We can also express failure too

const badJob = J.pureFail('Oh no!')

// this is the type of badJob,
// E is string
// A is unknown
type BadJob = J.Job<string, unknown>

// let's run it...

J.run(badJob, console.log)

// console.log -> { type: 'Failure', value: 'Oh no!' }

// The difference between this and something like a Promise
// is that there are no Errors (as in the Javascript class)
// which means no throwing, and we know that control isn't
// going to jump out of our functions if something goes wrong

// We can express this using Job
// here is a Job that either succeeds or fails
// if it success, it returns the string array ["Dogs","are","nice"]
// if something goes wrong, it fails with "Something went very wrong"

const myLuckyJob: J.Job<
  string, // E, our error type (a string)
  string[] // A, our return type (an array of strings)
> = J.makeJob((success, failure) => {
  const goodNews = Math.random() > 0.5
  return goodNews
    ? success(['Dogs', 'are', 'nice'])
    : failure('Something went very wrong')
})

J.run(myLuckyJob, console.log)

// console.log -> { type: 'Failure', value: 'Something went very wrong' }
// or
// console.log -> { type: 'Success', value: ['Dogs', 'are', 'nice'] }

// Let's do something a little bit more Real World with a very real chance of failure
// - fetch dog pictures
const baseUrl = 'https://dog.ceo/api'

type DogResponse = { message: string; status: string }

const dogJob = J.fromPromise(
  () =>
    axios
      .get<DogResponse>(
        `${baseUrl}/breed/samoyed/images/random`
      )
      .then(response => response.data as DogResponse),
  e => e.message || 'Unknown error'
)

// let's run it...

J.run(dogJob, console.log)

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

const getByBreed = (breed: Breed) =>
  `${baseUrl}/breed/${breed}/images/random`

const dogByBreedJob = (
  breed: Breed
): J.Job<string, string> =>
  J.fromPromise(
    () =>
      axios
        .get<DogResponse>(getByBreed(breed))
        .then(response =>
          response.data.status === 'success'
            ? Promise.resolve(response.data.message)
            : Promise.reject('Dog API did not succeed')
        ),
    e => e.message
  )

// Why stop at one dog?
// We can do a whole bunch of them!
const manyBreeds = J.list(
  dogByBreedJob('pug'),
  dogByBreedJob('samoyed'),
  dogByBreedJob('shiba'),
  dogByBreedJob('whippet')
).map(Res.all)

J.run(manyBreeds, console.log)

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
const manyBreedsJob2 = J.list(
  dogByBreedJob('pug'),
  dogByBreedJob('samoyed'),
  dogByBreedJob('shiba'),
  dogByBreedJob('whippet')
).map(Res.any)

J.run(manyBreedsJob2, console.log)

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
const saveCache = (
  breed: Breed,
  url: string
): J.Job<string, void> =>
  J.makeJob(success => {
    dogCache[breed] = url
    success(undefined)
  })

// reads the item from the cache if it exists
// we are using pureAction here as our function only reads
// and does no real actions
const readCache = (breed: Breed) =>
  J.makeJob<string, DogValue>((success, failure) =>
    dogCache[breed] !== undefined
      ? success({
          fromCache: true,
          value: dogCache[breed],
        })
      : failure(`No cache for ${breed}`)
  )

// saves the item in the cache, returns it regardless of whether it succeeded
// or not
const saveAndReturn = (
  breed: Breed,
  url: string
): J.Job<string, string> =>
  saveCache(breed, url).bind(_ => J.pure(url))

// fetch from API, save in cache
const dogByBreedWithCache = (breed: Breed) =>
  dogByBreedJob(breed)
    .bind(url => saveAndReturn(breed, url))
    .map(url => ({ fromCache: false, value: url }))

const dogFromAPIOrCache = (breed: Breed) =>
  readCache(breed).alt([dogByBreedWithCache(breed)])

// let's try it for a bunch of dogs
const fetchManyDogs = J.list(
  dogFromAPIOrCache('pug'),
  dogFromAPIOrCache('samoyed'),
  dogFromAPIOrCache('shiba'),
  dogFromAPIOrCache('whippet')
).map(Res.all)

console.log('dogCache before', dogCache)

// and run it twice

J.runToPromise(fetchManyDogs)
  .then(a => console.log('first response', a))
  .then(() =>
    J.runToPromise(fetchManyDogs).then(a => {
      console.log('second response', a)
      console.log('dogCache after', dogCache)
    })
  )

// what if we wish to find out which dog is fastest (at loading)?
const getFastestDog = dogFromAPIOrCache('greyhound/italian')
  .race([dogFromAPIOrCache('whippet')])
  .map(a => `The winner is ${a.value}`)

// this time it was the Italian Greyhound

J.run(getFastestDog, console.log)

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

J.run(raceTwo, console.log)

/*
{
  type: 'Success',
  value: 'The winner is https://images.dog.ceo/breeds/puggle/IMG_151824.jpg'
}
*/

// an action that mostly fails
const sometimesFail = J.makeJob((success, failure) =>
  Math.random() > 0.8
    ? success('Good news')
    : failure('oh dear')
)

// an API that mostly fails
const flakyDogAPI = (breed: Breed) =>
  sometimesFail.bind(_ => dogByBreedJob(breed))

// this mostly fails

J.run(flakyDogAPI('pug'), a => console.log('Flaky API', a))

/*
{ 
  type: 'Failure',
  value: 'oh dear'
}
*/

// that's shit right?
// enter: retry

// this will try 5 times before giving up

J.run(flakyDogAPI('pug').retry(4), a =>
  console.log('Flaky API with retries', a)
)

// alternatively though, we might want to implement stuff like back off

// retryWithCount gives a count so we can change our approach each time
// attemptNum starts at 0 so we'll get delays of 0ms, 10ms, 40ms, 90ms, 160ms

const withBackoff = J.retryWithCount(
  attemptNum =>
    flakyDogAPI('pug').delay(attemptNum * attemptNum * 10),
  5
)

J.run(withBackoff, a =>
  console.log('Flaky API with backoff', a)
)

// some APIs are so flaky that they just stall and don't time out for ages
// this is easy to tame

const withTimeout = flakyDogAPI('pug').timeout(
  20,
  'Request timed out'
)

// if the action takes longer than 20ms, we get the error instead

J.run(withTimeout, a =>
  console.log('Flaky API with timeout', a)
)

// we don't need to return a callback
// runToPromise returns a Promise with our result A in it,
// or fails with the error value E in it
const promise = J.runToPromise(withTimeout)
  .then(a => {
    console.log('our success value', a)
  })
  .catch(e => {
    console.log('our failure value', e)
  })

// or runToResolvingPromise returns a resolving promise that contains a Result
// which contains either success A or error E.
const resolvingPromise = J.runToResolvingPromise(
  withTimeout
).then(
  Res.matchResult(
    e => console.log('failure value', e),
    a => console.log('success value', a)
  )
)
