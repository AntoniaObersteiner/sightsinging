let sheet;
let synth;
let audio_state;
let canvas_height = 600;
let canvas_width = 600;
let analyzer;


function setup() {
	createCanvas(canvas_height, canvas_height);
	noLoop();
}

function startAudio () {
	userStartAudio();

	sheet = new Sheet();
	analyzer = new AudioAnalyzer();

	//make settings visible
	document.getElementsByTagName("nav")[0].removeAttribute("hidden");
	//mimics the autoplay policy
	getAudioContext().suspend();

	synth = new p5.MonoSynth();
	//This won't play until the context has resumed
	synth.play('A5', .5, 0, 0.2);

	sheet.synth.start();

	loop();
}

function draw() {
	if (sheet == null) {
		clear();
		text("klicken oder Taste drücken!", canvas_width / 2, canvas_height / 2);
		noLoop();
		return;
	}

	clear();
	sheet.draw();
	analyzer.draw();
	if (audio_state != getAudioContext().state) {
		console.log(getAudioContext().state);
		audio_state = getAudioContext().state;
	}
}

function mousePressed() {
	if (sheet == null)
		startAudio();
	console.log(getAudioContext().state);
	loop();
}

function audio_toggle() {
	if (getAudioContext().state == 'suspended')
		getAudioContext().resume();
	else if (getAudioContext().state == 'running')
		getAudioContext().suspend();
	else
		startAudio();
		console.log(getAudioContext().state);
		loop();
}

function keyPressed() {
	if (sheet == null)
		startAudio();
	if (keyIsDown(64 + 13)) { //'M'
		audio_toggle();
	} else if (keyIsDown(64 + 1)) { //'A'
		synth.play('A5', 1, 0, 2);
	} else if (keyIsDown(64 + 3)) { //'C'
		sheet.clear_notes();
	} else if (keyIsDown(LEFT_ARROW)) { //→
		sheet.backward();
	} else if (keyIsDown(RIGHT_ARROW)) { //←
		sheet.forward();
	}
}
