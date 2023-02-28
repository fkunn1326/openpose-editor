// this code is modified from https://github.com/Keshigom/VRMToybox/tree/main/PoseIK/src/ts/IK

import * as THREE from "./three.mjs"

/*
example
{
    iteration:number,   // 反復回数
    chainConfigs:[      // IKチェイン 
        {
            jointConfigs:[  // 手先から根本
                {},         // Effectorの親
                            // ||
                            // V
                {           // RootBone
                    boneName:  Hoge,
                    order: 'XYZ',   // 回転順序
                    rotationMin: new THREE.Vector3(-Math.PI,0,0)    // 最小 回転角制限  -Pi ~ Pi
                    rotationMax: new THREE.Vector3(Math.PI,0,0)    // 最大 回転角制限  -Pi ~ Pi
                }          
            ],
            effecotrBoneName: BoneName,  // ボーンの名前
        },
    ]
}
*/

// IK config
const defaultIKConfig = {
    iteration: 8,
    chainConfigs: [
        // Hip -> Head
        {
            jointConfigs: [

                {
                    boneName: "chest",
                    order: 'XYZ',
                    rotationMin: new THREE.Vector3(-Math.PI, -Math.PI, -Math.PI),
                    rotationMax: new THREE.Vector3(Math.PI, Math.PI, Math.PI),
                },
                {
                    boneName: "spine",
                    order: 'XYZ',
                    rotationMin: new THREE.Vector3(-Math.PI, -Math.PI, -Math.PI),
                    rotationMax: new THREE.Vector3(Math.PI, Math.PI, Math.PI),
                },
                {
                    boneName: "hips",
                    order: 'XYZ',
                    rotationMin: new THREE.Vector3(-Math.PI, -Math.PI, -Math.PI),
                    rotationMax: new THREE.Vector3(Math.PI, Math.PI, Math.PI),
                },
            ],
            effectorBoneName: "neck",
        },
        // Left Shoulder -> Hand
        {
            jointConfigs: [
                {
                    boneName: "leftLowerArm",
                    order: 'YZX',
                    rotationMin: new THREE.Vector3(0, -Math.PI, 0),
                    rotationMax: new THREE.Vector3(0, -(0.1 / 180) * Math.PI, 0),
                },
                {
                    boneName: "leftUpperArm",
                    order: 'ZXY',
                    rotationMin: new THREE.Vector3(-Math.PI / 2, -Math.PI, - Math.PI),
                    rotationMax: new THREE.Vector3(Math.PI / 2, Math.PI, Math.PI),
                },
                {
                    boneName: "leftShoulder",
                    order: 'ZXY',
                    rotationMin: new THREE.Vector3(0, -(45 / 180) * Math.PI, -(45 / 180) * Math.PI),
                    rotationMax: new THREE.Vector3(0, (45 / 180) * Math.PI, 0),
                }
            ],
            effectorBoneName: "leftHand"
        },
        // Right Shoulder -> Hand
        {
            jointConfigs: [
                {
                    boneName: "rightLowerArm",
                    order: 'YZX',
                    rotationMin: new THREE.Vector3(0, (0.1 / 180) * Math.PI, 0),
                    rotationMax: new THREE.Vector3(0, Math.PI, 0),
                },
                {
                    boneName: "rightUpperArm",
                    order: 'ZXY',
                    rotationMin: new THREE.Vector3(-Math.PI / 2, -Math.PI, -Math.PI),
                    rotationMax: new THREE.Vector3(Math.PI / 2, Math.PI, Math.PI),
                },
                {
                    boneName: "rightShoulder",
                    order: 'ZXY',
                    rotationMin: new THREE.Vector3(0, -(45 / 180) * Math.PI, 0),
                    rotationMax: new THREE.Vector3(0, (45 / 180) * Math.PI, (45 / 180) * Math.PI),
                },
            ],
            effectorBoneName: "rightHand"
        },
        // Left Leg
        {
            jointConfigs: [
                {
                    boneName: "leftLowerLeg",
                    order: 'XYZ',
                    rotationMin: new THREE.Vector3(-Math.PI, 0, 0),
                    rotationMax: new THREE.Vector3(0, 0, 0),

                },
                {
                    boneName: "leftUpperLeg",
                    order: 'XYZ',
                    rotationMin: new THREE.Vector3(-Math.PI, -Math.PI, -Math.PI),
                    rotationMax: new THREE.Vector3(Math.PI, Math.PI, Math.PI),
                },
            ],
            effectorBoneName: "leftFoot"
        },
        // Right Leg
        {
            jointConfigs: [
                {
                    boneName: "rightLowerLeg",
                    order: 'XYZ',
                    rotationMin: new THREE.Vector3(-Math.PI, 0, 0),
                    rotationMax: new THREE.Vector3(0, 0, 0),
                },
                {
                    boneName: "rightUpperLeg",
                    order: 'XYZ',
                    rotationMin: new THREE.Vector3(-Math.PI, -Math.PI, -Math.PI),
                    rotationMax: new THREE.Vector3(Math.PI, Math.PI, Math.PI),
                },
            ],
            effectorBoneName: "rightFoot"
        },
    ]
};

