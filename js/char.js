var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );
var headphones = document.getElementById( 'headphones' );

const bkgMusic = document.getElementById("music");
bkgMusic.pause();
bkgMusic.currentTime = 0;
bkgMusic.volume = 0.75;

let restart = false;

const idles = [0,1,2,3,4];
const walks = [12, 13, 14, 15];
const talks = [6,7,8,9];

/* sides  0 front  1 back  2 top  3 bottom  4 right  5 left*/
const dialogs = [
	// starts with empty church windows ... 
	{ track: "clips/0.mp3",	 anim: "drawings/beach.json", sides: [0,1,4,5], delay: 6000, end: 2000 },
	{ track: "clips/1.mp3",	 anim: "drawings/mustard_3.json", sides: [0, 1, 4, 5], delay: 3000, end: 2000 },
	{ track: "clips/2.mp3",	 anim: "drawings/jesus_windows.json", sides: [0, 1], delay: 3000, end: 2000 },
	{ track: "clips/3.mp3",	 anim: "drawings/heavenhell.json", sides: [0, 1, 4, 5], delay: 2000, end: 2000},
	{ track: "clips/4.mp3",	 anim: "drawings/liens.json", sides: [1, 2, 3], delay: 2000, end: 3000 },
	{ track: "clips/5.mp3",  anim: "drawings/moon.json", sides: [0, 1, 2, 4, 5], delay: 2000, end: 4000 },
	{ track: "clips/6.mp3",	 anim: "drawings/bite.json", sides: [0, 1, 2, 3, 4, 5], delay: 2000, end: 2000 },
	{ track: "clips/7.mp3",	 anim: "drawings/hotdog_angel.json", sides: [0, 1, 4, 5], delay: 6000, end: 2000 },
	{ track: "clips/8.mp3",	 anim: "drawings/get_a_dog.json", sides: [0, 1, 3, 4, 5], delay: 2000, end: 3000 },
	{ track: "clips/9.mp3",	 anim: "drawings/big_dogs.json", sides: [0, 1, 2, 3, 4, 5], delay: 2000, end: 2000 },
	{ track: "clips/10.mp3", anim: "drawings/spinning.json", sides: [0, 1, 2, 3, 4, 5], delay: 2000, end: 2000 },
	{ track: "clips/11.mp3", anim: "drawings/adam_and_eve.json", sides: [0, 1, 4, 5], delay: 4000, end: 2000 },
	{ track: "clips/12.mp3", anim: "drawings/hell_hotdog.json", sides: [0, 1, 4, 5], delay: 2000, end: 6000 },
	{ track: "clips/13.mp3", anim: "drawings/cracks_2.json", sides: [0, 1, 4, 5], delay: 2000, end: 4000 }
];

let currentDialog = 0;
let time;
let nextClip = true;

var lines = document.getElementById('lines');
let width = window.innerWidth, height = window.innerHeight;
let linesPlayer = new LinesPlayer(lines);
let planes = [];

let camera, scene, renderer, controls;
let linesTexture; /* texture gets updated */
let clock, mixer;
let listener, voiceSound, voiceSource, audioLoader;

let char;

const mob = mobilecheck();
if (mob) {
	init();
} else {
	instructions.remove();
	headphones.textContent = "Mobile device required to play.";
}


