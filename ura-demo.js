const Board = require('firmata');
const readline = require('readline');
const pixel = require('node-pixel');

const
	COUNTER_TRESHOLD = 54,
	COUNTER_GATE     = 9;

let
	counter = 0,
	jellyfish = [];

Board.requestPort(function(error, port) {
	if (error) {
		console.log(error);
		return;
	}

	const board = new Board(port.comName);

	// strip = new pixel.Strip({
	// 	pin: 6,
	// 	length: 10,
	// 	firmata: board,
	// 	controller: "FIRMATA",
	// });

	// strip.on('ready', function() {

	// });

	board.on('ready', function() {
		const
			A3  = 3,
			A5  = 5,
			A6  = 6,
			A9  = 9,
			A10 = 10,
			A11 = 11;

		const
			red  = A10;
			blue = A11;

		let
			state = 1,
			interval,
			intensityStep = 255 / COUNTER_TRESHOLD,
			intensityRed  = 0,
			intensityBlue = 255;

		/**
		 * Initialise PWM pins
		 */
		[A3, A5, A6, A9, A10, A11].forEach(function(pin) {
			board.pinMode(pin, board.MODES.PWM);
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
				console.log('Jellyfish is breathing!');
				clearInterval(this.interval);

				this.interval = setInterval(() => {
					// Brighter
					if (this.intensity < endValue && this.direction == 1) {
						this.intensity+=1;
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
			// Disabled to reduce log noise
			// console.log('Pin ' + pin + ': ' + intensity);
		};

		/**
		 * Handle changes from stepping plates
		 */

		const handleStep = function(c) {
			if (c % COUNTER_GATE == 0) {
				/**
				 * Structure handler
				 */
				intensityRed  = Math.floor(  0 + (c * intensityStep));
				intensityBlue = Math.floor(255 - (c * intensityStep));
				console.log('R ' + intensityRed);
				console.log('B ' + intensityBlue);
				board.analogWrite(A11, intensityRed);

				/**
				 * Jellyfish spawner
				 */
				// Logic to spawn the jellyfish?
			};
		};

		// Instantiate a sample jellyfish
		jellyfish[0] = new Jellyfish(A3, 0);

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
					counter++;
					if (counter > COUNTER_TRESHOLD) {
						counter = 0;
					}
					console.log('step ' + counter);
					handleStep(counter);
					break;
				// z
				case '\u007A':
					// Instantiate a sample jellyfish
					if (!jellyfish[0]) {
						console.log('Jellyfish spawned!');
						jellyfish[0] = new Jellyfish(A3, 0);
						console.log('z');
					}
					else {
						console.log('jellyfish exists');
					}
					break;
				// x
				case '\u0078':
					jellyfish[0].breathe(8, 64, 255); // (255 - 64) * 8ms
					console.log('x');
					break;
				// c
				case '\u0063':
					jellyfish[0].kill(16);
					console.log('c');
					break;
			};
		});
	});
});
