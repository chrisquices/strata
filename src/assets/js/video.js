// video.js
// A headless video playback engine. It turns a native video element into a small controlled media handle.
// It draws nothing and owns no interface — it only coordinates playback state and hands changes to you.
// The engine starts narrow on purpose: playback controls first, with future regions added one feature at a time.

//#region Generic Helpers ----------------------------------------------------------------------------------------------
export function formatTime(seconds) {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = Math.floor(safeSeconds % 60).toString().padStart(2, "0");

    return `${minutes}:${remainingSeconds}`;
}

// Invoke a consumer-supplied callback in isolation: one that throws can't abort an in-progress
// update or starve the other subscribers. The error surfaces to the console rather than vanishing.
function callConsumer(callback, argument) {
    try {
        callback(argument);
    } catch (error) {
        console.error("createVideo: a consumer callback threw —", error);
    }
}

//#endregion -----------------------------------------------------------------------------------------------------------

export function createVideo(video, options = {}) {
    if (!video || typeof video.addEventListener !== "function" || typeof video.play !== "function" || typeof video.pause !== "function") {
        throw new TypeError("createVideo: 'video' must be a media element.");
    }

    //#region Utility --------------------------------------------------------------------------------------------------
    const ownerDocument = video.ownerDocument; // the video's own document, so PiP exit/state reads work across realms/iframes
    const cleanups = []; // teardown functions, collected so everything can be undone at once
    const listeners = new Set(); // change subscribers — each gets the full state on every playback change
    let destroyed = false; // late media events must not still fire callbacks after teardown
    let lastStateSignature = ""; // last emitted state fingerprint, used to avoid duplicate media-event echoes

    // Register an event listener and remember how to remove it during teardown.
    function registerEventListener(target, type, handler) {
        target.addEventListener(type, handler);

        cleanups.push(function () {
            target.removeEventListener(type, handler); // detach the exact listener that was registered
        });
    }

    // Tears down the whole video engine: runs every registered cleanup, detaching all listeners it attached.
    function destroy() {
        if (destroyed) return;

        destroyed = true; // make future work and future destroy calls harmless

        cleanups.forEach(function (cleanup) {
            cleanup();
        });

        cleanups.length = 0; // release references to the cleanup functions and their event targets
        listeners.clear(); // release all subscribers
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region Options --------------------------------------------------------------------------------------------------
    const {
        onChange
    } = options;

    function validateOptions() {

        // onChange is optional but must be a function when provided.
        if (onChange !== undefined && typeof onChange !== "function") {
            throw new TypeError("createVideo: the 'onChange' option must be a function when provided.");
        }
    }

    validateOptions();

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region State ----------------------------------------------------------------------------------------------------

    // A snapshot of the media element's current playback state — consumers render from this.
    function getState() {
        const currentTime = readCurrentTime();
        const duration = readDuration();

        return {
            playing: videoIsPlaying(),
            paused: video.paused,
            ended: video.ended,
            currentTime: currentTime,
            duration: duration,
            currentTimeLabel: formatTime(currentTime),
            durationLabel: formatTime(duration),
            volume: readVolume(),
            muted: video.muted,
            pictureInPicture: videoIsInPictureInPicture(),
            pictureInPictureSupported: pictureInPictureIsSupported()
        };
    }

    // Subscribe to playback changes. The listener gets the state on every change (not
    // immediately — read getState() for the first paint). Returns an unsubscribe function.
    function subscribe(listener) {
        listeners.add(listener);
        return function unsubscribe() {
            listeners.delete(listener);
        };
    }

    // Emit the current state to every subscriber. Called after any meaningful playback change.
    function notify() {
        if (destroyed) return;
        const state = getState();
        const stateSignature = describeState(state);
        if (stateSignature === lastStateSignature) return;

        lastStateSignature = stateSignature;
        for (const listener of listeners) {
            callConsumer(listener, state);
        }
    }

    function videoIsPlaying() {
        return !video.paused && !video.ended;
    }

    function readCurrentTime() {
        if (!Number.isFinite(video.currentTime)) return 0;

        return video.currentTime;
    }

    function readDuration() {
        if (!Number.isFinite(video.duration)) return 0;

        return video.duration;
    }

    function readVolume() {
        return Math.round(video.volume * 100);
    }

    function describeState(state) {
        return [
            state.playing,
            state.paused,
            state.ended,
            state.currentTime,
            state.duration,
            state.volume,
            state.muted,
            state.pictureInPicture,
            state.pictureInPictureSupported
        ].join("|");
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region Playback Controls ----------------------------------------------------------------------------------------
    async function play() {
        if (destroyed) return false;
        if (videoIsPlaying()) return true;

        await video.play();
        if (destroyed) return false;

        notify();
        return true;
    }

    function pause() {
        if (destroyed) return false;
        if (video.paused) return true;

        video.pause();
        notify();
        return true;
    }

    function stop() {
        if (destroyed) return false;

        pause();
        setCurrentTime(0);
        notify();
        return true;
    }

    function seek(value) {
        if (destroyed) return false;

        const time = parseSeekTime(value);
        const changed = setCurrentTime(time);

        if (changed) {
            notify();
        }

        return changed;
    }

    function parseSeekTime(value) {
        const time = Number(value);

        if (!Number.isFinite(time) || time < 0) {
            throw new TypeError("createVideo: seek time must be a non-negative number of seconds.");
        }

        return time;
    }

    function setCurrentTime(time) {
        const nextTime = clampSeekTime(time);
        if (readCurrentTime() === nextTime) return false;

        video.currentTime = nextTime;
        return true;
    }

    function clampSeekTime(time) {
        const duration = readDuration();
        if (!duration) return time;

        return Math.min(time, duration);
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region Volume Controls ------------------------------------------------------------------------------------------
    function setVolume(value) {
        if (destroyed) return false;

        const percentage = parseVolumePercentage(value);
        const changed = applyVolumePercentage(percentage);

        if (changed) {
            notify();
        }

        return changed;
    }

    function mute() {
        if (destroyed) return false;
        if (video.muted) return true;

        video.muted = true;
        notify();
        return true;
    }

    function unmute() {
        if (destroyed) return false;
        if (!video.muted) return true;

        video.muted = false;
        notify();
        return true;
    }

    function parseVolumePercentage(value) {
        const percentage = Number(value);

        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
            throw new TypeError("createVideo: volume must be a number from 0 to 100.");
        }

        return percentage;
    }

    function applyVolumePercentage(percentage) {
        const nextVolume = percentage / 100;
        if (video.volume === nextVolume) return false;

        video.volume = nextVolume;
        return true;
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region Picture-in-Picture Controls ------------------------------------------------------------------------------
    async function enterPictureInPicture() {
        if (destroyed) return false;
        if (!pictureInPictureIsSupported()) return false;
        if (videoIsInPictureInPicture()) return true;

        try {
            await video.requestPictureInPicture();
        } catch {
            return false;
        }

        if (destroyed) return false;

        notify();
        return true;
    }

    async function exitPictureInPicture() {
        if (destroyed) return false;
        if (!videoIsInPictureInPicture()) return true; // this video isn't the one in PiP — leave any other element's PiP alone

        try {
            await ownerDocument.exitPictureInPicture();
        } catch {
            return false;
        }

        if (destroyed) return false;

        notify();
        return true;
    }

    async function togglePictureInPicture() {
        if (destroyed) return false;
        if (videoIsInPictureInPicture()) {
            return exitPictureInPicture();
        }

        return enterPictureInPicture();
    }

    function pictureInPictureIsSupported() {
        return Boolean(ownerDocument.pictureInPictureEnabled && video.requestPictureInPicture && ownerDocument.exitPictureInPicture && !video.disablePictureInPicture);
    }

    function videoIsInPictureInPicture() {
        return ownerDocument.pictureInPictureElement === video;
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region Media Events ---------------------------------------------------------------------------------------------
    function listenForPlaybackEvents() {
        registerEventListener(video, "play", notify);
        registerEventListener(video, "pause", notify);
        registerEventListener(video, "ended", notify);
    }

    function listenForTimeEvents() {
        registerEventListener(video, "timeupdate", notify);
        registerEventListener(video, "durationchange", notify);
        registerEventListener(video, "loadedmetadata", notify);
        registerEventListener(video, "seeked", notify);
    }

    function listenForVolumeEvents() {
        registerEventListener(video, "volumechange", notify);
    }

    function listenForPictureInPictureEvents() {
        registerEventListener(video, "enterpictureinpicture", notify);
        registerEventListener(video, "leavepictureinpicture", notify);
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    if (onChange) subscribe(onChange); // register the onChange option as a subscriber

    listenForPlaybackEvents();
    listenForTimeEvents();
    listenForVolumeEvents();
    listenForPictureInPictureEvents();

    return {
        getState,
        subscribe,
        play,
        pause,
        stop,
        seek,
        setVolume,
        mute,
        unmute,
        enterPictureInPicture,
        exitPictureInPicture,
        togglePictureInPicture,
        destroy
    };
}
