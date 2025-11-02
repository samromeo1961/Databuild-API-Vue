import { createRouter, createWebHistory } from 'vue-router';

// Import tab components
import CatalogueTab from '../components/Catalogue/CatalogueTab.vue';
import RecipesTab from '../components/Recipes/RecipesTab_updated.vue';
import SuppliersTab from '../components/Suppliers/SuppliersTab.vue';
import ContactsTab from '../components/Contacts/ContactsTab.vue';
import TemplatesTab from '../components/Templates/TemplatesTab.vue';
import FavouritesTab from '../components/Favourites/FavouritesTab.vue';
import RecentsTab from '../components/Recents/RecentsTab.vue';
import PreferencesTab from '../components/Preferences/PreferencesTab.vue';
import ZzTakeoffTab from '../components/ZzTakeoff/ZzTakeoffTab.vue';

const routes = [
  {
    path: '/',
    redirect: '/catalogue'
  },
  {
    path: '/catalogue',
    name: 'Catalogue',
    component: CatalogueTab
  },
  {
    path: '/recipes',
    name: 'Recipes',
    component: RecipesTab
  },
  {
    path: '/suppliers',
    name: 'Suppliers',
    component: SuppliersTab
  },
  {
    path: '/contacts',
    name: 'Contacts',
    component: ContactsTab
  },
  {
    path: '/templates',
    name: 'Templates',
    component: TemplatesTab
  },
  {
    path: '/favourites',
    name: 'Favourites',
    component: FavouritesTab
  },
  {
    path: '/recents',
    name: 'Recents',
    component: RecentsTab
  },
  {
    path: '/preferences',
    name: 'Preferences',
    component: PreferencesTab
  },
  {
    path: '/zztakeoff',
    name: 'zzTakeoff',
    component: ZzTakeoffTab
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
