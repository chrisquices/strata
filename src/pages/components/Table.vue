<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
import Table from '@ui/Table/Table.vue';
import TableHeader from '@ui/Table/TableHeader.vue';
import TableBody from '@ui/Table/TableBody.vue';
import TableFooter from '@ui/Table/TableFooter.vue';
import TableRow from '@ui/Table/TableRow.vue';
import TableHead from '@ui/Table/TableHead.vue';
import TableCell from '@ui/Table/TableCell.vue';
import TableCaption from '@ui/Table/TableCaption.vue';
import Badge from '@ui/Badge/Badge.vue';
import Card from '@ui/Card/Card.vue';
import Checkbox from '@ui/Checkbox/Checkbox.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const invoices = [
  {id: 'INV-001', status: 'Paid', method: 'Credit Card', amount: '$250.00', variant: 'success'},
  {id: 'INV-002', status: 'Pending', method: 'PayPal', amount: '$150.00', variant: 'warning'},
  {id: 'INV-003', status: 'Unpaid', method: 'Bank Transfer', amount: '$350.00', variant: 'destructive'},
  {id: 'INV-004', status: 'Paid', method: 'Credit Card', amount: '$450.00', variant: 'success'},
];

// Demo-only selection state (the kit provides the row UI; selection logic is up to the consumer).
const selected = ref<string[]>(['INV-002']);

function toggle(id: string, on: boolean) {
  selected.value = on ? [...selected.value, id] : selected.value.filter(function (selectedId) {
    return selectedId !== id;
  });
}
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Table</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Presentational table primitives — Table, TableHeader/Body/Footer, TableRow, TableHead/Cell, TableCaption. UI
      only (bring your own sorting/selection logic).
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A table with header, body, footer, and caption.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Card class="w-full max-w-2xl">
          <Table>
            <TableCaption>Recent invoices.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead class="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in invoices" :key="row.id">
                <TableCell class="font-medium">{{ row.id }}</TableCell>
                <TableCell>
                  <Badge :variant="row.variant" size="sm" class="w-20">{{ row.status }}</Badge>
                </TableCell>
                <TableCell class="text-muted">{{ row.method }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ row.amount }}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colspan="3">Total</TableCell>
                <TableCell class="text-right tabular-nums">$1,200.00</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Selectable -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Selectable</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Rows highlight on hover and show a selected state via <code
          class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">:selected</code> (visual only — wire your own
        selection). Selected: <strong class="text-foreground">{{ selected.length }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Card class="w-full max-w-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-10"><span class="sr-only">Select</span></TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in invoices" :key="row.id" :selected="selected.includes(row.id)">
                <TableCell>
                  <Checkbox
                      :checked="selected.includes(row.id)"
                      :aria-label="`Select ${row.id}`"
                      @update:checked="toggle(row.id, $event)"
                  />
                </TableCell>
                <TableCell class="font-medium">{{ row.id }}</TableCell>
                <TableCell>
                  <Badge :variant="row.variant" size="sm" class="w-20">{{ row.status }}</Badge>
                </TableCell>
                <TableCell class="text-right tabular-nums">{{ row.amount }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
