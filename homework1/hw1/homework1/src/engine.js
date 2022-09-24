//初始相机位置
var cameraPosition = [30, 30, 30]

//生成的纹理的分辨率，纹理必须是标准的尺寸 256*256 1024*1024  2048*2048
var resolution = 2048;
var fbo;

GAMES202Main();

//程序载入后立即运行此方法
function GAMES202Main() {
	// Init canvas and gl
	const canvas = document.querySelector('#glcanvas'); //document文档节点，能访问整个HTML文档

  //添加高宽属性
	canvas.width = window.screen.width; 
	canvas.height = window.screen.height;

  //gl 创建一个WebGLRenderingContext对象作为3D渲染的上下文
	const gl = canvas.getContext('webgl');
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	// Add camera 创建相机与四个参数
	const camera = new THREE.PerspectiveCamera(75, gl.canvas.clientWidth / gl.canvas.clientHeight, 1e-2, 1000);
  // Position 直接调用一开始的全局变量
	camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);

	// Add resize listener
	function setSize(width, height) {
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}
	setSize(canvas.clientWidth, canvas.clientHeight);
	window.addEventListener('resize', () => setSize(canvas.clientWidth, canvas.clientHeight));

	// Add camera control 轨道控制器
  // 对应OrbitControls.js 实现鼠标与场景的交互
	const cameraControls = new THREE.OrbitControls(camera, canvas);
  // 按键设置
	cameraControls.enableZoom = true; //缩放
	cameraControls.enableRotate = true; //旋转
	cameraControls.enablePan = true; //平移
  // 速度设置
	cameraControls.rotateSpeed = 0.3;
	cameraControls.zoomSpeed = 1.0;
	cameraControls.panSpeed = 0.8;
  // 设置了控制器，因此只能改变控制器的target和相机的lookat方向 默认为(0,0,0)
	cameraControls.target.set(0, 0, 0);

	// Add renderer 添加渲染器
	const renderer = new WebGLRenderer(gl, camera);

	// Add lights
	// light - is open shadow map == true
	let lightPos = [0, 80, 80];
	let focalPoint = [0, 0, 0];
	let lightUp = [0, 1, 0]
  // 添加方向光
	const directionLight = new DirectionalLight(5000, [1, 1, 1], lightPos, focalPoint, lightUp, true, renderer.gl);
	renderer.addLight(directionLight);

	// Add shapes
	// 记录三个物体的初始位置和Scale
	let floorTransform = setTransform(0, 0, -30, 4, 4, 4);
	let obj1Transform = setTransform(0, 0, 0, 20, 20, 20);
	let obj2Transform = setTransform(40, 0, -40, 10, 10, 10);

  // 载入三个模型
	loadOBJ(renderer, 'assets/mary/', '008model', 'PhongMaterial', obj1Transform);
	loadOBJ(renderer, 'assets/mary/', '008model', 'PhongMaterial', obj2Transform);
	loadOBJ(renderer, 'assets/floor/', 'floor', 'PhongMaterial', floorTransform);
	

	// let floorTransform = setTransform(0, 0, 0, 100, 100, 100);
	// let cubeTransform = setTransform(0, 50, 0, 10, 50, 10);
	// let sphereTransform = setTransform(30, 10, 0, 10, 10, 10);

	//loadOBJ(renderer, 'assets/basic/', 'cube', 'PhongMaterial', cubeTransform);
	// loadOBJ(renderer, 'assets/basic/', 'sphere', 'PhongMaterial', sphereTransform);
	//loadOBJ(renderer, 'assets/basic/', 'plane', 'PhongMaterial', floorTransform);

  //设置GUI
	//Add autoRotate 添加自动旋转
	cameraControls.autoRotate = true;
	cameraControls.autoRotateSpeed = 0.0;
	//添加一个dat.GUI
	function createGUI() {
		//实例化GUI
		const gui = new dat.gui.GUI();
		//gui.add(); //直接添加GUI栏
		const panelRotate = gui.addFolder('Model Move');
		panelRotate.add(cameraControls, 'autoRotateSpeed', { Stopped: 0, Slow: 4, Fast: 10 });
		panelRotate.open();
	}
	createGUI();

  //循环渲染场景，定义一个回调函数 mainLoop()
	function mainLoop(now) {
		cameraControls.update(); //每次递归更新一次控制器

		renderer.render(); //每次递归都执行一次渲染
    //递归渲染
		requestAnimationFrame(mainLoop);
	}
	requestAnimationFrame(mainLoop);
}

function setTransform(t_x, t_y, t_z, s_x, s_y, s_z) {
	return {
		modelTransX: t_x,
		modelTransY: t_y,
		modelTransZ: t_z,
		modelScaleX: s_x,
		modelScaleY: s_y,
		modelScaleZ: s_z,
	};
}
