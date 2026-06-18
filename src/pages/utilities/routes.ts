import VirtualizationEnginePage from './VirtualizationEnginePage.vue';
import UtilitiesLayout from './UtilitiesLayout.vue';
import UtilitiesIndex from './Index.vue';

export const utilityRoutes = [
  {
    path: '/utilities',
    component: UtilitiesLayout,
    children: [
      { path: '', component: UtilitiesIndex },
      { path: 'virtualization-engine', component: VirtualizationEnginePage },
    ],
  },
];
