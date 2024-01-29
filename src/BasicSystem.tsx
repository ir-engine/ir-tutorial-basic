import React, { useEffect } from 'react'

import {
  defineAction,
  defineState,
  dispatchAction,
  getMutableState,
  none,
  useHookstate
} from '@etherealengine/hyperflux'

import { EntityUUID } from '@etherealengine/common/src/interfaces/EntityUUID'

import { NetworkTopics } from '@etherealengine/engine/src/networking/classes/Network'
import { WorldNetworkAction } from '@etherealengine/engine/src/networking/functions/WorldNetworkAction'

import { PhysicsSystem } from '@etherealengine/engine/src/physics/PhysicsModule'

import { isClient } from '@etherealengine/common/src/utils/getEnvironment'
import { defineSystem, getComponent, setComponent } from '@etherealengine/ecs'
import { PrimitiveGeometryComponent } from '@etherealengine/engine/src/scene/components/PrimitiveGeometryComponent'
import { TransformComponent } from '@etherealengine/engine/src/transform/components/TransformComponent'
import { NameComponent } from '@etherealengine/engine/src/common/NameComponent'
import { UUIDComponent } from '@etherealengine/engine/src/common/UUIDComponent'
import { VisibleComponent } from '@etherealengine/engine/src/renderer/components/VisibleComponent'

//
// Description of the format of a spawn action to create a artifact
//

class BasicActions {
  static spawnAction = defineAction({
    ...WorldNetworkAction.spawnObject.actionShape,
    prefab: 'ee.basic.ball',
    $topic: NetworkTopics.world
  })
}

//
// Global state that tracks locally spawned or destroyed artifacts by using action receptors
//

export const BasicState = defineState({
  name: 'ee.basic.BasicState',
  initial: {} as Record<EntityUUID, {}>,
  receptors: {
    onSpawnAction: BasicActions.spawnAction.receive((action) => {
      const state = getMutableState(BasicState)
      state[action.entityUUID].merge({})
    }),
    onDestroyObject: WorldNetworkAction.destroyObject.receive((action) => {
      const state = getMutableState(BasicState)
      state[action.entityUUID].set(none)
    })
  }
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
    setComponent(entity, NameComponent, 'hello')
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

    if (isClient) return

    // positions are networked intrinsically

    const x = Math.random() * 10
    const y = 0
    const z = Math.random() * 10
    const transform = getComponent(entity, TransformComponent)
    transform.position.set(x, y, z)

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
  if (isClient) return
  counter++
  if (counter & 255) return

  const entityUUID = `basic-${counter}` as EntityUUID
  const prefab = 'ee.basic.ball'
  const action = BasicActions.spawnAction({ entityUUID, prefab })
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
