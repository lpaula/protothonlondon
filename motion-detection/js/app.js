(function() {

	function hasGetUserMedia() {
		// Note: Opera builds are unprefixed.
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia || navigator.msGetUserMedia);
	}

	if (hasGetUserMedia()) {
		$("#info").hide();
		$("#message").show();
	} else {
		$("#info").show();
		$("#message").hide();
		$("#video-demo").show();
		$("#video-demo")[0].play();
		return;
	}

	var webcamError = function(e) {
		alert('Webcam error!', e);
	};

	var video = $('#webcam')[0];

	if (navigator.getUserMedia) {
		navigator.getUserMedia({audio: true, video: true}, function(stream) {
			video.src = stream;
			initialize();
		}, webcamError);
	} else if (navigator.webkitGetUserMedia) {
		navigator.webkitGetUserMedia({audio: true, video: true}, function(stream) {
			video.src = window.webkitURL.createObjectURL(stream);
			initialize();
		}, webcamError);
	} else {
		//video.src = 'somevideo.webm'; // fallback.
	}

	var AudioContext = (
		window.AudioContext ||
		window.webkitAudioContext ||
		null
	);

	var notesPos = [50, 350, 1159, 1238, 1313, 1390, 1468, 1544];
	var ctrlPos = [0, 544];

	var timeOut, lastImageData;
	var canvasSource = $("#canvas-source")[0];
	var canvasBlended = $("#canvas-blended")[0];

	var contextSource = canvasSource.getContext('2d');
	var contextBlended = canvasBlended.getContext('2d');

	var soundContext;
	var bufferLoader;
	var notes = [];

	// mirror video
	contextSource.translate(canvasSource.width, 0);
	contextSource.scale(-1, 1);

	var c = 5;

	function initialize() {
		/*
		if (!AudioContext) {
			alert("AudioContext not supported!");
		}
		else {
			loadSounds();
		}
		*/
		start();
	}



	function start() {
		$(canvasSource).show();
		$(canvasBlended).hide();
		$("#controller").show();
		$("#message").hide();
		$("#description").hide();
		$("#slider").show();
		update();
	}

	function update() {
		drawVideo();
		blend();
		//checkAreas();
		checkSlider();
		timeOut = setTimeout(update, 1000/30);
	}

	function drawVideo() {
		contextSource.drawImage(video, 0, 0, video.width, video.height);
	}

	function blend() {
		var width = canvasSource.width;
		var height = canvasSource.height;
		// get webcam image data
		var sourceData = contextSource.getImageData(0, 0, width, height);
		// create an image if the previous image doesn’t exist
		if (!lastImageData) lastImageData = contextSource.getImageData(0, 0, width, height);
		// create a ImageData instance to receive the blended result
		var blendedData = contextSource.createImageData(width, height);
		// blend the 2 images
		differenceAccuracy(blendedData.data, sourceData.data, lastImageData.data);
		// draw the result in a canvas
		contextBlended.putImageData(blendedData, 0, 0);
		// store the current webcam image
		lastImageData = sourceData;
	}

	function fastAbs(value) {
		// funky bitwise, equal Math.abs
		return (value ^ (value >> 31)) - (value >> 31);
	}

	function threshold(value) {
		return (value > 0x15) ? 0xFF : 0;
	}

	function difference(target, data1, data2) {
		// blend mode difference
		if (data1.length != data2.length) return null;
		var i = 0;
		while (i < (data1.length * 0.25)) {
			target[4*i] = data1[4*i] == 0 ? 0 : fastAbs(data1[4*i] - data2[4*i]);
			target[4*i+1] = data1[4*i+1] == 0 ? 0 : fastAbs(data1[4*i+1] - data2[4*i+1]);
			target[4*i+2] = data1[4*i+2] == 0 ? 0 : fastAbs(data1[4*i+2] - data2[4*i+2]);
			target[4*i+3] = 0xFF;
			++i;
		}
	}

	function differenceAccuracy(target, data1, data2) {
		if (data1.length != data2.length) return null;
		var i = 0;
		while (i < (data1.length * 0.25)) {
			var average1 = (data1[4*i] + data1[4*i+1] + data1[4*i+2]) / 3;
			var average2 = (data2[4*i] + data2[4*i+1] + data2[4*i+2]) / 3;
			var diff = threshold(fastAbs(average1 - average2));
			target[4*i] = diff;
			target[4*i+1] = diff;
			target[4*i+2] = diff;
			target[4*i+3] = 0xFF;
			++i;
		}
	}

	function checkSlider() {
		// loop over the note areas
		for (var r=50; r<450; ++r) {
			
			// get the pixels in a note area from the blended image
			var x = 20;
			var y = 10+r;
			var blendedData = contextBlended.getImageData(x, y, 10, 50);
			var i = 0;
			var average = 0;
			// loop over the pixels
			while (i < (blendedData.data.length * 0.25)) {
				// make an average between the color channel
				average += (blendedData.data[i*4] + blendedData.data[i*4+1] + blendedData.data[i*4+2]) / 3;
				++i;
			}
			// calculate an average between of the color values of the note area
			average = Math.round(average / (blendedData.data.length * 0.25));
			if (average > 10) {
				//Motion Detected on Controller 1
				//document.getElementById('ctrl1').style.top = r + 'px';
				window.sendMessage('rate', r);
				//console.log("Motion detected: x=" + x + " y ="+y );
			}
			x = 580;
			y = 10+r;
			blendedData = contextBlended.getImageData(x, y, 10, 50);
			i = 0;
			var average = 0;
			// loop over the pixels
			while (i < (blendedData.data.length * 0.25)) {
				// make an average between the color channel
				average += (blendedData.data[i*4] + blendedData.data[i*4+1] + blendedData.data[i*4+2]) / 3;
				++i;
			}

			average = Math.round(average / (blendedData.data.length * 0.25));
			if (average > 10) {
				//Motion Detected on Controller 2
				//console.log("Motion detected: x=" + x + " y ="+ y );
				//document.getElementById('ctrl2').style.top = r + 'px';
				window.sendMessage('filter', r);
			}
		}
	}


})();