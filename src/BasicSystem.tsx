import React, { useEffect } from 'react'

import { isClient } from '@ir-engine/common/src/utils/getEnvironment'
import {
  Engine,
  EntityUUID,
  SimulationSystemGroup,
  UUIDComponent,
  defineSystem,
  getComponent,
  setComponent
} from '@ir-engine/ecs'
import { ECSState } from '@ir-engine/ecs/src/ECSState'
import { PrimitiveGeometryComponent } from '@ir-engine/engine/src/scene/components/PrimitiveGeometryComponent'
import { GeometryTypeEnum } from '@ir-engine/engine/src/scene/constants/GeometryTypeEnum'
import {
  defineAction,
  defineState,
  dispatchAction,
  getMutableState,
  getState,
  none,
  useHookstate
} from '@ir-engine/hyperflux'
import { NetworkState, NetworkTopics, WorldNetworkAction } from '@ir-engine/network'
import { NameComponent } from '@ir-engine/spatial/src/common/NameComponent'
import { Physics } from '@ir-engine/spatial/src/physics/classes/Physics'
import { ColliderComponent } from '@ir-engine/spatial/src/physics/components/ColliderComponent'
import { RigidBodyComponent } from '@ir-engine/spatial/src/physics/components/RigidBodyComponent'
import { VisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import { SpawnObjectActions } from '@ir-engine/spatial/src/transform/SpawnObjectActions'
import { TransformComponent } from '@ir-engine/spatial/src/transform/components/TransformComponent'
import { Vector3 } from 'three'

/**
 * Basic actions to spawn and destroy objects
 * This extends and naturally utilizes the functionality in EntityNetworkState
 */

const BasicActions = {
  spawnAction: defineAction(
    SpawnObjectActions.spawnObject.extend({
      type: 'ee.basic.SPAWN_OBJECT',
      $topic: NetworkTopics.world
    })
  )
}

/**
 * Global state that tracks locally spawned or destroyed artifacts by using action receptors
 */

const BasicState = defineState({
  name: 'ee.basic.BasicState',

  initial: {} as Record<EntityUUID, {}>,

  receptors: {
    onSpawnAction: BasicActions.spawnAction.receive((action) => {
      const state = getMutableState(BasicState)
      state[action.entityUUID].merge({})
    }),
    onDestroyObject: WorldNetworkAction.destroyEntity.receive((action) => {
      const state = getMutableState(BasicState)
      state[action.entityUUID].set(none)
    })
  },

  /**
   * Observe spawn events and create a sub-reactor for each entry in the basic state
   */

  reactor: () => {
    const basicState = useHookstate(getMutableState(BasicState))
    return (
      <>
        {basicState.keys.map((entityUUID: EntityUUID) => (
          <BasicObject key={entityUUID} entityUUID={entityUUID} />
        ))}
      </>
    )
  }
})

/**
 * A reactor such that each basic state record has an associated a visual artifact
 */

const BasicObject = ({ entityUUID }: { entityUUID: EntityUUID }) => {
  /** Entity creation and destruction is handled by EntityNetworkState */
  const entity = UUIDComponent.useEntityByUUID(entityUUID)

  useEffect(() => {
    if (!entity) return

    setComponent(entity, TransformComponent, { scale: new Vector3(0.1, 0.1, 0.1) })
    setComponent(entity, VisibleComponent)
    setComponent(entity, NameComponent, entityUUID)
    setComponent(entity, PrimitiveGeometryComponent, { geometryType: GeometryTypeEnum.SphereGeometry })
    setComponent(entity, RigidBodyComponent, { type: 'dynamic' })
    setComponent(entity, ColliderComponent, { shape: 'sphere' })

    if (isClient) return

    const angle = Math.random() * Math.PI * 2
    const direction = new Vector3(Math.sin(angle), 0, Math.cos(angle))
    const velocity = 0.025 + Math.random() * 0.01
    const world = Physics.getWorld(entity)!
    Physics.applyImpulse(world, entity, direction.multiplyScalar(velocity))
  }, [entity])

  return null
}

let counter = 0
const spawnRate = 3

/**
 * Spawn a new basic entity every 3 seconds
 */

const execute = () => {
  /** Only run this on the server */
  if (isClient || !NetworkState.worldNetwork) return

  const { deltaSeconds, elapsedSeconds } = getState(ECSState)

  counter += deltaSeconds

  if (counter < spawnRate) return
  counter = 0

  const entityUUID = `basic-${elapsedSeconds}` as EntityUUID
  const action = BasicActions.spawnAction({
    parentUUID: getComponent(Engine.instance.originEntity, UUIDComponent),
    entityUUID,
    position: new Vector3(Math.random(), 1, Math.random())
  })
  dispatchAction(action)
}

/**
 * System to register the execute function
 */

export const BasicSystem = defineSystem({
  uuid: 'ee.basic.system',
  execute,
  insert: { with: SimulationSystemGroup }
})