function init() {

	clock = new THREE.Clock();
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(width, height);
	document.body.appendChild(renderer.domElement);
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	effect = new THREE.OutlineEffect( renderer, {
		defaultThickNess: 1,
		defaultColor: new THREE.Color( 0xffffff )
	} );

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1100 );
	controls = new THREE.DeviceOrientationControls( camera );
	camera.position.z = 5;
	camera.ySpeed = 0;

	/* outside lines */
	

	lines.width =  1024;
	lines.height = 1024;
	linesTexture = new THREE.Texture(lines);
	const linesMaterial = new THREE.MeshBasicMaterial({map:linesTexture, side: THREE.DoubleSide});
	const sz = 40;
	const sides = [ /* relative x,y,z pos, rotation*/
		[0, 0,-1, 0, 0, 0], /* front face */
		[0, 0, 1, 0, Math.PI, 0], /* back face */
		
		[0, 1, 0, Math.PI/2, 0, 0], /* top face */
		[0,-1, 0, -Math.PI/2, 0, 0], /*  bottom face */

		[1, 0, 0, 0, -Math.PI/2, 0], /* right face */
		[-1,0, 0, 0, Math.PI/2, 0] /* left face */
	];

	for (let i = 0; i < sides.length; i++) {
		const side = sides[i];
		const planeGeo = new THREE.PlaneGeometry( sz*2, sz*2, i + 1 );
		const planeMesh = new THREE.Mesh( planeGeo, linesMaterial );
		planeMesh.position.set( side[0] * sz, side[1] * sz, side[2] * sz );
		planeMesh.rotation.set( side[3], side[4], side[5] );
		scene.add( planeMesh );
		planes.push(planeMesh);
		
	}

	listener = new THREE.AudioListener();
	camera.add(listener);
	audioLoader = new THREE.AudioLoader();
	voiceSound = new THREE.PositionalAudio(listener);

	/* blender */
	mixer = new THREE.AnimationMixer( scene );
	let loader = new THREE.JSONLoader();
	loader.load("models/char_toon.json", function(geometry, materials) {
		var charMat = materials[0];
		charMat.morphTargets = true;
		charMat.color.setHex(0x000000);
		charMat.skinning = true;
		char = new THREE.SkinnedMesh(geometry, charMat);
		char.position.set(0, -3, -2);
		char.scale.set(0.5,0.5,0.5);
		char.xSpeed = 0;
		char.zSpeed = 0;
		char.add(voiceSound);
		mixer.clipAction(geometry.animations[1], char)
			.play();
		scene.add(char);

		instructions.textContent = "Tap to play";
		function start() {
			if (restart) {
				currentDialog = 0;
				dialogs.map((d) => d.start = 0);
				nextClip = true;
				bkgMusic.src = "clips/theme_7_80_12.mp3";
				bkgMusic.loop = true;
				bkgMusic.play();
			} else {
				animate();
				bkgMusic.loop = true;
			}
			bkgMusic.play();

			blocker.style.display = 'none';
			
			time = performance.now() + 4000; /* beginning delay */

			linesPlayer.loadAnimation("drawings/empty.json", function() {
				// turn on dialog.sides, off others
				planes.map((p, i) => [0,1,4,5].indexOf(i) != -1 ? p.visible = true : p.visible = false);
			});

			/* for mobile to work  */
			const source = listener.context.createBufferSource();
			source.connect(listener.context.destination);
			source.start();
		}
		instructions.addEventListener('touchend', start, false );
		instructions.addEventListener('click', start, false );
			
	});
}

