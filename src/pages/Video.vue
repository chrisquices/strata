<script setup>
import ComponentContent from "@app/component/ComponentContent.vue";
import {onBeforeUnmount, onMounted, ref, shallowRef, triggerRef} from 'vue';
import {Pause, PictureInPicture, PictureInPicture2, Play, Square, Volume2, VolumeX} from '@lucide/vue';
import {createVideo} from '../assets/js/video.js';

import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const videoElement = ref(null);
const videoEngine = shallowRef();

onMounted(() => {
  if (videoElement.value) {
    videoEngine.value = createVideo(videoElement.value);
    videoEngine.value.subscribe(() => triggerRef(videoEngine));
  }
});

onBeforeUnmount(function () {
  if (videoEngine.value) videoEngine.value.destroy();
});
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Video</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A headless native video engine for playback, seeking, volume and mute state.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>

    <!-- Playback Controls -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Playback controls</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Native video playback driven through createVideo. {{ videoEngine?.getState().currentTimeLabel || '0:00' }} /
        {{ videoEngine?.getState().durationLabel || '0:00' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex max-w-3xl flex-col gap-5">
          <video
              ref="videoElement"
              src="/assets/video.mp4"
              preload="metadata"
              :controls="false"
              class="aspect-video w-full rounded-large border border-border bg-black object-cover"
          ></video>

          <div class="flex flex-wrap items-center gap-3">
            <Button variant="secondary" @click="videoEngine?.play()">
              <Play aria-hidden="true" class="size-icon"/>
              Play
            </Button>
            <Button variant="secondary" @click="videoEngine?.pause()">
              <Pause aria-hidden="true" class="size-icon"/>
              Pause
            </Button>
            <Button variant="secondary" @click="videoEngine?.stop()">
              <Square aria-hidden="true" class="size-icon"/>
              Stop
            </Button>
          </div>

          <label class="flex flex-col gap-2 text-sm text-muted">
            <span class="flex items-center justify-between gap-3">
              <span>Seek</span>
              <span>{{
                  videoEngine?.getState().currentTimeLabel || '0:00'
                }} / {{ videoEngine?.getState().durationLabel || '0:00' }}</span>
            </span>
            <input
                type="range"
                min="0"
                :max="videoEngine?.getState().duration || 0"
                step="0.1"
                :value="videoEngine?.getState().currentTime || 0"
                class="w-full accent-foreground"
                aria-label="Seek video"
                @input="videoEngine?.seek($event.target.value)"
            >
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Volume Controls -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Volume controls</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Volume is exposed as a 0 to 100 percentage and mute state stays in sync with the native element. Current volume:
        {{ videoEngine?.getState().volume || 100 }}%.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex max-w-xl flex-col gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <Button variant="secondary" @click="videoEngine?.mute()">
              <VolumeX aria-hidden="true" class="size-icon"/>
              Mute
            </Button>
            <Button variant="secondary" @click="videoEngine?.unmute()">
              <Volume2 aria-hidden="true" class="size-icon"/>
              Unmute
            </Button>
            <span class="text-sm text-muted">{{ videoEngine?.getState().muted ? 'Muted' : 'Unmuted' }}</span>
          </div>

          <label class="flex flex-col gap-2 text-sm text-muted">
            Volume
            <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="videoEngine?.getState().volume || 100"
                class="w-full accent-foreground"
                aria-label="Video volume"
                @input="videoEngine?.setVolume($event.target.value)"
            >
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Picture-in-Picture -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Picture-in-Picture</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Pops the video into a floating, always-on-top window through the native Picture-in-Picture API. Current state:
        {{ videoEngine?.getState().pictureInPicture ? 'Active' : 'Inactive' }}.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
          <Button variant="secondary" :disabled="!videoEngine?.getState().pictureInPictureSupported" @click="videoEngine?.enterPictureInPicture()">
            <PictureInPicture aria-hidden="true" class="size-icon"/>
            Enter Picture-in-Picture
          </Button>
          <Button variant="secondary" :disabled="!videoEngine?.getState().pictureInPicture" @click="videoEngine?.exitPictureInPicture()">
            <PictureInPicture2 aria-hidden="true" class="size-icon"/>
            Exit Picture-in-Picture
          </Button>
          <span class="text-sm text-muted">{{ videoEngine?.getState().pictureInPicture ? 'Active' : 'Inactive' }}</span>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
