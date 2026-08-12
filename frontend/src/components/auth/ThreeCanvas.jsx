import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Create Scene, Camera & Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf4f4f5, 0.0015); // soft fog matching zinc-50 light style

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.z = 400;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Generate Particles (AI Nodes)
    const particleCount = 70;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      // Spread nodes in a 3D box
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 500;

      velocities.push({
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5,
      });
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Particle material (soft teal/primary color glowing circle)
    const pMaterial = new THREE.PointsMaterial({
      color: 0x0ea5e9, // Tailwind sky-500 matching the primary accent color
      size: 6,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    const particleSystem = new THREE.Points(geometry, pMaterial);
    scene.add(particleSystem);

    // 3. Setup Connecting Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xe2e8f0, // Tailwind zinc-200 lines
      transparent: true,
      opacity: 0.45,
    });

    const lineGeometry = new THREE.BufferGeometry();
    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineMesh);

    // 4. Mouse interaction
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouse.targetX = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.targetY = -((event.clientY - rect.top) / height) * 2 + 1;
    };

    container.addEventListener("mousemove", handleMouseMove);

    // 5. Animation Loop
    let animationFrameId;
    const tempPositions = new Float32Array(particleCount * 3);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth mouse damping
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Tilt camera slightly based on mouse
      camera.position.x += (mouse.x * 120 - camera.position.x) * 0.05;
      camera.position.y += (mouse.y * 120 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      // Move particles
      const positionsAttr = geometry.attributes.position;
      const array = positionsAttr.array;

      for (let i = 0; i < particleCount; i++) {
        array[i * 3] += velocities[i].x;
        array[i * 3 + 1] += velocities[i].y;
        array[i * 3 + 2] += velocities[i].z;

        // Boundary checks (wrap around)
        if (array[i * 3] < -250 || array[i * 3] > 250) velocities[i].x *= -1;
        if (array[i * 3 + 1] < -250 || array[i * 3 + 1] > 250) velocities[i].y *= -1;
        if (array[i * 3 + 2] < -250 || array[i * 3 + 2] > 250) velocities[i].z *= -1;
      }

      positionsAttr.needsUpdate = true;

      // Calculate connections dynamically
      const linePositions = [];
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = array[i * 3] - array[j * 3];
          const dy = array[i * 3 + 1] - array[j * 3 + 1];
          const dz = array[i * 3 + 2] - array[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // Connect if particles are close
          if (dist < 110) {
            linePositions.push(array[i * 3], array[i * 3 + 1], array[i * 3 + 2]);
            linePositions.push(array[j * 3], array[j * 3 + 1], array[j * 3 + 2]);
          }
        }
      }

      lineGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(linePositions, 3)
      );

      // Rotate particle system slowly
      particleSystem.rotation.y += 0.001;
      lineMesh.rotation.y += 0.001;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Handle Resizing
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      pMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none" />;
}
