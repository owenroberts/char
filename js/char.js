var blocker = document.getElementById( 'blocker' );
var startButton = document.getElementById( 'start-button' );
var instructions = document.getElementById( 'instructions' );
var bgMusic, bgLoader;

let restart = false;

const idles = [0,1,2,3,4];
const walks = [12, 13, 14, 15];
const talks = [6,7,8,9];

/* sides  0 front  1 back  2 top  3 bottom  4 right  5 left*/
const dialogs = [
	// starts with empty church windows ... 
	{ track: "clips/0.mp3",	 anim: "drawings/beach.json", sides: [0,1,4,5], delay: 7000, end: 4000 },
	{ track: "clips/1.mp3",	 anim: "drawings/mustard_3.json", sides: [0, 1, 4, 5], delay: 4000, end: 4000 },
	{ track: "clips/2.mp3",	 anim: "drawings/cat_jesus_windows.json", sides: [0, 1], delay: 4000, end: 3000 },
	{ track: "clips/3.mp3",	 anim: "drawings/heavenhell.json", sides: [0, 1, 4, 5], delay: 3000, end: 3000},
	{ track: "clips/4.mp3",	 anim: "drawings/liens.json", sides: [1, 2, 3], delay: 3000, end: 4000 },
	{ track: "clips/5.mp3",  anim: "drawings/moon.json", sides: [0, 1, 2, 4, 5], delay: 3000, end: 5000 },
	{ track: "clips/6.mp3",	 anim: "drawings/bite.json", sides: [0, 1, 2, 3, 4, 5], delay: 3000, end: 3000 },
	{ track: "clips/7.mp3",	 anim: "drawings/get_a_dog.json", sides: [0, 1, 4, 5], delay: 7000, end: 3000 },
	{ track: "clips/8.mp3",	 anim: "drawings/cat_hotdog_angel.json", sides: [0, 1, 3, 4, 5], delay: 3000, end: 4000 },
	{ track: "clips/9.mp3",	 anim: "drawings/big_dogs.json", sides: [0, 1, 2, 3, 4, 5], delay: 3000, end: 3000 },
	{ track: "clips/10.mp3", anim: "drawings/spinning.json", sides: [0, 1, 2, 3, 4, 5], delay: 3000, end: 3000 },
	{ track: "clips/11.mp3", anim: "drawings/cat_adam_and_eve.json", sides: [0, 1, 4, 5], delay: 5000, end: 3000 },
	{ track: "clips/12.mp3", anim: "drawings/hell_hotdog.json", sides: [0, 1, 4, 5], delay: 3000, end: 7000 },
	{ track: "clips/13.mp3", anim: "drawings/cracks_2.json", sides: [0, 1, 4, 5], delay: 3000, end: 5000 }
];

let currentDialog = 0;
let time;
let nextClip = true;

var lines = document.getElementById('lines');
let width = window.innerWidth, height = window.innerHeight;
let linesPlayer = new LinesPlayer(lines);
linesPlayer.isTexture = true;
let planes = [];

let phoneLines = new LinesPlayer(document.getElementById('phone'));
phoneLines.loadAnimation('drawings/phone.json');

let camera, scene, renderer, controls;
let linesTexture; /* texture gets updated */
let clock, mixer;
let listener, voiceSound, voiceSource, audioLoader;

let char;

// better than mobile check, includes ipad
function onMotion(ev) {
	window.removeEventListener('devicemotion', onMotion, false);
	if (ev.acceleration.x != null || ev.accelerationIncludingGravity.x != null) {
		startButton.style.display = "block";
		instructions.textContent = "Headphones recommended.  Rotate phone to view.";
		document.getElementById('phone').style.display = 'block';
		document.getElementById('desktop').remove();
		init();
	}
}
window.addEventListener('devicemotion', onMotion, false);
if (document.getElementById('desktop'))
	document.getElementById('desktop').style.opacity = 1; 

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
	voiceSound = new THREE.PositionalAudio( listener );

	bgLoader = new THREE.AudioLoader();
	bgMusic = new THREE.Audio( listener );

	/* blender */
	mixer = new THREE.AnimationMixer( scene );
	let loader = new THREE.JSONLoader();
	loader.load("models/char_toon.min.json", function(geometry, materials) {
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

		startButton.textContent = "Tap to play";
		startButton.addEventListener('touchend', start, false );
		startButton.addEventListener('click', start, false );
	});
}

