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

interface PresenceOptions {
	/**
	 * ClientId of Discord application
	 * @link https://docs.premid.app/presence-development/coding/presence-class#clientid
	 */
	clientId: string;
}

class Presence {
	metadata: any;
	_events: any = {};
	private clientId: string;
	private trayTitle: string = "";
	private playback: boolean = true;
	private internalPresence: presenceData = {};
	private port = chrome.runtime.connect({ name: "devHelper" });

	/**
	 * Create a new Presence
	 */
	constructor(presenceOptions: PresenceOptions) {
		this.clientId = presenceOptions.clientId;
		// @ts-ignore
		this.metadata = PreMiD_Metadata;

		window.addEventListener("PreMiD_TabPriority", (data: CustomEvent) => {
			if (!data.detail) this.clearActivity();
		});
	}

	/**
	 *
	 * @param presenceData presenceData
	 * @param playback Is presence playing
	 * @link https://docs.premid.app/presence-development/coding/presence-class#setactivity-presencedata-boolean
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
	 * @link https://docs.premid.app/presence-development/coding/presence-class#clearactivity
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
	 * @link https://docs.premid.app/presence-development/coding/presence-class#settraytitle-string
	 */
	setTrayTitle(trayTitle: string = "") {
		this.trayTitle = trayTitle;
	}

	//TODO Make this return the active presence shown in Discord.
	/**
	 * Get the current
	 * @param strings
	 * @since 2.0-BETA3
	 */
	getActivity() {
		return this.internalPresence;
	}

	/**
	 * Get translations from the extension
	 * @param strings String object with keys being the key for string, keyValue is the string value
	 * @param language Language
	 * @link https://docs.premid.app/presence-development/coding/presence-class#getstrings-object
	 */
	getStrings(strings: Object, language?: string) {
		return new Promise<any>(resolve => {
			let listener = function(detail: any) {
				window.removeEventListener("PreMiD_ReceiveExtensionData", listener);

				resolve(detail.strings);
			};

			this.port.postMessage({ action: "getStrings", language, strings });

			//* Receive data from PreMiD
			window.addEventListener(
				"PreMiD_ReceiveExtensionData",
				(detail: CustomEvent) => listener(detail.detail)
			);

			let pmdRED = new CustomEvent("PreMiD_RequestExtensionData", {
				detail: {
					strings: strings
				}
			});

			//* Trigger the event
			window.dispatchEvent(pmdRED);
		});
	}

	/**
	 * Get result of running JS in the page. 
	 * @param js JS to run in page
	 * @example let pagelet = getPageletiable('window.myvar') -> "content of myvar"
	 * @link https://docs.premid.app/presence-development/coding/presence-class#getpageletiable-string
	 */
	getPageletiable(js: string) {
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
        var pmdPL = new CustomEvent("PreMiD_Pageletiable", {detail: JSON.stringify(${js})});
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
	 * @link https://docs.premid.app/presence-development/coding/presence-class#events
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
	 * @since 2.0-BETA3
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
