import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const Boids = ({ count }) => {
  const points = useRef();

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        acceleration: new THREE.Vector3(),
      });
    }
    return temp;
  }, [count]);

  const boidPositions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      particles[i].position.toArray(positions, i * 3);
    }
    return positions;
  }, [count, particles]);

  useFrame((state, delta) => {
    const separationDistance = 0.8;
    const alignmentDistance = 5;
    const cohesionDistance = 5;
    const maxSpeed = 0.1;
    const maxForce = 0.01;

    particles.forEach((boid, i) => {
      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();
      let separationCount = 0;
      let alignmentCount = 0;
      let cohesionCount = 0;

      particles.forEach((otherBoid, j) => {
        if (i === j) return;
        const distance = boid.position.distanceTo(otherBoid.position);

        if (distance < separationDistance) {
          const diff = new THREE.Vector3().subVectors(boid.position, otherBoid.position);
          diff.normalize().divideScalar(distance);
          separation.add(diff);
          separationCount++;
        }
        if (distance < alignmentDistance) {
          alignment.add(otherBoid.velocity);
          alignmentCount++;
        }
        if (distance < cohesionDistance) {
          cohesion.add(otherBoid.position);
          cohesionCount++;
        }
      });

      if (separationCount > 0) {
        separation.divideScalar(separationCount);
      }
      if (alignmentCount > 0) {
        alignment.divideScalar(alignmentCount);
        alignment.sub(boid.velocity).clampLength(0, maxForce);
      }
      if (cohesionCount > 0) {
        cohesion.divideScalar(cohesionCount);
        cohesion.sub(boid.position).clampLength(0, maxForce);
      }

      boid.acceleration.add(separation);
      boid.acceleration.add(alignment);
      boid.acceleration.add(cohesion);
    });

    for (let i = 0; i < particles.length; i++) {
      const boid = particles[i];
      boid.velocity.add(boid.acceleration);
      boid.velocity.clampLength(0, maxSpeed);
      boid.position.add(boid.velocity);

      // Boundary checks
      if(boid.position.x > 10 || boid.position.x < -10) boid.velocity.x *= -1;
      if(boid.position.y > 10 || boid.position.y < -10) boid.velocity.y *= -1;
      if(boid.position.z > 10 || boid.position.z < -10) boid.velocity.z *= -1;


      boid.position.toArray(boidPositions, i * 3);
      boid.acceleration.set(0, 0, 0);
    }

    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <Points ref={points} positions={boidPositions}>
      <PointMaterial
        transparent
        color="#4ade80" // emerald-400
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
};


const NetworkTopology = () => {
  return (
    <Canvas camera={{ position: [0, 0, 15], fov: 75 }}>
        <Boids count={200} />
    </Canvas>
  );
};

export default NetworkTopology;
