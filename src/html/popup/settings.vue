<template>
	<div id="mainWrapper">
		<transition name="fade" mode="out-in">
			<div v-if="inPresenceSettingsView" id="presenceSettings" key="1">
				<div id="headingWrapper">
					<i
						id="backBtn"
						class="fas fa-arrow-left"
						@click="inPresenceSettingsView = false"
					/>
					<img
						id="bg"
						:src="pSettingsPresence.metadata.thumbnail"
						draggable="false"
					/>
					<div id="heading">
						<img :src="pSettingsPresence.metadata.logo" draggable="false" />
						<h1 v-text="pSettingsPresence.metadata.service" />
					</div>
				</div>
				<div id="presenceInfo" class="container">
					<h1>{{ $t("popup.headings.description") }}</h1>
					<p v-html="presenceDescription" />
				</div>
				<div id="settings" class="container" ref="settingsContainer">
					<h1>{{ $t("popup.headings.settings") }}</h1>
					<div id="settingsContainer">
						<div
							id="setting"
							v-for="(setting, i) in settingsFiltered"
							:key="i"
							:class="
								typeof setting.value === 'number' ||
								(setting.multiLanguage &&
									setting.values &&
									setting.values.length > 1)
									? 'select'
									: ''
							"
						>
							<span :title="setting.title">
								<i :class="setting.icon" />
								{{ setting.title }}
							</span>

							<template v-if="!setting.multiLanguage">
								<checkbox
									v-if="typeof setting.value === 'boolean'"
									:checked="setting.value"
									@change="updatePresenceSetting(setting.id, $event)"
								/>
								<input
									v-if="typeof setting.value === 'string'"
									type="text"
									:value="setting.value"
									spellcheck="false"
									@change="
										updatePresenceSetting(setting.id, $event.target.value)
									"
									:ref="setting.id"
									:placeholder="setting.placeholder"
								/>
							</template>
							<customSelect
								v-if="
									typeof setting.value === 'number' ||
										(setting.multiLanguage &&
											setting.values &&
											setting.values.length > 1)
								"
								@change="updatePresenceSetting(setting.id, $event)"
								:options="setting.values"
								:selected="setting.value"
								@active="selectToggle"
								@inactive="selectToggle"
							/>
						</div>
					</div>
				</div>
			</div>

			<div v-else id="presenceWrapper" key="2">
				<div id="titleWrapper">
					<h1 id="title" v-if="defaultAdded">
						{{ $t("popup.headings.presences") }}
					</h1>
					<transition name="slideRight" mode="out-in">
						<span v-if="shiftPressed && $store.state.connected">
							<a id="loadPresence" @click="loadPresence">
								{{ $t("popup.presences.load") }}
							</a>
						</span>
						<div id="actions" v-else-if="this.presences.length > 0">
							<i
								v-if="!showDelete"
								:class="showCategories ? 'active' : ''"
								class="fas fa-tag"
								@click="showCategories = !showCategories"
							/>
							<i
								v-if="showDelete"
								id="deletePresence"
								class="fas fa-check-circle"
								@click="showDelete = !showDelete"
								style="grid-column-end: none"
							/>
							<i
								v-else
								class="fas fa-trash-alt"
								@click="showDelete = !showDelete"
							/>
						</div>
					</transition>
				</div>
				<transition name="categoryHeight">
					<div
						v-if="showCategories"
						id="categories"
						@mousewheel="catScroll($event, 'wheel')"
						@mousedown="catScroll($event, 'down')"
						@mouseup="catScroll($event, 'up')"
						@mousemove="catScroll($event, 'move')"
						@mouseleave="catMDown = false"
					>
						<span
							v-for="category in filteredCategories"
							:key="category.id"
							:class="activeCategory === category.id ? 'active' : ''"
							@click="activeCategory = category.id"
						>
							<i :class="category.icon" />
							<h1 v-text="category.text" />
						</span>
					</div>
				</transition>
				<div v-if="loadingPresences" id="loader-container">
					<div class="loader">
						<img src="/assets/images/icon.svg" />
						<p>{{ loadingString }}</p>
					</div>
				</div>
				<div id="presences" v-else-if="this.filteredPresences.length > 0">
					<div
						id="presence"
						v-for="(presence, i) in filteredPresences"
						v-bind:key="`p${i}`"
					>
						<img
							:src="presence.metadata.logo"
							draggable="false"
							:title="presence.metadata.service"
						/>
						<h1 :title="presence.metadata.service">
							<span v-if="presence.tmp">TMP</span
							>{{ presence.metadata.service }}
						</h1>
						<i
							v-if="
								!presence.noCog &&
									presence.metadata.settings &&
									presence.metadata.settings.length > 0 &&
									!showDelete
							"
							class="fas fa-cog action"
							id="settings"
							@click="togglePresenceSettings(i)"
						/>
						<transition name="fade" mode="out-in">
							<span v-if="showDelete && !presence.metaTag">
								<i class="fas fa-trash-alt action" @click="deletePresence(i)" />
							</span>
							<checkbox
								v-else
								:checked="presence.enabled"
								:color="presence.metadata.color"
								@change="updatePresence(i, $event)"
							/>
						</transition>
					</div>
				</div>
				<div v-else id="noPresences">
					<p v-if="defaultAdded">{{ $t("popup.presences.noPresences") }}</p>
					<div v-else>
						<p>
							Extension did not initialize correctly.
						</p>
						<span id="reinit" @click="reinit">Reinitialize</span>
					</div>
				</div>
				<a
					v-if="defaultAdded"
					id="presenceStoreBtn"
					href="https://premid.app/store"
					target="_blank"
					draggable="false"
					>{{ $t("popup.buttons.presenceStore") }}</a
				>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
	// @ts-ignore
	import checkbox from "./components/checkbox";
	// @ts-ignore
	import customSelect from "./components/customSelect";
	import { initPresenceLanguages } from "../../util/presenceManager";
	import { getStorage } from "../../util/functions/asyncStorage";

	export default {
		components: {
			checkbox,
			customSelect
		},
		data() {
			return {
				shiftPressed: false,
				presences: [],
				showCategories: false,
				showDelete: false,
				catMDown: false,
				catStartX: 0,
				catScrollLeft: 0,
				activeCategory: "all",
				categories: [
					{
						icon: "fas fa-map",
						text: this.$i18n.t("popup.category.all"),
						id: "all"
					},
					{
						icon: "fas fa-star",
						text: this.$i18n.t("popup.category.anime"),
						id: "anime"
					},
					{
						icon: "fas fa-leaf",
						text: this.$i18n.t("popup.category.games"),
						id: "games"
					},
					{
						icon: "fas fa-music",
						text: this.$i18n.t("popup.category.music"),
						id: "music"
					},
					{
						icon: "fas fa-comments",
						text: this.$i18n.t("popup.category.socials"),
						id: "socials"
					},
					{
						icon: "fas fa-play",
						text: this.$i18n.t("popup.category.videos"),
						id: "videos"
					},
					{
						icon: "fas fa-box",
						text: this.$i18n.t("popup.category.other"),
						id: "other"
					}
				],
				inPresenceSettingsView: false,
				pSettingsPresence: null,
				pSettings: null,
				presenceSettings: [],
				loadingPresences: true,
				loadingString: "",
				defaultAdded: false
			};
		},
		watch: {
			async presences(newValue, oldValue) {
				if (oldValue.length > 0 && newValue.length > oldValue.length) {
					let newPresences = newValue.filter(
						p => !oldValue.find(o => o.metadata.service == p.metadata.service)
					);

					for (const newPresence of newPresences) {
						initPresenceLanguages(newPresence);

						if (newPresence.metadata.settings) {
							newPresence.noCog = !(
								newPresence.metadata.settings.findIndex(
									s => s.multiLanguage && s.values.length > 1
								) >= 0
							);
							this.$forceUpdate();
						}
					}
				}
			}
		},
		computed: {
			filteredPresences() {
				return this.presences
					.filter((p, i) => {
						if (p.hidden) return false;

						p.noCog = !this.presenceSettings[i];

						if (
							this.categories.find(c => c.id === this.activeCategory).id ==
							"all"
						)
							return p;
						return (
							p.metadata.category ==
							this.categories.find(c => c.id === this.activeCategory).id
						);
					})
					.sort((a, b) => {
						if (a.metaTag !== b.metaTag) return -1;
						if (
							a.metadata.service.toLowerCase() <
							b.metadata.service.toLowerCase()
						) {
							return -1;
						}
						if (
							a.metadata.service.toLowerCase() >
							b.metadata.service.toLowerCase()
						) {
							return 1;
						}
						return 0;
					});
			},
			filteredCategories: function() {
				let filtered = [];

				const catNames = this.categories.filter(cat => {
					if (cat.id === "all") return true;
					return this.presences.some(p => p.metadata.category === cat.id);
				});

				catNames.map(c => {
					filtered.push(this.categories.find(cat => cat.id === c.id));
				});

				return filtered;
			},
			presenceDescription() {
				let description = null;

				if (
					this.pSettingsPresence.metadata.description[
						// @ts-ignore
						chrome.i18n.getUILanguage()
					]
				)
					description = this.pSettingsPresence.metadata.description[
						// @ts-ignore
						chrome.i18n.getUILanguage()
					];
				else description = this.pSettingsPresence.metadata.description.en;

				const match = description.match(/\[([^\]]+)\]\(([^)]+)\)/g);
				if (!match) {
					return description;
				}

				const exec = /\[([^\]]+)\]\(([^)]+)\)/g.exec(description);

				return description.replace(
					match,
					`<a class="link" target="_blank" href="${exec[2]}">${exec[1]}</a>`
				);
			},
			settingsFiltered() {
				return this.pSettings
					? this.pSettings.filter(s => {
							if (s.if) {
								if (
									Object.keys(s.if).every(
										(k, i) =>
											this.pSettings.find(si => si.id === k).value ===
											Object.values(s.if)[i]
									) &&
									!s.hidden
								)
									return s;
							} else if (!s.hidden) return s;
					  })
					: this.pSettings;
			}
		},
		methods: {
			loadPresence() {
				this.shiftPressed = false;
				this.$store.state.port.postMessage({ action: "loadLocalPresence" });
			},
			catScroll(e: WheelEvent | MouseEvent, event: string) {
				const el: HTMLDivElement = document.querySelector("#categories");

				if (event === "wheel")
					el.scrollLeft += ((e as WheelEvent).deltaY / 60) * 15;
				else if (event === "down") {
					this.catMDown = true;
					this.catStartX = e.pageX - el.offsetLeft;
					this.catScrollLeft = el.scrollLeft;
				} else if (event === "up") this.catMDown = false;
				else if (event === "move" && this.catMDown)
					el.scrollLeft =
						this.catScrollLeft - (e.pageX - el.offsetLeft - this.catStartX) * 2;
			},
			updatePresence(i: number, value: boolean) {
				this.filteredPresences[i].enabled = value;
				//* You may be wondering, why the fuck do you stringify and parse this? Guess what because Firefox sucks and breaks its storage
				//@ts-ignore
				chrome.storage.local.set(
					JSON.parse(JSON.stringify({ presences: this.presences }))
				);
			},
			async deletePresence(i: number) {
				const presenceToRemove = this.filteredPresences[i];
				this.presences = this.presences.filter(
					p =>
						!(
							p.metadata.service === presenceToRemove.metadata.service &&
							p.tmp === presenceToRemove.tmp
						)
				);

				//* You may be wondering, why the fuck do you stringify and parse this? Guess what because Firefox sucks and breaks its storage
				//@ts-ignore
				chrome.storage.local.set(
					JSON.parse(JSON.stringify({ presences: this.presences }))
				);

				// @ts-ignore
				const settings = await pmd.getStorage(
					"local",
					`pSettings_${presenceToRemove.metadata.service}`
				);
				if (settings) {
					chrome.storage.local.remove(
						`pSettings_${presenceToRemove.metadata.service}`
					);
				}
			},

			async togglePresenceSettings(i: number) {
				this.inPresenceSettingsView = !this.inPresenceSettingsView;
				this.pSettingsPresence = this.filteredPresences[i];

				// @ts-ignore
				let settings = await pmd.getStorage(
					"local",
					`pSettings_${this.filteredPresences[i].metadata.service}`
				);

				settings =
					settings[`pSettings_${this.pSettingsPresence.metadata.service}`];

				if (settings) {
					let storageLngsSettingsIdx = settings.findIndex(
						s => typeof s.multiLanguage !== "undefined"
					);
					let presenceLngsSettings = this.pSettingsPresence.metadata.settings.find(
						s => typeof s.multiLanguage !== "undefined"
					);

					if (storageLngsSettingsIdx >= 0) {
						if (presenceLngsSettings) {
							let setting = settings[storageLngsSettingsIdx];
							setting.multiLanguage = true;
						} else {
							settings.splice(storageLngsSettingsIdx, 1);
						}
					}
				}

				this.pSettings = settings
					? settings
					: this.pSettingsPresence.metadata.settings;
			},
			kDown(e: KeyboardEvent) {
				this.shiftPressed = e.shiftKey;
			},
			updatePresenceSetting(setting, value) {
				if (typeof value === "string" && value.trim() === "") {
					value = this.pSettingsPresence.metadata.settings.find(
						s => s.id === setting
					).value;

					//* Debug for input sometimes not updating
					this.$refs[setting][0].value = value;
				}

				this.pSettings.find(s => s.id === setting).value = value;

				//* You may be wondering, why the fuck do you stringify and parse this? Guess what because Firefox sucks and breaks its storage
				//@ts-ignore
				chrome.storage.local.set(
					JSON.parse(
						JSON.stringify({
							[`pSettings_${this.pSettingsPresence.metadata.service}`]: this
								.pSettings
						})
					)
				);
			},
			async randomLoadingString() {
				// @ts-ignore
				const textArray = (
					await pmd.getStorage("local", "languages")
				).languages.en.loading.split(";");
				const randomNumber = Math.floor(Math.random() * textArray.length);

				this.loadingString = textArray[randomNumber];
			},
			selectToggle(eventType, wrapper) {
				if (eventType === "active") {
					const diff =
						wrapper.getBoundingClientRect().bottom -
						this.$refs.settingsContainer.getBoundingClientRect().bottom;

					if (diff > 0) {
						this.$refs.settingsContainer.style.paddingBottom = diff + 8 + "px";
					}
				} else if (eventType === "inactive") {
					this.$refs.settingsContainer.style.paddingBottom = null;
				}
			},
			async reinit() {
				this.loadingPresences = true;
				const port = chrome.runtime.connect({ name: "app.ts" });

				port.onMessage.addListener(msg => {
					if (msg.success) {
						location.reload();
					} else {
						this.loadingPresences = false;
					}
				});

				port.postMessage({ action: "reinit" });
			}
		},
		created: async function() {
			this.randomLoadingString();

			this.defaultAdded = (
				await getStorage("local", "defaultAdded")
			).defaultAdded;

			// @ts-ignore
			(this.presences = (await pmd.getStorage("local", "presences")).presences),
				(this.presenceSettings = await Promise.all(
					this.presences.map(async p => {
						if (p.metadata.settings) {
							// @ts-ignore
							const presenceSettings = await pmd.getStorage(
								"local",
								`pSettings_${p.metadata.service}`
							);

							initPresenceLanguages(p);

							return !(
								presenceSettings[`pSettings_${p.metadata.service}`] &&
								presenceSettings[`pSettings_${p.metadata.service}`].filter(
									s => !s.hidden
								).length === 0
							);
						} else return false;
					})
				));

			this.loadingPresences = false;

			//* Presence hot reload
			// @ts-ignore
			chrome.storage.onChanged.addListener(storage => {
				if (storage.presences) this.presences = storage.presences.newValue;
				if (
					this.pSettingsPresence &&
					storage[`pSettings_${this.pSettingsPresence.metadata.service}`]
				)
					this.pSettings =
						storage[
							`pSettings_${this.pSettingsPresence.metadata.service}`
						].newValue;

				this.presences
					.filter(
						p =>
							p.metadata.settings &&
							p.metadata.settings.find(s =>
								Object.keys(s).includes("multiLanguage")
							)
					)
					.forEach(async p => {
						await initPresenceLanguages(p);
					});
				this.$forceUpdate();
			});

			//* Presence Dev
			window.addEventListener("keydown", this.kDown);
			window.addEventListener("keyup", this.kDown);
		},
		beforeDestroy: function() {
			window.removeEventListener("keydown", this.kDown);
			window.removeEventListener("keyup", this.kDown);
		}
	};
