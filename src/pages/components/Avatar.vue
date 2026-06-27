<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import Avatar from '@ui/Avatar/Avatar.vue';
import AvatarImage from '@ui/Avatar/AvatarImage.vue';
import AvatarFallback from '@ui/Avatar/AvatarFallback.vue';
import AvatarGroup from '@ui/Avatar/AvatarGroup.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

function picsum(id: number) {
  return `https://picsum.photos/id/${id}/96/96`;
}

const team = [
  { name: 'Ada Lovelace', src: picsum(64) },
  { name: 'Grace Hopper', src: picsum(65) },
  { name: 'Alan Turing' },
  { name: 'Katherine Johnson', src: picsum(91) },
  { name: 'Edsger Dijkstra' },
  { name: 'Barbara Liskov', src: picsum(1027) },
];
</script>

<template>

  <!-- Header -->
  <ComponentHeader>
    <!-- Title -->
    <ComponentHeaderTitle>Avatar</ComponentHeaderTitle>
    <!-- Description -->
    <ComponentHeaderDescription>
      A user image with an initials fallback while it loads or when no image is set. Stack several with AvatarGroup.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
  <!-- Image and fallback -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Image and fallback</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>With a valid image; and initials when there's no image.</ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex items-center gap-4">
        <Avatar>
          <AvatarImage :src="picsum(64)" alt="Ada Lovelace" />
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>GH</AvatarFallback>
        </Avatar>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>

  <!-- Sizes -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>Small, medium, and large sizes keep image and fallback content centered.</ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex items-center gap-4">
        <Avatar size="sm">
          <AvatarImage :src="picsum(177)" alt="Small avatar" />
          <AvatarFallback>SM</AvatarFallback>
        </Avatar>
        <Avatar size="md">
          <AvatarImage :src="picsum(342)" alt="Medium avatar" />
          <AvatarFallback>MD</AvatarFallback>
        </Avatar>
        <Avatar size="lg">
          <AvatarImage :src="picsum(433)" alt="Large avatar" />
          <AvatarFallback>LG</AvatarFallback>
        </Avatar>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>

  <!-- Group -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Group</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>Overlapping stack capped with max; extras collapse into a +N tile.</ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex flex-col gap-4">
        <AvatarGroup :items="team" :max="4" />
        <AvatarGroup :items="team" :max="0" size="md" />
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>
  </ComponentContent>
</template>
