import React, { useEffect } from 'react'

import {
  defineAction,
  defineState,
  dispatchAction,
  getMutableState,
  receiveActions,
  useHookstate,
  none,
  getState
} from '@etherealengine/hyperflux'
import { defineSystem } from '@etherealengine/engine/src/ecs/functions/SystemFunctions'

import { EntityUUID } from '@etherealengine/common/src/interfaces/EntityUUID'
import { isClient } from '@etherealengine/engine/src/common/functions/getEnvironment'

import { matches, string } from '@etherealengine/engine/src/common/functions/MatchesUtils'
import { NetworkTopics } from '@etherealengine/engine/src/networking/classes/Network'
import { WorldNetworkAction } from '@etherealengine/engine/src/networking/functions/WorldNetworkAction'

import { PhysicsSystem } from '@etherealengine/engine/src/physics/PhysicsModule'
import { Physics } from '@etherealengine/engine/src/physics/classes/Physics'

import { Vector3 } from 'three'
import { UUIDComponent } from '@etherealengine/engine/src/scene/components/UUIDComponent'
import { getComponent, setComponent } from '@etherealengine/engine/src/ecs/functions/ComponentFunctions'
import { TransformComponent } from '@etherealengine/engine/src/transform/components/TransformComponent'
import { VisibleComponent } from '@etherealengine/engine/src/scene/components/VisibleComponent'
import { NameComponent } from '@etherealengine/engine/src/scene/components/NameComponent'
import { PrimitiveGeometryComponent } from '@etherealengine/engine/src/scene/components/PrimitiveGeometryComponent'
import { ColliderComponent } from '@etherealengine/engine/src/scene/components/ColliderComponent'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { PhysicsState } from '@etherealengine/engine/src/physics/state/PhysicsState'
import { RigidBodyComponent } from '@etherealengine/engine/src/physics/components/RigidBodyComponent'
import { getInteractionGroups } from '@etherealengine/engine/src/physics/functions/getInteractionGroups'
import { CollisionGroups, DefaultCollisionMask } from '@etherealengine/engine/src/physics/enums/CollisionGroups'

//
// Description of the format of a spawn action to create a artifact
//

const spawnAction = defineAction({
  ...WorldNetworkAction.spawnObject.actionShape,
  prefab: 'ee.basic.ball',
  $topic: NetworkTopics.world
})

//
// Global state that tracks locally spawned or destroyed artifacts by using action receptors
//

export const BasicState = defineState({
  name: 'ee.basic.BasicState',
  initial: {} as Record< EntityUUID, {} >,
  receptors: [
    [
      spawnAction,
      (state, action: typeof spawnAction.matches._TYPE) => {
        state[action.entityUUID].merge({})
      }
    ],
    [
      WorldNetworkAction.destroyObject,
      (state, action: typeof WorldNetworkAction.destroyObject.matches._TYPE) => {
        state[action.entityUUID].set(none)
      }
    ]
  ]
})

//
// A reactor such that each basic state record has an associated a visual artifact
//

const ArtifactReactor = ({ entityUUID }: { entityUUID: EntityUUID }) => {
  const basicState = useHookstate(getMutableState(BasicState)[entityUUID])
  useEffect(() => {
    const entity = UUIDComponent.getEntityByUUID(entityUUID)
    setComponent(entity, TransformComponent)
    setComponent(entity, VisibleComponent)
    setComponent(entity, NameComponent,'hello')
    setComponent(entity, PrimitiveGeometryComponent, { geometryType: 1 })

    /*

    setComponent(entity, ColliderComponent, {
      bodyType: 0, // dynamic
      shapeType: 1, // sphere
      collisionMask: 1,
      restitution: 0.5
    })

    const rigidBodyDesc = RigidBodyDesc.dynamic()
    Physics.createRigidBody(entity, getState(PhysicsState).physicsWorld, rigidBodyDesc, [])
  
    const rigidBody = getComponent(entity, RigidBodyComponent)
  
    const interactionGroups = getInteractionGroups(CollisionGroups.Default, DefaultCollisionMask)
    const colliderDesc = ColliderDesc.ball(0.1).setCollisionGroups(interactionGroups)
    colliderDesc.setRestitution(1)
  
    Physics.createColliderAndAttachToRigidBody(getState(PhysicsState).physicsWorld, colliderDesc, rigidBody.body)
  
    */

    if(isClient) return

    // positions are networked intrinsically

    const x = Math.random()*10
    const y = 0
    const z = Math.random()*10
    const transform = getComponent(entity,TransformComponent)
    transform.position.set(x,y,z)

    // forces are networked intrinsically

    //const angle = Math.random()*Math.PI*2
    //const direction = new Vector3( Math.sin(angle),0,Math.cos(angle))
    //const velocity = 0.025 + Math.random()*0.01
    //rigidBody.body.applyImpulse(direction.multiplyScalar(velocity), true)

  }, [])
  return null
}

//
// Observe spawn events and make sure there are sub reactors that reflect them
// Make sub-reactors for each entry
//

const reactor = () => {
  const basicState = useHookstate(getMutableState(BasicState))
  return (
    <>
      {basicState.keys.map((entityUUID: EntityUUID) => (
        <ArtifactReactor entityUUID={entityUUID} />
      ))}
    </>
  )
}

let counter = 0

//
// Periodically change the basic state
//

const execute = () => {
  receiveActions(BasicState)

  if(isClient) return
  counter++
  if(counter&255) return

  const entityUUID = `basic-${counter}` as EntityUUID
  const prefab = 'ee.basic.ball'
  const action = spawnAction({ entityUUID, prefab })
  dispatchAction(action)
}

//
// System
//

export const BasicSystem = defineSystem({
  uuid: 'basic.system',
  reactor,
  execute,
  insert: { after: PhysicsSystem }
})
