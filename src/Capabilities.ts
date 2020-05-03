import * as C from './ContReaderEither'
import { Spread } from './Spread'

type WithLog = {
  log: (a: string) => void
}

const withLog = <Eff extends WithLog>(
  str: string
): C.Cont<Eff, unknown, string> =>
  C.contRead(({ log }, success) => {
    log(str)
    success(str)
  })

type WithDebugLog = {
  debugLog: (a: string) => void
}

const withDebugLog = <Eff extends WithDebugLog>(
  str: string
): C.Cont<Eff, unknown, string> =>
  C.contRead(({ debugLog }, success) => {
    debugLog(str)
    success(str)
  })

const log: WithLog = {
  log: console.log,
}

const debugLog: WithDebugLog = {
  debugLog: (a: string) => console.error(a),
}

const combine = <A extends object, B extends object>(
  a: A,
  b: B
): Spread<A, B> => ({
  ...a,
  ...b,
})

const allCommands = combine(log, debugLog)

allCommands.log('yes')
allCommands.debugLog('no')

C.run(
  C.bind(withLog('test'), withDebugLog),
  allCommands,
  console.log
)