</script>

<style lang="scss" scoped>
	@import "../../assets/scss/_variables.scss";
	#mainWrapper {
		* {
			position: relative;
		}

		display: grid;

		#presenceSettings {
			max-height: 470px;
		}

		#presenceWrapper {
			max-height: 450px;
		}

		#presenceSettings {
			overflow-y: scroll;
			overflow-x: hidden;

			#presenceInfo {
				p {
					max-width: 300px;
				}
			}

			#headingWrapper {
				height: 150px;

				#backBtn {
					transition: 0.15s all ease-out;

					cursor: pointer;
					color: white;
					font-size: 25px;
					position: absolute;
					margin-top: 5px;
					margin-left: 5px;
					z-index: 10;

					&:hover {
						color: $blurple;
					}

					&:active {
						transform: scale(0.9);
						color: darken($blurple, 5);
					}
				}

				#heading {
					top: 10px;
					display: grid;
					justify-items: center;
					text-align: center;

					h1 {
						color: white;
						font-size: 25px;
					}

					img {
						max-height: 100px;
						border-radius: 5px;
					}
				}

				#bg {
					position: absolute;
					filter: blur(3px) contrast(0.75);
					z-index: 0;
					min-width: 100%;
					max-height: 150px;
				}
			}

			.container {
				margin: 5px;
				margin-top: 15px;
				padding: 3px 5px;
				background-color: $darkButNotQuiteBlack;
				border-radius: 5px;

				h1 {
					color: $blurple;
					font-family: "Discord Font";
					font-size: 15px;
					padding-bottom: 5px;
				}

				p {
					color: $greyple;
					font-weight: 500;
				}
			}

			#setting {
				display: grid;
				grid-template-columns: auto min-content;
				align-items: center;
				min-height: 25px;
				margin: 5px 0;
				margin-top: 0;
				grid-gap: 5px;

				span {
					white-space: nowrap;
					font-size: 14px;
					max-width: 190px;
					overflow: hidden;
					text-overflow: ellipsis;

					i {
						text-align: center;
						width: 15px;
						margin-right: 5px;
						color: #fff;
					}
					color: $greyple;
				}

				input {
					grid-row: none;
				}

				input,
				select {
					color: #fff;
					font-size: 12px;
					background-color: $notQuiteBlack;
					outline: none;
					border-radius: 5px;
					border: none;
					height: 25px;
					padding: 0 5px;
				}
			}
		}

		#presenceWrapper {
			display: grid;
			background-color: $darkButNotQuiteBlack;
			margin: 10px;
			padding: 5px;
			border-radius: 5px;

			overflow: auto;
			overflow-x: hidden;

			#titleWrapper {
				display: inline-grid;
				grid-template-columns: auto min-content;
				grid-gap: 10px;

				#title {
					font-family: "Discord Font";
					color: $blurple;
					font-size: 15px;
				}

				#loadPresence {
					transition: 0.15s color ease-out;

					cursor: pointer;
					white-space: nowrap;
					color: $greyple;

					&:hover {
						color: #fff;
					}

					&:active {
						color: darken(#fff, 10);
					}
				}

				#actions {
					display: inline-grid;
					grid-template-columns: min-content min-content;
					grid-gap: 5px;

					i {
						cursor: pointer;
						transition: color 0.15s ease-out;
						color: $greyple;
						font-size: 20px;

						&:hover,
                        &.active {
                            color: lighten($greyple, 10);
                        }

                        &:active {
                            color: darken($greyple, 10);
                        }
					}
				}
			}

			#categories {
				display: flex;
				flex-flow: nowrap;
				width: 262px;
				height: 30px;
				overflow: hidden;
				align-items: flex-end;

				span {
					transition: 0.15s all ease-out;

					height: 25px;

					cursor: pointer;
					display: inline-grid;
					grid-gap: 5px;
					grid-template-columns: min-content max-content;
					align-items: center;
					margin: 0 2px;

					background-color: $notQuiteBlack;

					color: white;
					padding: 0 5px;
					border-radius: 5px;

					h1 {
						font-weight: 500;
						font-size: 14px;
					}

					&:hover,
					&.active {
						background-color: $blurple;
					}

					&.active:hover {
						background-color: lighten($blurple, 5);
					}

					&:active {
						background-color: darken($blurple, 5);
					}
				}
			}

			#loader-container {
				text-align: center;
				margin-bottom: 10px;

				.loader {
					img {
						width: 50px;
						height: 50px;

						transform: translateX(10px);
						animation: loaderAnimation 0.5s ease-out infinite;
					}

					p {
						color: rgba(255, 255, 255, 1);
						font-size: 1.2em;
						font-weight: bold;
					}

					@keyframes loaderAnimation {
						50% {
							transform: translateX(-10px);
						}

						100% {
							transform: translateX(10px);
						}
					}
				}
			}

			#presences {
				#presence {
					margin: 7px 0;
					display: grid;
					grid-template-columns: min-content auto min-content min-content;
					grid-gap: 5px;
					align-items: center;

					&:first-of-type {
						margin-top: 3px;
					}

					img {
						width: 25px;
						border-radius: 5px;
					}

					h1 {
						color: white;
						font-size: 17px;
						font-weight: normal;
						justify-content: center;

						max-width: 100%;
						overflow-x: hidden;
						text-overflow: ellipsis;

						white-space: nowrap;

						span {
							font-size: 10px;
							background: rgb(200, 75, 75);
							vertical-align: middle;
							padding: 2px 4px;
							border-radius: 5px;
							position: relative;
							margin-right: 5px;
							top: -2px;
						}
					}

					.action {
						transition: 0.1s color ease-out;

						cursor: pointer;
						color: $greyple;
						font-size: 17px;

						&:hover {
							color: #fff;
						}

						&#settings {
							margin-right: 5px;
						}
					}

					#checkbox {
						grid-column-end: 5;
					}
				}
			}

			#noPresences {
				font-size: 15px;
				text-align: center;
				margin-bottom: 5px;
				font-weight: 600;
				color: $greyple;

				#reinit {
					color: $blurple;
					cursor: pointer;

					&:hover {
						text-decoration: underline;
					}
				}
			}

			#presenceStoreBtn {
				transition: 0.1s background-color ease-out;

				font-weight: 600;
				width: 90%;
				background-color: $blurple;
				justify-self: center;
				padding: 5px 5px;
				font-size: 17px;
				color: white;
				text-decoration: none;
				text-align: center;
				border-radius: 20px;
				margin-bottom: 10px;

				&:hover {
					background-color: lighten($blurple, 5);
				}

				&:active {
					background-color: darken($blurple, 5);
				}
			}
		}
	}
</style>
