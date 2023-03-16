import * as aesjs from "aes-js";

/**
 * @link https://docs.premid.app/dev/presence/class#presencedata-interface
 */
interface PresenceData {
	/**
	 * Top row of the status
	 */
	details?: string;
	/**
	 * Bottom row of the status
	 */
	state?: string;
	/**
	 * epoch seconds for start - including will show time as "elapsed"
	 */
	startTimestamp?: number;
	/**
	 * epoch seconds for ending - including will show time as "remaining"
	 */
	endTimestamp?: number;
	/**
	 * name of the uploaded image for the large profile artwork
	 */
	largeImageKey?: string;
	/**
	 * name of the uploaded image for the small profile artwork
	 */
	smallImageKey?: string;
	/**
	 * tooltip for the smallImageKey
	 */
	smallImageText?: string;
}

/**
 * Options that change the behavior of the presence
 */
interface PresenceOptions {
	/**
	 * ClientId of Discord application
	 * @link https://docs.premid.app/dev/presence/class#clientid
	 */
	clientId: string;
	/**
	 * The `UpdateData` event for both the presence and the iframe
	 * will only be fired when the page has fully loaded.
	 */
	injectOnComplete?: boolean;
	/**
	 * Empty presence data will show the application (image and name) on
	 * the user's profile.
	 */
	appMode?: boolean;
}

/**
 * Contains basic information about the presece
 * @link https://docs.premid.app/dev/presence/metadata
 */
interface Metadata {
	/**
	 * Should contain Object with name and id of the presence developer.
	 *
	 * Name is your Discord username without the identifier(#0000).
	 *
	 * User id can be copied from Discord by enabling developer mode and right-clicking on your profile.
	 */
	author: { name: string; id: string };
	/**
	 * Should contain an Array of Objects with each Object having the name and id of the contributor.
	 *
	 * Name is your Discord username without the identifier(#0000).
	 *
	 * User id can be copied from Discord by enabling developer mode and right-clicking on your profile.
	 */
	contributors?: Array<{ name: string; id: string }>;
	/**
	 * The title of the service that this presence supports. The folder name and service name should also be the same.
	 */
	service: string;
	/**
	 * Alternative titles for the service which can be used for searching in the store.
	 *
	 * Useful for services that have different names in different countries or for services which have spaces in them, you can remove the space in the alternative name for easier searching.
	 *
	 * Note: This is **NOT** used for tags! Only for alternative names!
	 */
	altnames?: Array<string>;
	/**
	 * Small description of the service.
	 *
	 * Your description must have key pair values which indicate the language, and the description in that specific language.
	 *
	 * Make descriptions with the languages that you know, our translators will make changes to your metadata file.
	 *
	 * Visit the link for all the language IDs.
	 * @link https://api.premid.app/v2/langFile/list
	 */
	description: Record<string, string>;
	/**
	 * URL of the service.
	 *
	 * Example: `vk.com`
	 *
	 * This url must match the url of the website as it will be used to detect wherever or not this is the website to inject the script to.
	 *
	 * This may only be used as an array when there are more than one urls.
	 *
	 * Note: Do **NOT** add `http://` or `https://` in the url or it will not work.
	 */
	url: string | Array<string>;
	/**
	 * Version of your presence.
	 *
	 * Use Sematic Versioning; <MAJOR>.<MINOR>.<PATCH>
	 *
	 * @link https://semver.org/
	 */
	version: string;
	/**
	 * Link to service's logo.
	 *
	 * Must end with .png/.jpg/etc.
	 */
	logo: string;
	/**
	 * Link to service's thumbnail or picture of the website.
	 *
	 * Must end with .png/.jpg/etc.
	 */
	thumbnail: string;
	/**
	 * `#HEX` value.
	 *
	 * We recommend to use a primary color of the service that your presence supports.
	 */
	color: string;
	/**
	 * Array with tags, they will help users to search your presence on the website.
	 */
	tags: Array<string>;
	/**
	 * A string used to represent the category the presence falls under.
	 * @link https://docs.premid.app/dev/presence/metadata#presence-categories
	 */
	category: string;
	/**
	 * Defines whether `iFrames` are used.
	 */
	iframe?: boolean;
	/**
	 * A regular expression string used to match urls.
	 * @link https://docs.premid.app/dev/presence/metadata#regular-expressions
	 */
	regExp?: RegExp;
	/**
	 * A regular expression selector that selects iframes to inject into.
	 * @link https://docs.premid.app/dev/presence/metadata#regular-expressions
	 */
	iframeRegExp?: RegExp;
	/**
	 * Defines whether `getLogs()` is used.
	 */
	readLogs?: boolean;
	button?: boolean;
	warning?: boolean;
	/**
	 * An array of settings the user can change.
	 * @link https://docs.premid.app/dev/presence/metadata#presence-settings
	 */
	settings?: Array<{
		id: string;
		/**
		 * Needed for every setting except if you use `multiLanguage`.
		 */
		title?: string;
		/**
		 * Needed for every setting except if you use `multiLanguage`.
		 */
		icon?: string;
		if?: Record<string, string | number | boolean>;
		placeholder?: string;
		value?: string | number | boolean;
		values?: Array<string | number | boolean>;
		/**
		 * `false`: default, it disables multi-localization.
		 *
		 * `true`: use this if you are only going to use strings from the `general.json` file, of the  [localization github repo](https://github.com/PreMiD/Localization/tree/master/src/Presence).
		 *
		 * `string`: name of the file, excluding the extension (.json), inside the [localization github repo](https://github.com/PreMiD/Localization/tree/master/src/Presence).
		 *
		 * `Array<string>`: if you are using more than one file, from inside of the [localization github repo](https://github.com/PreMiD/Localization/tree/master/src/Presence), you can specify all the values in an array. Only common languages of all the files will be listed.
		 */
		multiLanguage?: boolean | string | Array<string>;
	}>;
}