/* 0: delay, 1: play, 2: end */
function animate() {
	/* audio clips */
	if (performance.now() > time && nextClip) {
		let dialog = dialogs[currentDialog];
		if (dialog.start == 1) {
			nextClip = false;
			char.xSpeed = 0;
			char.zSpeed = 0;
			camera.ySpeed = Cool.random(-0.001, 0.001);
			linesPlayer.loadAnimation(dialog.anim, function() {
				// turn on dialog.sides, off others
				planes.map((p, i) => dialog.sides.indexOf(i) != -1 ? p.visible = true : p.visible = false);
			});
			audioLoader.load( dialog.track, function(buffer) {
				voiceSound.setBuffer(buffer);
				voiceSound.setRefDistance(20);
				voiceSound.play();
			});

			mixer.stopAllAction();
			const talk = talks[Math.floor(Math.random() * talks.length)];
			mixer.clipAction(char.geometry.animations[talk], char).play();
			// https://stackoverflow.com/questions/35323062/detect-sound-is-ended-in-three-positionalaudio
			voiceSound.onEnded = function() {
				voiceSound.isPlaying = false;
				time = performance.now() + dialog.end;
				nextClip = true;
				const nextIndex = dialogs.indexOf(dialog) + 1;
				if (nextIndex < dialogs.length) {
					currentDialog = nextIndex;
				} else {
					/* its over */
					setTimeout(function() { 
						restart = true;
						bkgMusic.pause();
						blocker.style.display = 'block';
						instructions.textContent = "Tap to play again";
						headphones.textContent = "End of part 1";
						nextClip = false;
						mixer.stopAllAction();
						const endAnim = [1,2,3,4][Cool.randomInt(1,4)];
						mixer.clipAction(char.geometry.animations[endAnim], char).play();
						char.xSpeed = 0;
						char.zSpeed = 0;
						linesPlayer.loadAnimation("drawings/big_dogs.json", function() {
							// turn on dialog.sides, off others
							planes.map((p, i) => [0,1,2,3,4,5].indexOf(i) != -1 ? p.visible = true : p.visible = false);
						});
						bkgMusic.src = "clips/end.mp3";
						bkgMusic.play();
						bkgMusic.loop = false;
					}, 2000);
				}
			};
		} else {
			dialog.start = 1;
			time += dialog.delay;
			mixer.stopAllAction();

			if (Math.random() > 0.3) {
				const walk = walks[Math.floor(Math.random() * walks.length)];
				mixer.clipAction(char.geometry.animations[walk], char).play();
				
				// get distance from camera? 
				// console.log( char.position.distanceTo(camera.position) );
				if (char.position.distanceTo(camera.position) > 10) {
					char.xSpeed = char.position.x > camera.position.x ? Cool.random(-0.02, 0) : Cool.random(0, 0.02);
					char.zSpeed = char.position.z > camera.position.z ? Cool.random(-0.02, 0) : Cool.random(0, 0.02);
					console.log( "should walk to camera" );
				} else {
					char.xSpeed = Cool.random(-0.02, 0.02);
					char.zSpeed = Cool.random(-0.02, 0.03);
				}
				
				camera.ySpeed = 0;
				const vec = new THREE.Vector3(
					char.position.x + char.xSpeed, 
					char.position.y,
					char.position.z + char.zSpeed
				);
				char.lookAt(vec);
			} else {
				const idle = idles[Math.floor(Math.random() * idles.length)];
				mixer.clipAction(char.geometry.animations[idle], char).play();
				// const vec = new THREE.Vector3(
				// 	camera.position.x, 
				// 	0,
				// 	camera.position.z
				// );
				// char.lookAt(vec);
				// make him look somewhere
			}
		}
	}

    requestAnimationFrame(animate);
    linesTexture.needsUpdate = true;
    mixer.update( clock.getDelta() );
    char.position.x += char.xSpeed;
    char.position.z += char.zSpeed;
    camera.position.y += camera.ySpeed;
    controls.update();
   	// renderer.render(scene, camera);
   	effect.render( scene, camera );
}

function onWindowResize() { 
	width = window.innerWidth;
	height = window.innerHeight;
	camera.aspect = width / height;
	camera.updateProjectionMatrix(); // https://stackoverflow.com/questions/30453549/three-js-canvas-not-resizing-to-mobile-device-window-width
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(width, height);
}
window.addEventListener( 'resize', onWindowResize, false );

/* old crap */

	// const helperMaterial = new THREE.MeshBasicMaterial( { color: 0xff00ff, wireframe: true } );
// helper 
	// const helper = new THREE.Mesh( planeGeo, helperMaterial );
	// helper.position.set( side[0] * sz, side[1] * sz, side[2] * sz );
	// helper.rotation.set( side[3], side[4], side[5] );
	// scene.add( helper );

	// var sphere = new THREE.Mesh( new THREE.SphereGeometry( 50, 20, 10 ), linesMaterial );
	// sphere.position.set( 0, 0, 0 );
	// scene.add( sphere );

	// var cyl = new THREE.Mesh( new THREE.CylinderGeometry( 10, 10, 20, 16, 1, true ), linesMaterial );
	// cyl.position.set( 0, -3, 0 );
	// scene.add( cyl );


	// var light = new THREE.HemisphereLight( 0xeeeeee, 0x020202, 0.75 );
	// light.position.set( 0.5, 1, 0.75 );
	// scene.add( light );
	// scene.add( group );