import * as JR from './jobReader/JobReader'

// allows us to use data and actions in our Context

interface Capability<Actions extends {}> {
  actions: Actions
}

const capability = <Actions extends {}>(
  actions: Actions
): Capability<Actions> => ({
  actions,
})

// these allow us to also carry around some other static data

interface CapabilityWithData<Data, Actions extends {}> {
  data: Data
  actions: Actions
}

const capabilityWithData = <Data, Actions extends {}>(
  data: Data,
  actions: Actions
): CapabilityWithData<Data, Actions> => ({
  data,
  actions,
})

// example one

interface WithLog {
  log: (a: string) => void
}

const withLog = (str: string) => <E, A>(
  value: A
): JR.Job<Capability<WithLog>, E, A> =>
  JR.jobRead(({ actions }, success) => {
    actions.log(str)
    success(value)
  })

// example two

interface WithDebugLog {
  debugLog: (a: string) => void
}

const withDebugLog = (str: string) => <E, A>(
  value: A
): JR.Job<Capability<WithDebugLog>, E, A> =>
  JR.jobRead(({ actions }, success) => {
    actions.debugLog(str)
    success(value)
  })

// example three

type User = {
  name: string
  id: number
  likesDogs: boolean
}

interface WithUser {
  getUser: (userId: number) => Promise<User>
  saveUser: (
    authToken: string,
    user: User
  ) => Promise<number>
}

// here we are grabbing the getUser function from Jobext
// allowing to be passed in
// the 'Data' generic means "there is something, we don't care what"
// this allows this function to be used with any kind of Data
const withGetUser = (userId: number) =>
  JR.fromPromise<Capability<WithUser>, string, User>(
    ({ actions }) => actions.getUser(userId),
    (e) => 'Error fetching user!'
  )

type WithAuthToken = {
  authToken: string
}

const withSaveUser = (user: User) =>
  JR.fromPromise<
    CapabilityWithData<WithAuthToken, WithUser>,
    string,
    number
  >(
    ({ actions, data }) =>
      actions.saveUser(data.authToken, user),
    (e) => `Error saving user ${user.name}`
  )

// actions for testing
const logAction: WithLog = {
  log: console.log,
}

const debugLogAction: WithDebugLog = {
  debugLog: (a: string) => console.error(a),
}

const userAction: WithUser = {
  getUser: (userId: number): Promise<User> =>
    Promise.resolve({
      id: userId,
      name: 'Steve',
      likesDogs: true,
    }),

  saveUser: (
    authToken: string,
    user: User
  ): Promise<number> =>
    authToken === 'supersecretyes'
      ? Promise.resolve(user.id)
      : Promise.reject('Terrible news, could not auth'),
}

// combining machinery

const allCommands = (data: WithAuthToken) =>
  capabilityWithData(data, {
    ...logAction,
    ...debugLogAction,
    ...userAction,
  })

const bigCommand = withGetUser(100)
  .bind(withLog(`Looks like we've found it.`))
  .map((user) => ({
    ...user,
    name: user.name.toUpperCase(),
  }))
  .bind(withSaveUser)

JR.run(
  bigCommand,
  allCommands({ authToken: 'hello' }),
  console.log
)

JR.run(
  bigCommand,
  allCommands({ authToken: 'supersecretyes' }),
  console.log
)