/**
 * Useful tools for developing presences
 * @link https://docs.premid.app/en/dev/presence/class
 */
// @ts-ignore
class Presence {
	metadata: Metadata;
	_events: any = {};
	private clientId: string;
	private injectOnComplete: boolean;
	private appMode: boolean;
	private trayTitle: string = "";
	private playback: boolean = true;
	private internalPresence: PresenceData = {};
	private port = chrome.runtime.connect({ name: "devHelper" });
	private genericStyle: string =
		"font-weight: 800; padding: 2px 5px; color: white;";
	private presenceStyle: string = "";
	private encryptionKey: Uint8Array;

	/**
	 * Create a new Presence
	 */
	constructor(presenceOptions: PresenceOptions) {
		this.clientId = presenceOptions.clientId;
		this.injectOnComplete = presenceOptions.injectOnComplete || false;
		this.appMode = presenceOptions.appMode || false;

		// @ts-ignore
		this.metadata = PreMiD_Metadata;

		this.presenceStyle = `background: ${
			this.metadata.color
		}; color: ${this.getFontColor(this.metadata.color)};`;

		window.addEventListener("PreMiD_TabPriority", (data: CustomEvent) => {
			if (!data.detail) this.clearActivity();
		});
	}

	//TODO Make this return the active presence shown in Discord.
	/**
	 * Get the current activity
	 * @link https://docs.premid.app/en/dev/presence/class#getactivity
	 */
	getActivity() {
		return this.internalPresence;
	}

	/**
	 * Sets the presence activity and sends it to the application.
	 * @param data PresenceData or Slideshow
	 * @param playback Is presence playing
	 * @link https://docs.premid.app/dev/presence/class#setactivitypresencedata-boolean
	 */
	setActivity(data: PresenceData | Slideshow = {}, playback: boolean = true) {
		if (data instanceof Slideshow) data = data.currentSlide;

		// Remove empty strings
		for (let [k, v] of Object.entries(data)) {
			if (typeof v === "string" && !v) delete data[k];
		}

		// Round decimal timestamps
		data.startTimestamp = Math.floor(data.startTimestamp);
		data.endTimestamp = Math.floor(data.endTimestamp);

		this.internalPresence = data;
		this.playback = playback;

		// Fix 00:00 timestamp bug
		if (data.endTimestamp && Date.now() >= data.endTimestamp) playback = false;

		this.sendData({
			clientId: this.clientId,
			presenceData: this.internalPresence,
			trayTitle: this.trayTitle,
			playback: this.playback
		});
	}

