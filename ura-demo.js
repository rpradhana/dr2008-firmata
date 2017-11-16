const pixel = require("node-pixel");
const five  = require("johnny-five");
const readline = require('readline');

const
	COUNTER_TRESHOLD = 54,
	COUNTER_GATE     = 1,
	BREATHE_SLOWEST  = 20,
	BREATHE_FASTEST  = 2;

const board = new five.Board();

let
	strip = null,
	counter = 0,
	intensityStep = 255 / COUNTER_TRESHOLD,
	intensityRed  = 0,
	jellyfish = [],
	intensityBlue = 255,
	breatheInterval,
	isFading = false,
	isManualMode = false;

board.on("ready", function() {

	strip = new pixel.Strip({
		board: this,
		controller: "FIRMATA",
		strips: [ {pin: 6, length: 50}, ], // this is preferred form for definition
		gamma: 2.8, // set to a gamma that works nicely for WS2812
	});

	strip.on("ready", function() {
		// Initialize with blue
		strip.color("rgb(0, 0, 255)");
		strip.show();
	});

	/**
	 * Jellyfish Object
	 */
	const Jellyfish = function(pin, startValue) {
		this.pin = pin;
		this.intensity = startValue;
		this.interval;
		this.direction = 1;

		Jellyfish.prototype.kill = function(delay) {
			console.log('Killing the jellyfish!');
			clearInterval(this.interval);

			this.interval = setInterval(() => {
				// Dimmer
				if (this.intensity > 0) {
					this.intensity-=1;
					setIntensity(this.pin, this.intensity);
					if (this.intensity <= 0) {
						this.direction = 1;
						return;
					}
				};
			}, delay);
		};

		Jellyfish.prototype.breathe = function(delay, startValue, endValue) {
			// console.log('Jellyfish is breathing!');
			clearInterval(this.interval);

			this.interval = setInterval(() => {
				// Brighter
				if (this.intensity < endValue && this.direction == 1) {
					this.intensity += 1;
					setIntensity(this.pin, this.intensity);
					if (this.intensity >= endValue) {
						this.direction = 0;
						return;
					}
				}
				// Dimmer
				else if (this.intensity > startValue && this.direction == 0) {
					this.intensity-=1;
					setIntensity(this.pin, this.intensity);
					if (this.intensity <= startValue) {
						this.direction = 1;
						return;
					}
				};
			}, delay);
		};
	};

	const setIntensity = function(pin, intensity) {
		board.analogWrite(pin, intensity);
		// Disable to reduce log noise
		// console.log('Pin ' + pin + ': ' + intensity);
	};

	/**
	 * Initialize Jellyfish
	 */
	this.pinMode(3, five.Pin.PWM);
	jellyfish[0] = new Jellyfish(3, 0);
	jellyfish[0].breathe(BREATHE_SLOWEST, 32, 255);


	const step = function() {
		if (isFading) {
			console.log('still fading...');
			return;
		}
		counter++;
		if (counter > COUNTER_TRESHOLD) {
			fade();
			return;
		}
		console.log('step ' + counter);
		handleStep(counter);
	}

	const fade = function() {
		console.log('Fading start.');
		jellyfish[0].kill(10);
		// Fade out
		let fadeOutInterval = setInterval(() => {
			isFading = true;
			if (intensityRed <= 0) {
				intensityRed = 0;
				clearInterval(fadeOutInterval);
				return;
			}
			else {
				intensityRed -= 1;
				console.log('R ' + intensityRed);
			}
			strip.color("rgb(" + intensityRed + ", 0 , " + intensityBlue + ")");
			strip.show();
		}, 10);

		setTimeout(() => {
			jellyfish[0].breathe(BREATHE_SLOWEST, 32, 255);
			// Fade in
			isFading = true;
			let fadeInInterval = setInterval(() => {
				isFading = true;
				if (intensityBlue >= 255) {
					intensityBlue = 255;
					clearInterval(fadeInInterval);
					isFading = false;
					console.log('Fading end.');
					return;
				}
				else {
					intensityBlue += 1;
					console.log('B ' + intensityBlue);
				}
				strip.color("rgb(" + intensityRed + ", 0 , " + intensityBlue + ")");
				strip.show();
			}, 10);
		}, 2500);

		counter = 0;
		return;
	}

	const handleStep = function(c) {
		if (c % COUNTER_GATE == 0) {
			/**
			 * Structure handler
			 */
			intensityRed  = Math.floor(  0 + (c * intensityStep));
			intensityBlue = Math.floor(255 - (c * intensityStep));
			console.log('R ' + intensityRed);
			console.log('B ' + intensityBlue);
			strip.color("rgb(" + intensityRed + ", 0 , " + intensityBlue + ")");
			strip.show();
			/**
			 * Jellyfish handler
			 * clamp intensity changes within max-min range
			 * c / floor(c / (max-min))
			 */
			breatheInterval = BREATHE_SLOWEST - Math.floor(c / (COUNTER_TRESHOLD / (BREATHE_SLOWEST - BREATHE_FASTEST)));
			console.log(breatheInterval);
			jellyfish[0].breathe(breatheInterval, 32, 255);
		};
	};

	/**
	 * Demo purpose only
	 */
	setInterval(() => {
		step();
	}, 250);

	/**
	 * Keypress Handler
	 */
	// Allows us to listen for events from stdin
	readline.emitKeypressEvents(process.stdin);
	process.stdin.setRawMode(true);
	process.stdin.on('keypress', (str, key) => {
		switch (key.sequence) {
			// end of line
			case '\u0003':
				process.exit();
				break;
			// spacebar
			case '\u0020':
				step();
				break;
			// z
			case '\u007A':
				isManualMode = true;
				jellyfish[0].breathe(BREATHE_SLOWEST, 32, 255);
				break;
			// x
			case '\u0078':
				isManualMode = true;
				jellyfish[0].breathe(BREATHE_FASTEST, 32, 255);
				break;
			// c
			case '\u0063':
				step(); step(); step();
				step(); step(); step();
				step(); step(); step();
				break;
		};
	});

});
