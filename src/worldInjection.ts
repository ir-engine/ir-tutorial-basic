
import { EntityUUID } from '@etherealengine/common/src/interfaces/EntityUUID'
import { matches, matchesEntityUUID, matchesUserId } from '@etherealengine/engine/src/common/functions/MatchesUtils'
import { defineSystem } from '@etherealengine/engine/src/ecs/functions/SystemFunctions'
import { NetworkTopics } from '@etherealengine/engine/src/networking/classes/Network'
import { PhysicsSystem } from '@etherealengine/engine/src/physics/PhysicsModule'

import {
  defineAction,
  defineState,
  dispatchAction,
  getMutableState,
  none,
  receiveActions,
  useHookstate
} from '@etherealengine/hyperflux'

import { WorldNetworkAction } from '@etherealengine/engine/src/networking/functions/WorldNetworkAction'

class BasicActions {
  static spawnBall = defineAction({
    ...WorldNetworkAction.spawnObject.actionShape,
    prefab: 'ee.basic.ball',
    $topic: NetworkTopics.world
  })
}

function spawnBall(entityUUID: EntityUUID) {

}

export const BasicState = defineState({
  name: 'ee.basic.BasicState',
  initial: {
    ball: null as EntityUUID | null
  },

  receptors: [
    [
      BasicActions.spawnBall,
      (state, action: typeof BasicActions.spawnBall.matches._TYPE) => {
        state.ball.set(action.entityUUID)

        // @todo arguably a reactor would be better than this
        spawnBall(action.entityUUID)
      }
    ],

    [
      WorldNetworkAction.destroyObject,
      (state, action: typeof WorldNetworkAction.destroyObject.matches._TYPE) => {
        if(action.entityUUID == state.ball.value) {

        }
        state.ball.set(null)
        for (const ballUUID of state.keys) {
          const ball = state[ballUUID as EntityUUID]
          if (ball.ball.value === action.entityUUID) {
            ball.ball.set(null)
            // remove the ball
          }
        }
      }
    ]
  ]
})

export const SpawnSystem = defineSystem({
  uuid: 'basic.spawn-system',
  execute: () => {
    receiveActions(BasicState)

    // - if server then periodically spawn a ball and destroy when they hit the ground
    // - i guess i should have a record of multiple balls rather than just one

  },
  insert: { after: PhysicsSystem }
})

export default async function worldInjection() {}