	/**
	 * Clears the activity shown in discord as well as the Tray and keybinds
	 * @link https://docs.premid.app/dev/presence/class#clearactivity
	 */
	clearActivity() {
		this.internalPresence = {};
		this.trayTitle = "";

		const data = {
			clientId: undefined,
			presenceData: {},
			playback: false,
			hidden: true
		};

		if (this.appMode) data.clientId = this.clientId;

		//* Send data to app
		this.sendData(data);
	}

	/**
	 * Sets the tray title on the Menubar in Mac OS (Mac OS only, supports ANSI colors)
	 * @param trayTitle Tray Title
	 * @link https://docs.premid.app/dev/presence/class#settraytitlestring
	 * @since 2.0-BETA3
	 */
	setTrayTitle(trayTitle: string = "") {
		this.trayTitle = trayTitle;
	}

	/**
	 * Get translations from the extension
	 * @param strings String object with keys being the key for string, keyValue is the string value
	 * @param language Language
	 * @link https://docs.premid.app/dev/presence/class#getstringsobject
	 */
	getStrings(strings: Object, language?: string) {
		return new Promise<any>(resolve => {
			const listener = function(detail: any) {
				window.removeEventListener("PreMiD_ReceiveExtensionData", listener);
				resolve(detail.strings);
			};

			// TODO currently unhandled
			this.port.postMessage({ action: "getStrings", language, strings });

			//* Receive data from PreMiD
			window.addEventListener(
				"PreMiD_ReceiveExtensionData",
				(detail: CustomEvent) => listener(detail.detail)
			);

			const pmdRED = new CustomEvent("PreMiD_RequestExtensionData", {
				detail: {
					strings: strings,
					language: language ?? null
				}
			});

			//* Trigger the event
			window.dispatchEvent(pmdRED);
		});
	}

	/**
	 * Get letiables from the actual site
	 * @param {Array} letiables Array of letiable names to get
	 * @example let pagelet = getPageletiable('pagelet') -> "letiable content"
	 * @link https://docs.premid.app/presence-development/coding/presence-class#getpageletiable-string
	 */
	getPageletiable(letiable: string) {
		return new Promise<any>(resolve => {
			let script = document.createElement("script"),
				_listener = (data: CustomEvent) => {
					script.remove();
					resolve(JSON.parse(data.detail));

					window.removeEventListener("PreMiD_Pageletiable", _listener, true);
				};

			window.addEventListener("PreMiD_Pageletiable", _listener);

			script.id = "PreMiD_Pageletiables";
			script.appendChild(
				document.createTextNode(`
        var pmdPL = new CustomEvent("PreMiD_Pageletiable", {detail: (typeof window["${letiable}"] === "string") ? window["${letiable}"] : JSON.stringify(window["${letiable}"])});
        window.dispatchEvent(pmdPL);
      `)
			);

			(document.body || document.head || document.documentElement).appendChild(
				script
			);
		});
	}

	/**
	 * Returns an array of the past 100 logs, you can filter these logs with a RegExp.
	 * @param regExp Filter of the logs
	 */
	async getLogs(regExp?: RegExp): Promise<Array<any>> {
		let logs = (await this.getPageletiable("console")).logs;
		if (regExp) {
			logs = logs.filter(
				l => typeof l === "string" && new RegExp(regExp).test(l)
			);
		}
		if (logs == undefined) logs = [];
		return logs;
	}

	/**
	 * Returns extension version
	 * @param onlyNumeric version nubmer without dots
	 * @link https://docs.premid.app/en/dev/presence/class#getextensionversionboolean
	 * @since 2.1
	 */
	getExtensionVersion(onlyNumeric = true) {
		if (onlyNumeric)
			return parseInt(chrome.runtime.getManifest().version.replace(/\D/g, ""));
		return chrome.runtime.getManifest().version;
	}

	/**
	 * Get a setting from the presence metadata
	 * @param setting Id of setting as defined in metadata
	 * @link https://docs.premid.app/dev/presence/class#getsettingstring
	 * @since 2.1
	 */
	getSetting(setting: string) {
		return new Promise<any>((resolve, reject) => {
			chrome.storage.local.get(
				`pSettings_${this.metadata.service}`,
				settings => {
					const settingValue = settings[
						`pSettings_${this.metadata.service}`
					].find(s => s.id === setting);

					const res =
						settingValue !== undefined
							? settingValue.value
							: this.metadata.settings[setting]
							? this.metadata.settings[setting].value
							: undefined;
					if (res !== undefined) resolve(res);
					else reject(res);
				}
			);
		});
	}

