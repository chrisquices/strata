<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Avatar from '@ui/Avatar/Avatar.vue';
import AvatarImage from '@ui/Avatar/AvatarImage.vue';
import AvatarFallback from '@ui/Avatar/AvatarFallback.vue';
import AvatarGroup from '@ui/Avatar/AvatarGroup.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const picsum = (id: number) => `https://picsum.photos/id/${id}/96/96`;

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
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Avatar</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A user image with an initials fallback while it loads or when no image is set. Stack several with AvatarGroup.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Image and fallback</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>With a valid image; and initials when there's no image.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-4" data-demo="basic">
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

    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-4" data-demo="sizes">
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

    <ComponentItemSection>
      <ComponentItemSectionTitle>Group</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Overlapping stack capped with max; extras collapse into a +N tile.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-4" data-demo="group">
          <AvatarGroup :items="team" :max="4" />
          <AvatarGroup :items="team" :max="0" size="md" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
