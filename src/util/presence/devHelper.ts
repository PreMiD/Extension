/**
 * @link https://docs.premid.app/dev/presence/class#presencedata-interface
 */
interface presenceData {
	state?: string;
	details?: string;
	startTimestamp?: number;
	endTimestamp?: number;
	largeImageKey?: string;
	smallImageKey?: string;
	smallImageText?: string;
}

/**
 * @link https://docs.premid.app/dev/presence/metadata
 */
interface Metadata {
	/**
	 * Should contain Object with name and id of the presence developer.
	 * Name is your Discord username without the identifier(#0000).
	 * User id can be copied from Discord by enabling developer mode and right-clicking on your profile.
	 */
	author: { name: string; id: string };
	/**
	 * Should contain an Array of Objects with each Object having the name and id of the contributor.
	 * Name is your Discord username without the identifier(#0000).
	 * User id can be copied from Discord by enabling developer mode and right-clicking on your profile.
	 */
	contributors?: Array<{ name: string; id: string }>;
	/**
	 * The title of the service that this presence supports. The folder name and service name should also be the same.
	 */
	service: string;
	/**
	 * Small description of the service. Your description must have key pair values which indicate the language, and the description in that specific language.
	 * Make descriptions with the languages that you know, our translators will make changes to your metadata file.
	 * Visit the link for all the language IDs.
	 * @link https://api.premid.app/v2/langFile/list
	 */
	description: Record<string, string>;
	/**
	 * URL of the service.
	 * Example: `vk.com`
	 * This url must match the url of the website as it will be used to detect wherever or not this is the website to inject the script to.
	 * This may only be used as an array when there are more than one urls.
	 * Note: Do **NOT** add `http://` or `https://` in the url or it will not work.
	 */
	url: string;
	/**
	 * Version of your presence.
	 * Use Sematic Versioning; <MAJOR>.<MINOR>.<PATCH>
	 * @link https://semver.org/
	 */
	version: string;
	/**
	 * Link to service's logo.
	 * Must end with .png/.jpg/etc.
	 */
	logo: string;
	/**
	 * Link to service's thumbnail or picture of the website.
	 * Must end with .png/.jpg/etc.
	 */
	thumbnail: string;
	/**
	 * `#HEX` value.
	 * We recommend to use a primary color of the service that your presence supports.
	 */
	color: string;
	/**
	 * Array with tags, they will help users to search your presence on the website.
	 */
	tags: string | Array<string>;
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
	button?: boolean;
	warning?: boolean;
	/**
	 * An array of settings the user can change.
	 * @link https://docs.premid.app/dev/presence/metadata#presence-settings
	 */
	settings?: Array<{
		id: string;
		title: string;
		icon: string;
		if?: Record<string, string>;
		placeholder?: string;
		value?: string | number | boolean;
		values?: Array<string | number | boolean>;
	}>;
}

interface PresenceOptions {
	/**
	 * ClientId of Discord application
	 * @link https://docs.premid.app/dev/presence/class#clientid
	 */
	clientId: string;
}

class Presence {
	metadata: Metadata;
	_events: any = {};
	private clientId: string;
	private trayTitle: string = "";
	private playback: boolean = true;
	private internalPresence: presenceData = {};
	private port = chrome.runtime.connect({ name: "devHelper" });
	private genericStyle = "font-weight: 800; padding: 2px 5px; color: white;";
	private presenceStyle = "";

	/**
	 * Create a new Presence
	 */
	constructor(presenceOptions: PresenceOptions) {
		this.clientId = presenceOptions.clientId;
		// @ts-ignore
		this.metadata = PreMiD_Metadata;

		this.presenceStyle = `background: ${
			this.metadata.color
		}; color: ${this.getFontColor(this.metadata.color)};`;

		window.addEventListener("PreMiD_TabPriority", (data: CustomEvent) => {
			if (!data.detail) this.clearActivity();
		});
	}

	/**
	 *
	 * @param presenceData presenceData
	 * @param playback Is presence playing
	 * @link https://docs.premid.app/dev/presence/class#setactivitypresencedata-boolean
	 */
	setActivity(presenceData: presenceData = {}, playback: boolean = true) {
		this.internalPresence = presenceData;
		this.playback = playback;

		//* Senddata
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

		//* Send data to app
		this.sendData({
			presenceData: {},
			playback: false,
			hidden: true
		});
	}

	/**
	 * Sets the tray title on the Menubar in Mac OS (Mac OS only, supports ANSI colors)
	 * @param trayTitle Tray Title
	 * @link https://docs.premid.app/dev/presence/class#settraytitlestring
	 */
	setTrayTitle(trayTitle: string = "") {
		this.trayTitle = trayTitle;
	}

	//TODO Make this return the active presence shown in Discord.
	/**
	 * Get the current activity
	 * @param strings
	 */
	getActivity() {
		return this.internalPresence;
	}