function start() {
	// fullscreen();
	if (document.getElementById('phone'))
		document.getElementById('phone').remove();

	if (restart) {
		currentDialog = 0;
		dialogs.map((d) => d.start = 0);
		nextClip = true;
		bgLoader.load("clips/theme_7_80_12.mp3", function(buffer) {
			bgMusic.stop();
			bgMusic.isPlaying = false;		
			bgMusic.setBuffer( buffer );
			bgMusic.setLoop( true );
			bgMusic.play();
		});
	} else {
		animate();
		bgMusic.loop = true;
	}

	bgLoader.load("clips/theme_7_80_12.mp3", function(buffer) {
		bgMusic.setBuffer( buffer );
		bgMusic.setLoop( true );
		bgMusic.play();
	});

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

function talk(dialog) {
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
		walk();

		const nextIndex = dialogs.indexOf(dialog) + 1;
		if (nextIndex <  dialogs.length) {
			currentDialog = nextIndex;
			nextClip = true;
		}
		else
			setTimeout(end, 4000);
	};
}

function walk( isWalk ) {
	mixer.stopAllAction();
	if (Math.random() > 0.3 || isWalk) {
		const walk = walks[Math.floor(Math.random() * walks.length)];
		mixer.clipAction(char.geometry.animations[walk], char).play();
		if (char.position.distanceTo(camera.position) > 10) {
			char.xSpeed = char.position.x > camera.position.x ? Cool.random(-0.02, 0) : Cool.random(0, 0.02);
			char.zSpeed = char.position.z > camera.position.z ? Cool.random(-0.02, 0) : Cool.random(0, 0.02);
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
	}
}

function end() {
	bgLoader.load("clips/end.mp3", function(buffer) {
		bgMusic.stop();
		bgMusic.isPlaying = false;
		bgMusic.setBuffer( buffer );
		bgMusic.setLoop( false );
		bgMusic.play();
	});
	setTimeout(function() {
		exitFullscreen();
		restart = true;
		blocker.style.display = 'block';
		instructions.style.display = 'block';
		startButton.textContent = "Tap to play again";
		instructions.textContent = "End of part 1";
		document.getElementById("title").style.display = "block";
		document.getElementById("tramp-link").style.display = "block";
		nextClip = false;
		mixer.stopAllAction();
		const endAnim = [1,2,3,4][Cool.randomInt(0,3)];
		mixer.clipAction(char.geometry.animations[endAnim], char).play();
		char.xSpeed = 0;
		char.zSpeed = 0;
		linesPlayer.loadAnimation("drawings/big_dogs.json", function() {
			// turn on dialog.sides, off others
			planes.map((p, i) => [0,1,2,3,4,5].indexOf(i) != -1 ? p.visible = true : p.visible = false);
		});
	}, 2000);
}

function animate() {
	/* audio clips */
	if (performance.now() > time && nextClip) {
		let dialog = dialogs[currentDialog];
		if (dialog.start == 1) {
			talk( dialog );
		} else {
			if (currentDialog == 0)
				walk( true );
			dialog.start = 1;
			time += dialog.delay;
			// walk();
		}
	}

    requestAnimationFrame(animate);
    linesTexture.needsUpdate = true;
    linesPlayer.draw();
    mixer.update( clock.getDelta() );
    char.position.x += char.xSpeed;
    char.position.z += char.zSpeed;
    camera.position.y += camera.ySpeed;
    controls.update();
   	// renderer.render(scene, camera);
   	effect.render( scene, camera );
}

function onWindowResize() { 
	width =  document.documentElement.clientWidth;
	height =  document.documentElement.clientHeight;
	
	//document.getElementById('ww').textContent = window.screen.width + ", " + width;
	//document.getElementById('wh').textContent = window.screen.height + ", " + height;

	camera.aspect = width / height;
	camera.updateProjectionMatrix(); // https://stackoverflow.com/questions/30453549/three-js-canvas-not-resizing-to-mobile-device-window-width
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(width, height);
}
window.addEventListener( 'resize', onWindowResize, false );

function fullscreen() {
	if (renderer.domElement.requestFullscreen) {
		renderer.domElement.requestFullscreen();
	} else if (renderer.domElement.msRequestFullscreen) {
		renderer.domElement.msRequestFullscreen();
	} else if (renderer.domElement.mozRequestFullScreen) {
		renderer.domElement.mozRequestFullScreen();
	} else if (renderer.domElement.webkitRequestFullscreen) {
		renderer.domElement.webkitRequestFullscreen();
	}
}

function exitFullscreen() {
	document.exitFullscreen = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
	if (document.exitFullscreen)
		document.exitFullscreen();
}

// https://stackoverflow.com/questions/28402100/wrong-value-for-window-innerwidth-during-onload-event-in-firefox-for-android

document.addEventListener('visibilitychange', ev => {
	location.reload(); // easier for now
	if (document.hidden && !bgMusic.paused) {
		bgMusic.pause();
		voiceSound.pause();
	} else if (!document.hidden && bgMusic.paused) {
		bgMusic.play();
		voiceSound.play();
	}
});