// spatial-canvas-threejs.js
// Frosted glass cube composition with lighting, fog, and orbit controls

(function () {
  // -----------------------------
  // Scene / Camera / Renderer
  // -----------------------------

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);
  scene.fog = new THREE.FogExp2(0x050509, 0.035);

  const camera = new THREE.PerspectiveCamera(60, 800 / 800, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });

  renderer.setSize(800, 800);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x050509);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document
    .getElementById("threejs-container-2")
    .appendChild(renderer.domElement);


  // -----------------------------
  // Procedural noise texture
  // -----------------------------

  function createNoiseTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;

    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(canvas.width, canvas.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = Math.random() * 80 + 175;

      imageData.data[i + 0] = value * 0.82;
      imageData.data[i + 1] = value * 0.86;
      imageData.data[i + 2] = value;
      imageData.data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.5, 2.5);

    return texture;
  }

  const frostTexture = createNoiseTexture();


  // -----------------------------
  // Lighting
  // -----------------------------

  const ambient = new THREE.AmbientLight(0x3d3a88, 0.45);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xd7dcff, 2.2);
  keyLight.position.set(5, 8, 6);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const blueLight = new THREE.PointLight(0x243dff, 5.5, 22);
  blueLight.position.set(-5, 2.5, 4);
  scene.add(blueLight);

  const rimLight = new THREE.PointLight(0x8f8cff, 4.5, 24);
  rimLight.position.set(4, 5, -5);
  scene.add(rimLight);

  const softTopLight = new THREE.PointLight(0xffffff, 2.2, 16);
  softTopLight.position.set(0, 6, 3);
  scene.add(softTopLight);


  // -----------------------------
  // Materials
  // -----------------------------

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8b94ff,

    map: frostTexture,

    transparent: true,
    opacity: 0.86,

    roughness: 0.82,
    metalness: 0.02,

    transmission: 0.18,
    thickness: 1.4,

    clearcoat: 0.9,
    clearcoatRoughness: 0.35,

    emissive: 0x0710a8,
    emissiveIntensity: 0.32
  });

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xc8d2ff,
    transparent: true,
    opacity: 0.18
  });

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0x3440ff,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });


  // -----------------------------
  // Cube helper
  // -----------------------------

  const cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  function createFrostedCube(x, y, z, s) {
    let geometry;

    if (THREE.RoundedBoxGeometry) {
      geometry = new THREE.RoundedBoxGeometry(s, s, s, 8, 0.18);
    } else {
      geometry = new THREE.BoxGeometry(s, s, s);
    }

    const cube = new THREE.Mesh(geometry, glassMaterial);
    cube.position.set(x, y, z);
    cube.castShadow = true;
    cube.receiveShadow = true;

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.copy(cube.position);

    const halo = new THREE.Mesh(geometry.clone(), haloMaterial);
    halo.position.copy(cube.position);
    halo.scale.setScalar(1.06);

    cubeGroup.add(halo);
    cubeGroup.add(cube);
    cubeGroup.add(edgeLines);
  }


  // -----------------------------
  // Cube composition
  // -----------------------------

  const s = 2.15;

  createFrostedCube(-2.15, 0.8, 0.0, s);
  createFrostedCube(0.0, 0.8, 0.0, s);
  createFrostedCube(2.15, 0.8, 0.0, s);

  createFrostedCube(0.0, 2.75, -1.55, s);
  createFrostedCube(2.15, 2.0, -1.55, s);


  // -----------------------------
  // Dark floor for subtle shadows
  // -----------------------------

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.ShadowMaterial({
      color: 0x000000,
      opacity: 0.35
    })
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.35;
  floor.receiveShadow = true;
  scene.add(floor);


  // -----------------------------
  // Camera
  // -----------------------------

  camera.position.set(8, 8, 8);
  camera.lookAt(0, 1, 0);


  // -----------------------------
  // OrbitControls
  // -----------------------------

  const controls = new THREE.OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.screenSpacePanning = false;

  controls.minDistance = 4;
  controls.maxDistance = 40;

  controls.target.set(0, 1.4, 0);


  // -----------------------------
  // Animation
  // -----------------------------

  function animate() {
    requestAnimationFrame(animate);

    const t = performance.now() * 0.001;

    cubeGroup.rotation.y = Math.sin(t * 0.22) * 0.08;
    cubeGroup.rotation.x = Math.sin(t * 0.15) * 0.035;

    blueLight.intensity = 5.2 + Math.sin(t * 1.4) * 0.6;
    rimLight.intensity = 4.2 + Math.cos(t * 1.1) * 0.5;

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
})();