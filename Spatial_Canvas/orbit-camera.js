// spatial-canvas-threejs.js
// Three.js scene: three intersecting rectangular prisms with orbit controls

(function () {
  // Scene, camera, renderer setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 800 / 800, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.setSize(800, 800);
  renderer.setClearColor(0xf6ef91); // pale yellow background

  document
    .getElementById("threejs-container-2")
    .appendChild(renderer.domElement);

  // Add ambient and directional light
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // --------------------------------------------------
  // Materials
  // --------------------------------------------------

  const matRight = new THREE.MeshBasicMaterial({
    color: 0x167b93 // dark blue side
  });

  const matLeft = new THREE.MeshBasicMaterial({
    color: 0x2fa6a5 // teal side
  });

  const matTop = new THREE.MeshBasicMaterial({
    color: 0x9bbec4 // pale blue top
  });

  const matBottom = new THREE.MeshBasicMaterial({
    color: 0x0f6378 // dark shadow
  });



  const boxMaterials = [
    matRight,
    matLeft,
    matTop,
    matBottom,
    matLeft,
    matRight
  ];

  // --------------------------------------------------
  // Main shape
  // Three identical rectangular prisms
  // intersecting at the same center point
  // --------------------------------------------------

  const group = new THREE.Group();
  scene.add(group);

  const length = 6.2;
  const thick = 2.0;

  // Raise object slightly above ground level
  const centerY = 1.7;

  // Prism 1: long in X direction
  const barX = new THREE.Mesh(
    new THREE.BoxGeometry(length, thick, thick),
    boxMaterials
  );
  barX.position.set(0, centerY, 0);
  group.add(barX);

  // Prism 2: long in Y direction
  const barY = new THREE.Mesh(
    new THREE.BoxGeometry(thick, length, thick),
    boxMaterials
  );
  barY.position.set(0, centerY, 0);
  group.add(barY);

  // Prism 3: long in Z direction
  const barZ = new THREE.Mesh(
    new THREE.BoxGeometry(thick, thick, length),
    boxMaterials
  );
  barZ.position.set(0, centerY, 0);
  group.add(barZ);

  // --------------------------------------------------
  // Camera position
  // --------------------------------------------------

  camera.position.set(8, 8, 8);
  camera.lookAt(0, 0, 0);

  // --------------------------------------------------
  // OrbitControls
  // --------------------------------------------------

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.screenSpacePanning = false;
  controls.minDistance = 4;
  controls.maxDistance = 40;
  controls.target.set(0, 1, 0);

  // --------------------------------------------------
  // Animation loop
  // --------------------------------------------------

  function animate() {
    requestAnimationFrame(animate);

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
})();