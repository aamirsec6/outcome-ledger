"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Sphere } from "@react-three/drei";
import type { Group } from "three";

type Mouse = { x: number; y: number };

function EmeraldMat({ emissive = "#34d399" }: { emissive?: string }) {
  return (
    <meshStandardMaterial
      color="#0f172a"
      emissive={emissive}
      emissiveIntensity={0.85}
      metalness={0.55}
      roughness={0.25}
    />
  );
}

function ChartIcon({ position }: { position: [number, number, number] }) {
  const bars: [number, number, number][] = [
    [-0.45, -0.15, 0],
    [-0.15, 0.05, 0],
    [0.15, 0.25, 0],
    [0.45, -0.05, 0],
  ];
  return (
    <Float speed={1.8} rotationIntensity={0.35} floatIntensity={0.9}>
      <group position={position}>
        {bars.map((pos, i) => (
          <RoundedBox
            key={i}
            args={[0.22, 0.35 + i * 0.12, 0.22]}
            radius={0.04}
            position={[pos[0], pos[1] + (0.35 + i * 0.12) / 2, pos[2]]}
          >
            <EmeraldMat emissive={i === 2 ? "#6ee7b7" : "#34d399"} />
          </RoundedBox>
        ))}
        <RoundedBox args={[1.1, 0.08, 0.22]} radius={0.02} position={[0, -0.35, 0]}>
          <meshStandardMaterial color="#27272a" metalness={0.3} roughness={0.6} />
        </RoundedBox>
      </group>
    </Float>
  );
}

function LinkIcon({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2.2} rotationIntensity={0.5} floatIntensity={1.1}>
      <group position={position} rotation={[0, 0.4, 0.2]}>
        <mesh>
          <torusGeometry args={[0.35, 0.09, 16, 32]} />
          <EmeraldMat emissive="#22d3ee" />
        </mesh>
        <mesh position={[0.55, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.35, 0.09, 16, 32]} />
          <EmeraldMat emissive="#22d3ee" />
        </mesh>
      </group>
    </Float>
  );
}

function ContractIcon({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.75}>
      <group position={position}>
        <RoundedBox args={[0.75, 0.95, 0.12]} radius={0.06}>
          <meshStandardMaterial color="#18181b" metalness={0.2} roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.55, 0.08, 0.14]} radius={0.02} position={[0, 0.25, 0.07]}>
          <EmeraldMat />
        </RoundedBox>
        <RoundedBox args={[0.45, 0.06, 0.14]} radius={0.02} position={[0, 0.05, 0.07]}>
          <EmeraldMat emissive="#6ee7b7" />
        </RoundedBox>
        <RoundedBox args={[0.35, 0.06, 0.14]} radius={0.02} position={[0, -0.15, 0.07]}>
          <EmeraldMat emissive="#6ee7b7" />
        </RoundedBox>
      </group>
    </Float>
  );
}

function CoinIcon({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2.5} rotationIntensity={0.6} floatIntensity={1.2}>
      <group position={position}>
        <Sphere args={[0.42, 32, 32]}>
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={0.4}
            metalness={0.7}
            roughness={0.2}
          />
        </Sphere>
        <mesh position={[0, 0, 0.43]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.28, 32]} />
          <meshStandardMaterial color="#09090b" emissive="#34d399" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </Float>
  );
}

function Scene({ mouse }: { mouse: Mouse }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += (mouse.x * 0.45 - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (mouse.y * 0.3 - group.current.rotation.x) * 0.05;
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-3, -2, -4]} intensity={0.35} color="#34d399" />
      <pointLight position={[0, 2, 3]} intensity={0.6} color="#6ee7b7" />
      <ChartIcon position={[-1.1, 0.35, 0]} />
      <LinkIcon position={[1.15, 0.15, -0.1]} />
      <ContractIcon position={[0.15, -0.85, 0.15]} />
      <CoinIcon position={[-0.95, -0.55, 0.25]} />
    </group>
  );
}

export function Icon3DScene({ className }: { className?: string }) {
  const [mouse, setMouse] = useState<Mouse>({ x: 0, y: 0 });

  return (
    <div
      className={className}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setMouse({
          x: ((e.clientX - r.left) / r.width) * 2 - 1,
          y: -(((e.clientY - r.top) / r.height) * 2 - 1),
        });
      }}
      onMouseLeave={() => setMouse({ x: 0, y: 0 })}
    >
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  );
}