	/**
	 * Hide a setting
	 * @param setting Id of setting / Array of setting Id's
	 * @link https://docs.premid.app/dev/presence/class#hidesettingstring
	 * @since 2.1
	 */
	hideSetting(settings: string | Array<string>) {
		return new Promise<void>((resolve, reject) => {
			chrome.storage.local.get(
				`pSettings_${this.metadata.service}`,
				storageSettings => {
					const errors = [];

					if (!Array.isArray(settings)) settings = [settings];

					settings.forEach(setting => {
						let settingToHide = storageSettings[
							`pSettings_${this.metadata.service}`
						].find(s => s.id === setting);

						if (!settingToHide)
							errors.push(`Setting "${setting}" does not exist.`);
						else {
							settingToHide.hidden = true;
						}
					});

					chrome.storage.local.set(storageSettings, resolve);
					if (errors.length > 0) reject(errors);
				}
			);
		});
	}

	/**
	 * Show a setting
	 * @param setting Id of setting / Array of setting Id's
	 * @link https://docs.premid.app/dev/presence/class#showsettingstring
	 * @since 2.1
	 */
	showSetting(settings: string | Array<string>) {
		return new Promise<void>((resolve, reject) => {
			chrome.storage.local.get(
				`pSettings_${this.metadata.service}`,
				storageSettings => {
					const errors = [];

					if (!Array.isArray(settings)) settings = [settings];

					settings.forEach(setting => {
						let settingToShow = storageSettings[
							`pSettings_${this.metadata.service}`
						].find(s => s.id === setting);

						if (!settingToShow)
							errors.push(`Setting "${setting}" does not exist.`);
						else {
							settingToShow.hidden = false;
						}
					});

					chrome.storage.local.set(storageSettings, resolve);
					if (errors.length > 0) reject(errors);
				}
			);
		});
	}

	/**
	 * Similar to `getTimestamps` but takes in a media element and returns snowflake timestamps
	 * @param media Media object
	 */
	getTimestampsfromMedia(media: HTMLMediaElement) {
		return this.getTimestamps(media.currentTime, media.duration);
	}

	/**
	 * Converts time and duration integers into snowflake timestamps
	 * @param {Number} elementTime Current element time seconds
	 * @param {Number} elementDuration Element duration seconds
	 */
	getTimestamps(elementTime: number, elementDuration: number) {
		const startTime = Date.now() - elementTime,
			endTime = Math.floor(startTime / 1000) - elementTime + elementDuration;
		return [Math.floor(startTime / 1000), endTime];
	}

	/**
	 * Converts a string with format `HH:MM:SS` or `MM:SS` or `SS` into an integer (Does not return snowflake timestamp)
	 * @param format The formatted string
	 */
	timestampFromFormat(format: string) {
		return format
			.split(":")
			.map(time => {
				return parseInt(time);
			})
			.reduce((prev, time) => 60 * prev + time);
	}

	/**
	 * Converts a hex string into an RGB object
	 * @param hex The hex string
	 */
	private hexToRGB(hex: string) {
		const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, (_, r, g, b) => {
			return r + r + g + g + b + b;
		});

