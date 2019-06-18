const touch = {};
function handleStart(ev) {
	ev.preventDefault();
	touch.x = ev.touches[0].clientX;
	touch.y = ev.touches[0].clientY;
}
function handleMove(ev) {
	ev.preventDefault();
	const delta = {
		x: ev.touches[0].clientX - touch.x,
		y: ev.touches[0].clientY - touch.y
	};
	camera.rotation.y += Cool.map(delta.x, -width/2, width/2, -Math.PI/4, Math.PI/4);
	camera.rotation.x += Cool.map(delta.y, -height/2, height/2, -Math.PI/4, Math.PI/4);
	touch.x = ev.touches[0].clientX;
	touch.y = ev.touches[0].clientY;
}

function setupTouchControls() {
	renderer.domElement.addEventListener("touchstart", handleStart);
	renderer.domElement.addEventListener("touchmove", handleMove);
}