const _goalPosition = new THREE.Vector3();
const _joint2GoalVector = new THREE.Vector3();
const _effectorPosition = new THREE.Vector3();
const _joint2EffectorVector = new THREE.Vector3();
const _jointPosition = new THREE.Vector3();
const _jointQuaternionInverse = new THREE.Quaternion();
const _jointScale = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _vector = new THREE.Vector3();
const _quarternion = new THREE.Quaternion();

const solve = (ikChain, iteration) => {

    // 目標位置のワールド座標
    ikChain.goal.getWorldPosition(_goalPosition);

    for (let i = iteration; i > 0; i--) {

        let didConverge = true;
        ikChain.joints.forEach((joint) => {
            // 注目関節のワールド座標・姿勢等を取得する
            joint.bone?.matrixWorld.decompose(_jointPosition, _jointQuaternionInverse, _jointScale);
            _jointQuaternionInverse.invert();

            //  注目関節 -> エフェクタのベクトル
            ikChain.effector.getWorldPosition(_effectorPosition);
            _joint2EffectorVector.subVectors(_effectorPosition, _jointPosition);
            _joint2EffectorVector.applyQuaternion(_jointQuaternionInverse);
            _joint2EffectorVector.normalize();

            // 注目関節 -> 目標位置のベクトル
            _joint2GoalVector.subVectors(_goalPosition, _jointPosition);
            _joint2GoalVector.applyQuaternion(_jointQuaternionInverse);
            _joint2GoalVector.normalize();

            // cos rad
            let deltaAngle = _joint2GoalVector.dot(_joint2EffectorVector);

            if (deltaAngle > 1.0) {
                deltaAngle = 1.0;
            } else if (deltaAngle < -1.0) {
                deltaAngle = - 1.0;
            }

            // rad
            deltaAngle = Math.acos(deltaAngle);

            // 振動回避
            if (deltaAngle < 1e-5) {
                return;
            }

            // TODO:微小回転量の制限

            // 回転軸
            _axis.crossVectors(_joint2EffectorVector, _joint2GoalVector);
            _axis.normalize();

            // 回転
            _quarternion.setFromAxisAngle(_axis, deltaAngle);
            joint.bone?.quaternion.multiply(_quarternion);

            // 回転角・軸制限
            joint.bone?.rotation.setFromVector3(
                new THREE.Vector3(joint.bone?.rotation.x, joint.bone?.rotation.y, joint.bone?.rotation.z).max(joint.rotationMin).min(joint.rotationMax), joint.order
            );

            joint.bone?.updateMatrixWorld(true);
            didConverge = false;
        });

        if (didConverge)
            break;
    }
}

export class VrmIK {

    _chains;
    _iteration;

    constructor(vrm, ikConfig = defaultIKConfig) {

        this._chains = ikConfig.chainConfigs.map((chainConfig) => {
            return this._createIKChain(vrm, chainConfig);
        });
        this._iteration = ikConfig.iteration || 1;
    }

    get ikChains() {
        return this._chains;
    }

    // TODO: updateの方が良い？
    solve() {
        this._chains.forEach(chain => {
            solve(chain, this._iteration);
        });
    }

    _createIKChain(vrm, chainConfig) {

        const goal = new THREE.Object3D();
        const effector = vrm.humanoid.getBoneNode(chainConfig.effectorBoneName);
        const joints = chainConfig.jointConfigs.map((jointConfig) => {
            return this._createJoint(vrm, jointConfig);
        });


        effector.getWorldPosition(goal.position);
        vrm.scene.add(goal);

        return {
            goal: goal,
            effector: effector,
            joints: joints
        }
    }

    _createJoint(vrm, jointConfig) {

        return {
            bone: vrm.humanoid.getBoneNode(jointConfig.boneName),
            order: jointConfig.order,
            rotationMin: jointConfig.rotationMin,
            rotationMax: jointConfig.rotationMax,
        }
    }
}