		const result = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16)
			  }
			: null;
	}

	/**
	 * Calculates the font color based on the luminosity of the background
	 * @param backgroundHex The hex string of the background
	 */
	private getFontColor(backgroundHex: string) {
		const rgb = this.hexToRGB(backgroundHex),
			r = rgb.r,
			g = rgb.g,
			b = rgb.b,
			hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

		if (hsp < 127.5) {
			return "white";
		} else {
			return "black";
		}
	}

	/**
	 * Console logs with an info message
	 * @param message The log message
	 */
	info(message: string) {
		console.log(
			`%cPreMiD%c${this.metadata.service}%cINFO%c ${message}`,
			this.genericStyle + "border-radius: 25px 0 0 25px; background: #596cae;",
			this.genericStyle + this.presenceStyle,
			this.genericStyle + "border-radius: 0 25px 25px 0; background: #5050ff;",
			"color: unset;"
		);
	}

	/**
	 * Console logs with a success message
	 * @param message The log message
	 */
	success(message: string) {
		console.log(
			`%cPreMiD%c${this.metadata.service}%cSUCCESS%c ${message}`,
			this.genericStyle + "border-radius: 25px 0 0 25px; background: #596cae;",
			this.genericStyle + this.presenceStyle,
			this.genericStyle +
				"border-radius: 0 25px 25px 0; background: #50ff50; color: black;",
			"color: unset;"
		);
	}

	/**
	 * Console logs with an error message
	 * @param message The log message
	 */
	error(message: string) {
		console.error(
			`%cPreMiD%c${this.metadata.service}%cERROR%c ${message}`,
			this.genericStyle + "border-radius: 25px 0 0 25px; background: #596cae;",
			this.genericStyle + this.presenceStyle,
			this.genericStyle + "border-radius: 0 25px 25px 0; background: #ff5050;",
			"color: unset;"
		);
	}

	/**
	 * Creates a slideshow that allows for alternating between sets of
	 * presence data at specific intervals
	 */
	createSlideshow() {
		return new Slideshow();
	}

	/**
	 * Sends data back to application
	 * @param data Data to send back to application
	 */
	private sendData(data: Object) {
		//* Send data to app
		const pmdUP = new CustomEvent("PreMiD_UpdatePresence", {
			detail: this.encryptData(JSON.stringify(data))
		});

		window.dispatchEvent(pmdUP);
	}

	/**
	 * Generates a AES key from the app identifier
	 */
	private getEncryptionKey(): Uint8Array {
		if (this.encryptionKey) {
			return this.encryptionKey;
		}

		// @ts-ignore
		const key: string = PreMiD_Identifier;
		let keySize: number;

		if (key.length >= 32) {
			keySize = 32;
		} else if (key.length >= 24) {
			keySize = 24;
		} else if (key.length >= 16) {
			keySize = 16;
		} else {
			throw new Error("String is not long enough to create encryption key.");
		}

		this.encryptionKey = aesjs.utils.utf8.toBytes(key.substring(0, keySize));
		return this.encryptionKey;
	}

	/**
	 * Encrypts a string using AES algorithm
	 * @param data String to be encrypted
	 */
	private encryptData(data: string): string {
		const key = this.getEncryptionKey();

		const aesCtr = new aesjs.ModeOfOperation.ctr(key);
		const textBytes = aesjs.utils.utf8.toBytes(data);
		const encryptedBytes = aesCtr.encrypt(textBytes);
		const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);

		return encryptedHex;
	}

	/**
	 * Subscribe to events emitted by the extension
	 * @param eventName EventName to subscribe to
	 * @param callback Callback function for event
	 * @link https://docs.premid.app/dev/presence/class#events
	 */
	on(eventName: "UpdateData" | "iFrameData", callback: Function) {
		this._events[eventName] = callback;

		switch (eventName) {
			case "UpdateData":
				document.addEventListener("PreMiD_UpdateData", () => {
					//* Run callback
					if (this.injectOnComplete && document.readyState !== "complete")
						return;
					this._events[eventName]();
				});
				return;
			case "iFrameData":
				window.addEventListener("PreMiD_iFrameData", (data: CustomEvent) => {
					if (this.injectOnComplete && document.readyState !== "complete")
						return;
					this._events[eventName](data.detail);
				});
				return;
			default:
				console.error(Error(`${eventName} is not a valid event.`));
				return;
		}
	}
}

/**
 * Minimum amount of time in ms between slide updates
 */
const MIN_SLIDE_TIME: number = 5000;

/**
 * Represents a slideshow slide
 */
class SlideshowSlide {
	id: string;
	data: PresenceData;
	private _interval: number;

	constructor(id: string, data: PresenceData, interval: number) {
		this.id = id;
		this.data = data;
		this.interval = interval;
	}

	get interval(): number {
		return this._interval;
	}

	set interval(interval: number) {
		if (interval <= MIN_SLIDE_TIME) {
			interval = MIN_SLIDE_TIME;
		}
		this._interval = interval;
	}

	/**
	 * Updates the slide presenceData
	 * Passing null will keep the original value
	 * @param data The slide presenceData
	 */
	updateData(data: PresenceData = null) {
		this.data = data || this.data;
	}

