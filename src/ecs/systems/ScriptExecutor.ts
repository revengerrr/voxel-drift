// commit: feat(scripting): implement sandboxed drone script executor
// description: Executes drone scripts within a strict time budget (2ms/frame).
// Scripts are stored as an array of instructions (from the visual block
// editor). The executor runs one instruction per tick per drone,
// translating script commands into TaskQueue entries. Includes a simple
// instruction set: move, mine, deposit, wait, loop, if-else.

import * as THREE from "three";
import { scriptedDrones } from "../world";
import { DroneState, ResourceType } from "../components";

// ─── Instruction Types ────────────────────────────────────────

export enum OpCode {
  Move = "move",
  Mine = "mine",
  Deposit = "deposit",
  Wait = "wait",
  Jump = "jump", // unconditional jump (for loops)
  JumpIfEmpty = "jump_if_empty", // jump if cargo empty
  JumpIfFull = "jump_if_full", // jump if cargo full
  Noop = "noop",
}

export interface Instruction {
  op: OpCode;
  /** Target position (for Move) */
  target?: [number, number, number];
  /** Resource type (for Mine) */
  resource?: ResourceType;
  /** Duration in ticks (for Wait) */
  ticks?: number;
  /** Jump target (program counter value) */
  jumpTo?: number;
}

/** Script = ordered list of instructions */
export type DroneScript = Instruction[];

// ─── Script Registry ──────────────────────────────────────────

const scriptRegistry = new Map<string, DroneScript>();

export function registerScript(id: string, script: DroneScript): void {
  scriptRegistry.set(id, script);
}

export function getScript(id: string): DroneScript | undefined {
  return scriptRegistry.get(id);
}

// ─── Default demo script ──────────────────────────────────────

registerScript("demo-mine-loop", [
  { op: OpCode.Move, target: [5, 0, 0] },
  { op: OpCode.Mine, resource: ResourceType.Ore, ticks: 30 },
  { op: OpCode.JumpIfFull, jumpTo: 4 },
  { op: OpCode.Jump, jumpTo: 0 }, // loop back to mine more
  { op: OpCode.Move, target: [0, 0, 0] }, // return to base
  { op: OpCode.Deposit },
  { op: OpCode.Jump, jumpTo: 0 }, // start over
]);

// ─── Executor ─────────────────────────────────────────────────

const BUDGET_MS = 2; // max 2ms per frame for all scripts

/**
 * ScriptExecutor — runs each physics tick.
 *
 * For each drone with a ScriptRef:
 * 1. Look up script from registry
 * 2. If cooldown > 0, decrement and skip
 * 3. Execute current instruction
 * 4. Advance program counter
 * 5. Bail if time budget exceeded
 */
export function scriptExecutorSystem(_dt: number): void {
  const startTime = performance.now();

  for (const entity of scriptedDrones.entities) {
    // Time budget check
    if (performance.now() - startTime > BUDGET_MS) break;

    const { drone, scriptRef, taskQueue, transform } = entity;
    if (!drone || !scriptRef || !taskQueue || !transform) continue;

    // Skip if drone is in error state
    if (drone.state === DroneState.Error) continue;

    // Cooldown
    if (scriptRef.cooldown > 0) {
      scriptRef.cooldown--;
      continue;
    }

    // Get script
    const script = scriptRegistry.get(scriptRef.scriptId);
    if (!script || script.length === 0) {
      drone.state = DroneState.Idle;
      continue;
    }

    // Bounds check
    if (scriptRef.programCounter >= script.length) {
      scriptRef.programCounter = 0; // wrap around
    }

    const instruction = script[scriptRef.programCounter];
    drone.state = DroneState.Executing;

    switch (instruction.op) {
      case OpCode.Move:
        if (instruction.target) {
          taskQueue.tasks = [
            {
              type: "move",
              target: new THREE.Vector3(...instruction.target),
            },
          ];
          taskQueue.currentIndex = 0;
          scriptRef.cooldown = 60; // wait ~1s for movement
        }
        scriptRef.programCounter++;
        break;

      case OpCode.Mine:
        taskQueue.tasks = [
          {
            type: "mine",
            resourceType: instruction.resource ?? ResourceType.Ore,
            duration: instruction.ticks ?? 30,
          },
        ];
        taskQueue.currentIndex = 0;
        scriptRef.cooldown = instruction.ticks ?? 30;
        scriptRef.programCounter++;
        break;

      case OpCode.Deposit:
        taskQueue.tasks = [{ type: "deposit" }];
        taskQueue.currentIndex = 0;
        scriptRef.cooldown = 20;
        scriptRef.programCounter++;
        break;

      case OpCode.Wait:
        scriptRef.cooldown = instruction.ticks ?? 60;
        scriptRef.programCounter++;
        break;

      case OpCode.Jump:
        scriptRef.programCounter = instruction.jumpTo ?? 0;
        break;

      case OpCode.JumpIfEmpty: {
        let totalCargo = 0;
        drone.cargo.forEach((v: number) => (totalCargo += v));
        if (totalCargo === 0) {
          scriptRef.programCounter = instruction.jumpTo ?? 0;
        } else {
          scriptRef.programCounter++;
        }
        break;
      }

      case OpCode.JumpIfFull: {
        let totalCargo = 0;
        drone.cargo.forEach((v: number) => (totalCargo += v));
        if (totalCargo >= drone.maxCargo) {
          scriptRef.programCounter = instruction.jumpTo ?? 0;
        } else {
          scriptRef.programCounter++;
        }
        break;
      }

      case OpCode.Noop:
      default:
        scriptRef.programCounter++;
        break;
    }
  }
}