	/**
	 * Get translations from the extension
	 * @param strings String object with keys being the key for string, keyValue is the string value
	 * @param language Language
	 * @link https://docs.premid.app/dev/presence/class#getstringsobject
	 */
	getStrings(strings: Object, language?: string) {
		return new Promise<any>(resolve => {
			let listener = function (detail: any) {
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

			let pmdRED = new CustomEvent("PreMiD_RequestExtensionData", {
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
	 * Get variables from the current site
	 * @param {Array} letiables Array of letiable names to get
	 * @link https://docs.premid.app/dev/presence/class#getpageletiablestring
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
	 * Returns extension version
	 * @param onlyNumeric version nubmer without dots
	 * @since 2.1
	 */
	getExtensionVersion(onlyNumeric = true) {
		if (onlyNumeric)
			return parseInt(chrome.runtime.getManifest().version.replace(/\D/g, ""));
		return chrome.runtime.getManifest().version;
	}

	/**
	 * Get a setting from the presence metadata
	 * @param setting Id of setting as defined in metadata.
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
					let errors = [];

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
	 * Hide a setting
	 * @param setting Id of setting / Array of setting Id's
	 * @link https://docs.premid.app/dev/presence/class#showsettingstring
	 * @since 2.1
	 */
	showSetting(settings: string | Array<string>) {
		return new Promise<void>((resolve, reject) => {
			chrome.storage.local.get(
				`pSettings_${this.metadata.service}`,
				storageSettings => {
					let errors = [];

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
	 * Similar to `getTimestamps` but takes in a media element and returns snowflake timestamps.
	 * @param media Media object
	 */
	getTimestampsfromMedia(media: HTMLMediaElement) {
		return this.getTimestamps(media.currentTime, media.duration);
	}

	/**
	 * Converts time and duration integers into snowflake timestamps.
	 * @param {Number} elementTime Current element time seconds
	 * @param {Number} elementDuration Element duration seconds
	 */
	getTimestamps(elementTime: number, elementDuration: number) {
		var startTime = Date.now();
		var endTime = Math.floor(startTime / 1000) - elementTime + elementDuration;
		return [Math.floor(startTime / 1000), endTime];
	}

	/**
	 * Converts a string with format `HH:MM:SS` or `MM:SS` or `SS` into an integer. (Does not return snowflake timestamp)
	 * @param format The formatted string
	 */
	timestampFromFormat(format: string) {
		return format
			.split(":")
			.map(time => {
				return parseInt(time);
			})
			.reduce((prev, time) => 60 * prev + +time);
	}

	private hexToRGB(hex: string) {
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, (_, r, g, b) => {
			return r + r + g + g + b + b;
		});

		var result = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16)
			  }
			: null;
	}

	private getFontColor(backgroundHex: string) {
		const rgb = this.hexToRGB(backgroundHex);

		const r = rgb.r;
		const g = rgb.g;
		const b = rgb.b;

		const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

		if (hsp > 127.5) {
			return "white";
		} else {
			return "black";
		}
	}

	/**
	 * Console logs with an info message.
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
	 * Console logs with a success message.
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
	 * Console logs with an error message.
	 * @param message The log message
	 */
	error(message: string) {
		console.log(
			`%cPreMiD%c${this.metadata.service}%cERROR%c ${message}`,
			this.genericStyle + "border-radius: 25px 0 0 25px; background: #596cae;",
			this.genericStyle + this.presenceStyle,
			this.genericStyle + "border-radius: 0 25px 25px 0; background: #ff5050;",
			"color: unset;"
		);
	}

	/**
	 * Sends data back to application
	 * @param data Data to send back to application
	 */
	private sendData(data: Object) {
		//* Send data to app
		let pmdUP = new CustomEvent("PreMiD_UpdatePresence", {
			detail: data
		});

		window.dispatchEvent(pmdUP);
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
					this._events[eventName]();
				});
				return;
			case "iFrameData":
				window.addEventListener("PreMiD_iFrameData", (data: CustomEvent) => {
					this._events[eventName](data.detail);
				});
				return;
			default:
				console.error(Error(`${eventName} is not a valid event.`));
				return;
		}
	}
}

class iFrame {
	_events: any = {};

	/**
	 * Send data from iFrames back to the presence script
	 * @param data Data to send
	 * @link https://docs.premid.app/dev/presence/class#iframedata
	 */
	send(data: any) {
		let pmdIFD = new CustomEvent("PreMiD_iFrameData", {
			detail: data
		});

		document.dispatchEvent(pmdIFD);
	}

	//TODO Add to docs
	/**
	 * Returns the iframe url
	 * @link https://docs.premid.app/dev/presence/iframe#geturl
	 */
	getUrl() {
		return new Promise<string>(async resolve => {
			let _listener = (data: CustomEvent) => {
				resolve(data.detail);
				document.removeEventListener("PreMiD_iFrameURL", _listener, true);
			};
			document.addEventListener("PreMiD_iFrameURL", _listener);

			let pmdGIFU = new CustomEvent("PreMiD_GETiFrameURL");

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