	/**
	 * Updates the slide interval
	 * Passing null will keep the original value
	 * @param interval The slide interval
	 */
	updateInterval(interval: number = null) {
		this.interval = interval || this.interval;
	}
}

/**
 * Controller for alternating between multiple sets of
 * presence data at specific intervals
 */
class Slideshow {
	private index: number = 0;
	private slides: Array<SlideshowSlide> = [];
	currentSlide: PresenceData = {};

	constructor() {
		this.pollSlide();
	}

	/**
	 * Sets the current slide
	 */
	private pollSlide() {
		if (this.index > this.slides.length - 1) this.index = 0;
		if (this.slides.length !== 0) {
			const slide = this.slides[this.index];
			this.currentSlide = slide.data;
			this.index++;
			setTimeout(() => {
				// necessary to keep 'this' bound
				this.pollSlide();
			}, slide.interval);
		} else {
			this.currentSlide = {};
			setTimeout(() => {
				// necessary to keep 'this' bound
				this.pollSlide();
			}, MIN_SLIDE_TIME);
		}
	}

	/**
	 * Adds a slide to the queue
	 * If a slide already exists with the given id, it will be updated with a new value
	 * @param id The slide id
	 * @param data The slide presenceData
	 * @param interval Interval until next slide
	 */
	addSlide(id: string, data: PresenceData, interval: number) {
		if (this.hasSlide(id)) return this.updateSlide(id, data, interval);
		const slide = new SlideshowSlide(id, data, interval);
		this.slides.push(slide);
		return slide;
	}

	/**
	 * Deletes a slide from the queue
	 * @param id The slide id
	 */
	deleteSlide(id: string) {
		this.slides = this.slides.filter(slide => slide.id !== id);
	}

	/**
	 * Clears the queue
	 */
	deleteAllSlides() {
		this.slides = [];
		this.currentSlide = {};
	}

	/**
	 * Updates a slide already in queue
	 * Passing null will keep the old value
	 * @param id The slide id
	 * @param data The slide presenceData
	 * @param interval Interval until next slide
	 */
	updateSlide(id: string, data: PresenceData = null, interval: number = null) {
		for (const slide of this.slides) {
			if (slide.id === id) {
				slide.updateData(data);
				slide.updateInterval(interval);
				return slide;
			}
		}
	}

	/**
	 * Returns if a slide exists in the queue
	 * @param id The slide id
	 */
	hasSlide(id: string) {
		return this.slides.filter(slide => slide.id === id).length > 0;
	}

	/**
	 * Returns all slides
	 */
	getSlides() {
		return this.slides;
	}
}

/**
 * Is used to gather information from iFrames
 * @link https://docs.premid.app/en/dev/presence/iframe
 */
// @ts-ignore
class iFrame {
	_events: any = {};

	/**
	 * Send data from iFrames back to the presence script
	 * @param data Data to send
	 * @link https://docs.premid.app/dev/presence/class#iframedata
	 */
	send(data: any) {
		const pmdIFD = new CustomEvent("PreMiD_iFrameData", {
			detail: data
		});

		document.dispatchEvent(pmdIFD);
	}

	/**
	 * Returns the iframe url
	 * @link https://docs.premid.app/dev/presence/iframe#geturl
	 * @since 2.0-BETA3
	 */
	getUrl() {
		return new Promise<string>(async resolve => {
			const _listener = (data: CustomEvent) => {
				resolve(data.detail);
				document.removeEventListener("PreMiD_iFrameURL", _listener, true);
			};
			document.addEventListener("PreMiD_iFrameURL", _listener);

			const pmdGIFU = new CustomEvent("PreMiD_GETiFrameURL");

			document.dispatchEvent(pmdGIFU);
		});
	}

	/**
	 * Subscribe to events emitted by the extension
	 * @param eventName
	 * @param callback
	 * @link https://docs.premid.app/dev/presence/class#updatedata
	 */
	on(eventName: "UpdateData", callback: Function) {
		this._events[eventName] = callback;

		switch (eventName) {
			case "UpdateData": {
				document.addEventListener("PreMiD_UpdateData", () => {
					//* Run callback
					this._events[eventName]();
				});
				return;
			}
		}
	}
}

// @ts-ignore
window.Presence = Presence;

// @ts-ignore
window.iFrame = iFrame;

// @ts-ignore
window.Slideshow = Slideshow;
